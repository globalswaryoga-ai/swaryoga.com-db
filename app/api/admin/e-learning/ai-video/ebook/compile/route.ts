import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
// PDFKit (not pdf-lib, used by the receipt PDFs elsewhere in this codebase)
// because it does real script shaping via fontkit's Indic shaper — pdf-lib's
// drawText() draws each Unicode character as its own glyph in sequence,
// which is wrong for Devanagari: a vowel sign that visually precedes its
// consonant needs to be reordered, not just substituted. Confirmed via a
// live spike test (rendered to an image, not just text-extracted) that
// PDFKit gets this right and pdf-lib does not.
import PDFDocument from 'pdfkit';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';
import { getAiVideoJob } from '@/lib/schemas/enterpriseSchemas';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const DEVANAGARI_FONT_PATH = path.join(process.cwd(), 'public', 'fonts', 'NotoSansDevanagari-Regular.ttf');

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!isSuperAdmin(decoded)) {
      return NextResponse.json({ error: 'Forbidden: Superadmin access required' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({} as any));
    const workshopName = String(body?.workshopName || '').trim();
    const language = String(body?.language || '').trim();
    if (!workshopName || !language) {
      return NextResponse.json({ error: 'workshopName and language are required' }, { status: 400 });
    }

    await connectDB();

    const AiVideoJob = getAiVideoJob();
    const jobs = await (AiVideoJob as any)
      .find({ workshopName, 'ebookChapters.language': language })
      .sort({ dayOrder: 1, createdAt: 1 })
      .lean();

    if (!jobs.length) {
      return NextResponse.json({ error: `No e-book chapters found for workshop "${workshopName}" in this language` }, { status: 404 });
    }

    const pdfBytes = await new Promise<Buffer>((resolve, reject) => {
      // Passing the font here (rather than calling .font() after
      // construction) matters: PDFDocument's constructor otherwise tries to
      // initialize its standard Helvetica font first, which reads an AFM
      // metrics file from a path Next.js's webpack bundling for server
      // routes doesn't carry over — confirmed via a live test (ENOENT on
      // .next/server/vendor-chunks/data/Helvetica.afm). Setting the font up
      // front skips that default entirely.
      const doc = new PDFDocument({ margin: 56, font: DEVANAGARI_FONT_PATH });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // One Unicode font (Noto Sans Devanagari) covers both Devanagari and
      // Latin, so the same font works for Hindi/Marathi and English chapters.

      jobs.forEach((job: any, i: number) => {
        const chapter = job.ebookChapters.find((c: any) => c.language === language);
        if (!chapter) return;

        if (i > 0) doc.addPage();
        doc.fontSize(20).text(`Chapter ${i + 1}: ${job.topicTitle}`, { align: 'left' });
        doc.moveDown(1);
        doc.fontSize(12).text(chapter.text, { align: 'left', lineGap: 4 });
      });

      doc.end();
    });

    const filename = workshopName.replace(/[^a-zA-Z0-9_-]+/g, '_');

    return new NextResponse(pdfBytes as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${filename}-${language}.pdf"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to compile e-book';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
