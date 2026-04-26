/**
 * Telegram Send Message API
 * POST — Send a message (text/photo/video/document) to a Telegram chat via user's bot
 */
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { getCRMUserSettings, getTelegramContact, getTelegramMessage } from '@/lib/schemas/enterpriseSchemas';
import { getViewerUserId } from '@/lib/crm-handlers';
import {
  sendTelegramMessage,
  sendTelegramPhoto,
  sendTelegramVideo,
  sendTelegramDocument,
} from '@/lib/telegram';

export const dynamic = 'force-dynamic';


export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin && !decoded?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = getViewerUserId(decoded);
    const body = await req.json();
    const { chatId, text, type, url, caption } = body;

    if (!chatId) {
      return NextResponse.json({ error: 'Missing chatId' }, { status: 400 });
    }
    if (!text && !url) {
      return NextResponse.json({ error: 'Missing message content' }, { status: 400 });
    }

    await connectDB();
    const Settings = getCRMUserSettings();
    const settings = await Settings.findOne({ userId }).lean();
    const botToken = (settings as any)?.telegramBotToken;

    if (!botToken) {
      return NextResponse.json({ error: 'Telegram bot not configured. Go to Settings.' }, { status: 400 });
    }

    let response;
    const messageType = type || 'text';

    switch (messageType) {
      case 'photo':
      case 'image':
        response = await sendTelegramPhoto(chatId, url, caption || text || '', botToken);
        break;
      case 'video':
        response = await sendTelegramVideo(chatId, url, caption || text || '', botToken);
        break;
      case 'document':
        response = await sendTelegramDocument(chatId, url, caption || text || '', botToken);
        break;
      default:
        response = await sendTelegramMessage(chatId, text, 'HTML', botToken);
        break;
    }

    if (!response.ok) {
      return NextResponse.json({
        error: response.description || 'Failed to send Telegram message',
      }, { status: 400 });
    }

    // Log the outbound message
    const TelegramMsg = getTelegramMessage();
    await TelegramMsg.create({
      ownerId: userId,
      chatId: Number(chatId),
      messageId: response.result?.message_id,
      direction: 'outbound',
      text: text || caption || '',
      mediaType: messageType === 'text' ? 'none' : messageType === 'image' ? 'photo' : messageType,
      mediaUrl: url || '',
      caption: caption || '',
      status: 'sent',
    });

    // Update contact's last message
    const TelegramCont = getTelegramContact();
    await TelegramCont.findOneAndUpdate(
      { ownerId: userId, chatId: Number(chatId) },
      {
        $set: { lastMessageAt: new Date(), lastMessageText: text || caption || `[${messageType}]` },
        $inc: { messageCount: 1 },
      }
    );

    return NextResponse.json({
      success: true,
      messageId: response.result?.message_id,
    });
  } catch (err: any) {
    console.error('[Telegram Send]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
