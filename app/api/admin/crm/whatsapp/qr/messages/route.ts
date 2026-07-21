/**
 * QR WhatsApp Messages API — Fetch messages for a specific chat.
 *
 * GET /api/admin/crm/whatsapp/qr/messages?chatJid=xxx&connectedPhone=xxx&limit=100
 *
 * Reads from QrWhatsAppMessage (qr_whatsapp_messages) — the collection the
 * QR webhook route and bridge actually persist to — scoped by
 * (userId, connectedPhone, chatJid) per the QR tenant-isolation model.
 *
 * A previous version of this route queried the unrelated Meta WhatsApp
 * collection (WhatsAppMessage / whatsapp_messages) and ignored
 * userId/connectedPhone entirely, so any message not still cached in the
 * bridge's in-memory session (e.g. after a bridge restart, or a chat
 * older than the live session) came back empty — the chat still showed a
 * preview in the inbox list (populated separately, from qr_whatsapp_chats),
 * but opening it showed no messages.
 *
 * Also falls back to the Bunny archive (lib/qrWhatsappArchive.ts) once
 * Mongo's ~1 day hot window is exhausted, so older history (already swept
 * out by the daily archive cron) is still reachable here.
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { getQrWhatsAppMessage } from '@/lib/schemas/enterpriseSchemas';
import { verifyToken } from '@/lib/auth';
import { getViewerUserId } from '@/lib/crm-handlers';
import { apiError, apiSuccess } from '@/lib/api-error';
import { normalizePhone } from '@/lib/whatsapp';
import { getArchivedMessages, dateKeyForTimestamp, RETENTION_DAYS } from '@/lib/qrWhatsappArchive';

export const dynamic = 'force-dynamic';

function normalizeConnectedPhone(value: string): string {
  return normalizePhone(String(value || '').split(':')[0].split('@')[0]);
}

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.split('Bearer ')[1];
    if (!token) return apiError('Unauthorized', 401);

    const decoded = verifyToken(token);
    if (!decoded || !decoded.isAdmin) return apiError('Unauthorized', 401);

    const userId = getViewerUserId(decoded);
    await connectDB();

    const { searchParams } = new URL(req.url);
    const chatJid = searchParams.get('chatJid');
    const connectedPhone = normalizeConnectedPhone(searchParams.get('connectedPhone') || '');
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 500);
    const before = searchParams.get('before'); // ms timestamp, for pagination (optional)

    if (!chatJid) {
      return apiError('Missing chatJid', 400);
    }
    if (!connectedPhone) {
      return apiError('Missing connectedPhone', 400);
    }

    const QrWhatsAppMessage = getQrWhatsAppMessage();

    const query: any = { userId, connectedPhone, chatJid };
    const beforeSeconds = before ? Math.floor(parseInt(before) / 1000) : undefined;
    if (beforeSeconds) query.timestamp = { $lt: beforeSeconds };

    const messages = await QrWhatsAppMessage.find(query)
      .sort({ timestamp: -1 }) // most recent first, frontend reverses for display
      .limit(limit)
      .lean();

    let source = 'mongodb';
    let combined = messages;

    // Mongo's hot window is only ~1 day — once it's exhausted for this
    // chat, pull the rest from the Bunny archive instead of returning empty.
    if (messages.length < limit) {
      try {
        const untilTs = beforeSeconds || Math.floor(Date.now() / 1000);
        const untilDateKey = dateKeyForTimestamp(untilTs);
        const sinceDateKey = dateKeyForTimestamp(Math.max(
          untilTs - 30 * 24 * 60 * 60,
          Math.floor(Date.now() / 1000) - RETENTION_DAYS * 24 * 60 * 60
        ));
        const archived = await getArchivedMessages(userId, connectedPhone, chatJid, sinceDateKey, untilDateKey);
        const filtered = archived.filter((m) => !beforeSeconds || m.timestamp < beforeSeconds);
        if (filtered.length) {
          source = 'mongodb+archive';
          const byId = new Map(messages.map((m: any) => [m.messageId, m]));
          for (const m of filtered) {
            if (!byId.has(m.messageId)) {
              byId.set(m.messageId, {
                messageId: m.messageId, direction: m.direction, fromMe: m.fromMe,
                text: m.text, type: m.type, participant: m.participant, pushName: m.pushName,
                timestamp: m.timestamp, status: m.status, hasMedia: m.hasMedia,
                mediaUrl: m.mediaUrl, mediaMimetype: m.mediaMimetype, mediaFileName: m.mediaFileName,
                quotedId: m.quotedId, quotedText: m.quotedText, quotedParticipant: m.quotedParticipant,
              });
            }
          }
          combined = Array.from(byId.values())
            .sort((a: any, b: any) => b.timestamp - a.timestamp)
            .slice(0, limit);
        }
      } catch (archiveErr) {
        console.warn('[QR Messages API] Archive fallback failed (non-fatal):', archiveErr);
      }
    }

    return apiSuccess({
      messages: combined.map((m: any) => ({
        id: m.messageId || '',
        from: m.fromMe ? connectedPhone : (m.participant || chatJid.split('@')[0]),
        fromMe: !!m.fromMe,
        text: m.text || '',
        type: m.type || 'text',
        timestamp: (m.timestamp || 0) * 1000, // seconds -> ms for the frontend
        status: m.status ?? 0,
        participant: m.participant || '',
        pushName: m.pushName || '',
        hasMedia: !!m.hasMedia,
        mediaUrl: m.mediaUrl || null,
        mediaMimetype: m.mediaMimetype || null,
        mediaFileName: m.mediaFileName || null,
        quoted: m.quotedId ? { id: m.quotedId, text: m.quotedText, participant: m.quotedParticipant } : null,
        quotedId: m.quotedId || null,
        reactions: {},
      })),
      source,
      connectedPhone,
      count: combined.length,
      ...(messages.length === limit && {
        hasMore: true,
        nextBefore: (messages[messages.length - 1] as any)?.timestamp ? (messages[messages.length - 1] as any).timestamp * 1000 : undefined,
      }),
    });
  } catch (err: any) {
    console.error('[QR Messages API]', err.message);
    return apiError(err.message, 500);
  }
}
