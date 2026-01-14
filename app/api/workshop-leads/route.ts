import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { apiError, apiSuccess } from '@/lib/api-error';
import { normalizePhone } from '@/lib/whatsapp';
import { getLead } from '@/lib/schemas/enterpriseSchemas';
import { allocateNextLeadNumber } from '@/lib/crm/leadNumber';

// Public website endpoint:
// - creates/updates a CRM Lead (so it appears in /admin/crm/leads)
// - returns a permanent 6-digit leadNumber
//
// NOTE: This endpoint is intentionally unauthenticated because it's used from the public workshop form.
// We keep it minimal and safe (validation + phone normalization + duplicate handling).

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    if (!body) return apiError('INVALID_REQUEST', 'Invalid JSON body');

    const workshopId = String(body.workshopId || '').trim();
    const workshopName = String(body.workshopName || '').trim();
    const month = String(body.month || '').trim();
    const mode = String(body.mode || '').trim();
    const language = String(body.language || '').trim();

    const name = String(body.name || '').trim();
    const mobileRaw = String(body.mobile || '').trim();
    const emailRaw = String(body.email || '').trim();
    const gender = String(body.gender || '').trim();
    const city = String(body.city || '').trim();
    const priceInr = typeof body.priceInr === 'number' ? body.priceInr : Number(body.priceInr || 0) || 0;

    if (!workshopId || !workshopName || !name || !mobileRaw || !emailRaw || !gender || !city) {
      return apiError('VALIDATION_ERROR', 'Missing required fields');
    }

    if (!emailRaw.includes('@')) {
      return apiError('VALIDATION_ERROR', 'Invalid email');
    }

    const phoneNumber = normalizePhone(mobileRaw);
    if (!phoneNumber) {
      return apiError('VALIDATION_ERROR', 'Invalid mobile number');
    }

    await connectDB();
    const Lead = getLead();

    // Find by phone first (primary). If not found, fall back to email.
    const existing = await Lead.findOne({
      $or: [{ phoneNumber }, ...(emailRaw ? [{ email: emailRaw.toLowerCase() }] : [])],
    });

    if (existing) {
      // Ensure leadNumber exists.
      if (!existing.leadNumber) {
        const { leadNumber } = await allocateNextLeadNumber();
        existing.leadNumber = leadNumber;
      }

      // Update fields opportunistically.
      existing.name = existing.name || name;
      existing.email = existing.email || emailRaw.toLowerCase();
      existing.phoneNumber = phoneNumber;
      existing.city = (existing as any).city || city;
      (existing as any).gender = (existing as any).gender || gender;
      (existing as any).source = (existing as any).source || 'website-form';
      (existing as any).workshopId = (existing as any).workshopId || workshopId;
      (existing as any).workshopName = (existing as any).workshopName || workshopName;
      (existing as any).lastFormAt = new Date();
      (existing as any).lastFormMeta = {
        month,
        mode,
        language,
        priceInr,
      };

      await existing.save();

      return apiSuccess({
        leadNumber: existing.leadNumber,
        leadId: String(existing._id),
        updated: true,
      });
    }

    const { leadNumber } = await allocateNextLeadNumber();

    const lead = await Lead.create({
      leadNumber,
      name,
      email: emailRaw.toLowerCase(),
      phoneNumber,
      source: 'website-form',
      status: 'lead',
      // workshop fields (schema supports these in CRM routes)
      workshopId,
      workshopName,
      // extra form meta
      city,
      gender,
      lastFormAt: new Date(),
      lastFormMeta: {
        month,
        mode,
        language,
        priceInr,
      },
    });

    return apiSuccess(
      {
        leadNumber,
        leadId: String(lead._id),
        created: true,
      },
      201
    );
  } catch (error) {
    console.error('❌ POST /api/workshop-leads error:', error);
    const msg = error instanceof Error ? error.message : 'Failed to submit form';
    return apiError('SERVER_ERROR', 'Failed to submit form', msg);
  }
}
