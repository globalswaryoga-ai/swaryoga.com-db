import { NextRequest, NextResponse } from 'next/server';
import {
  verifyAdminAccess,
  parsePagination,
  handleCrmError,
  formatCrmSuccess,
  buildMetadata,
} from '@/lib/crm-handlers';
import { listBunnyAutomationRules, saveBunnyAutomationRule } from '@/lib/bunnyAutomationRepository';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const owner = String(verifyAdminAccess(request));
    const { limit, skip } = parsePagination(request);
    const triggerType = request.nextUrl.searchParams.get('triggerType')?.trim();

    const all = (await listBunnyAutomationRules(owner)).filter((rule: any) => {
      const isQr = rule.provider === 'qr' || !rule.provider;
      const matchesTrigger = !triggerType || triggerType === 'all' || rule.triggerType === triggerType;
      return isQr && matchesTrigger;
    });

    const rules = all.slice(skip, skip + limit);
    return NextResponse.json(
      { success: true, rules, total: all.length, data: { rules, total: all.length }, meta: buildMetadata(all.length, limit, skip) },
      { status: 200 }
    );
  } catch (error) {
    return handleCrmError(error, 'GET qr/automations');
  }
}

export async function POST(request: NextRequest) {
  try {
    const owner = String(verifyAdminAccess(request));
    const body = await request.json().catch(() => null);
    if (!body) return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });

    try {
      const rule = await saveBunnyAutomationRule({ ...body, provider: 'qr' }, owner);
      return formatCrmSuccess(rule);
    } catch (error) {
      if (error instanceof Error && /required|Unsupported|Keywords|Invalid/.test(error.message)) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      throw error;
    }
  } catch (error) {
    return handleCrmError(error, 'POST qr/automations');
  }
}
