export const dynamic = 'force-dynamic';
/**
 * QR WhatsApp Sync API — Bridge → MongoDB persistent storage
 * 
 * POST /api/admin/crm/whatsapp/qr/sync
 * 
 * Called by the Baileys bridge to persist messages and chat metadata to MongoDB.
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
import { connectDB } from '@/lib/db';
import { getQrWhatsAppMessage, getQrWhatsAppChat } from '@/lib/schemas/enterpriseSchemas';

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

    await connectDB();
    const body = await req.json();
    const { action, userId, connectedPhone, messages, chats } = body;

    if (!userId || !connectedPhone) {
      return NextResponse.json({ error: 'Missing userId or connectedPhone' }, { status: 400 });
    }

    const result: any = { success: true };

    // ── Sync Messages ──
    if ((action === 'sync_messages' || action === 'sync_all') && messages?.length > 0) {
      const QrMsg = getQrWhatsAppMessage();
      const ops = messages.map((m: any) => ({
        updateOne: {
          filter: { userId, connectedPhone, messageId: m.messageId, chatJid: m.chatJid },
          update: {
            $set: {
              userId,
              connectedPhone,
              chatJid: m.chatJid,
              messageId: m.messageId,
              direction: m.fromMe ? 'outbound' : 'inbound',
              fromMe: m.fromMe || false,
              text: m.text || '',
              type: m.type || 'text',
              participant: m.participant || '',
              pushName: m.pushName || '',
              timestamp: m.timestamp || 0,
              status: m.status || 0,
              hasMedia: m.hasMedia || false,
              mediaUrl: m.mediaUrl || '',
              mediaMimetype: m.mediaMimetype || '',
              mediaFileName: m.mediaFileName || '',
              quotedId: m.quotedId || '',
              quotedText: m.quotedText || '',
              quotedParticipant: m.quotedParticipant || '',
            },
            $setOnInsert: { createdAt: new Date() },
          },
          upsert: true,
        },
      }));

      // Process in batches of 500
      const BATCH = 500;
      let upserted = 0;
      let modified = 0;
      for (let i = 0; i < ops.length; i += BATCH) {
        const batch = ops.slice(i, i + BATCH);
        const res = await QrMsg.bulkWrite(batch, { ordered: false });
        upserted += res.upsertedCount || 0;
        modified += res.modifiedCount || 0;
      }
      result.messages = { total: messages.length, upserted, modified };
    }

    // ── Sync Chats ──
    if ((action === 'sync_chats' || action === 'sync_all') && chats?.length > 0) {
      const QrChat = getQrWhatsAppChat();
      const chatOps = chats.map((c: any) => ({
        updateOne: {
          filter: { userId, connectedPhone, chatJid: c.chatJid || c.id },
          update: {
            $set: {
              userId,
              connectedPhone,
              chatJid: c.chatJid || c.id,
              name: c.name || '',
              isGroup: c.isGroup || false,
              lastMessage: c.lastMessage || '',
              lastMessageTime: c.lastMessageTime ? new Date(c.lastMessageTime) : null,
              lastMessageFromMe: c.lastMessageFromMe || false,
              unreadCount: c.unreadCount || 0,
              conversationTimestamp: c.conversationTimestamp || 0,
              pinned: c.pinned || false,
              archived: c.archived || false,
            },
            $setOnInsert: { createdAt: new Date() },
          },
          upsert: true,
        },
      }));

      const BATCH = 500;
      let upserted = 0;
      let modified = 0;
      for (let i = 0; i < chatOps.length; i += BATCH) {
        const batch = chatOps.slice(i, i + BATCH);
        const res = await QrChat.bulkWrite(batch, { ordered: false });
        upserted += res.upsertedCount || 0;
        modified += res.modifiedCount || 0;
      }
      result.chats = { total: chats.length, upserted, modified };
    }

    return NextResponse.json(result);
  } catch (err: any) {
    console.error('[QR Sync]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
