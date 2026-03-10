/**
 * Telegram Bot Config API
 * GET  — Fetch current user's Telegram bot configuration
 * POST — Save bot token, verify it, optionally set webhook
 * DELETE — Remove bot token and disconnect
 */
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { getCRMUserSettings } from '@/lib/schemas/enterpriseSchemas';
import { getViewerUserId } from '@/lib/crm-handlers';
import { verifyBotToken, setWebhook, deleteWebhook, getWebhookInfo } from '@/lib/telegram';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

function getBaseUrl(req: NextRequest): string {
  const proto = req.headers.get('x-forwarded-proto') || 'https';
  const host = req.headers.get('host') || 'swaryoga.com';
  return `${proto}://${host}`;
}

export async function GET(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = getViewerUserId(decoded);
    await connectDB();
    const Settings = getCRMUserSettings();
    const settings = await Settings.findOne({ userId }).lean();

    if (!settings) {
      return NextResponse.json({
        success: true,
        configured: false,
        botToken: '',
        botUsername: '',
        botName: '',
        webhookSet: false,
        enabled: false,
      });
    }

    // Mask the bot token for security (show first 10 chars + last 5)
    const rawToken = (settings as any).telegramBotToken || '';
    const maskedToken = rawToken
      ? rawToken.slice(0, 10) + '...' + rawToken.slice(-5)
      : '';

    return NextResponse.json({
      success: true,
      configured: !!rawToken,
      botToken: maskedToken,
      botUsername: (settings as any).telegramBotUsername || '',
      botName: (settings as any).telegramBotName || '',
      botId: (settings as any).telegramBotId || null,
      webhookSet: (settings as any).telegramWebhookSet || false,
      enabled: (settings as any).telegramEnabled || false,
    });
  } catch (err: any) {
    console.error('[Telegram Config GET]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = getViewerUserId(decoded);
    const body = await req.json();
    const { botToken, setupWebhook } = body;

    if (!botToken || typeof botToken !== 'string' || botToken.length < 30) {
      return NextResponse.json({ error: 'Invalid bot token' }, { status: 400 });
    }

    // 1. Verify the bot token with Telegram
    const verification = await verifyBotToken(botToken);
    if (!verification.ok || !verification.result) {
      return NextResponse.json({
        error: `Invalid bot token: ${verification.error || 'Could not verify'}`,
      }, { status: 400 });
    }

    const botInfo = verification.result;

    await connectDB();
    const Settings = getCRMUserSettings();

    // Generate a webhook secret for this user
    const webhookSecret = crypto.randomBytes(20).toString('hex');

    const updateData: any = {
      telegramBotToken: botToken,
      telegramBotUsername: botInfo.username || '',
      telegramBotName: botInfo.first_name || '',
      telegramBotId: botInfo.id,
      telegramWebhookSecret: webhookSecret,
      telegramEnabled: true,
    };

    // 2. Optionally set webhook
    if (setupWebhook !== false) {
      const baseUrl = getBaseUrl(req);
      const webhookUrl = `${baseUrl}/api/admin/crm/telegram/webhook?uid=${userId}`;
      const whResult = await setWebhook(botToken, webhookUrl, webhookSecret);
      updateData.telegramWebhookSet = whResult.ok;
      if (!whResult.ok) {
        console.warn('[Telegram] Webhook setup failed:', whResult.description);
      }
    }

    await Settings.findOneAndUpdate(
      { userId },
      { $set: updateData },
      { upsert: true }
    );

    return NextResponse.json({
      success: true,
      botUsername: botInfo.username,
      botName: botInfo.first_name,
      botId: botInfo.id,
      webhookSet: updateData.telegramWebhookSet ?? false,
    });
  } catch (err: any) {
    console.error('[Telegram Config POST]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = getViewerUserId(decoded);
    await connectDB();
    const Settings = getCRMUserSettings();
    const settings = await Settings.findOne({ userId }).lean();
    
    const botToken = (settings as any)?.telegramBotToken;
    if (botToken) {
      // Remove webhook from Telegram
      await deleteWebhook(botToken).catch(() => {});
    }

    await Settings.findOneAndUpdate(
      { userId },
      {
        $set: {
          telegramBotToken: '',
          telegramBotUsername: '',
          telegramBotName: '',
          telegramBotId: null,
          telegramWebhookSet: false,
          telegramWebhookSecret: '',
          telegramEnabled: false,
        },
      }
    );

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[Telegram Config DELETE]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
