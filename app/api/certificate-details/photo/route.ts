import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { apiError, apiSuccess, logError } from '@/lib/api-error';
import { isValidObjectId } from '@/lib/crm-handlers';
import { getSalesReport } from '@/lib/schemas/enterpriseSchemas';
import { uploadToS3 } from '@/lib/bunny-storage';

export const dynamic = 'force-dynamic';

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

/**
 * Public self-service "certificate photo" upload endpoint.
 *
 * POST multipart/form-data: file, saleId (or leadId)
 * Uploads the participant's photo to Bunny CDN and stores the URL on the sale's
 * certificatePhotoUrl field (resetting zoom/offset so it starts centered).
 *
 * Intentionally unauthenticated (matches /api/certificate-details pattern).
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData().catch(() => null);
    if (!formData) return apiError('INVALID_REQUEST', 'Invalid form data');

    const file = formData.get('file') as File | null;
    const saleId = String(formData.get('saleId') || '');
    const leadId = String(formData.get('leadId') || '');

    if (!file) return apiError('VALIDATION_ERROR', 'No file provided');
    if (!file.type.startsWith('image/')) return apiError('VALIDATION_ERROR', 'File must be an image');
    if (file.size > MAX_BYTES) {
      return apiError('VALIDATION_ERROR', `Image too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Max 5 MB.`);
    }
    if (!saleId && !leadId) return apiError('VALIDATION_ERROR', 'Missing saleId or leadId');

    await connectDB();
    const SalesReport = getSalesReport();

    const sale = saleId && isValidObjectId(saleId)
      ? await SalesReport.findById(saleId)
      : leadId && isValidObjectId(leadId)
        ? await SalesReport.findOne({ leadId }).sort({ createdAt: -1 })
        : null;

    if (!sale) return apiError('NOT_FOUND', 'Certificate record not found');

    const buffer = Buffer.from(await file.arrayBuffer());
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const fileName = `certificate-photos/${sale._id}-${Date.now()}-${sanitizedName}`;

    const url = await uploadToS3(buffer, fileName, {
      contentType: file.type,
      metadata: { 'upload-source': 'certificate-details' },
    });

    sale.certificatePhotoUrl = url;
    sale.certificatePhotoZoom = 1;
    sale.certificatePhotoOffsetX = 0;
    sale.certificatePhotoOffsetY = 0;
    await sale.save();

    return apiSuccess({ certificatePhotoUrl: url });
  } catch (error) {
    logError('POST /api/certificate-details/photo', error);
    return apiError('SERVER_ERROR', 'Failed to upload photo');
  }
}
