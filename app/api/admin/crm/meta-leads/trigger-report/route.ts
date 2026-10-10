import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.slice('Bearer '.length);
    if (!verifyToken(token)?.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 401 });
    }

    const workshopId = new URL(request.url).searchParams.get('workshopId');
    if (!workshopId) return NextResponse.json({ error: 'Missing workshopId' }, { status: 400 });

    const reportData = [];

    // Add manual triggered messages from leads_sql
    try {
        const { bunnyExecute } = await import('@/lib/bunnyDatabase');
        const leadsRes = await bunnyExecute({ sql: "SELECT data_json FROM leads_sql" });
        const triggerLeads = leadsRes.rows
            .map((r: any) => JSON.parse(r.data_json))
            .filter((l: any) => l.metadata?.wtStatus);
            
        for (const lead of triggerLeads) {
            let messageStatus = lead.metadata?.wtStatus;
            let messageReason = lead.metadata?.wtError || '';
            
            if (messageReason.toLowerCase().includes('not a valid whatsapp') || messageReason.toLowerCase().includes('not exist') || messageReason.toLowerCase().includes('131026')) {
                messageStatus = 'wrong_number';
            }
            if (messageReason.toLowerCase().includes('spam') || messageReason.toLowerCase().includes('blocked') || messageReason.toLowerCase().includes('131031')) {
                messageStatus = 'blocked';
            }

            reportData.push({
                id: lead._id || lead.id || `manual-${Date.now()}`,
                leadName: lead.name || 'Unknown',
                phone: lead.phoneNumber || 'Unknown',
                stage: lead.status || 'Unknown',
                template: lead.metadata?.templateName || 'WhatsApp Trigger',
                scheduledAt: lead.updatedAt || new Date().toISOString(),
                status: messageStatus,
                reason: messageReason
            });
        }
    } catch(e) {
        console.error('Error fetching leads_sql triggers:', e);
    }

    reportData.sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime());

    return NextResponse.json({ success: true, data: reportData });
  } catch (error: any) {
    console.error('Error fetching trigger report:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

