/**
 * POST /api/admin/crm/calls/broadcasts/resolve-phones
 * Body: { phoneNumbers: string[] }
 * Returns matching leads for the given phone numbers
 */
import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { apiError, apiSuccess } from '@/lib/api-error';
import { getLead } from '@/lib/schemas/enterpriseSchemas';
import { tenantFilter } from '@/lib/crm-handlers';
import { normalizePhoneCSV } from '@/lib/utils/csvParser';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin && !decoded?.userId) return apiError('UNAUTHORIZED');
    const tf = tenantFilter(decoded, 'assignedToUserId');

    const { phoneNumbers } = await request.json();
    if (!Array.isArray(phoneNumbers) || phoneNumbers.length === 0) {
      return apiError('VALIDATION_ERROR', 'phoneNumbers array is required');
    }

    await connectDB();
    const Lead = getLead();

    // Normalize all input phone numbers
    const normalized = phoneNumbers
      .map((p: string) => normalizePhoneCSV(String(p)))
      .filter(p => p.length >= 6);

    if (!normalized.length) return apiSuccess({ leads: [], matched: 0, unmatched: phoneNumbers.length });

    // Build regex patterns to match last 10 digits (works across country code variations)
    const last10 = [...new Set(normalized.map(p => p.slice(-10)).filter(p => p.length === 10))];

    const leads = await Lead.find({
      $or: last10.map(digits => ({ phoneNumber: { $regex: digits + '$' } })),
      ...tf,
    })
      .select('name displayName phoneNumber funnelStage')
      .limit(500)
      .lean() as any[];

    return apiSuccess({
      leads,
      matched: leads.length,
      unmatched: phoneNumbers.length - leads.length,
    });
  } catch (err: any) {
    console.error('[resolve-phones]', err);
    return apiError('SERVER_ERROR', err.message);
  }
}
