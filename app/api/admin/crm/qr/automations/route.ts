import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import {
  verifyAdminAccess,
  parsePagination,
  handleCrmError,
  formatCrmSuccess,
  buildMetadata,
} from '@/lib/crm-handlers';
import { WhatsAppAutomationRule } from '@/lib/schemas/enterpriseSchemas';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const userId = verifyAdminAccess(request);
    const { limit, skip } = parsePagination(request);
    const url = new URL(request.url);
    const triggerType = url.searchParams.get('triggerType')?.trim();

    await connectDB();

    const filter: any = { createdByUserId: String(userId), provider: 'qr' };
    if (triggerType && triggerType !== 'all') filter.triggerType = triggerType;

    const rules = await WhatsAppAutomationRule.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await WhatsAppAutomationRule.countDocuments(filter);
    const meta = buildMetadata(total, limit, skip);

    return NextResponse.json({ success: true, rules, total, meta }, { status: 200 });
  } catch (error) {
    return handleCrmError(error, 'GET qr/automations');
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = verifyAdminAccess(request);
    const body = await request.json().catch(() => null);
    if (!body) return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });

    const { name, enabled, triggerType, keywords, throttleMinutesPerLead, actionType, actionText } = body;
    if (!name || !String(name).trim()) return NextResponse.json({ error: 'name is required' }, { status: 400 });

    await connectDB();

    const rule = await WhatsAppAutomationRule.create({
      name: String(name).trim(),
      enabled: typeof enabled === 'boolean' ? enabled : true,
      createdByUserId: String(userId),
      provider: 'qr',
      triggerType: String(triggerType || 'welcome'),
      keywords: Array.isArray(keywords) ? keywords.map((k: any) => String(k).trim()).filter(Boolean) : [],
      throttleMinutesPerLead: typeof throttleMinutesPerLead === 'number' ? Math.max(0, throttleMinutesPerLead) : 5,
      actionType: String(actionType || 'send_text'),
      actionText: typeof actionText === 'string' ? actionText : undefined,
    });

    return formatCrmSuccess(rule);
  } catch (error) {
    return handleCrmError(error, 'POST qr/automations');
  }
}
