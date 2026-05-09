import crypto from 'crypto';
import mongoose from 'mongoose';
import { connectDB, SocialMediaAccount } from '@/lib/db';
import { decryptCredential } from '@/lib/encryption';
import { verifyToken, type TokenPayload } from '@/lib/auth';
import { buildSocialMediaScopeFilter, resolveSocialMediaScope, type SocialMediaScope } from '@/lib/socialMediaScope';
import { getSocialInboxConversation, getSocialInboxMessage } from '@/lib/schemas/enterpriseSchemas';

const META_GRAPH_API_VERSION = process.env.META_GRAPH_API_VERSION || 'v24.0';
const META_INBOX_WEBHOOK_VERIFY_TOKEN =
  process.env.META_INBOX_WEBHOOK_VERIFY_TOKEN ||
  process.env.META_FORMS_WEBHOOK_VERIFY_TOKEN ||
  process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN ||
  '';
const META_INBOX_APP_SECRET = process.env.META_APP_SECRET || process.env.WHATSAPP_APP_SECRET || '';

export type SocialInboxPlatform = 'messenger' | 'instagram';

export type ResolvedSocialInboxAccount = {
  platform: SocialInboxPlatform;
  scope: SocialMediaScope;
  accountId: string;
  accountName: string;
  accountHandle: string;
  accessToken: string;
  accountDocId: string;
};

export type SocialInboxParsedEvent = {
  platform: SocialInboxPlatform;
  accountId: string;
  participantId: string;
  participantName?: string;
  participantUsername?: string;
  participantProfilePic?: string;
  messageId?: string;
  direction: 'inbound' | 'outbound';
  messageText?: string;
  messageType?: 'text' | 'image' | 'video' | 'audio' | 'document' | 'postback' | 'unsupported';
  mediaUrl?: string;
  mediaType?: string;
  sentAt?: Date;
  rawEvent?: any;
};

function getConnectedPlatform(platform: SocialInboxPlatform): 'facebook' | 'instagram' {
  return platform === 'messenger' ? 'facebook' : 'instagram';
}

function cleanString(value: unknown): string {
  return String(value || '').trim();
}

export function normalizeSocialInboxPlatform(value: unknown): SocialInboxPlatform | null {
  const normalized = cleanString(value).toLowerCase();
  if (normalized === 'messenger' || normalized === 'instagram') return normalized;
  return null;
}

export function buildSocialInboxScopeFilter(scope: Pick<SocialMediaScope, 'scopeType' | 'scopeKey'>, platform?: SocialInboxPlatform) {
  return {
    accountScopeType: scope.scopeType,
    accountScopeKey: scope.scopeKey,
    ...(platform ? { platform } : {}),
  };
}

export async function resolveSocialInboxAccount(decoded: TokenPayload | null | undefined, platform: SocialInboxPlatform): Promise<ResolvedSocialInboxAccount | null> {
  await connectDB();
  const scope = await resolveSocialMediaScope(decoded);
  const accountPlatform = getConnectedPlatform(platform);
  const account = await SocialMediaAccount.findOne({
    isConnected: true,
    platform: accountPlatform,
    ...buildSocialMediaScopeFilter(scope),
  })
    .sort({ connectedAt: -1, updatedAt: -1 })
    .lean<any>();

  if (!account?.accountId || !account?.accessToken) {
    return null;
  }

  let accessToken: string;
  try {
    accessToken = decryptCredential(String(account.accessToken));
  } catch (err) {
    console.error('[socialInbox] Could not decrypt access token for account', account._id, err);
    return null;
  }

  return {
    platform,
    scope,
    accountId: String(account.accountId),
    accountName: String(account.accountName || account.accountHandle || account.accountId),
    accountHandle: String(account.accountHandle || ''),
    accessToken,
    accountDocId: String(account._id),
  };
}

