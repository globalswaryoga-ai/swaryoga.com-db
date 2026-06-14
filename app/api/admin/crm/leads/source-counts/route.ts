/**
 * Lead source counts API
 * GET - QR vs Meta lead counts for the current tenant, computed the same way
 * everywhere (Leads, Funnel, Broadcast, Reports pages all use this).
 */
import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { apiError, apiSuccess } from '@/lib/api-error';
import { getLead } from '@/lib/schemas/enterpriseSchemas';
import { isSuperAdmin, getViewerUserId } from '@/lib/crm-handlers';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin && !decoded?.userId) return apiError('UNAUTHORIZED');

    await connectDB();
    const Lead = getLead();

    const viewerId = getViewerUserId(decoded);
    const isSuper = isSuperAdmin(decoded);
    const ownFilter = { $or: [{ assignedToUserId: viewerId }, { createdByUserId: viewerId }] };

    // QR is per-tenant SaaS: always scope to own leads, even for super admin.
    const qrFilter: any = { ...ownFilter, source: 'qr_whatsapp' };

    // Meta: super admin sees all Meta leads; regular admins see only their own.
    const metaFilter: any = { source: { $in: ['whatsapp', 'meta_webhook_auto'] } };
    if (!isSuper) Object.assign(metaFilter, ownFilter);

    const [qrLeads, metaLeads] = await Promise.all([
      Lead.countDocuments(qrFilter),
      Lead.countDocuments(metaFilter),
    ]);

    return apiSuccess({ qrLeads, metaLeads });
  } catch (error) {
    return apiError('INTERNAL_ERROR', error instanceof Error ? error.message : 'Failed to fetch lead source counts');
  }
}
