import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import {
  verifyAdminAccess,
  handleCrmError,
  formatCrmSuccess,
  isValidObjectId,
  toObjectId,
} from '@/lib/crm-handlers';
import { WhatsAppAutomationRule } from '@/lib/schemas/enterpriseSchemas';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest, context: { params: { id: string } }) {
  try {
    const userId = verifyAdminAccess(request);
    const id = String(context?.params?.id || '').trim();
    if (!isValidObjectId(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    await connectDB();
    const rule = await WhatsAppAutomationRule.findOne({ _id: toObjectId(id), createdByUserId: String(userId), provider: 'qr' }).lean();
    if (!rule) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return formatCrmSuccess(rule);
  } catch (error) {
    return handleCrmError(error, 'GET qr/automations/[id]');
  }
}

export async function PUT(request: NextRequest, context: { params: { id: string } }) {
  try {
    const userId = verifyAdminAccess(request);
    const id = String(context?.params?.id || '').trim();
    if (!isValidObjectId(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    const body = await request.json().catch(() => null);
    if (!body) return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    await connectDB();

    const allowed: any = {};
    if (typeof body.name === 'string') allowed.name = body.name.trim();
    if (typeof body.enabled === 'boolean') allowed.enabled = body.enabled;
    if (body.triggerType) allowed.triggerType = body.triggerType;
    if (Array.isArray(body.keywords)) allowed.keywords = body.keywords.map((k: any) => String(k).trim()).filter(Boolean);
    if (typeof body.throttleMinutesPerLead === 'number') allowed.throttleMinutesPerLead = Math.max(0, body.throttleMinutesPerLead);
    if (body.actionType) allowed.actionType = body.actionType;
    if (typeof body.actionText === 'string') allowed.actionText = body.actionText;

    const updated = await WhatsAppAutomationRule.findOneAndUpdate(
      { _id: toObjectId(id), createdByUserId: String(userId), provider: 'qr' },
      { $set: allowed },
      { new: true }
    ).lean();
    if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return formatCrmSuccess(updated);
  } catch (error) {
    return handleCrmError(error, 'PUT qr/automations/[id]');
  }
}

export async function DELETE(request: NextRequest, context: { params: { id: string } }) {
  try {
    const userId = verifyAdminAccess(request);
    const id = String(context?.params?.id || '').trim();
    if (!isValidObjectId(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    await connectDB();
    const res = await WhatsAppAutomationRule.deleteOne({ _id: toObjectId(id), createdByUserId: String(userId), provider: 'qr' });
    if (!res.deletedCount) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return formatCrmSuccess({ deletedCount: res.deletedCount });
  } catch (error) {
    return handleCrmError(error, 'DELETE qr/automations/[id]');
  }
}
