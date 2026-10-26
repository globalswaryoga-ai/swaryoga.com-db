export const dynamic = 'force-dynamic';
/**
 * QR WhatsApp Sync API — Bridge → Bunny Database persistent storage
 * 
 * POST /api/admin/crm/whatsapp/qr/sync
 * 
 * Called by the Baileys bridge to persist messages and chat metadata to Bunny Database.
 * This ensures messages survive bridge restarts and provides phone session isolation.
 * 
 * Actions:
 * - sync_messages: Persist batch of messages (from messages.upsert or history sync)
 * - sync_chats: Persist chat metadata (from chats.upsert/update or history sync)
 * - sync_all: Persist both messages and chats in one call
 * 
 * Security: Uses bridge secret header (same as qr-bridge proxy)
 */

import { NextRequest, NextResponse } from 'next/server';
import { saveQrMessageToBunny, saveQrChatToBunny, initBunnyQrWhatsAppSchema } from '@/lib/bunnyQrWhatsAppRepository';

const BRIDGE_SECRET = process.env.WHATSAPP_BRIDGE_SECRET || process.env.NEXT_PUBLIC_WHATSAPP_BRIDGE_SECRET || '';

function authCheck(req: NextRequest): boolean {
  const secret = req.headers.get('x-bridge-secret') || '';
  return secret === BRIDGE_SECRET && BRIDGE_SECRET.length > 0;
}

export async function POST(req: NextRequest) {
  try {
    if (!authCheck(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { action, userId, connectedPhone, messages, chats } = body;

    if (!userId || !connectedPhone) {
      return NextResponse.json({ error: 'Missing userId or connectedPhone' }, { status: 400 });
    }

    await initBunnyQrWhatsAppSchema();
    const result: any = { success: true };

    // ── Sync Messages ──
    if ((action === 'sync_messages' || action === 'sync_all') && messages?.length > 0) {
      let saved = 0;
      for (const m of messages) {
        try {
          await saveQrMessageToBunny({
            ...m,
            userId,
            connectedPhone
          });
          saved++;
        } catch (mErr: any) {
          // Continue with remaining messages
        }
      }
      result.messages = { total: messages.length, saved };
    }

    // ── Sync Chats ──
    if ((action === 'sync_chats' || action === 'sync_all') && chats?.length > 0) {
      let saved = 0;
      for (const c of chats) {
        try {
          await saveQrChatToBunny({
            ...c,
            userId,
            connectedPhone,
            chatJid: c.chatJid || c.id
          });
          saved++;
        } catch (cErr: any) {
          // Continue with remaining chats
        }
      }
      result.chats = { total: chats.length, saved };
    }

    return NextResponse.json(result);
  } catch (err: any) {
    console.error('[QR Sync Bunny]', err?.message || err);
    return NextResponse.json({ error: err?.message || 'Sync error' }, { status: 500 });
  }
}
