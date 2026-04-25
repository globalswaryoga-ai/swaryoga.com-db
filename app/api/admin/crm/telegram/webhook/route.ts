/**
 * Telegram Webhook Receiver
 * POST — Receives updates from Telegram Bot API
 * 
 * Each user's bot has a unique webhook URL:
 *   /api/admin/crm/telegram/webhook?uid=<userId>
 * 
 * Security: Telegram sends X-Telegram-Bot-Api-Secret-Token header
 */
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { getCRMUserSettings, getTelegramContact, getTelegramMessage } from '@/lib/schemas/enterpriseSchemas';
import type { TelegramUpdate } from '@/lib/telegram';

export const dynamic = 'force-dynamic';


export async function POST(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const uid = url.searchParams.get('uid');
    if (!uid) {
      return NextResponse.json({ ok: true }); // Silently accept
    }

    // Verify secret token
    const secretHeader = req.headers.get('x-telegram-bot-api-secret-token') || '';

    await connectDB();
    const Settings = getCRMUserSettings();
    const settings = await Settings.findOne({ userId: uid }).lean();

    if (!settings) {
      return NextResponse.json({ ok: true });
    }

    const expectedSecret = (settings as any).telegramWebhookSecret || '';
    if (expectedSecret && secretHeader !== expectedSecret) {
      console.warn('[Telegram Webhook] Secret mismatch for user:', uid);
      return NextResponse.json({ ok: true }); // Don't reveal error to Telegram
    }

    const update: TelegramUpdate = await req.json();

    // Handle Message or Channel Post
    const msg = update.message || update.channel_post;
    if (!msg) {
      return NextResponse.json({ ok: true });
    }

    const chatId = msg.chat.id;
    const chatType = msg.chat.type;
    const firstName = msg.from?.first_name || msg.chat.first_name || '';
    const lastName = msg.from?.last_name || msg.chat.last_name || '';
    const username = msg.from?.username || msg.chat.username || '';
    const groupTitle = msg.chat.title || '';

    // Determine media type
    let mediaType = 'none';
    let mediaFileId = '';
    let mediaFileName = '';
    if (msg.photo && msg.photo.length > 0) {
      mediaType = 'photo';
      mediaFileId = msg.photo[msg.photo.length - 1].file_id; // highest resolution
    } else if (msg.video) {
      mediaType = 'video';
      mediaFileId = msg.video.file_id;
    } else if (msg.document) {
      mediaType = 'document';
      mediaFileId = msg.document.file_id;
      mediaFileName = msg.document.file_name || '';
    }

    const textContent = msg.text || msg.caption || '';

    // Save message
    const TelegramMsg = getTelegramMessage();
    await TelegramMsg.create({
      ownerId: uid,
      chatId,
      messageId: msg.message_id,
      direction: 'inbound',
      text: textContent,
      mediaType,
      mediaFileId,
      mediaFileName,
      caption: msg.caption || '',
      fromName: `${firstName} ${lastName}`.trim(),
      fromUsername: username,
      status: 'delivered',
    });

    // Upsert contact
    const TelegramCont = getTelegramContact();
    await TelegramCont.findOneAndUpdate(
      { ownerId: uid, chatId },
      {
        $set: {
          firstName,
          lastName,
          username,
          chatType,
          groupTitle,
          lastMessageAt: new Date(),
          lastMessageText: textContent || `[${mediaType}]`,
        },
        $inc: { messageCount: 1 },
        $setOnInsert: {
          ownerId: uid,
          chatId,
          labels: [],
          notes: '',
          isBlocked: false,
        },
      },
      { upsert: true }
    );

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('[Telegram Webhook Error]', err.message);
    // Always return 200 to Telegram so it doesn't disable webhook
    return NextResponse.json({ ok: true });
  }
}

// Telegram may send GET requests for health checks
export async function GET() {
  return NextResponse.json({ ok: true, service: 'telegram-webhook' });
}
