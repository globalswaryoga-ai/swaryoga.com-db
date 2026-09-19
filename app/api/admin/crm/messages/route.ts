import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import {
  verifyAdminAccess,
  parsePagination,
  handleCrmError,
  formatCrmSuccess,
  buildMetadata,
  isValidObjectId,
  normalizePhone,
} from '@/lib/crm-handlers';

export const dynamic = 'force-dynamic';
import { ConsentManager } from '@/lib/consentManager';
import { AuditLogger } from '@/lib/auditLogger';
import { sendWhatsAppText, sendWhatsAppMedia } from '@/lib/whatsapp';
import { 
  listBunnyMetaMessages, 
  countBunnyMetaMessages, 
  upsertBunnyMetaMessage, 
  updateBunnyMetaMessage, 
  updateBunnyMetaMessagesMany, 
  deleteBunnyMetaMessage,
  getBunnyMetaMessage
} from '@/lib/bunnyMetaWhatsAppRepository';
import { loadBunnyLeads } from '@/lib/bunnyLeadsRepository';
import crypto from 'node:crypto';

// Re-implement the GET endpoint using BunnyDB
export async function GET(request: NextRequest) {
  try {
    const viewerUserId = verifyAdminAccess(request);
    const superAdmin = viewerUserId === 'admincrm' || viewerUserId === 'admin';
    const { limit, skip } = parsePagination(request);
    const url = new URL(request.url);
    const orderParam = url.searchParams.get('order');
    const sortDir = orderParam === 'asc' ? 1 : -1;

    const filterParams = {
      leadId: url.searchParams.get('leadId') || undefined,
      phoneNumber: url.searchParams.get('phoneNumber') || undefined,
      status: url.searchParams.get('status') || undefined,
      direction: url.searchParams.get('direction') || undefined,
    };

    const providerParam = url.searchParams.get('provider');

    if (providerParam === 'qr') {
      return formatCrmSuccess({ messages: [], total: 0, note: 'Use dedicated QR APIs' }, buildMetadata(0, limit, skip));
    }

    const beforeParam = url.searchParams.get('before');

    // Fetch messages from BunnyDB
    let bunnyMessages = await listBunnyMetaMessages({
      phoneNumber: filterParams.phoneNumber ? normalizePhone(filterParams.phoneNumber) : undefined,
      leadId: filterParams.leadId,
      limit: limit * 2, // Fetch more to allow for filtering
      skip: 0, // We have to do in-memory filtering if not superAdmin, so we might need more
      before: beforeParam || undefined,
    });

    let bunnyTotal = await countBunnyMetaMessages({ 
        phoneNumber: filterParams.phoneNumber ? normalizePhone(filterParams.phoneNumber) : undefined, 
        leadId: filterParams.leadId 
    });

    if (!superAdmin) {
      // Need to filter by accessible leads and ownership
      const allLeads = await loadBunnyLeads();
      const accessibleLeads = allLeads.filter(l => l.assignedToUserId === viewerUserId || l.createdByUserId === viewerUserId);
      const accessibleIds = accessibleLeads.map(l => String(l._id));

      if (filterParams.leadId && !accessibleIds.includes(String(filterParams.leadId))) {
        return formatCrmSuccess({ messages: [], total: 0 }, buildMetadata(0, limit, skip));
      }

      // Filter messages in memory for now if not superAdmin
      bunnyMessages = bunnyMessages.filter((m: any) => 
        (m.leadId && accessibleIds.includes(String(m.leadId))) ||
        m.sentByUserId === viewerUserId ||
        m.bridgeUserId === viewerUserId ||
        m.ownerId === viewerUserId
      );
      bunnyTotal = bunnyMessages.length; // Approximate
    }

    // Apply additional filters (status, direction)
    if (filterParams.status) {
      bunnyMessages = bunnyMessages.filter((m: any) => m.status === filterParams.status);
    }
    if (filterParams.direction) {
      bunnyMessages = bunnyMessages.filter((m: any) => m.direction === filterParams.direction);
    }
    
    // Date filters
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');
    if (startDate) {
        bunnyMessages = bunnyMessages.filter((m: any) => new Date(m.sentAt || m.createdAt) >= new Date(startDate));
    }
    if (endDate) {
        const end = new Date(endDate);
        end.setDate(end.getDate() + 1);
        bunnyMessages = bunnyMessages.filter((m: any) => new Date(m.sentAt || m.createdAt) < end);
    }

    // Apply sorting and pagination
    bunnyMessages.sort((a: any, b: any) => {
        const at = new Date(a.sentAt || a.createdAt).getTime();
        const bt = new Date(b.sentAt || b.createdAt).getTime();
        return sortDir === 1 ? at - bt : bt - at;
    });

    const paginatedMessages = bunnyMessages.slice(skip, skip + limit);

    return formatCrmSuccess({ messages: paginatedMessages, total: bunnyTotal }, buildMetadata(bunnyTotal, limit, skip));
  } catch (error) {
    return handleCrmError(error, 'GET messages');
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = verifyAdminAccess(request);
    const superAdmin = userId === 'admincrm' || userId === 'admin';
    const body = await request.json().catch(() => null);

    if (!body) return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });

    if (body.action === 'markThreadAsRead') {
      const { phoneNumber } = body;
      if (phoneNumber) {
        const normalizedPhone = normalizePhone(String(phoneNumber));
        if (normalizedPhone) {
          await updateBunnyMetaMessagesMany(
            { phoneNumber: normalizedPhone, statusNot: 'read' },
            { status: 'read', readAt: new Date().toISOString() }
          );
        }
      }
      return NextResponse.json({ success: true, action: 'markThreadAsRead' }, { status: 200 });
    }

    const { leadId, phoneNumber, messageContent, messageType, mediaUrl, mediaType: providedMediaType } = body;

    if (!leadId || !phoneNumber || (!messageContent && !mediaUrl)) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const allLeads = await loadBunnyLeads();
    const lead = allLeads.find(l => String(l._id) === String(leadId));
    
    if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });

    if (!superAdmin) {
      const assignedTo = String(lead.assignedToUserId || '').trim();
      const createdBy = String(lead.createdByUserId || '').trim();
      if (assignedTo && assignedTo !== userId && createdBy !== userId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const normalizedPhone = normalizePhone(String(phoneNumber));
    if (!normalizedPhone) return NextResponse.json({ error: 'Invalid phone number' }, { status: 400 });

    const now = new Date();
    const decoded = verifyToken(request.headers.get('authorization')?.slice('Bearer '.length));
    const adminDisplayName = decoded?.name || decoded?.username || userId;
    const adminNameTag = `\n\n*${adminDisplayName}*`;
    const messageWithAdmin = messageContent ? String(messageContent).trim() + adminNameTag : '';
    
    const messageId = crypto.randomUUID();

    const insertData: any = {
      _id: messageId,
      documentId: messageId,
      leadId: leadId,
      phoneNumber: normalizedPhone,
      messageContent: messageWithAdmin,
      direction: 'outbound',
      messageType: mediaUrl ? 'media' : (messageType || 'text'),
      status: 'queued',
      sentAt: now.toISOString(),
      createdAt: now.toISOString(),
      sentByLabel: userId,
      sentByUserId: userId,
      provider: 'meta',
    };

    if (mediaUrl) {
      insertData.media = { kind: providedMediaType || 'image', url: mediaUrl };
    }

    const newMessage = await upsertBunnyMetaMessage(insertData);

    try {
      let apiResult;
      if (mediaUrl) {
         apiResult = await sendWhatsAppMedia(normalizedPhone, mediaUrl, (providedMediaType as any) || 'image', messageWithAdmin);
      } else {
         apiResult = await sendWhatsAppText(normalizedPhone, messageWithAdmin);
      }

      await updateBunnyMetaMessage(messageId, {
        status: 'sent',
        waMessageId: apiResult.waMessageId,
        provider: apiResult.raw?.provider || 'meta',
      });
      newMessage.status = 'sent';
      newMessage.waMessageId = apiResult.waMessageId;
    } catch (sendErr) {
      console.error('[Messages API] Meta send failed:', sendErr);
      await updateBunnyMetaMessage(messageId, {
        status: 'failed',
        failureReason: sendErr instanceof Error ? sendErr.message : 'Send failed'
      });
      newMessage.status = 'failed';
    }

    return formatCrmSuccess(newMessage);
  } catch (error) {
    return handleCrmError(error, 'POST message');
  }
}

