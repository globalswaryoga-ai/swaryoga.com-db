/**
 * QR WhatsApp Health Report API
 *
 * GET /api/admin/crm/whatsapp/qr/health-stats?period=month
 *
 * Returns comprehensive inbound/outbound message statistics for all connected channels
 * Includes health scores, message breakdowns by type, and daily activity
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { getViewerUserId } from '@/lib/crm-handlers';
import { getQrWhatsAppMessage, getQrWhatsAppChat } from '@/lib/schemas/enterpriseSchemas';
import { apiError, apiSuccess } from '@/lib/api-error';

export const dynamic = 'force-dynamic';

type TimePeriod = 'today' | 'week' | 'month' | 'year' | 'all';

function getDateRange(period: TimePeriod): { startTime: number; endTime: number } {
  const now = new Date();
  const endTime = now.getTime();
  let startTime: number;

  switch (period) {
    case 'today':
      const today = new Date(now);
      today.setHours(0, 0, 0, 0);
      startTime = today.getTime();
      break;
    case 'week':
      startTime = endTime - 7 * 24 * 60 * 60 * 1000;
      break;
    case 'month':
      startTime = endTime - 30 * 24 * 60 * 60 * 1000;
      break;
    case 'year':
      startTime = endTime - 365 * 24 * 60 * 60 * 1000;
      break;
    case 'all':
      startTime = 0;
      break;
    default:
      startTime = endTime - 30 * 24 * 60 * 60 * 1000;
  }

  return { startTime, endTime };
}

function calculateHealthScore(stats: {
  inboundMessages: number;
  outboundMessages: number;
  failedMessages?: number;
  daysSinceLastMessage?: number;
  isConnected: boolean;
}): number {
  let score = 100;

  if (!stats.isConnected) return 0;

  // Penalize no messages
  if (stats.inboundMessages === 0 && stats.outboundMessages === 0) {
    score -= 50;
  }

  // Penalize imbalance (too much inbound or outbound)
  const total = stats.inboundMessages + stats.outboundMessages;
  if (total > 0) {
    const inboundRatio = stats.inboundMessages / total;
    if (inboundRatio < 0.1 || inboundRatio > 0.9) {
      score -= 15;
    }
  }

  // Penalize old conversations
  if (stats.daysSinceLastMessage && stats.daysSinceLastMessage > 30) {
    score -= Math.min(30, stats.daysSinceLastMessage - 30);
  }

  // Penalize failed messages
  if (stats.failedMessages && stats.failedMessages > 0) {
    const failureRate = stats.failedMessages / (stats.failedMessages + (stats.outboundMessages || 1));
    score -= Math.round(failureRate * 20);
  }

  return Math.max(0, Math.min(100, score));
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
    const period = (searchParams.get('period') || 'month') as TimePeriod;
    const { startTime, endTime } = getDateRange(period);

    const QrMsg = getQrWhatsAppMessage();
    const QrChat = getQrWhatsAppChat();

    // Get all unique connected phones for this user
    const chats = await QrChat.find({ userId }).lean();
    const uniquePhones = new Set<string>();
    chats.forEach((chat: any) => {
      if (chat.connectedPhone) uniquePhones.add(chat.connectedPhone);
    });

    // Get all messages in the time period
    const messages = await QrMsg.find({
      userId,
      timestamp: { $gte: startTime, $lte: endTime },
    }).lean();

    // Group statistics by phone
    const phoneStats: Record<string, any> = {};

    for (const phone of uniquePhones) {
      const phoneMessages = messages.filter((m: any) => m.connectedPhone === phone);
      const phoneChats = chats.filter((c: any) => c.connectedPhone === phone);

      const inboundMessages = phoneMessages.filter((m: any) => !m.fromMe).length;
      const outboundMessages = phoneMessages.filter((m: any) => m.fromMe).length;

      // Message types breakdown
      const messagesByType: Record<string, number> = {};
      phoneMessages.forEach((m: any) => {
        const type = m.type || 'text';
        messagesByType[type] = (messagesByType[type] || 0) + 1;
      });

      // Find chats with inbound and outbound separately
      const inboundChats = new Set<string>();
      const outboundChats = new Set<string>();
      phoneMessages.forEach((m: any) => {
        if (!m.fromMe) inboundChats.add(m.chatJid);
        if (m.fromMe) outboundChats.add(m.chatJid);
      });

      // Last message time
      const lastMessage = phoneMessages.sort((a: any, b: any) => b.timestamp - a.timestamp)[0];
      const lastMessageTime = lastMessage ? new Date(lastMessage.timestamp).toISOString() : null;
      const daysSinceLastMessage = lastMessage
        ? Math.floor((Date.now() - lastMessage.timestamp) / (1000 * 60 * 60 * 24))
        : null;

      // Daily breakdown
      const dailyMap: Record<string, { inbound: number; outbound: number }> = {};
      phoneMessages.forEach((m: any) => {
        const date = new Date(m.timestamp).toLocaleDateString('en-IN');
        if (!dailyMap[date]) dailyMap[date] = { inbound: 0, outbound: 0 };
        if (m.fromMe) {
          dailyMap[date].outbound++;
        } else {
          dailyMap[date].inbound++;
        }
      });

      const dailyBreakdown = Object.entries(dailyMap).map(([date, data]) => ({
        date,
        inbound: data.inbound,
        outbound: data.outbound,
        total: data.inbound + data.outbound,
      }));

      // Calculate health score
      const healthScore = calculateHealthScore({
        inboundMessages,
        outboundMessages,
        daysSinceLastMessage: daysSinceLastMessage || 0,
        isConnected: true,
      });

      phoneStats[phone] = {
        phone,
        name: phoneChats[0]?.name || undefined,
        status: 'connected' as const,
        connectedAt: phoneChats[0]?.createdAt,
        totalMessages: phoneMessages.length,
        inboundMessages,
        outboundMessages,
        inboundChats: inboundChats.size,
        outboundChats: outboundChats.size,
        totalChats: phoneChats.length,
        lastMessageTime,
        daysSinceLastMessage,
        avgMessagesPerChat: phoneChats.length > 0 ? Math.round(phoneMessages.length / phoneChats.length) : 0,
        messagesByType,
        dailyBreakdown,
        healthScore,
      };
    }

    const channels = Object.values(phoneStats);

    return apiSuccess({
      period,
      dateRange: { startTime: new Date(startTime).toISOString(), endTime: new Date(endTime).toISOString() },
      channels,
      summary: {
        totalChannels: channels.length,
        connectedChannels: channels.filter((c: any) => c.status === 'connected').length,
        totalMessages: channels.reduce((sum: number, c: any) => sum + c.totalMessages, 0),
        totalInbound: channels.reduce((sum: number, c: any) => sum + c.inboundMessages, 0),
        totalOutbound: channels.reduce((sum: number, c: any) => sum + c.outboundMessages, 0),
        totalChats: channels.reduce((sum: number, c: any) => sum + c.totalChats, 0),
        averageHealthScore: channels.length > 0
          ? Math.round(channels.reduce((sum: number, c: any) => sum + c.healthScore, 0) / channels.length)
          : 0,
      },
    });
  } catch (err: any) {
    console.error('[QR Health Stats API]', err.message);
    return apiError(err.message, 500);
  }
}
