/**
 * QR WhatsApp Messages API — Fetch stored messages for a specific chat.
 *
 * GET /api/admin/crm/whatsapp/qr/messages?chatJid=xxx&connectedPhone=xxx&limit=100
 *
 * Bunny-only: reads hot history from Bunny SQL (`qr_messages_sql`) scoped by
 * (userId, connectedPhone, chatJid), then fills older history from the Bunny
 * Storage archive via `qr_archive_manifest_sql`. Every lookup has a hard
 * timeout and degrades to an empty list, because the inbox also merges live
 * bridge messages.
 */

import { NextRequest, NextResponse } from 'next/server';
import { listBunnyQrMessages, listBunnyQrArchiveManifest } from '@/lib/bunnyQrRepository';
import { fetchFromStorage } from '@/lib/bunny-storage';
import { verifyToken } from '@/lib/auth';
import { getViewerUserId } from '@/lib/crm-handlers';
import { apiError, apiSuccess } from '@/lib/api-error';
import { normalizePhone } from '@/lib/whatsapp';
import { dateKeyForTimestamp, RETENTION_DAYS } from '@/lib/qrWhatsappArchive';

export const dynamic = 'force-dynamic';

function normalizeConnectedPhone(value: string): string {
  return normalizePhone(String(value || '').split(':')[0].split('@')[0]);
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

async function loadBunnyArchive(
  userId: string,
  connectedPhone: string,
  chatJid: string,
  sinceDateKey: string,
  untilDateKey: string
): Promise<any[]> {
  const entries: any[] = await listBunnyQrArchiveManifest({ userId, connectedPhone, chatJid, sinceDateKey, untilDateKey });
  const files = await Promise.allSettled(
    entries.map((e) => e?.bunnyPath || e?.bunny_path).filter(Boolean).map(async (path: string) => {
      const { buffer } = await fetchFromStorage(path);
      return JSON.parse(buffer.toString('utf-8')) as any[];
    })
  );
  return files.flatMap((f) => (f.status === 'fulfilled' && Array.isArray(f.value) ? f.value : []));
}

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.split('Bearer ')[1];
    if (!token) return apiError('Unauthorized', 401);

    const decoded = verifyToken(token);
    if (!decoded || !decoded.isAdmin) return apiError('Unauthorized', 401);

    const userId = getViewerUserId(decoded);

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

    const beforeSeconds = before ? Math.floor(parseInt(before) / 1000) : undefined;

    // Stored history is optional: the inbox merges live bridge messages, so a
    // storage outage must degrade to an empty result instead of a 500.
    let messages: any[] = [];
    let source = 'bunny';
    try {
      messages = await withTimeout(
        listBunnyQrMessages({ userId, connectedPhone, chatJid, limit, before: beforeSeconds }),
        6000,
        'Stored message lookup'
      );
    } catch (dbErr: any) {
      console.warn('[QR Messages API] Stored history unavailable (non-fatal):', dbErr?.message);
      source = 'unavailable';
    }

    let combined = messages;

    // Hot Bunny SQL rows may not cover older history — pull the rest from
    // the Bunny Storage archive instead of returning empty.
    if (messages.length < limit) {
      try {
        const untilTs = beforeSeconds || Math.floor(Date.now() / 1000);
        const untilDateKey = dateKeyForTimestamp(untilTs);
        const sinceDateKey = dateKeyForTimestamp(Math.max(
          untilTs - 30 * 24 * 60 * 60,
          Math.floor(Date.now() / 1000) - RETENTION_DAYS * 24 * 60 * 60
        ));
        const archived = await withTimeout(
          loadBunnyArchive(userId, connectedPhone, chatJid, sinceDateKey, untilDateKey),
          6000,
          'Archive lookup'
        );
        const filtered = archived.filter((m) => !beforeSeconds || m.timestamp < beforeSeconds);
        if (filtered.length) {
          source = source === 'unavailable' ? 'archive' : 'bunny+archive';
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
