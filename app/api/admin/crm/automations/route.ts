import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAccess, parsePagination, handleCrmError, formatCrmSuccess, buildMetadata } from '@/lib/crm-handlers';
import { listBunnyAutomationRules, saveBunnyAutomationRule } from '@/lib/bunnyAutomationRepository';

export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
  try {
    const owner = String(verifyAdminAccess(request));
    const { limit, skip } = parsePagination(request);
    const enabled = request.nextUrl.searchParams.get('enabled');
    const trigger = request.nextUrl.searchParams.get('triggerType');
    const all = (await listBunnyAutomationRules(owner)).filter(rule =>
      (!['true', 'false', '1', '0'].includes(enabled || '') || rule.enabled === ['true', '1'].includes(enabled!)) &&
      (!trigger || trigger === 'all' || rule.triggerType === trigger));
    const rules = all.slice(skip, skip + limit);
    return NextResponse.json({ success: true, rules, total: all.length, data: { rules, total: all.length }, meta: buildMetadata(all.length, limit, skip) });
  } catch (error) { return handleCrmError(error, 'GET automations'); }
}
export async function POST(request: NextRequest) {
  try {
    const owner = String(verifyAdminAccess(request));
    const body = await request.json();
    try { return formatCrmSuccess(await saveBunnyAutomationRule(body, owner)); }
    catch (error) {
      if (error instanceof Error && /required|Unsupported|Keywords|Invalid/.test(error.message))
        return NextResponse.json({ error: error.message }, { status: 400 });
      throw error;
    }
  } catch (error) { return handleCrmError(error, 'POST automations'); }
}
