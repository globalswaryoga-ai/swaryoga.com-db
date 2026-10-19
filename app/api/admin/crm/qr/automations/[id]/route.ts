import { NextRequest, NextResponse } from 'next/server';
import {
  verifyAdminAccess,
  handleCrmError,
  formatCrmSuccess,
} from '@/lib/crm-handlers';
import {
  listBunnyAutomationRules,
  saveBunnyAutomationRule,
  deleteBunnyAutomationRule,
} from '@/lib/bunnyAutomationRepository';

export const dynamic = 'force-dynamic';

type Context = { params: Promise<{ id: string }> | { id: string } };

export async function GET(request: NextRequest, context: Context) {
  try {
    const owner = String(verifyAdminAccess(request));
    const resolvedParams = await Promise.resolve(context.params);
    const id = String(resolvedParams?.id || '').trim();
    if (!id) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

    const rule = (await listBunnyAutomationRules(owner)).find((r: any) => r._id === id);
    if (!rule) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return formatCrmSuccess(rule);
  } catch (error) {
    return handleCrmError(error, 'GET qr/automations/[id]');
  }
}

export async function PUT(request: NextRequest, context: Context) {
  try {
    const owner = String(verifyAdminAccess(request));
    const resolvedParams = await Promise.resolve(context.params);
    const id = String(resolvedParams?.id || '').trim();
    if (!id) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

    const rules = await listBunnyAutomationRules(owner);
    const existing = rules.find((r: any) => r._id === id);
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const body = await request.json().catch(() => null);
    if (!body) return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });

    try {
      const updated = await saveBunnyAutomationRule({ ...body, provider: 'qr' }, owner, id);
      return formatCrmSuccess(updated);
    } catch (error) {
      if (error instanceof Error && /required|Unsupported|Keywords|Invalid/.test(error.message)) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      throw error;
    }
  } catch (error) {
    return handleCrmError(error, 'PUT qr/automations/[id]');
  }
}

export async function DELETE(request: NextRequest, context: Context) {
  try {
    const owner = String(verifyAdminAccess(request));
    const resolvedParams = await Promise.resolve(context.params);
    const id = String(resolvedParams?.id || '').trim();
    if (!id) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

    const deletedCount = await deleteBunnyAutomationRule(id, owner);
    if (!deletedCount) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return formatCrmSuccess({ deletedCount });
  } catch (error) {
    return handleCrmError(error, 'DELETE qr/automations/[id]');
  }
}
