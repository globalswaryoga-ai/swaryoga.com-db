import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAccess, handleCrmError, formatCrmSuccess } from '@/lib/crm-handlers';
import { getBunnyChatbotSettings, saveBunnyChatbotSettings } from '@/lib/bunnyChatbotSettingsRepository';

export const dynamic = 'force-dynamic';

export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const userId = String(verifyAdminAccess(request));

    let settings = await getBunnyChatbotSettings(userId);
    if (!settings) {
      settings = await saveBunnyChatbotSettings({
        welcomeEnabled: true,
        officeHoursEnabled: false,
        officeHoursTimezone: 'Asia/Kolkata',
        globalLabels: [],
        aiEnabled: false,
      }, userId);
    }

    return formatCrmSuccess(settings);
  } catch (error) {
    return handleCrmError(error, 'GET chatbot-settings');
  }
}

export async function PUT(request: NextRequest) {
  try {
    const userId = String(verifyAdminAccess(request));
    const body = await request.json().catch(() => null);
    if (!body) return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });

    const allowed: Record<string, any> = {};
    const keys = [
      'welcomeEnabled', 'welcomeMessage', 'officeHoursEnabled',
      'officeHoursStart', 'officeHoursEnd', 'officeHoursTimezone',
      'afterHoursMessage', 'escalateAfterMessages', 'escalateMessage',
      'inactivityMinutes', 'inactivityMessage', 'globalLabels',
      'defaultResponse', 'aiEnabled',
    ];
    for (const key of keys) {
      if (body[key] !== undefined) allowed[key] = body[key];
    }

    const updated = await saveBunnyChatbotSettings(allowed, userId);

    return formatCrmSuccess(updated);
  } catch (error) {
    return handleCrmError(error, 'PUT chatbot-settings');
  }
}
