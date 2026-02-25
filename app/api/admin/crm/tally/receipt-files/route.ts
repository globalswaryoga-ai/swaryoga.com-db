/**
 * Tally Receipt Files API — Upload, list, delete receipt/bill images for CA audit
 *
 * GET    ?fy=2023-24                    — list all receipt files for FY
 * POST   FormData { file, ...metadata } — upload new receipt file
 * DELETE ?id=xxx                        — delete a receipt file
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { getTallyReceiptFile } from '@/lib/schemas/enterpriseSchemas';
import { uploadToS3, buildS3Path, generatePresignedUrl } from '@/lib/aws-s3';

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return unauthorized();
    const decoded = verifyToken(authHeader.split(' ')[1]);
    if (!decoded || !decoded.isAdmin) return unauthorized();

    await connectDB();
    const ReceiptFile = getTallyReceiptFile();

    const { searchParams } = request.nextUrl;
    const fy = searchParams.get('fy') || '2023-24';
    const category = searchParams.get('category'); // income, expense, or all

    const filter: any = { financialYear: fy };
    if (category && category !== 'all') filter.category = category;

    const files = await ReceiptFile.find(filter).sort({ date: -1, createdAt: -1 }).lean();

    // Generate temporary signed URLs for preview (only for S3 files)
    const filesWithUrls = await Promise.all(
      files.map(async (f: any) => {
        let previewUrl = f.fileUrl;
        // If the URL is an S3 path (contains s3.amazonaws.com), generate a presigned URL
        if (f.fileUrl?.includes('s3.') && f.fileUrl?.includes('amazonaws.com')) {
          try {
            // Extract key from S3 URL
            const urlObj = new URL(f.fileUrl);
            const key = decodeURIComponent(urlObj.pathname.slice(1)); // Remove leading /
            previewUrl = await generatePresignedUrl(key, { expiresIn: 3600 });
          } catch {
            // Keep original URL if presigning fails
          }
        }
        return { ...f, previewUrl };
      })
    );

    const stats = {
      total: files.length,
      income: files.filter((f: any) => f.category === 'income').length,
      expense: files.filter((f: any) => f.category === 'expense').length,
      other: files.filter((f: any) => f.category === 'other').length,
    };

    return NextResponse.json({ success: true, files: filesWithUrls, stats, financialYear: fy });
  } catch (error: any) {
    console.error('[Receipt Files GET Error]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return unauthorized();
    const decoded = verifyToken(authHeader.split(' ')[1]);
    if (!decoded || !decoded.isAdmin) return unauthorized();

    await connectDB();
    const ReceiptFile = getTallyReceiptFile();

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const financialYear = (formData.get('financialYear') as string) || '2023-24';
    const category = (formData.get('category') as string) || 'other';
    const voucherId = formData.get('voucherId') as string;
    const voucherType = formData.get('voucherType') as string;
    const voucherNumber = formData.get('voucherNumber') as string;
    const partyName = formData.get('partyName') as string;
    const amount = formData.get('amount') as string;
    const date = formData.get('date') as string;
    const notes = formData.get('notes') as string;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: `File type ${file.type} not allowed. Use JPEG, PNG, WebP, HEIC, or PDF.` }, { status: 400 });
    }

    // Max 10MB
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large. Maximum 10MB.' }, { status: 400 });
    }

    // Upload to S3
    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = file.name.split('.').pop() || 'jpg';
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const s3Path = buildS3Path('tally', `receipts/${financialYear}`, `${Date.now()}-${sanitizedName}`);

    const fileUrl = await uploadToS3(buffer, s3Path, {
      contentType: file.type,
      metadata: {
        category,
        financialYear,
        originalName: file.name,
      },
    });

    // Save record in DB
    const record = await ReceiptFile.create({
      financialYear,
      voucherId: voucherId || undefined,
      voucherType: voucherType || '',
      voucherNumber: voucherNumber || '',
      fileName: file.name,
      fileUrl,
      fileType: file.type,
      fileSize: file.size,
      category,
      partyName: partyName || '',
      amount: amount ? Number(amount) : undefined,
      date: date || '',
      notes: notes || '',
      uploadedBy: decoded.userId || 'admin',
    });

    return NextResponse.json({ success: true, file: record });
  } catch (error: any) {
    console.error('[Receipt Files POST Error]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return unauthorized();
    const decoded = verifyToken(authHeader.split(' ')[1]);
    if (!decoded || !decoded.isAdmin) return unauthorized();

    await connectDB();
    const ReceiptFile = getTallyReceiptFile();

    const { searchParams } = request.nextUrl;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing id parameter' }, { status: 400 });
    }

    const deleted = await ReceiptFile.findByIdAndDelete(id);
    if (!deleted) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // Note: S3 object is not deleted to avoid accidental data loss.
    // It can be cleaned up separately if needed.

    return NextResponse.json({ success: true, deleted: true });
  } catch (error: any) {
    console.error('[Receipt Files DELETE Error]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
