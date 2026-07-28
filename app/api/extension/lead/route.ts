import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { tenantOrFilter, getViewerUserId } from '@/lib/crm-handlers';
import { getLead } from '@/lib/schemas/enterpriseSchemas';
import { extensionJson, extensionOptions, requireExtensionAccess } from '@/lib/extensionAccess';

export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return extensionOptions();
}

/**
 * GET /api/extension/lead?phone=919876543210
 * Same lookup as /api/admin/crm/leads/by-phone/[phone], gated by extension
 * approval rather than just general CRM login.
 */
export async function GET(req: NextRequest) {
  try {
    const decoded = await requireExtensionAccess(req);
    if (!decoded) {
      return extensionJson({ success: false, error: 'Extension access not approved for this user' }, 403);
    }

    const rawPhone = req.nextUrl.searchParams.get('phone') || '';
    let normalizedPhone = rawPhone.replace(/\D/g, '');
    if (normalizedPhone.length === 10) normalizedPhone = `91${normalizedPhone}`;
    if (!normalizedPhone) {
      return extensionJson({ success: false, error: 'phone query param required' }, 400);
    }

    await connectDB();

    let tf: Record<string, any> = tenantOrFilter(decoded);
    if (Object.keys(tf).length === 0) {
      const viewerId = getViewerUserId(decoded);
      tf = {
        $or: [
          { assignedToUserId: viewerId },
          { createdByUserId: viewerId },
          {
            $and: [
              { $or: [{ assignedToUserId: { $in: [null, ''] } }, { assignedToUserId: { $exists: false } }] },
              { $or: [{ createdByUserId: { $in: [null, ''] } }, { createdByUserId: { $exists: false } }] },
            ],
          },
        ],
      };
    }

    const Lead = getLead();
    let lead: any = await Lead.findOne({ phoneNumber: normalizedPhone, ...tf }).lean();
    if (!lead) {
      lead = await Lead.findOne({
        $and: [
          { $or: [
            { phoneNumber: { $regex: normalizedPhone + '$' } },
            { phoneNumber: { $regex: '^' + normalizedPhone } },
          ] },
          tf,
        ],
      }).lean();
    }

    if (!lead) {
      return extensionJson({ success: false, found: false, phone: normalizedPhone });
    }

    return extensionJson({
      success: true,
      found: true,
      _id: lead._id,
      name: lead.name,
      phoneNumber: lead.phoneNumber,
      status: lead.status,
      label: lead.label,
      email: lead.email,
      leadNumber: lead.leadNumber,
      notes: lead.notes || '',
    });
  } catch (err) {
    console.error('[extension/lead]', err);
    return extensionJson({ success: false, error: 'Internal error' }, 500);
  }
}
