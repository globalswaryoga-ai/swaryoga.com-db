import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { apiError, apiSuccess, logError } from '@/lib/api-error';
import { isValidObjectId } from '@/lib/crm-handlers';
import { getSalesReport } from '@/lib/schemas/enterpriseSchemas';

export const dynamic = 'force-dynamic';

/**
 * Public self-service "certificate details" endpoint.
 *
 * GET  ?saleId=... | ?leadId=...   -> look up a sale and return certificate-relevant fields
 * POST { saleId, ... }             -> save participant-supplied certificate details
 *
 * Intentionally unauthenticated (matches /api/leads/my-details pattern) so a participant
 * can fill in their own certificate details via a shared link. Only certificate* fields
 * are writable - no status, payments, or core CRM customer fields are exposed/updatable.
 */

async function resolveSale(saleId: string | null, leadId: string | null) {
  const SalesReport = getSalesReport();

  if (saleId && isValidObjectId(saleId)) {
    return SalesReport.findById(saleId);
  }

  if (leadId && isValidObjectId(leadId)) {
    return SalesReport.findOne({ leadId }).sort({ createdAt: -1 });
  }

  return null;
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const saleId = url.searchParams.get('saleId');
    const leadId = url.searchParams.get('leadId');

    if (!saleId && !leadId) {
      return apiError('VALIDATION_ERROR', 'Missing saleId or leadId');
    }

    await connectDB();
    const sale = await resolveSale(saleId, leadId);

    if (!sale) {
      return apiSuccess({ found: false });
    }

    return apiSuccess({
      found: true,
      saleId: String(sale._id),
      workshopName: sale.workshopName || '',
      date: sale.batchDate || sale.saleDate || sale.createdAt,
      certificateTitle: sale.certificateTitle || '',
      certificateName: sale.certificateName || sale.customerName || '',
      certificateAddress: sale.certificateAddress || '',
      certificateMobile: sale.certificateMobile || sale.customerPhone || '',
      certificatePlace: sale.certificatePlace || '',
      certificatePincode: sale.certificatePincode || '',
      certificateState: sale.certificateState || '',
      certificateCountry: sale.certificateCountry || '',
      certificatePhotoUrl: sale.certificatePhotoUrl || '',
    });
  } catch (error) {
    logError('GET /api/certificate-details', error);
    return apiError('SERVER_ERROR', 'Failed to load certificate details');
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    if (!body) return apiError('INVALID_REQUEST', 'Invalid JSON body');

    const { saleId, leadId } = body;
    if (!saleId && !leadId) return apiError('VALIDATION_ERROR', 'Missing saleId or leadId');

    const name = String(body.certificateName || '').trim();
    if (!name) return apiError('VALIDATION_ERROR', 'Name is required');

    await connectDB();
    const sale = await resolveSale(saleId || null, leadId || null);
    if (!sale) return apiError('NOT_FOUND', 'Certificate record not found');

    const allowedTitles = ['Mr', 'Miss', 'Mrs', 'Ms', 'Dr'];
    const title = String(body.certificateTitle || '').trim();

    sale.certificateTitle = allowedTitles.includes(title) ? title : undefined;
    sale.certificateName = name;
    sale.certificateAddress = String(body.certificateAddress || '').trim() || undefined;
    sale.certificateMobile = String(body.certificateMobile || '').trim() || undefined;
    sale.certificatePlace = String(body.certificatePlace || '').trim() || undefined;
    sale.certificatePincode = String(body.certificatePincode || '').trim() || undefined;
    sale.certificateState = String(body.certificateState || '').trim() || undefined;
    sale.certificateCountry = String(body.certificateCountry || '').trim() || undefined;
    await sale.save();

    return apiSuccess({
      saleId: String(sale._id),
      certificateTitle: sale.certificateTitle || '',
      certificateName: sale.certificateName || '',
      certificateAddress: sale.certificateAddress || '',
      certificateMobile: sale.certificateMobile || '',
      certificatePlace: sale.certificatePlace || '',
      certificatePincode: sale.certificatePincode || '',
      certificateState: sale.certificateState || '',
      certificateCountry: sale.certificateCountry || '',
      certificatePhotoUrl: sale.certificatePhotoUrl || '',
    });
  } catch (error) {
    logError('POST /api/certificate-details', error);
    return apiError('SERVER_ERROR', 'Failed to save certificate details');
  }
}
