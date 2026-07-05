/**
 * QR WhatsApp Queue Processor
 * Runs every 5 minutes — sends queued messages once allowed hours begin (5 AM IST)
 * Messages queued after 10:30 PM are held here and sent at 5 AM
 */

import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/db';
import { isQRSendAllowed } from '@/lib/qrTimeGuard';
import { resolveQrTenantBridge, isQrTenantConnected, qrTenantHeaders } from '@/lib/qrTenantBridge';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export async function GET(req: NextRequest) {
  // Vercel Cron sends "Authorization: Bearer {CRON_SECRET}" — strip the prefix before comparing
  const rawAuth = req.headers.get('authorization') || '';
  const cronSecret =
    rawAuth.replace(/^Bearer\s+/i, '').trim() ||
    req.nextUrl.searchParams.get('secret') ||
    '';
  const expectedSecret = process.env.CRON_SECRET || '';
  if (expectedSecret && cronSecret !== expectedSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Only process when inside allowed hours (5 AM – 10:30 PM IST)
  if (!isQRSendAllowed()) {
    return NextResponse.json({
      success: true,
      note: 'Outside allowed hours — queue held until 5:00 AM IST',
      processed: 0,
    });
  }

  await connectDB();
  const db = mongoose.connection.getClient().db(process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm');
  const queueCol = db.collection('qr_message_queue');
  await Promise.all([
    queueCol.createIndex({ status: 1, sendAt: 1 }),
    queueCol.createIndex({ sessionKey: 1, status: 1, sendAt: 1 }),
  ]);

  // Find pending messages whose sendAt has passed
  const pendingCandidates = await queueCol.find({
    status: 'pending',
    sendAt: { $lte: new Date() },
  }).sort({ sendAt: 1 }).limit(500).toArray();
  const perTenant = new Map<string, any>();
  for (const message of pendingCandidates) {
    const key = String(message.sessionKey || message.userId || '');
    if (key && !perTenant.has(key)) perTenant.set(key, message);
  }
  const pending = Array.from(perTenant.values()).slice(0, 100);

  if (pending.length === 0) {
    return NextResponse.json({ success: true, processed: 0, note: 'No queued messages' });
  }

  let sent = 0;
  let failed = 0;

  await Promise.all(pending.map(async (msg) => {
    try {
      const claim = await queueCol.findOneAndUpdate(
        { _id: msg._id, status: 'pending' },
        { $set: { status: 'sending', processingStartedAt: new Date() } },
        { returnDocument: 'after' }
      );
      if (!claim) return;
      // Get session info for this user
      const sessionInfo = await resolveQrTenantBridge(msg.userId || 'admincrm', msg.sessionKey);
      if (!sessionInfo || !(await isQrTenantConnected(sessionInfo))) {
        console.warn(`[QR Queue] No session for user ${msg.userId}`);
        await queueCol.updateOne({ _id: msg._id }, { $set: { status: 'pending', lastError: 'QR session disconnected' }, $unset: { processingStartedAt: 1 } });
        return;
      }

      const headers = qrTenantHeaders(sessionInfo);

      const payload: any = { to: msg.to };
      if (msg.type === 'image' && msg.url) {
        payload.type = 'media';
        payload.media = msg.url;
        payload.caption = msg.message;
      } else {
        payload.type = 'text';
        payload.message = msg.message;
      }

      const res = await fetch(`${sessionInfo.url}/send`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok && data?.success !== false) {
        const waMessageId = String(data?.messageId || data?.id || data?.key?.id || `queue-${msg._id}`);
        await queueCol.updateOne(
          { _id: msg._id },
          { $set: { status: 'sent', sentAt: new Date(), waMessageId }, $unset: { processingStartedAt: 1, lastError: 1 } }
        );
        const rawJid = String(msg.to || '');
        const chatJid = rawJid.includes('@') ? rawJid.replace('@c.us', '@s.whatsapp.net') : `${rawJid.replace(/\D/g, '')}@s.whatsapp.net`;
        const timestamp = Math.floor(Date.now() / 1000);
        if (sessionInfo.connectedPhone && chatJid) {
          await db.collection('qr_whatsapp_messages').updateOne(
            { userId: msg.userId, connectedPhone: sessionInfo.connectedPhone, chatJid, messageId: waMessageId },
            { $set: { userId: msg.userId, connectedPhone: sessionInfo.connectedPhone, chatJid, messageId: waMessageId, direction: 'outbound', fromMe: true, text: msg.message || '', type: msg.type === 'image' ? 'image' : 'text', timestamp, status: 1, hasMedia: msg.type === 'image', mediaUrl: msg.url || '', metadata: { sessionKey: sessionInfo.sessionKey, tenantId: sessionInfo.tenantId, queueId: String(msg._id) } }, $setOnInsert: { createdAt: new Date() } },
            { upsert: true }
          );
          await db.collection('qr_whatsapp_chats').updateOne(
            { userId: msg.userId, connectedPhone: sessionInfo.connectedPhone, chatJid },
            { $set: { userId: msg.userId, connectedPhone: sessionInfo.connectedPhone, chatJid, lastMessage: msg.message || '[media]', lastMessageTime: new Date(), lastMessageFromMe: true, conversationTimestamp: timestamp }, $setOnInsert: { name: chatJid.split('@')[0], isGroup: chatJid.endsWith('@g.us'), unreadCount: 0, pinned: false, archived: false, profilePicUrl: '', createdAt: new Date() } },
            { upsert: true }
          );
        }
        sent++;
        console.log(`[QR Queue] ✅ Sent queued message to ${msg.to}`);
      } else {
        await queueCol.updateOne(
          { _id: msg._id },
          { $set: { status: 'failed', error: data?.error || `HTTP ${res.status}`, failedAt: new Date() } }
        );
        failed++;
        console.error(`[QR Queue] ✗ Failed for ${msg.to}: ${data?.error}`);
      }

    } catch (err: any) {
      await queueCol.updateOne(
        { _id: msg._id },
        { $set: { status: 'failed', error: err.message, failedAt: new Date() } }
      );
      failed++;
    }
  }));

  return NextResponse.json({
    success: true,
    processed: pending.length,
    sent,
    failed,
    timestamp: new Date().toISOString(),
  });
}