export async function PUT(request: NextRequest) {
  try {
    const userId = verifyAdminAccess(request);
    const body = await request.json().catch(() => null);
    if (!body) return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });

    const { messageId, leadId, phoneNumber, action, ...updates } = body;
    const normalizedAction = action === 'mark-read' ? 'markAsRead' : action === 'mark-unread' ? 'markAsUnread' : action;

    if (normalizedAction === 'markThreadAsRead') {
      if (!leadId && !phoneNumber) return NextResponse.json({ error: 'Missing leadId/phoneNumber' }, { status: 400 });
      await updateBunnyMetaMessagesMany(
        { phoneNumber, leadId, direction: 'inbound', statusNot: 'read' },
        { isRead: true, status: 'read', readAt: new Date().toISOString() }
      );
      return formatCrmSuccess({ modifiedCount: 1 });
    }

    if (!messageId) return NextResponse.json({ error: 'Missing: messageId' }, { status: 400 });

    if (normalizedAction === 'markAsRead') {
      const message = await updateBunnyMetaMessage(messageId, { isRead: true, status: 'read', readAt: new Date().toISOString() });
      if (!message) return NextResponse.json({ error: 'Message not found' }, { status: 404 });
      return formatCrmSuccess(message);
    } else if (normalizedAction === 'markAsUnread') {
      const message = await updateBunnyMetaMessage(messageId, { isRead: false, status: 'delivered', readAt: null });
      if (!message) return NextResponse.json({ error: 'Message not found' }, { status: 404 });
      return formatCrmSuccess(message);
    } else if (normalizedAction === 'archive' || normalizedAction === 'unarchive') {
      const message = await updateBunnyMetaMessage(messageId, { 'metadata.archived': normalizedAction === 'archive' });
      if (!message) return NextResponse.json({ error: 'Message not found' }, { status: 404 });
      return formatCrmSuccess(message);
    } else if (normalizedAction === 'retry') {
      const message = await getBunnyMetaMessage(messageId);
      if (!message) return NextResponse.json({ error: 'Message not found' }, { status: 404 });
      if (String(message.messageType || 'text') !== 'text') return NextResponse.json({ error: 'Retry text only' }, { status: 400 });

      const to = normalizePhone(String(message.phoneNumber));
      const compliance = await ConsentManager.validateCompliance(to);
      if (!compliance.compliant) {
        await updateBunnyMetaMessage(messageId, { status: 'failed', failureReason: compliance.reason, retryCount: (message.retryCount || 0) + 1 });
        return NextResponse.json({ error: compliance.reason }, { status: 403 });
      }

      try {
        const apiResult = await sendWhatsAppText(to, String(message.messageContent).trim());
        const updated = await updateBunnyMetaMessage(messageId, { status: 'sent', waMessageId: apiResult.waMessageId, retryCount: (message.retryCount || 0) + 1, failureReason: null });
        return formatCrmSuccess(updated || message);
      } catch (err) {
        const updated = await updateBunnyMetaMessage(messageId, { status: 'failed', failureReason: String(err), retryCount: (message.retryCount || 0) + 1 });
        return NextResponse.json({ error: String(err), data: updated }, { status: 502 });
      }
    } else {
      const message = await updateBunnyMetaMessage(messageId, updates);
      if (!message) return NextResponse.json({ error: 'Message not found' }, { status: 404 });
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

    if (!messageId) return NextResponse.json({ error: 'messageId required' }, { status: 400 });

    await deleteBunnyMetaMessage(messageId);
    return formatCrmSuccess({ deleted: true });
  } catch (error) {
    return handleCrmError(error, 'DELETE message');
  }
}