export async function resolveSocialInboxAccountByAccountId(platform: SocialInboxPlatform, accountId: string): Promise<(ResolvedSocialInboxAccount & { ownerUserId?: string }) | null> {
  await connectDB();
  const accountPlatform = getConnectedPlatform(platform);
  const account = await SocialMediaAccount.findOne({
    isConnected: true,
    platform: accountPlatform,
    accountId: String(accountId),
  })
    .sort({ connectedAt: -1, updatedAt: -1 })
    .lean<any>();

  if (!account?.accountId || !account?.accessToken) {
    return null;
  }

  const scopeType = account.scopeType === 'tenant' ? 'tenant' : 'super_admin';
  const scopeKey = cleanString(account.scopeKey) || 'super_admin';
  const scopeLabel =
    scopeType === 'tenant'
      ? `Tenant settings (${cleanString(account.tenantSlug || scopeKey)})`
      : 'Super Admin shared settings';

  return {
    platform,
    scope: {
      scopeType,
      scopeKey,
      scopeLabel,
      ownerUserId: cleanString(account.ownerUserId || 'admincrm'),
      tenantSlug: cleanString(account.tenantSlug || '') || undefined,
    },
    accountId: String(account.accountId),
    accountName: String(account.accountName || account.accountHandle || account.accountId),
    accountHandle: String(account.accountHandle || ''),
    accessToken: decryptCredential(String(account.accessToken)),
    accountDocId: String(account._id),
    ownerUserId: cleanString(account.ownerUserId || ''),
  };
}

export function verifyMetaInboxSignature(rawBody: string, signatureHeader: string | null): boolean {
  // Allow through if no secret configured (will verify when secret is added)
  if (!META_INBOX_APP_SECRET) return true;
  const header = cleanString(signatureHeader);
  if (!header) return true; // Allow if no signature header (temporary for setup)
  const provided = header.includes('=') ? header.split('=').slice(1).join('=') : header;
  const expected = crypto.createHmac('sha256', META_INBOX_APP_SECRET).update(rawBody, 'utf8').digest('hex');
  return provided === expected;
}

export function getMetaInboxVerifyToken(): string {
  return META_INBOX_WEBHOOK_VERIFY_TOKEN;
}

export function getConversationKey(platform: SocialInboxPlatform, accountId: string, participantId: string) {
  return `${platform}:${cleanString(accountId)}:${cleanString(participantId)}`;
}

function pickFirstAttachment(message: any): { mediaUrl?: string; mediaType?: string; messageType: SocialInboxParsedEvent['messageType'] } {
  const firstAttachment = Array.isArray(message?.attachments) ? message.attachments[0] : undefined;
  const attachmentType = cleanString(firstAttachment?.type).toLowerCase();
  const payloadUrl = cleanString(firstAttachment?.payload?.url);

  if (attachmentType === 'image') return { mediaUrl: payloadUrl || undefined, mediaType: 'image', messageType: 'image' };
  if (attachmentType === 'video') return { mediaUrl: payloadUrl || undefined, mediaType: 'video', messageType: 'video' };
  if (attachmentType === 'audio') return { mediaUrl: payloadUrl || undefined, mediaType: 'audio', messageType: 'audio' };
  if (attachmentType === 'file') return { mediaUrl: payloadUrl || undefined, mediaType: 'document', messageType: 'document' };
  return { mediaUrl: payloadUrl || undefined, mediaType: attachmentType || undefined, messageType: 'unsupported' };
}

export function parseMetaSocialWebhookPayload(payload: any): SocialInboxParsedEvent[] {
  const objectType = cleanString(payload?.object).toLowerCase();
  const platformFromObject: SocialInboxPlatform | null = objectType === 'instagram' ? 'instagram' : objectType === 'page' ? 'messenger' : null;
  const entries = Array.isArray(payload?.entry) ? payload.entry : [];
  const events: SocialInboxParsedEvent[] = [];

  for (const entry of entries) {
    const messagingEvents = [
      ...(Array.isArray(entry?.messaging) ? entry.messaging : []),
      ...(Array.isArray(entry?.standby) ? entry.standby : []),
      ...(Array.isArray(entry?.changes)
        ? entry.changes.flatMap((change: any) => (Array.isArray(change?.value?.messaging) ? change.value.messaging : []))
        : []),
    ];

    for (const item of messagingEvents) {
      const platform = platformFromObject || (cleanString(item?.platform).toLowerCase() === 'instagram' ? 'instagram' : 'messenger');
      const senderId = cleanString(item?.sender?.id);
      const recipientId = cleanString(item?.recipient?.id);
      const isEcho = item?.message?.is_echo === true;
      const direction: 'inbound' | 'outbound' = isEcho ? 'outbound' : 'inbound';
      const participantId = direction === 'inbound' ? senderId : recipientId;
      const accountId = direction === 'inbound' ? recipientId : senderId;
      const timestampMs = Number(item?.timestamp || 0);
      const sentAt = Number.isFinite(timestampMs) && timestampMs > 0 ? new Date(timestampMs) : new Date();
      const messageText = cleanString(item?.message?.text || item?.postback?.title || item?.postback?.payload || item?.reaction?.emoji);
      const messageId = cleanString(item?.message?.mid || item?.postback?.mid || item?.reaction?.mid || item?.delivery?.mids?.[0]);
      const attachmentInfo = pickFirstAttachment(item?.message);

      if (!platform || !participantId || !accountId || (!messageText && !attachmentInfo.mediaUrl && !messageId)) {
        continue;
      }

      events.push({
        platform,
        accountId,
        participantId,
        participantName: cleanString(item?.sender?.name || item?.sender?.display_name || item?.message?.reply_to?.story?.mention?.username),
        participantUsername: cleanString(item?.sender?.username || item?.sender?.ig_username),
        participantProfilePic: cleanString(item?.sender?.profile_pic || item?.sender?.profile_pic_url),
        messageId: messageId || undefined,
        direction,
        messageText: messageText || undefined,
        messageType: messageText ? 'text' : attachmentInfo.messageType,
        mediaUrl: attachmentInfo.mediaUrl,
        mediaType: attachmentInfo.mediaType,
        sentAt,
        rawEvent: item,
      });
    }
  }

  return events;
}

