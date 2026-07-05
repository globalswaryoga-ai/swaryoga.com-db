/**
 * QR WhatsApp Messages API — Fetch messages from MongoDB persistent storage
 *
 * ✅ FIXED VERSION
 *
 * GET /api/admin/crm/whatsapp/qr/messages?chatJid=xxx&limit=50
 *
 * Returns messages for a specific chat from WhatsAppMessage collection.
 * Only returns messages for the CURRENT chat JID (session isolation).
 *
 * Security: Requires admin auth token (same as other CRM endpoints)
 *
 * FIXES:
 * - Changed from getQrWhatsAppMessage() to getWhatsAppMessage() [correct collection]
 * - Query uses phoneNumber field (as saved by webhook)
 * - Uses sentAt field for sorting/pagination
 * - Maps direction field to fromMe boolean
 * - Handles messageContent field from schema
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { getWhatsAppMessage } from '@/lib/schemas/enterpriseSchemas';  // ✅ FIXED: Was getQrWhatsAppMessage
import { verifyToken } from '@/lib/auth';
import { getViewerUserId } from '@/lib/crm-handlers';
import { apiError, apiSuccess } from '@/lib/api-error';

export const dynamic = 'force-dynamic';

/**
 * Extract phone number from WhatsApp JID
 * e.g., "919309986820@c.us" -> "919309986820"
 */
function extractPhoneFromJid(jid: string): string {
  return String(jid || '').split('@')[0].split(':')[0].replace(/\D/g, '').slice(-10);
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
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 500);
    const before = searchParams.get('before'); // timestamp for pagination (optional)

    if (!chatJid) {
      return apiError('Missing chatJid', 400);
    }

    // ✅ FIXED: Use correct collection that webhook actually saves to
    const WhatsAppMessage = getWhatsAppMessage();

    // Extract phone number from JID format
    const phoneNumber = extractPhoneFromJid(chatJid);

    if (!phoneNumber) {
      return apiError('Invalid chatJid format', 400);
    }

    // ✅ FIXED: Build query using actual saved fields
    const query: any = {
      phoneNumber,  // ✅ This field IS saved by webhook
      // Note: No userId/connectedPhone filters - webhook doesn't save these
      // Frontend handles session isolation via connected phone in page.tsx
    };

    // ✅ FIXED: Handle pagination using sentAt field (not timestamp)
    if (before) {
      query.sentAt = { $lt: new Date(parseInt(before)) };
    }

    // ✅ FIXED: Query from WhatsAppMessage collection, sort by sentAt
    const messages = await WhatsAppMessage.find(query)
      .sort({ sentAt: -1 })  // Most recent first for pagination, will reverse in frontend
      .limit(limit)
      .lean();

    // ✅ FIXED: Map WhatsAppMessage schema fields to MessageItem format
    return apiSuccess({
      messages: messages.map((m: any) => ({
        id: m._id?.toString() || m.id || '',
        from: m.phoneNumber + '@c.us',
        // ✅ FIXED: Use direction field instead of looking for fromMe
        fromMe: m.direction === 'outbound',
        // ✅ FIXED: Use messageContent field
        text: m.messageContent || m.body || m.text || '',
        // ✅ FIXED: Use messageType field
        type: m.messageType || m.type || 'text',
        // ✅ FIXED: Use sentAt and convert to timestamp
        timestamp: m.sentAt ? new Date(m.sentAt).getTime() : (m.timestamp || 0),
        // Status: 0 = sent (outbound), 1 = delivered, 2 = read
        status: m.status === 'sent' ? 1 : m.status === 'received' ? 0 : 0,
        participant: m.phoneNumber,
        pushName: m.contactName || '',  // Not available in this schema
        hasMedia: m.hasMedia || !!m.media?.url || false,
        // ✅ FIXED: Handle nested media object
        mediaUrl: m.media?.url || m.mediaUrl || null,
        mediaMimetype: m.media?.mimeType || m.mediaMimetype || null,
        mediaFileName: m.mediaFileName || null,
        quoted: null,  // Not in schema
        quotedId: m.quotedId || null,
        reactions: {},  // Not in schema
      })),
      source: 'mongodb',
      phoneNumber,
      count: messages.length,
      // Return pagination info
      ...(messages.length === limit && {
        hasMore: true,
        nextBefore: messages[messages.length - 1]?.sentAt?.getTime(),
      }),
    });
  } catch (err: any) {
    console.error('[QR Messages API]', err.message);
    return apiError(err.message, 500);
  }
}
