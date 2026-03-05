import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { getAutoConfig } from '@/lib/schemas/enterpriseSchemas';
import { bustAutoConfigCache } from '@/lib/autoConfig';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/crm/auto-config
 * Fetch current auto-config settings
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(authHeader || '');

    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const AutoConfig = getAutoConfig();

    const config = await AutoConfig.findOne({ key: 'auto_config' }).lean();

    return NextResponse.json({
      success: true,
      config: config || null,
    });
  } catch (error) {
    console.error('[AutoConfig API] GET error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to load config' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/crm/auto-config
 * Save auto-config settings (upsert)
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(authHeader || '');

    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    await connectDB();
    const AutoConfig = getAutoConfig();

    const updatedConfig = await AutoConfig.findOneAndUpdate(
      { key: 'auto_config' },
      {
        $set: {
          chatbotEnabled: body.chatbotEnabled,

          welcomeEnabled: body.welcomeEnabled,
          welcomeMessage: body.welcomeMessage,

          workingHoursEnabled: body.workingHoursEnabled,
          workingHoursStart: body.workingHoursStart,
          workingHoursEnd: body.workingHoursEnd,
          workingHoursTimezone: body.workingHoursTimezone,
          offHoursMessage: body.offHoursMessage,

          kbAutoReplyEnabled: body.kbAutoReplyEnabled,
          kbMinConfidence: body.kbMinConfidence,

          aiAgentEnabled: body.aiAgentEnabled,
          aiModel: body.aiModel,
          aiSystemPrompt: body.aiSystemPrompt,
          aiMaxTokens: body.aiMaxTokens,

          autoAssignEnabled: body.autoAssignEnabled,
          autoAssignStrategy: body.autoAssignStrategy,

          autoBroadcastEnabled: body.autoBroadcastEnabled,

          autoCloseEnabled: body.autoCloseEnabled,
          autoCloseMinutes: body.autoCloseMinutes,
          autoCloseMessage: body.autoCloseMessage,

          notifyOnNewLead: body.notifyOnNewLead,
          notifyOnOffHoursMessage: body.notifyOnOffHoursMessage,
          notifyEmail: body.notifyEmail,

          rateLimitEnabled: body.rateLimitEnabled,
          rateLimitMaxPerMinute: body.rateLimitMaxPerMinute,

          updatedAt: new Date(),
          updatedBy: decoded.userId || 'admin',
        },
      },
      { upsert: true, new: true }
    );

    // Bust the in-memory cache so the automation picks up changes immediately
    bustAutoConfigCache();

    console.log('[AutoConfig API] Saved by:', decoded.userId);

    return NextResponse.json({
      success: true,
      message: 'Auto-config saved successfully',
      config: updatedConfig,
    });
  } catch (error) {
    console.error('[AutoConfig API] POST error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to save config' },
      { status: 500 }
    );
  }
}
