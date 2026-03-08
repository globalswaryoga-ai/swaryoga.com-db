import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import {
  verifyAdminAccess,
  parsePagination,
  buildFilter,
  handleCrmError,
  formatCrmSuccess,
  buildMetadata,
  isValidObjectId,
  toObjectId,
  normalizePhone,
} from '@/lib/crm-handlers';
import { getLead, getWhatsAppMessage } from '@/lib/schemas/enterpriseSchemas';
import { ConsentManager } from '@/lib/consentManager';
import { AuditLogger } from '@/lib/auditLogger';
import { sendWhatsAppText, sendWhatsAppMedia } from '@/lib/whatsapp';

/**
 * WhatsApp message management - REFACTORED
 * GET: Fetch messages with filtering
 * POST: Send a message
 * PUT: Update message (retry, mark as read)
 * DELETE: Delete message
 */

// Mark this route as dynamic (uses request.url for filtering)
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const Lead = getLead();
    const WhatsAppMessage = getWhatsAppMessage();

    const viewerUserId = verifyAdminAccess(request);
    const superAdmin = viewerUserId === 'admincrm' || viewerUserId === 'admin';
    const { limit, skip } = parsePagination(request);
    const url = new URL(request.url);
    const orderParam = url.searchParams.get('order');
    const sortDir = orderParam === 'asc' ? 1 : -1;

    // Build filter from query parameters
    const filterParams = {
      leadId: url.searchParams.get('leadId') || undefined,
      phoneNumber: url.searchParams.get('phoneNumber') || undefined,
      status: url.searchParams.get('status') || undefined,
      direction: url.searchParams.get('direction') || undefined,
    };
    const filter: any = buildFilter(filterParams);

    const providerParam = url.searchParams.get('provider');

    // Provider filtering — STRICT SEPARATION:
    // - Default (no param) & provider=meta: Meta Cloud API messages ONLY
    // - provider=qr: QR bridge messages ONLY (no overlap with Meta)
    // - provider=all: everything (admin analytics/reports)
    if (providerParam === 'qr') {
      // QR inbox: only QR-related providers — NO null/missing included
      filter.provider = { $in: ['whatsapp_web_bridge', 'whatsapp_qr', 'qr'] };
    } else if (providerParam === 'all') {
      // No provider filter – include everything
    } else {
      // Default & 'meta': strictly Meta Cloud API messages only
      filter.provider = 'meta';
    }

    // Add date range filter
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');
    if (startDate || endDate) {
      filter.sentAt = {};
      if (startDate) filter.sentAt.$gte = new Date(startDate);
      if (endDate) filter.sentAt.$lte = new Date(endDate);
    }

    // Access control:
    // - Super admin (admincrm) can see all messages.
    // - Other admins can see messages for leads assigned to them OR created by them (user compartment).
    if (!superAdmin) {
      // Find leads assigned to this user OR created by this user
      const accessibleLeads = await Lead.find({ 
        $or: [
          { assignedToUserId: viewerUserId },
          { createdByUserId: viewerUserId }
        ]
      }).select('_id').lean();
      
      const accessibleIds = accessibleLeads.map(l => String(l._id));
      
      if (filter.leadId) {
        // If they requested a specific lead, check if it's in their accessible list
        if (!accessibleIds.includes(String(filter.leadId))) {
          // Forbidden lead requested
          return formatCrmSuccess({ messages: [], total: 0 }, buildMetadata(0, limit, skip));
        }
      } else {
        // No specific lead requested, filter by all accessible leads
        filter.leadId = { $in: accessibleIds };
      }
    }

    const messages = await WhatsAppMessage.find(filter)
      .sort({ sentAt: sortDir })
      .skip(skip)
      .limit(limit)
      .populate('leadId', 'name phoneNumber assignedToUserId')
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
    await connectDB();
    
    const Lead = getLead();
    const WhatsAppMessage = getWhatsAppMessage();
    const userId = verifyAdminAccess(request);
    const superAdmin = userId === 'admincrm' || userId === 'admin';
    const body = await request.json().catch(() => null);

    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    // Handle special actions (e.g., markThreadAsRead)
    if (body.action === 'markThreadAsRead') {
      // This is just a QR chat action, minimal validation
      const { phoneNumber } = body;
      if (phoneNumber) {
        // Mark all messages for this phone as read
        const normalizedPhone = normalizePhone(String(phoneNumber));
        if (normalizedPhone) {
          await WhatsAppMessage.updateMany(
            { phoneNumber: normalizedPhone, status: { $ne: 'read' } },
            { $set: { status: 'read', readAt: new Date() } }
          ).catch(() => {}); // Silently fail
        }
      }
      return NextResponse.json({ success: true, action: 'markThreadAsRead' }, { status: 200 });
    }

    const { leadId, phoneNumber, messageContent, messageType, mediaUrl, mediaType: providedMediaType } = body;

    // Validate required fields
    if (!leadId || !phoneNumber || (!messageContent && !mediaUrl)) {
      return NextResponse.json(
        { error: 'Missing required fields: leadId, phoneNumber, messageContent/mediaUrl' },
        { status: 400 }
      );
    }

    // Validate leadId format
    if (!isValidObjectId(String(leadId))) {
      return NextResponse.json({ error: 'Invalid leadId format' }, { status: 400 });
    }

    // Find lead
    const lead = await Lead.findById(leadId);
    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    // ACCESS CONTROL: Check if admin is assigned to or created this lead (user compartment)
    if (!superAdmin) {
      const assignedTo = String(lead.assignedToUserId || '').trim();
      const createdBy = String(lead.createdByUserId || '').trim();
      if (assignedTo && assignedTo !== userId && createdBy !== userId) {
        return NextResponse.json(
          { error: 'Forbidden: You can only message leads assigned to you or created by you' },
          { status: 403 }
        );
      }
    }

    // Normalize phone
    const normalizedPhone = normalizePhone(String(phoneNumber));
    if (!normalizedPhone) {
      return NextResponse.json({ error: 'Invalid phone number' }, { status: 400 });
    }

    // Create message in database (with admin display name in bold below message)
    const now = new Date();
    const decoded = verifyToken(request.headers.get('authorization')?.slice('Bearer '.length));
    const adminDisplayName = decoded?.name || decoded?.username || userId;
    const adminNameTag = `\n\n*${adminDisplayName}*`;
    const messageWithAdmin = messageContent ? String(messageContent).trim() + adminNameTag : '';
    
    const insertData: any = {
      leadId: leadId,
      phoneNumber: normalizedPhone,
      messageContent: messageWithAdmin,
      direction: 'outbound',
      messageType: mediaUrl ? 'media' : (messageType || 'text'),
      status: 'queued', // Start as queued
      sentAt: now,
      sentByLabel: userId,
      sentByUserId: userId,
      provider: 'meta',
    };

    if (mediaUrl) {
      insertData.media = {
        kind: providedMediaType || 'image',
        url: mediaUrl
      };
    }

    const newMessage = await WhatsAppMessage.create(insertData);

    // Actually send the message via Meta Cloud API / Bridge
    try {
      let apiResult;
      if (mediaUrl) {
         apiResult = await sendWhatsAppMedia(
           normalizedPhone, 
           mediaUrl, 
           (providedMediaType as any) || 'image', 
           messageWithAdmin
         );
      } else {
         apiResult = await sendWhatsAppText(normalizedPhone, messageWithAdmin);
      }

      await WhatsAppMessage.updateOne(
        { _id: newMessage._id },
        { 
          $set: { 
            status: 'sent', 
            waMessageId: apiResult.waMessageId,
            provider: apiResult.raw?.provider || 'meta',
            updatedAt: new Date()
          } 
        }
      );
    } catch (sendErr) {
      console.error('[Messages API] Meta send failed:', sendErr);
      await WhatsAppMessage.updateOne(
        { _id: newMessage._id },
        { $set: { status: 'failed', failureReason: sendErr instanceof Error ? sendErr.message : 'Send failed' } }
      );
    }

    // Update lead's lastMessageAt
    await Lead.updateOne({ _id: leadId }, { $set: { lastMessageAt: now } });

    console.log(`[Messages API] Message processed: ${newMessage._id} status updated to sent/failed`);

    // Return success
    return formatCrmSuccess(newMessage);
  } catch (error) {
    return handleCrmError(error, 'POST message');
  }
}

