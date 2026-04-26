/**
 * Telegram Broadcast API
 * POST — Send a broadcast message to multiple Telegram chats via user's bot
 */
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { getCRMUserSettings, getTelegramContact, getTelegramMessage } from '@/lib/schemas/enterpriseSchemas';
import { getViewerUserId } from '@/lib/crm-handlers';
import { broadcastToTelegram } from '@/lib/telegram';

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
    const { chatIds, text, imageUrl, videoUrl, documentUrl, templateId, broadcastRunId } = body;

    if (!chatIds || !Array.isArray(chatIds) || chatIds.length === 0) {
      return NextResponse.json({ error: 'Missing or empty chatIds array' }, { status: 400 });
    }
    if (!text && !imageUrl && !videoUrl) {
      return NextResponse.json({ error: 'Missing message content' }, { status: 400 });
    }

    await connectDB();
    const Settings = getCRMUserSettings();
    const settings = await Settings.findOne({ userId }).lean();
    const botToken = (settings as any)?.telegramBotToken;

    if (!botToken) {
      return NextResponse.json({ error: 'Telegram bot not configured' }, { status: 400 });
    }

    // Run broadcast
    const result = await broadcastToTelegram(
      chatIds,
      { text: text || '', imageUrl, videoUrl, documentUrl },
      botToken,
      async (br, idx) => {
        // Log each message
        try {
          const TelegramMsg = getTelegramMessage();
          await TelegramMsg.create({
            ownerId: userId,
            chatId: Number(br.chatId),
            messageId: br.messageId,
            direction: 'outbound',
            text: text || '',
            mediaType: imageUrl ? 'photo' : videoUrl ? 'video' : documentUrl ? 'document' : 'none',
            mediaUrl: imageUrl || videoUrl || documentUrl || '',
            status: br.success ? 'sent' : 'failed',
            errorMessage: br.error || '',
            broadcastRunId: broadcastRunId || '',
            templateId: templateId || '',
          });
        } catch (e) {
          // Don't fail broadcast if logging fails
        }
      }
    );

    return NextResponse.json({
      success: true,
      sent: result.sent,
      failed: result.failed,
      total: chatIds.length,
      errors: result.errors.slice(0, 10), // limit error details
    });
  } catch (err: any) {
    console.error('[Telegram Broadcast]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
