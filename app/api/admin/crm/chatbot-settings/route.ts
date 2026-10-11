import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAccess, handleCrmError, formatCrmSuccess } from '@/lib/crm-handlers';
import { getBunnyChatbotSettings, saveBunnyChatbotSettings } from '@/lib/bunnyChatbotSettingsRepository';
import { isChatbotOfficeOpen } from '@/lib/chatbotOfficeHours';

export const dynamic = 'force-dynamic';

export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const userId = String(verifyAdminAccess(request));

    let settings = await getBunnyChatbotSettings(userId);
    if (!settings) {
      settings = await saveBunnyChatbotSettings({
        chatbotEnabled: false,
        welcomeEnabled: false,
        welcomeRepeatDays: 0,
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
      'chatbotEnabled', 'welcomeRepeatDays', 'aiSystemPrompt', 'aiMaxTokens', 'aiModel',
    ];
    for (const key of keys) {
      if (body[key] !== undefined) allowed[key] = body[key];
    }
    if (allowed.welcomeRepeatDays !== undefined && (!Number.isInteger(allowed.welcomeRepeatDays) || allowed.welcomeRepeatDays < 0 || allowed.welcomeRepeatDays > 365)) {
      return NextResponse.json({ error: 'Welcome repeat days must be an integer from 0 to 365; 0 means first conversation only.' }, { status: 400 });
    }
    if (allowed.aiMaxTokens !== undefined && (!Number.isInteger(allowed.aiMaxTokens) || allowed.aiMaxTokens < 50 || allowed.aiMaxTokens > 1000)) {
      return NextResponse.json({ error: 'AI response token limit must be 50–1000.' }, { status: 400 });
    }
    for (const key of ['chatbotEnabled', 'welcomeEnabled', 'officeHoursEnabled', 'aiEnabled']) {
      if (allowed[key] !== undefined && typeof allowed[key] !== 'boolean')
        return NextResponse.json({ error: `${key} must be true or false.` }, { status: 400 });
    }
    if (allowed.officeHoursEnabled || allowed.officeHoursStart || allowed.officeHoursEnd || allowed.officeHoursTimezone) {
      const previous = await getBunnyChatbotSettings(userId);
      try {
        isChatbotOfficeOpen({ ...previous, ...allowed, officeHoursEnabled: true });
      } catch (error) {
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Invalid office hours' }, { status: 400 });
      }
    }

    const updated = await saveBunnyChatbotSettings(allowed, userId);

    return formatCrmSuccess(updated);
  } catch (error) {
    return handleCrmError(error, 'PUT chatbot-settings');
  }
}
