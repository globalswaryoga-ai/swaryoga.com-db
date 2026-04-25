/**
 * Tally Bills API
 * POST /api/tally/bills — Upload a bill/receipt to a voucher
 * GET  /api/tally/bills — Get vouchers with bills (for CA view)
 */

import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { apiError, apiSuccess } from '@/lib/api-error';
import { getAccVoucher } from '@/lib/schemas/enterpriseSchemas';
import { uploadToS3 } from '@/lib/bunny-storage';
import { getVouchersWithBills } from '@/lib/tally/engine';
import { resolveTallyOwnerId } from '@/lib/tally/access';

export const dynamic = 'force-dynamic';


function getAuth(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return null;
  try {
    return verifyToken(token);
  } catch { return null; }
}

// Upload bill to a voucher
export async function POST(request: NextRequest) {
  try {
    const decoded = getAuth(request);
    if (!decoded) return apiError('UNAUTHORIZED');

    await connectDB();
    const AccVoucher = getAccVoucher();

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const voucherId = formData.get('voucherId') as string | null;

    if (!file || !voucherId) {
      return apiError('VALIDATION_ERROR', 'file and voucherId are required');
    }

    // Validate file type (images + PDF)
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      return apiError('VALIDATION_ERROR', 'Only JPEG, PNG, WebP, HEIC images and PDF files are allowed');
    }

    // Max 10MB
    if (file.size > 10 * 1024 * 1024) {
      return apiError('VALIDATION_ERROR', 'File size must be under 10MB');
    }

    // Check voucher exists
    const voucher = await AccVoucher.findById(voucherId);
    if (!voucher) {
      return apiError('NOT_FOUND', 'Voucher not found');
    }

    // Upload to S3
    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = file.name.split('.').pop() || 'jpg';
    const s3Key = `tally/bills/${(voucher as any).financialYear}/${(voucher as any).voucherNumber}.${ext}`;

    const fileUrl = await uploadToS3(buffer, s3Key, {
      contentType: file.type,
      metadata: {
        voucherId,
        voucherNumber: (voucher as any).voucherNumber,
        financialYear: (voucher as any).financialYear,
      },
    });

    // Update voucher with bill URL
    await AccVoucher.findByIdAndUpdate(voucherId, {
      receiptFileUrl: fileUrl,
      receiptFileName: file.name,
    });

    return apiSuccess({
      url: fileUrl,
      fileName: file.name,
      voucherId,
      voucherNumber: (voucher as any).voucherNumber,
      message: 'Bill uploaded successfully',
    });
  } catch (error: any) {
    console.error('[Tally Bills POST]', error);
    return apiError('SERVER_ERROR', error.message);
  }
}

// Get all vouchers with bills (for CA view)
export async function GET(request: NextRequest) {
  try {
    const decoded = getAuth(request);
    if (!decoded) return apiError('UNAUTHORIZED');

    const searchParams = request.nextUrl.searchParams;
    const fy = searchParams.get('fy') || '2023-24';
    const month = searchParams.get('month') ? parseInt(searchParams.get('month')!, 10) : undefined;
    const year = searchParams.get('year') ? parseInt(searchParams.get('year')!, 10) : undefined;

    const ownerId = resolveTallyOwnerId(decoded);
    const bills = await getVouchersWithBills(fy, month, year, ownerId);

    return apiSuccess({
      bills,
      count: bills.length,
      financialYear: fy,
    });
  } catch (error: any) {
    console.error('[Tally Bills GET]', error);
    return apiError('SERVER_ERROR', error.message);
  }
}
