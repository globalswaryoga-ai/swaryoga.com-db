import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin, getViewerUserId } from '@/lib/crm-handlers';
import { loadBunnyLeads } from '@/lib/bunnyLeadsRepository';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded: any = verifyToken(token);
    if (!decoded?.isAdmin && !decoded?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const viewerUserId = String(getViewerUserId(decoded) || decoded?.userId || '');
    const leads = await loadBunnyLeads();
    const visible = isSuperAdmin(decoded)
      ? leads
      : leads.filter((lead: any) => String(lead.assignedToUserId || '') === viewerUserId || String(lead.createdByUserId || '') === viewerUserId);
    const qrLeads = visible.filter((lead: any) => /qr|baileys|whatsapp_qr/i.test(`${lead.source || ''} ${lead.provider || ''}`)).length;
    return NextResponse.json({ success: true, data: { qrLeads, metaLeads: Math.max(0, visible.length - qrLeads), total: visible.length } });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Failed to load source counts' }, { status: 500 });
  }
}