export async function ingestMetaSocialEvent(event: SocialInboxParsedEvent) {
  const resolvedAccount = await resolveSocialInboxAccountByAccountId(event.platform, event.accountId);
  if (!resolvedAccount) {
    return null;
  }

  const Conversation = getSocialInboxConversation();
  const Message = getSocialInboxMessage();
  const conversationKey = getConversationKey(event.platform, event.accountId, event.participantId);
  const now = new Date();

  const baseConversationUpdate: Record<string, any> = {
    platform: event.platform,
    accountScopeType: resolvedAccount.scope.scopeType,
    accountScopeKey: resolvedAccount.scope.scopeKey,
    accountId: resolvedAccount.accountId,
    accountName: resolvedAccount.accountName,
    accountHandle: resolvedAccount.accountHandle,
    participantId: event.participantId,
    participantName: event.participantName || event.participantUsername || `User ${event.participantId.slice(-6)}`,
    participantUsername: event.participantUsername || '',
    participantProfilePic: event.participantProfilePic || '',
    lastMessage: event.messageText || (event.messageType ? `[${event.messageType}]` : ''),
    lastMessageAt: event.sentAt || now,
    lastMessageDirection: event.direction,
    lastExternalMessageId: event.messageId || '',
    updatedAt: now,
  };

  // Get or create conversation
  let conversation = await Conversation.findOne({
    conversationKey,
    accountScopeType: resolvedAccount.scope.scopeType,
    accountScopeKey: resolvedAccount.scope.scopeKey,
  });

  if (conversation) {
    // Update existing - manually increment unreadCount if inbound
    const updates: any = { ...baseConversationUpdate };
    if (event.direction === 'inbound') {
      updates.unreadCount = (conversation.unreadCount || 0) + 1;
    }
    Object.assign(conversation, updates);
    await conversation.save();
  } else {
    // Create new conversation
    const conversationData: any = {
      conversationKey,
      createdByUserId: resolvedAccount.ownerUserId || resolvedAccount.scope.ownerUserId,
      assignedToUserId: resolvedAccount.ownerUserId || resolvedAccount.scope.ownerUserId,
      status: 'new_lead',
      labels: [],
      notes: '',
      unreadCount: event.direction === 'inbound' ? 1 : 0,
      isBlocked: false,
      createdAt: now,
      ...baseConversationUpdate,
    };
    conversation = new Conversation(conversationData);
    await conversation.save();
  }

  if (event.messageId) {
    await Message.updateOne(
      {
        platform: event.platform,
        accountScopeType: resolvedAccount.scope.scopeType,
        accountScopeKey: resolvedAccount.scope.scopeKey,
        externalMessageId: event.messageId,
      },
      {
        $setOnInsert: {
          conversationId: conversation._id,
          conversationKey,
          accountId: resolvedAccount.accountId,
          senderId: event.direction === 'inbound' ? event.participantId : resolvedAccount.accountId,
          recipientId: event.direction === 'inbound' ? resolvedAccount.accountId : event.participantId,
          direction: event.direction,
          messageContent: event.messageText || '',
          messageType: event.messageType || 'text',
          mediaUrl: event.mediaUrl || '',
          mediaType: event.mediaType || '',
          sentAt: event.sentAt || now,
          isRead: event.direction === 'outbound',
          metadata: event.rawEvent || {},
          createdAt: now,
          updatedAt: now,
        },
      },
      { upsert: true }
    );
  } else {
    await Message.create({
      conversationId: conversation._id,
      conversationKey,
      platform: event.platform,
      accountScopeType: resolvedAccount.scope.scopeType,
      accountScopeKey: resolvedAccount.scope.scopeKey,
      accountId: resolvedAccount.accountId,
      externalMessageId: undefined,
      senderId: event.direction === 'inbound' ? event.participantId : resolvedAccount.accountId,
      recipientId: event.direction === 'inbound' ? resolvedAccount.accountId : event.participantId,
      direction: event.direction,
      messageContent: event.messageText || '',
      messageType: event.messageType || 'text',
      mediaUrl: event.mediaUrl || '',
      mediaType: event.mediaType || '',
      sentAt: event.sentAt || now,
      isRead: event.direction === 'outbound',
      metadata: event.rawEvent || {},
    });
  }

  return conversation;
}

