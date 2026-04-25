import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import {
  verifyAdminAccess,
  parsePagination,
  handleCrmError,
  formatCrmSuccess,
  buildMetadata,
} from '@/lib/crm-handlers';

export const dynamic = 'force-dynamic';
import { WhatsAppAutomationRule } from '@/lib/schemas/enterpriseSchemas';

// Mark as dynamic since this route uses request.headers or request.url


export async function GET(request: NextRequest) {
  try {
    const userId = verifyAdminAccess(request);
    const { limit, skip } = parsePagination(request);
    const url = new URL(request.url);

    await connectDB();

  const enabled = String(url.searchParams.get('enabled') || '').trim().toLowerCase();
  const triggerType = String(url.searchParams.get('triggerType') || '').trim();

  // Only restrict to creator for non-super-admins
  const superAdmin = String(userId) === 'admincrm' || String(userId) === 'admin';
  const filter: any = {};
  if (!superAdmin) filter.createdByUserId = String(userId);

  // enabled can be true|false|all
  if (enabled === 'true' || enabled === '1') filter.enabled = true;
  if (enabled === 'false' || enabled === '0') filter.enabled = false;

  // triggerType can be a specific value or 'all'
  if (triggerType && triggerType !== 'all') filter.triggerType = triggerType;

    const rules = await WhatsAppAutomationRule.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await WhatsAppAutomationRule.countDocuments(filter);
    const meta = buildMetadata(total, limit, skip);

    // Backward-compat: existing CRM fetch helpers often expect the payload at the top level
    // (e.g. res.rules). We return both shapes.
    return NextResponse.json(
      {
        success: true,
        rules,
        total,
        data: { rules, total },
        meta,
      },
      { status: 200 }
    );
  } catch (error) {
    return handleCrmError(error, 'GET automations');
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = verifyAdminAccess(request);
    const body = await request.json().catch(() => null);
    if (!body) return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });

    const {
      name,
      enabled,
      triggerType,
      keywords,
      conditions,
      throttleMinutesPerLead,
      actionType,
      actionText,
      actionTemplateId,
      actionTemplateVariables,
      actionLeadUpdates,
    } = body;

    if (!name || !String(name).trim()) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }

    await connectDB();

    const rule = await WhatsAppAutomationRule.create({
      name: String(name).trim(),
      enabled: typeof enabled === 'boolean' ? enabled : true,
      createdByUserId: String(userId),
      triggerType: String(triggerType || 'welcome'),
      keywords: Array.isArray(keywords) ? keywords.map((k: any) => String(k).trim()).filter(Boolean) : [],
      conditions: conditions && typeof conditions === 'object' ? conditions : undefined,
      throttleMinutesPerLead: typeof throttleMinutesPerLead === 'number' ? Math.max(0, throttleMinutesPerLead) : 5,
      actionType: String(actionType || 'send_text'),
      actionText: typeof actionText === 'string' ? actionText : undefined,
      actionTemplateId,
      actionTemplateVariables,
      actionLeadUpdates,
    });

    return formatCrmSuccess(rule);
  } catch (error) {
    return handleCrmError(error, 'POST automations');
  }
}
