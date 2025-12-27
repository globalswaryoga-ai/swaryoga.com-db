import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyAdminAccess, handleCrmError, isValidObjectId, toObjectId, formatCrmSuccess } from '@/lib/crm-handlers';
import { WhatsAppAutomationRule } from '@/lib/schemas/enterpriseSchemas';

export async function GET(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const userId = verifyAdminAccess(request);
    const { id } = await ctx.params;
    if (!isValidObjectId(String(id))) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

    await connectDB();

    const rule = await WhatsAppAutomationRule.findOne({ _id: toObjectId(String(id)), createdByUserId: String(userId) }).lean();
    if (!rule) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    return formatCrmSuccess(rule);
  } catch (error) {
    return handleCrmError(error, 'GET automations/[id]');
  }
}

export async function PUT(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const userId = verifyAdminAccess(request);
    const { id } = await ctx.params;
    if (!isValidObjectId(String(id))) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

    const body = await request.json().catch(() => null);
    if (!body) return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });

    await connectDB();

    const allowed: any = {};
    const fields = [
      'name',
      'enabled',
      'triggerType',
      'keywords',
      'conditions',
      'throttleMinutesPerLead',
      'actionType',
      'actionText',
      'actionTemplateId',
      'actionTemplateVariables',
      'actionLeadUpdates',
    ];

    for (const f of fields) {
      if (Object.prototype.hasOwnProperty.call(body, f)) allowed[f] = body[f];
    }

    const updated = await WhatsAppAutomationRule.findOneAndUpdate(
      { _id: toObjectId(String(id)), createdByUserId: String(userId) },
      { $set: allowed },
      { new: true }
    ).lean();

    if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    return formatCrmSuccess(updated);
  } catch (error) {
    return handleCrmError(error, 'PUT automations/[id]');
  }
}

export async function DELETE(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const userId = verifyAdminAccess(request);
    const { id } = await ctx.params;
    if (!isValidObjectId(String(id))) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

    await connectDB();

    const res = await WhatsAppAutomationRule.deleteOne({ _id: toObjectId(String(id)), createdByUserId: String(userId) });
    if (!res.deletedCount) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    return formatCrmSuccess({ deletedCount: res.deletedCount });
  } catch (error) {
    return handleCrmError(error, 'DELETE automations/[id]');
  }
}
