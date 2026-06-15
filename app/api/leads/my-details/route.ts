import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { apiError, apiSuccess, logError } from '@/lib/api-error';
import { normalizePhone } from '@/lib/whatsapp';
import { getLead } from '@/lib/schemas/enterpriseSchemas';
import { allocateNextLeadNumber } from '@/lib/crm/leadNumber';

export const dynamic = 'force-dynamic';

/**
 * Public self-service "update my details" endpoint.
 *
 * GET  ?mobile=...     -> look up the lead by phone number, return editable fields
 * POST { mobile, ... } -> create or update the lead with corrected details
 *
 * NOTE: Intentionally unauthenticated (matches /api/workshop-leads pattern) so
 * anyone can self-correct their own contact info. Only non-sensitive contact
 * fields are exposed/updatable - no status, labels, payments, or assignment data.
 */

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);

    if (url.searchParams.get('workshops') === '1') {
      await connectDB();
      const Lead = getLead();
      const workshops = await Lead.distinct('workshopName', { workshopName: { $nin: [null, ''] } });
      return apiSuccess({ workshops: workshops.sort() });
    }

    const mobileRaw = url.searchParams.get('mobile') || '';
    const phoneNumber = normalizePhone(mobileRaw);
    if (!phoneNumber) {
      return apiError('VALIDATION_ERROR', 'Invalid mobile number');
    }

    await connectDB();
    const Lead = getLead();
    const lead = await Lead.findOne({ phoneNumber }).lean();

    if (!lead) {
      return apiSuccess({ found: false });
    }

    return apiSuccess({
      found: true,
      leadNumber: (lead as any).leadNumber || '',
      phoneNumber: (lead as any).phoneNumber || '',
      name: (lead as any).name || '',
      email: (lead as any).email || '',
      workshopName: (lead as any).workshopName || '',
      city: (lead as any).city || '',
      state: (lead as any).state || '',
      country: (lead as any).country || '',
      language: (lead as any).language || '',
    });
  } catch (error) {
    logError('GET /api/leads/my-details', error);
    return apiError('SERVER_ERROR', 'Failed to load details');
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    if (!body) return apiError('INVALID_REQUEST', 'Invalid JSON body');

    const phoneNumber = normalizePhone(String(body.mobile || ''));
    if (!phoneNumber) {
      return apiError('VALIDATION_ERROR', 'Invalid mobile number');
    }

    const name = String(body.name || '').trim();
    const email = String(body.email || '').trim();
    if (!name) {
      return apiError('VALIDATION_ERROR', 'Name is required');
    }
    if (email && !email.includes('@')) {
      return apiError('VALIDATION_ERROR', 'Invalid email');
    }

    await connectDB();
    const Lead = getLead();

    const updates: Record<string, any> = { name };
    if (email) updates.email = email.toLowerCase();
    for (const field of ['workshopName', 'city', 'state', 'country', 'language'] as const) {
      const value = String(body[field] || '').trim();
      if (value) updates[field] = value;
    }

    let lead = await Lead.findOne({ phoneNumber });

    if (lead) {
      Object.assign(lead, updates);
      if (!lead.leadNumber) {
        const { leadNumber } = await allocateNextLeadNumber();
        lead.leadNumber = leadNumber;
      }
      lead.metadata = { ...(lead.metadata || {}), selfUpdatedAt: new Date().toISOString() };
      await lead.save();
    } else {
      const { leadNumber } = await allocateNextLeadNumber();
      lead = await Lead.create({
        leadNumber,
        phoneNumber,
        source: 'website',
        labels: ['self-update'],
        status: 'lead',
        ...updates,
        metadata: { selfUpdatedAt: new Date().toISOString() },
      });
    }

    return apiSuccess({
      leadNumber: lead.leadNumber,
      name: lead.name,
      email: lead.email || '',
      workshopName: lead.workshopName || '',
      city: lead.city || '',
      state: lead.state || '',
      country: lead.country || '',
      language: lead.language || '',
    });
  } catch (error) {
    logError('POST /api/leads/my-details', error);
    return apiError('SERVER_ERROR', 'Failed to update details');
  }
}
