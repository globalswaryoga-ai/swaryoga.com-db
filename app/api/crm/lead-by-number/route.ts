import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { apiError, apiSuccess } from '@/lib/api-error';
import { verifyToken } from '@/lib/auth';
import { normalizeLeadNumberInput } from '@/lib/crm/leadNumber';
import { getLead } from '@/lib/schemas/enterpriseSchemas';

/**
 * GET /api/crm/lead-by-number?leadNumber=006999
 *
 * Authenticated (requires website user token). Returns basic lead/user details
 * for checkout autofill. This endpoint is intentionally NOT admin-only.
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || '';
    const decoded = verifyToken(token);
    if (!decoded?.userId) {
      return apiError('UNAUTHORIZED', 'Please sign in to continue');
    }

    const { searchParams } = new URL(request.url);
    const raw = searchParams.get('leadNumber') || '';
    const leadNumber = normalizeLeadNumberInput(raw);
    if (!leadNumber) {
      return apiError('VALIDATION_ERROR', 'Invalid leadNumber (must be 1 to 6 digits).');
    }

    await connectDB();
    const Lead = getLead();

    const lead: any = await Lead.findOne({ leadNumber }).lean();
    if (!lead) {
      return apiError('NOT_FOUND', 'Lead not found');
    }

    // Return only the fields we actually want to use for autofill.
    // (Avoid leaking CRM-only/private data.)
    const data = {
      leadId: String(lead._id),
      leadNumber: String(lead.leadNumber || leadNumber),
      name: String(lead.name || ''),
      email: String(lead.email || ''),
      phoneNumber: String(lead.phoneNumber || ''),
      city: String((lead as any).city || ''),
      state: String((lead as any).state || ''),
      country: String((lead as any).country || ''),
    };

    return apiSuccess(data);
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to load lead';
    return apiError('SERVER_ERROR', 'Failed to load lead', msg);
  }
}
