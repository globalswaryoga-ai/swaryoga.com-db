/**
 * QR WhatsApp Messages API — Fetch messages from MongoDB persistent storage
 * 
 * GET /api/admin/crm/whatsapp/qr/messages?chatJid=xxx&connectedPhone=yyy&limit=50&before=timestamp
 * 
 * Returns messages for a specific chat, filtered by connectedPhone (session isolation).
 * Only returns messages for the CURRENT connected phone number — old sessions never leak.
 * 
 * Security: Requires admin auth token (same as other CRM endpoints)
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { getQrWhatsAppMessage, getQrWhatsAppChat } from '@/lib/schemas/enterpriseSchemas';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin, getViewerUserId } from '@/lib/crm-handlers';
import { apiError, apiSuccess } from '@/lib/api-error';

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
    const connectedPhone = searchParams.get('connectedPhone');
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 500);
    const before = searchParams.get('before'); // timestamp for pagination

    if (!chatJid || !connectedPhone) {
      return apiError('Missing chatJid or connectedPhone', 400);
    }

    const QrMsg = getQrWhatsAppMessage();

    // Build query — session isolation by connectedPhone
    const query: any = {
      userId,
      connectedPhone,
      chatJid,
    };

    if (before) {
      query.timestamp = { $lt: parseInt(before) };
    }

    const messages = await QrMsg.find(query)
      .sort({ timestamp: 1 }) // oldest first for chat view
      .limit(limit)
      .lean();

    return apiSuccess({
      messages: messages.map((m: any) => ({
        id: m.messageId,
        from: m.participant || m.chatJid,
        fromMe: m.fromMe,
        text: m.text,
        type: m.type,
        timestamp: m.timestamp,
        status: m.status,
        participant: m.participant,
        pushName: m.pushName,
        hasMedia: m.hasMedia,
        mediaUrl: m.mediaUrl,
        mediaMimetype: m.mediaMimetype,
        mediaFileName: m.mediaFileName,
        quoted: m.quotedId ? { id: m.quotedId, text: m.quotedText, participant: m.quotedParticipant } : null,
        quotedId: m.quotedId || null,
        reactions: {},
      })),
      source: 'mongodb',
      connectedPhone,
    });
  } catch (err: any) {
    console.error('[QR Messages API]', err.message);
    return apiError(err.message, 500);
  }
}

/**
 * GET /api/admin/crm/whatsapp/qr/messages/chats — Fetch chat list from MongoDB
 * (Alternative to bridge /chats when bridge memory is empty)
 */
