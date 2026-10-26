import { NextRequest, NextResponse } from 'next/server';
import { uploadPublicFile, isBunnyStorageConfigured } from '@/lib/bunny-storage';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const execAsync = promisify(exec);
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const mediaType = (formData.get('mediaType') as string) || 'image';

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const storagePath = `animation-media/${mediaType}/${Date.now()}_${sanitizedName}`;

    let fileUrl = '';

    if (isBunnyStorageConfigured()) {
      const uploadResult = await uploadPublicFile(buffer, storagePath, file.type || 'application/octet-stream');
      fileUrl = uploadResult.cdnUrl;
    } else {
      fileUrl = `/uploads/${storagePath}`;
    }

    const slides: string[] = [];

    // PHASE 6: If uploaded file is a PPT, PPTX or PDF document, convert slides into usable PNG images
    const isPpt = file.name.toLowerCase().endsWith('.ppt') || file.name.toLowerCase().endsWith('.pptx');
    const isPdf = file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf';

    // Locate pdftoppm and libreoffice/soffice binaries across platforms (macOS / Linux / Contabo)
    const findBinary = (names: string[]): string | null => {
      for (const name of names) {
        if (fs.existsSync(name)) return name;
      }
      return null;
    };

    const pdftoppmBin = findBinary([
      '/opt/homebrew/bin/pdftoppm',
      '/usr/bin/pdftoppm',
      '/usr/local/bin/pdftoppm'
    ]);

    const sofficeBin = findBinary([
      '/usr/bin/soffice',
      '/usr/local/bin/soffice',
      '/opt/homebrew/bin/soffice',
      '/Applications/LibreOffice.app/Contents/MacOS/soffice'
    ]);

    if ((isPdf || isPpt) && (pdftoppmBin || (isPpt && sofficeBin))) {
      const tempDir = path.resolve(process.cwd(), 'node_modules/.cache/slide-temp', `slide_${Date.now()}`);
      try {
        if (!fs.existsSync(tempDir)) {
          fs.mkdirSync(tempDir, { recursive: true });
        }

        let pdfPathToExtract = '';

        if (isPpt && sofficeBin) {
          const tempPptPath = path.join(tempDir, sanitizedName);
          fs.writeFileSync(tempPptPath, buffer);
          // Convert PPT/PPTX to PDF via LibreOffice headless
          await execAsync(`"${sofficeBin}" --headless --convert-to pdf "${tempPptPath}" --outdir "${tempDir}"`);
          const baseName = path.parse(sanitizedName).name;
          const convertedPdf = path.join(tempDir, `${baseName}.pdf`);
          if (fs.existsSync(convertedPdf)) {
            pdfPathToExtract = convertedPdf;
          }
        } else if (isPdf) {
          pdfPathToExtract = path.join(tempDir, 'input.pdf');
          fs.writeFileSync(pdfPathToExtract, buffer);
        }

        if (pdfPathToExtract && pdftoppmBin && fs.existsSync(pdfPathToExtract)) {
          // Convert first 10 pages to high-res PNG slides
          const outPrefix = path.join(tempDir, 'slide');
          await execAsync(`"${pdftoppmBin}" -png -r 150 -l 10 "${pdfPathToExtract}" "${outPrefix}"`);

          const generatedFiles = fs.readdirSync(tempDir).filter((f) => f.startsWith('slide-') && f.endsWith('.png'));
          generatedFiles.sort();

          for (const slideFile of generatedFiles) {
            const slideBuffer = fs.readFileSync(path.join(tempDir, slideFile));
            const slideKey = `animation-media/ppt-slides/${Date.now()}_${slideFile}`;
            if (isBunnyStorageConfigured()) {
              const up = await uploadPublicFile(slideBuffer, slideKey, 'image/png');
              slides.push(up.cdnUrl);
            } else {
              slides.push(`/uploads/${slideKey}`);
            }
          }
        }
      } catch (slideErr: any) {
        console.warn('[Slide Converter] Error converting slides:', slideErr.message);
      } finally {
        try {
          fs.rmSync(tempDir, { recursive: true, force: true });
        } catch (e) {}
      }
    }

    return NextResponse.json({
      success: true,
      fileUrl,
      fileName: file.name,
      fileSize: file.size,
      mediaType,
      slides,
      convertedSlideCount: slides.length,
    });
  } catch (error: any) {
    console.error('Animation media upload error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to upload media file' },
      { status: 500 }
    );
  }
}
