import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { getViewerUserId } from '@/lib/crm-handlers';
import {
  getLead,
  getWhatsAppMessage,
  getWhatsAppTemplate,
  getBroadcastRun,
  getSalesReport,
  getAutoConfig,
} from '@/lib/schemas/enterpriseSchemas';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(authHeader || '');
    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const ownerId = getViewerUserId(decoded);

    const Lead = getLead();
    const WhatsAppMessage = getWhatsAppMessage();
    const Template = getWhatsAppTemplate();
    const Broadcast = getBroadcastRun();
    const Sale = getSalesReport();
    const AutoConfig = getAutoConfig();

    // Fetch all user data in parallel
    const [leads, messages, templates, broadcasts, sales, settings] = await Promise.all([
      Lead.find({ ownerId }).lean().exec().catch(() => []),
      WhatsAppMessage.find({ ownerId }).sort({ createdAt: -1 }).limit(5000).lean().exec().catch(() => []),
      Template.find({ ownerId }).lean().exec().catch(() => []),
      Broadcast.find({ ownerId }).lean().exec().catch(() => []),
      Sale.find({ ownerId }).lean().exec().catch(() => []),
      AutoConfig.findOne({ ownerId }).lean().exec().catch(() => null),
    ]);

    const exportData = {
      exportDate: new Date().toISOString(),
      ownerId,
      summary: {
        leads: leads.length,
        messages: messages.length,
        templates: templates.length,
        broadcasts: broadcasts.length,
        sales: sales.length,
      },
      data: {
        leads,
        messages,
        templates,
        broadcasts,
        sales,
        settings,
      },
    };

    const json = JSON.stringify(exportData, null, 2);

    return new NextResponse(json, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="crm-backup-${new Date().toISOString().split('T')[0]}.json"`,
      },
    });
  } catch (err: any) {
    console.error('[export-data] Error:', err);
    return NextResponse.json(
      { error: err.message || 'Export failed' },
      { status: 500 }
    );
  }
}
