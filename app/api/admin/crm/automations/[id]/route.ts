import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAccess, handleCrmError, formatCrmSuccess } from '@/lib/crm-handlers';
import { listBunnyAutomationRules, saveBunnyAutomationRule, deleteBunnyAutomationRule } from '@/lib/bunnyAutomationRepository';
export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ id: string }> };
export async function GET(request: NextRequest, context: Context) {
  try {
    const owner = String(verifyAdminAccess(request));
    const { id } = await context.params;
    const rule = (await listBunnyAutomationRules(owner)).find(rule => rule._id === id);
    return rule ? formatCrmSuccess(rule) : NextResponse.json({ error: 'Not found' }, { status: 404 });
  } catch (error) { return handleCrmError(error, 'GET automation'); }
}
export async function PUT(request: NextRequest, context: Context) {
  try {
    const owner = String(verifyAdminAccess(request));
    const { id } = await context.params;
    if (!(await listBunnyAutomationRules(owner)).some(rule => rule._id === id))
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const body = await request.json();
    try { return formatCrmSuccess(await saveBunnyAutomationRule(body, owner, id)); }
    catch (error) {
      if (error instanceof Error && /required|Unsupported|Keywords|Invalid/.test(error.message))
        return NextResponse.json({ error: error.message }, { status: 400 });
      throw error;
    }
  } catch (error) { return handleCrmError(error, 'PUT automation'); }
}
export async function DELETE(request: NextRequest, context: Context) {
  try {
    const owner = String(verifyAdminAccess(request));
    const { id } = await context.params;
    const deletedCount = await deleteBunnyAutomationRule(id, owner);
    return deletedCount ? formatCrmSuccess({ deletedCount }) : NextResponse.json({ error: 'Not found' }, { status: 404 });
  } catch (error) { return handleCrmError(error, 'DELETE automation'); }
}
