import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import {
  verifyAdminAccess,
  parsePagination,
  buildFilter,
  handleCrmError,
  formatCrmSuccess,
  buildMetadata,
  isValidObjectId,
  toObjectId,
} from '@/lib/crm-handlers';
import { WhatsAppMessage, Lead } from '@/lib/schemas/enterpriseSchemas';
import { ConsentManager } from '@/lib/consentManager';
import { AuditLogger } from '@/lib/auditLogger';
import { normalizePhone, sendWhatsAppText } from '@/lib/whatsapp';

/**
 * WhatsApp message management - REFACTORED
 * GET: Fetch messages with filtering
 * POST: Send a message
 * PUT: Update message (retry, mark as read)
 * DELETE: Delete message
 */

export async function GET(request: NextRequest) {
  try {
    verifyAdminAccess(request);
    const { limit, skip } = parsePagination(request);
    const url = new URL(request.url);

    await connectDB();

    // Build filter from query parameters
    const filterParams = {
      leadId: url.searchParams.get('leadId') || undefined,
      phoneNumber: url.searchParams.get('phoneNumber') || undefined,
      status: url.searchParams.get('status') || undefined,
      direction: url.searchParams.get('direction') || undefined,
    };
    const filter: any = buildFilter(filterParams);

    // Add date range filter
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');
    if (startDate || endDate) {
      filter.sentAt = {};
      if (startDate) filter.sentAt.$gte = new Date(startDate);
      if (endDate) filter.sentAt.$lte = new Date(endDate);
    }

    const messages = await WhatsAppMessage.find(filter)
      .sort({ sentAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('leadId', 'name phoneNumber')
      .lean();

    const total = await WhatsAppMessage.countDocuments(filter);
    const meta = buildMetadata(total, limit, skip);

    return formatCrmSuccess({ messages, total }, meta);
  } catch (error) {
    return handleCrmError(error, 'GET messages');
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = verifyAdminAccess(request);
    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { leadId, phoneNumber, messageContent, templateId, messageType } = body;

    if (!leadId || !phoneNumber || !messageContent) {
      return NextResponse.json({ error: 'Missing: leadId, phoneNumber, messageContent' }, { status: 400 });
    }

    if (!isValidObjectId(String(leadId))) {
      return NextResponse.json({ error: 'Invalid leadId' }, { status: 400 });
    }

    await connectDB();

    // Verify lead exists
    const lead = await Lead.findById(leadId);
    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    const to = normalizePhone(String(phoneNumber));
    const leadPhone = normalizePhone(String((lead as any).phoneNumber || ''));
    if (!to) {
      return NextResponse.json({ error: 'Invalid phoneNumber' }, { status: 400 });
    }

    // Safety: prevent accidental sends to a number that doesn't match the lead record.
    if (leadPhone && to !== leadPhone) {
      return NextResponse.json(
        { error: 'phoneNumber does not match lead phoneNumber' },
        { status: 400 }
      );
    }

    // Consent / opt-out compliance
    const compliance = await ConsentManager.validateCompliance(to);
    if (!compliance.compliant) {
      return NextResponse.json(
        { error: compliance.reason || 'User has opted out or is blocked' },
        { status: 403 }
      );
    }

    // Create message record
    const now = new Date();
    const normalizedType = String(messageType || 'text');
    const message = await WhatsAppMessage.create({
      leadId,
      phoneNumber: to,
      messageContent: String(messageContent),
      direction: 'outbound',
      messageType: normalizedType,
      status: 'queued',
      sentBy: userId,
      sentAt: now,
      templateId: templateId || undefined,
      retryCount: 0,
    });

    // Update lead's lastMessageAt
    await Lead.updateOne({ _id: leadId }, { $set: { lastMessageAt: now } });

    // Send immediately for text messages.
    // For template/media/interactive, we still record the message as queued for now.
    if (normalizedType === 'text') {
      try {
        const apiResult = await sendWhatsAppText(to, String(messageContent).trim());
        await WhatsAppMessage.updateOne(
          { _id: message._id },
          {
            $set: {
              status: 'sent',
              waMessageId: apiResult.waMessageId,
              updatedAt: new Date(),
            },
            $unset: {
              failureReason: 1,
              nextRetryAt: 1,
            },
          }
        );

        if (isValidObjectId(String(userId))) {
          await AuditLogger.log({
            userId: String(userId),
            actionType: 'message_send',
            resourceType: 'whatsapp_message',
            resourceId: String(message._id),
            description: `Sent WhatsApp message to ${to}`,
            metadata: { to, waMessageId: apiResult.waMessageId },
          });
        }

        const updated = await WhatsAppMessage.findById(message._id).lean();
        return formatCrmSuccess(updated || message);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'WhatsApp send failed';
        await WhatsAppMessage.updateOne(
          { _id: message._id },
          {
            $set: {
              status: 'failed',
              failureReason: String(msg),
              updatedAt: new Date(),
            },
          }
        );

        // Bubble up a clear error for the UI.
        const status = typeof (err as any)?.status === 'number' ? (err as any).status : 502;
        return NextResponse.json({ error: msg }, { status });
      }
    }

    return formatCrmSuccess(message);
  } catch (error) {
    return handleCrmError(error, 'POST message');
  }
}

export async function PUT(request: NextRequest) {
  try {
    const userId = verifyAdminAccess(request);
    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { messageId, action, ...updates } = body;

    if (!messageId) {
      return NextResponse.json({ error: 'Missing: messageId' }, { status: 400 });
    }

    if (!isValidObjectId(String(messageId))) {
      return NextResponse.json({ error: 'Invalid messageId' }, { status: 400 });
    }

    await connectDB();

    if (action === 'markAsRead') {
      const message = await WhatsAppMessage.findByIdAndUpdate(
        messageId,
        { $set: { status: 'read', readAt: new Date() } },
        { new: true }
      );
      if (!message) {
        return NextResponse.json({ error: 'Message not found' }, { status: 404 });
      }
      return formatCrmSuccess(message);
    } else if (action === 'retry') {
      const message = await WhatsAppMessage.findById(messageId);
      if (!message) return NextResponse.json({ error: 'Message not found' }, { status: 404 });

      if (String(message.messageType || 'text') !== 'text') {
        return NextResponse.json({ error: 'Retry currently supported only for text messages' }, { status: 400 });
      }

      if (!message.messageContent) {
        return NextResponse.json({ error: 'Message content missing' }, { status: 400 });
      }

      const maxRetries = typeof message.maxRetries === 'number' ? message.maxRetries : 3;
      const retryCount = typeof message.retryCount === 'number' ? message.retryCount : 0;
      if (retryCount >= maxRetries) {
        return NextResponse.json({ error: 'Max retries exceeded' }, { status: 400 });
      }

      const to = normalizePhone(String(message.phoneNumber));
      const compliance = await ConsentManager.validateCompliance(to);
      if (!compliance.compliant) {
        await WhatsAppMessage.updateOne(
          { _id: message._id },
          {
            $set: {
              status: 'failed',
              failureReason: compliance.reason || 'User has opted out or is blocked',
              updatedAt: new Date(),
            },
            $inc: { retryCount: 1 },
          }
        );
        return NextResponse.json(
          { error: compliance.reason || 'User has opted out or is blocked' },
          { status: 403 }
        );
      }

      try {
        const apiResult = await sendWhatsAppText(to, String(message.messageContent).trim());
        const updated = await WhatsAppMessage.findByIdAndUpdate(
          messageId,
          {
            $set: {
              status: 'sent',
              waMessageId: apiResult.waMessageId,
              updatedAt: new Date(),
            },
            $unset: {
              failureReason: 1,
              nextRetryAt: 1,
            },
            $inc: { retryCount: 1 },
          },
          { new: true }
        );

        if (updated && isValidObjectId(String(userId))) {
          await AuditLogger.log({
            userId: String(userId),
            actionType: 'message_send',
            resourceType: 'whatsapp_message',
            resourceId: String(updated._id),
            description: `Retried WhatsApp message to ${to}`,
            metadata: { to, waMessageId: apiResult.waMessageId },
          });
        }

        return formatCrmSuccess(updated || message);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'WhatsApp send failed';
        const updated = await WhatsAppMessage.findByIdAndUpdate(
          messageId,
          {
            $set: {
              status: 'failed',
              failureReason: String(msg),
              nextRetryAt: new Date(),
              updatedAt: new Date(),
            },
            $inc: { retryCount: 1 },
          },
          { new: true }
        );

        const status = typeof (err as any)?.status === 'number' ? (err as any).status : 502;
        return NextResponse.json({ error: msg, data: updated }, { status });
      }
    } else {
      // Generic update
      const message = await WhatsAppMessage.findByIdAndUpdate(
        messageId,
        { $set: updates },
        { new: true }
      );
      if (!message) {
        return NextResponse.json({ error: 'Message not found' }, { status: 404 });
      }
      return formatCrmSuccess(message);
    }
  } catch (error) {
    return handleCrmError(error, 'PUT message');
  }
}

export async function DELETE(request: NextRequest) {
  try {
    verifyAdminAccess(request);
    const url = new URL(request.url);
    const messageId = url.searchParams.get('messageId');

    if (!messageId) {
      return NextResponse.json({ error: 'messageId parameter required' }, { status: 400 });
    }

    if (!isValidObjectId(messageId)) {
      return NextResponse.json({ error: 'Invalid messageId' }, { status: 400 });
    }

    await connectDB();

    const result = await WhatsAppMessage.findByIdAndDelete(messageId);

    if (!result) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    return formatCrmSuccess({ deleted: true });
  } catch (error) {
    return handleCrmError(error, 'DELETE message');
  }
}
