import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyAdminAccess, handleCrmError, formatCrmSuccess } from '@/lib/crm-handlers';
import { ChatbotSettings } from '@/lib/schemas/enterpriseSchemas';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const userId = verifyAdminAccess(request);
    await connectDB();

    let settings = await ChatbotSettings.findOne({ createdByUserId: String(userId) }).lean();
    if (!settings) {
      settings = await ChatbotSettings.create({ createdByUserId: String(userId) });
    }

    return formatCrmSuccess(settings);
  } catch (error) {
    return handleCrmError(error, 'GET chatbot-settings');
  }
}

export async function PUT(request: NextRequest) {
  try {
    const userId = verifyAdminAccess(request);
    const body = await request.json().catch(() => null);
    if (!body) return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });

    await connectDB();

    const allowed = {
      welcomeEnabled: body?.welcomeEnabled,
      welcomeMessage: body?.welcomeMessage,
      officeHoursEnabled: body?.officeHoursEnabled,
      officeHoursStart: body?.officeHoursStart,
      officeHoursEnd: body?.officeHoursEnd,
      officeHoursTimezone: body?.officeHoursTimezone,
      afterHoursMessage: body?.afterHoursMessage,
      escalateAfterMessages: body?.escalateAfterMessages,
      escalateMessage: body?.escalateMessage,
      inactivityMinutes: body?.inactivityMinutes,
      inactivityMessage: body?.inactivityMessage,
      globalLabels: body?.globalLabels,
      defaultResponse: body?.defaultResponse,
      aiEnabled: body?.aiEnabled,
    };

    const updated = await ChatbotSettings.findOneAndUpdate(
      { createdByUserId: String(userId) },
      { $set: Object.fromEntries(Object.entries(allowed).filter(([, v]) => v !== undefined)) },
      { new: true, upsert: true }
    ).lean();

    return formatCrmSuccess(updated);
  } catch (error) {
    return handleCrmError(error, 'PUT chatbot-settings');
  }
}