export async function PUT(request: NextRequest) {
  try {
    await connectDB();
    const Lead = getLead();
    const WhatsAppMessage = getWhatsAppMessage();

    const userId = verifyAdminAccess(request);
    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { messageId, leadId, phoneNumber, action, ...updates } = body;

    // Backward-compatible action aliases used by older UI code.
    const normalizedAction =
      action === 'mark-read'
        ? 'markAsRead'
        : action === 'mark-unread'
          ? 'markAsUnread'

          : action;

    if (normalizedAction === 'markThreadAsRead') {
      const markFilter: any = {
        direction: 'inbound',
        isRead: { $ne: true },
      };

      if (leadId && isValidObjectId(String(leadId))) {
        markFilter.leadId = toObjectId(String(leadId));
      } else if (phoneNumber) {
        markFilter.phoneNumber = phoneNumber;
      } else {
        return NextResponse.json({ error: 'Missing: leadId or phoneNumber' }, { status: 400 });
      }

      const res = await WhatsAppMessage.updateMany(
        markFilter,
        { $set: { isRead: true, status: 'read', readAt: new Date(), updatedAt: new Date() } }
      );

      return formatCrmSuccess({ modifiedCount: res.modifiedCount });
    }

    if (!messageId) {
      return NextResponse.json({ error: 'Missing: messageId' }, { status: 400 });
    }

    if (!isValidObjectId(String(messageId))) {
      return NextResponse.json({ error: 'Invalid messageId' }, { status: 400 });
    }

    if (normalizedAction === 'markAsRead') {
      const message = await WhatsAppMessage.findByIdAndUpdate(
        messageId,
        { $set: { isRead: true, status: 'read', readAt: new Date(), updatedAt: new Date() } },
        { new: true }
      );
      if (!message) {
        return NextResponse.json({ error: 'Message not found' }, { status: 404 });
      }
      return formatCrmSuccess(message);
    } else if (normalizedAction === 'markAsUnread') {
      const message = await WhatsAppMessage.findByIdAndUpdate(
        messageId,
        {
          $set: { isRead: false, status: 'delivered', updatedAt: new Date() },
          $unset: { readAt: 1 },
        },
        { new: true }
      );
      if (!message) {
        return NextResponse.json({ error: 'Message not found' }, { status: 404 });
      }
      return formatCrmSuccess(message);
    } else if (normalizedAction === 'archive' || normalizedAction === 'unarchive') {
      const archived = normalizedAction === 'archive';
      const message = await WhatsAppMessage.findByIdAndUpdate(
        messageId,
        { $set: { 'metadata.archived': archived } },
        { new: true }
      );
      if (!message) {
        return NextResponse.json({ error: 'Message not found' }, { status: 404 });
      }
      return formatCrmSuccess(message);
    } else if (normalizedAction === 'retry') {
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
    await connectDB();
    const WhatsAppMessage = getWhatsAppMessage();

    verifyAdminAccess(request);
    const url = new URL(request.url);
    const messageId = url.searchParams.get('messageId');

    if (!messageId) {
      return NextResponse.json({ error: 'messageId parameter required' }, { status: 400 });
    }

    if (!isValidObjectId(messageId)) {
      return NextResponse.json({ error: 'Invalid messageId' }, { status: 400 });
    }

    const result = await WhatsAppMessage.findByIdAndDelete(messageId);

    if (!result) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    return formatCrmSuccess({ deleted: true });
  } catch (error) {
    return handleCrmError(error, 'DELETE message');
  }
}