export async function sendMetaSocialMessage(args: {
  platform: SocialInboxPlatform;
  accountId: string;
  accessToken: string;
  recipientId: string;
  message: string;
}) {
  const url = `https://graph.facebook.com/${META_GRAPH_API_VERSION}/${encodeURIComponent(args.accountId)}/messages`;
  const payload: Record<string, any> = {
    recipient: { id: args.recipientId },
    message: { text: args.message },
  };

  if (args.platform === 'messenger') {
    payload.messaging_type = 'RESPONSE';
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${args.accessToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
    cache: 'no-store',
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error?.message || `Meta social inbox send failed (${response.status})`);
  }

  const messageId = cleanString(data?.message_id || data?.recipient_id || data?.messages?.[0]?.id);
  return {
    messageId,
    raw: data,
  };
}

export async function createOutboundSocialMessage(args: {
  scope: SocialMediaScope;
  platform: SocialInboxPlatform;
  account: ResolvedSocialInboxAccount;
  conversationId: string;
  message: string;
}) {
  const Conversation = getSocialInboxConversation();
  const Message = getSocialInboxMessage();
  const now = new Date();

  const conversation = await Conversation.findOne({
    _id: args.conversationId,
    ...buildSocialInboxScopeFilter(args.scope, args.platform),
  });

  if (!conversation) {
    throw new Error('Conversation not found');
  }

  const sendResult = await sendMetaSocialMessage({
    platform: args.platform,
    accountId: args.account.accountId,
    accessToken: args.account.accessToken,
    recipientId: String(conversation.participantId),
    message: args.message,
  });

  const createdMessage = await Message.create({
    conversationId: conversation._id,
    conversationKey: conversation.conversationKey,
    platform: args.platform,
    accountScopeType: args.scope.scopeType,
    accountScopeKey: args.scope.scopeKey,
    accountId: args.account.accountId,
    externalMessageId: sendResult.messageId || undefined,
    senderId: args.account.accountId,
    recipientId: String(conversation.participantId),
    direction: 'outbound',
    messageContent: args.message,
    messageType: 'text',
    sentAt: now,
    isRead: true,
    metadata: sendResult.raw || {},
  });

  await Conversation.updateOne(
    { _id: conversation._id },
    {
      $set: {
        lastMessage: args.message,
        lastMessageAt: now,
        lastMessageDirection: 'outbound',
        lastExternalMessageId: sendResult.messageId || '',
        updatedAt: now,
      },
    }
  );

  return createdMessage;
}

export async function markSocialConversationRead(scope: SocialMediaScope, platform: SocialInboxPlatform, conversationId: string) {
  const Conversation = getSocialInboxConversation();
  const Message = getSocialInboxMessage();
  const now = new Date();

  await Conversation.updateOne(
    { _id: conversationId, ...buildSocialInboxScopeFilter(scope, platform) },
    { $set: { unreadCount: 0, updatedAt: now } }
  );

  await Message.updateMany(
    {
      conversationId: new mongoose.Types.ObjectId(conversationId),
      platform,
      accountScopeType: scope.scopeType,
      accountScopeKey: scope.scopeKey,
      direction: 'inbound',
      isRead: { $ne: true },
    },
    { $set: { isRead: true, readAt: now, updatedAt: now } }
  );
}

export function getDecodedTokenFromRequest(request: Request | { headers: Headers }) {
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : '';
  return verifyToken(token);
}
