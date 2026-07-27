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
const META_APP_ID = process.env.META_APP_ID || process.env.FACEBOOK_APP_ID || process.env.NEXT_PUBLIC_FACEBOOK_APP_ID || '';
const GRAPH_BASE = `https://graph.facebook.com/${META_GRAPH_API_VERSION}`;

function appsecretProof(token: string): string {
  return META_INBOX_APP_SECRET ? crypto.createHmac('sha256', META_INBOX_APP_SECRET).update(token).digest('hex') : '';
}

export type SocialInboxPlatform = 'messenger' | 'instagram';

export type ResolvedSocialInboxAccount = {
  platform: SocialInboxPlatform;
  scope: SocialMediaScope;
  accountId: string;
  accountName: string;
  accountHandle: string;
  accessToken: string;
  accountDocId: string;
  // The node id to use for outbound Graph API calls (conversations/messages).
  // For Messenger this is the same as accountId (the Page id). For Instagram,
  // Meta requires these classic Page-linked calls to target the linked Page id,
  // not the Instagram Business Account id itself — calling with the IG id
  // fails with "(#3) Application does not have the capability to make this API call."
  graphNodeId: string;
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
    graphNodeId: platform === 'instagram'
      ? cleanString(account.metadata?.linkedPageId) || String(account.accountId)
      : String(account.accountId),
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
    graphNodeId: platform === 'instagram'
      ? cleanString(account.metadata?.linkedPageId) || String(account.accountId)
      : String(account.accountId),
    ownerUserId: cleanString(account.ownerUserId || ''),
  };
}

/**
 * List every connected Messenger/Instagram account across all tenants, resolved
 * to the same shape ingestMetaSocialEvent/importFacebookConversationHistory use.
 * Backs a polling-based sync (see /api/cron/social-inbox-sync) that pulls
 * conversations directly via the Graph API — a reliable fallback independent
 * of whether Meta's webhook push actually fires, since webhook delivery has
 * proven unreliable for real (non-tester) accounts even with a fully correct
 * subscription + Live mode + permissions setup.
 */
export async function getAllConnectedSocialInboxAccounts(): Promise<(ResolvedSocialInboxAccount & { ownerUserId?: string })[]> {
  await connectDB();
  const accounts = await SocialMediaAccount.find({
    isConnected: true,
    platform: { $in: ['facebook', 'instagram'] },
  }).lean<any[]>();

  const resolved: (ResolvedSocialInboxAccount & { ownerUserId?: string })[] = [];
  for (const account of accounts) {
    if (!account?.accountId || !account?.accessToken) continue;
    const platform: SocialInboxPlatform = account.platform === 'instagram' ? 'instagram' : 'messenger';
    const scopeType = account.scopeType === 'tenant' ? 'tenant' : 'super_admin';
    const scopeKey = cleanString(account.scopeKey) || 'super_admin';
    let accessToken: string;
    try {
      accessToken = decryptCredential(String(account.accessToken));
    } catch {
      continue;
    }

    resolved.push({
      platform,
      scope: {
        scopeType,
        scopeKey,
        scopeLabel: scopeType === 'tenant' ? `Tenant settings (${cleanString(account.tenantSlug || scopeKey)})` : 'Super Admin shared settings',
        ownerUserId: cleanString(account.ownerUserId || 'admincrm'),
        tenantSlug: cleanString(account.tenantSlug || '') || undefined,
      },
      accountId: String(account.accountId),
      accountName: String(account.accountName || account.accountHandle || account.accountId),
      accountHandle: String(account.accountHandle || ''),
      accessToken,
      accountDocId: String(account._id),
      graphNodeId: platform === 'instagram'
        ? cleanString(account.metadata?.linkedPageId) || String(account.accountId)
        : String(account.accountId),
      ownerUserId: cleanString(account.ownerUserId || ''),
    });
  }
  return resolved;
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

function pickFirstAttachment(message: any): { mediaUrl?: string; mediaType?: string; messageType: SocialInboxParsedEvent['messageType']; fallbackText?: string } {
  const firstAttachment = Array.isArray(message?.attachments) ? message.attachments[0] : undefined;
  const attachmentType = cleanString(firstAttachment?.type).toLowerCase();
  const payloadUrl = cleanString(firstAttachment?.payload?.url);
  const stickerId = firstAttachment?.payload?.sticker_id || message?.sticker_id;

  if (attachmentType === 'image' && !stickerId) return { mediaUrl: payloadUrl || undefined, mediaType: 'image', messageType: 'image' };
  if (attachmentType === 'image' && stickerId) return { mediaUrl: payloadUrl || undefined, mediaType: 'image', messageType: 'image', fallbackText: '🎭 Sent a sticker' };
  if (attachmentType === 'video') return { mediaUrl: payloadUrl || undefined, mediaType: 'video', messageType: 'video' };
  if (attachmentType === 'audio') return { mediaUrl: payloadUrl || undefined, mediaType: 'audio', messageType: 'audio' };
  if (attachmentType === 'file') return { mediaUrl: payloadUrl || undefined, mediaType: 'document', messageType: 'document' };
  if (attachmentType === 'sticker') return { mediaUrl: payloadUrl || undefined, mediaType: 'image', messageType: 'image', fallbackText: '🎭 Sent a sticker' };
  if (attachmentType === 'share') {
    const title = cleanString(firstAttachment?.title);
    const url = payloadUrl || cleanString(firstAttachment?.url);
    return { mediaUrl: url || undefined, mediaType: 'share', messageType: 'unsupported', fallbackText: title ? `🔗 Shared: ${title}` : '🔗 Shared a post' };
  }
  if (attachmentType === 'fallback') {
    const title = cleanString(firstAttachment?.title);
    const url = payloadUrl || cleanString(firstAttachment?.url);
    return { mediaUrl: url || undefined, mediaType: 'fallback', messageType: 'unsupported', fallbackText: title ? `📎 ${title}` : '📎 Shared something' };
  }
  if (attachmentType === 'template') return { mediaUrl: undefined, mediaType: 'template', messageType: 'unsupported', fallbackText: '📄 Sent a template message' };
  if (attachmentType === 'location') return { mediaUrl: undefined, mediaType: 'location', messageType: 'unsupported', fallbackText: '📍 Shared a location' };
  if (attachmentType === 'like_heart') return { mediaUrl: undefined, mediaType: 'like_heart', messageType: 'unsupported', fallbackText: '❤️' };
  return { mediaUrl: payloadUrl || undefined, mediaType: attachmentType || undefined, messageType: 'unsupported', fallbackText: '📎 Sent a media message' };
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
      const rawMessageText = cleanString(item?.message?.text || item?.postback?.title || item?.postback?.payload || item?.reaction?.emoji);
      // Meta sends the literal string "[unsupported message]" for some attachment types — replace with fallback text
      const isMetaUnsupportedPlaceholder = rawMessageText === '[unsupported message]' || rawMessageText === 'unsupported message';
      const messageId = cleanString(item?.message?.mid || item?.postback?.mid || item?.reaction?.mid || item?.delivery?.mids?.[0]);
      const attachmentInfo = pickFirstAttachment(item?.message);
      const messageText = isMetaUnsupportedPlaceholder ? (attachmentInfo.fallbackText || '') : rawMessageText;

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
        messageType: messageText && !isMetaUnsupportedPlaceholder ? 'text' : attachmentInfo.messageType,
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

  // Get or create conversation (looked up first so we only hit the Graph API for
  // a participant profile when we actually need a name).
  let conversation = await Conversation.findOne({
    conversationKey,
    accountScopeType: resolvedAccount.scope.scopeType,
    accountScopeKey: resolvedAccount.scope.scopeKey,
  });

  // Resolve a human-readable participant name. Webhooks usually omit it, so fall
  // back to a best-effort profile lookup — but never clobber a good existing name.
  let participantName = event.participantName || event.participantUsername || '';
  let participantUsername = event.participantUsername || '';
  let participantProfilePic = event.participantProfilePic || '';
  if (!participantName && conversation && !isGenericParticipantName(conversation.participantName)) {
    participantName = conversation.participantName;
  }
  if (!participantName && event.direction === 'inbound') {
    const profile = await fetchSocialParticipantProfile(event.platform, event.participantId, resolvedAccount.accessToken);
    participantName = profile.name || profile.username || '';
    participantUsername = participantUsername || profile.username || '';
    participantProfilePic = participantProfilePic || profile.profilePic || '';
  }
  if (!participantName) participantName = `User ${event.participantId.slice(-6)}`;
  participantUsername = participantUsername || (conversation?.participantUsername || '');
  participantProfilePic = participantProfilePic || (conversation?.participantProfilePic || '');

  const baseConversationUpdate: Record<string, any> = {
    platform: event.platform,
    accountScopeType: resolvedAccount.scope.scopeType,
    accountScopeKey: resolvedAccount.scope.scopeKey,
    accountId: resolvedAccount.accountId,
    accountName: resolvedAccount.accountName,
    accountHandle: resolvedAccount.accountHandle,
    participantId: event.participantId,
    participantName,
    participantUsername,
    participantProfilePic,
    lastMessage: event.messageText || (event.messageType ? `[${event.messageType}]` : ''),
    lastMessageAt: event.sentAt || now,
    lastMessageDirection: event.direction,
    lastExternalMessageId: event.messageId || '',
    updatedAt: now,
  };

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
  // The node id to POST to — the linked Page id for Instagram (classic
  // Page-linked integration rejects the IG Business Account id here with
  // "Application does not have the capability to make this API call").
  // Falls back to accountId for callers that haven't been updated.
  graphNodeId?: string;
  accessToken: string;
  recipientId: string;
  message: string;
}) {
  // Calculate appsecret_proof for security
  const appSecret = META_INBOX_APP_SECRET;
  const appsecretProof = appSecret
    ? crypto.createHmac('sha256', appSecret).update(args.accessToken).digest('hex')
    : '';

  const baseUrl = `https://graph.facebook.com/${META_GRAPH_API_VERSION}/${encodeURIComponent(args.graphNodeId || args.accountId)}/messages`;
  const url = appsecretProof ? `${baseUrl}?appsecret_proof=${appsecretProof}` : baseUrl;

  const payload: Record<string, any> = {
    recipient: { id: args.recipientId },
    message: { text: args.message },
    access_token: args.accessToken,
  };

  if (args.platform === 'messenger') {
    payload.messaging_type = 'RESPONSE';
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
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
    graphNodeId: args.account.graphNodeId,
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

// ────────────────────────────────────────────────────────────────────────────
// Facebook OAuth / Page-connect helpers (per-tenant SaaS flow)
// ────────────────────────────────────────────────────────────────────────────

export type ManagedPage = {
  pageId: string;
  name: string;
  picture?: string;
  pageAccessToken: string;
  hasInstagram: boolean;
  instagramId?: string;
};

/**
 * Exchange a short-lived user access token (from FB.login on the client) for a
 * long-lived one. Page tokens derived from a long-lived user token never expire,
 * which is what we want for an always-on inbox. Falls back to the input token if
 * app credentials are missing or the exchange fails (so connect still works in dev).
 */
export async function exchangeLongLivedUserToken(shortToken: string): Promise<string> {
  const token = cleanString(shortToken);
  if (!token || !META_APP_ID || !META_INBOX_APP_SECRET) return token;
  const url = `${GRAPH_BASE}/oauth/access_token?grant_type=fb_exchange_token`
    + `&client_id=${encodeURIComponent(META_APP_ID)}`
    + `&client_secret=${encodeURIComponent(META_INBOX_APP_SECRET)}`
    + `&fb_exchange_token=${encodeURIComponent(token)}`;
  const res = await fetch(url, { cache: 'no-store' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.error) {
    console.warn('[socialInbox] long-lived token exchange failed:', data?.error?.message);
    return token;
  }
  return cleanString(data?.access_token) || token;
}

/**
 * List the Facebook Pages the user manages, each with its own Page access token.
 * Page tokens are secrets and must never be returned to the browser — callers
 * strip them before responding.
 */
export async function listManagedPages(userAccessToken: string): Promise<ManagedPage[]> {
  const fields = 'id,name,access_token,picture{url},instagram_business_account{id}';
  const proof = appsecretProof(userAccessToken);
  let next: string | null = `${GRAPH_BASE}/me/accounts?fields=${encodeURIComponent(fields)}&limit=100`
    + `&access_token=${encodeURIComponent(userAccessToken)}`
    + (proof ? `&appsecret_proof=${proof}` : '');

  const pages: ManagedPage[] = [];
  let guard = 0;
  while (next && guard < 10) {
    guard += 1;
    const res = await fetch(next, { cache: 'no-store' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data?.error) {
      throw new Error(data?.error?.message || 'Failed to list Facebook Pages');
    }
    for (const p of (Array.isArray(data?.data) ? data.data : [])) {
      const pageId = cleanString(p?.id);
      const pageAccessToken = cleanString(p?.access_token);
      if (!pageId || !pageAccessToken) continue;
      pages.push({
        pageId,
        name: cleanString(p?.name) || pageId,
        picture: cleanString(p?.picture?.data?.url) || undefined,
        pageAccessToken,
        hasInstagram: Boolean(p?.instagram_business_account?.id),
        instagramId: cleanString(p?.instagram_business_account?.id) || undefined,
      });
    }
    next = cleanString(data?.paging?.next) || null;
  }
  return pages;
}

/**
 * Subscribe a Page to this app's webhook so Meta delivers Messenger events to
 * /api/webhooks/meta-inbox. Without this, no inbound messages arrive.
 */
export async function subscribePageToWebhook(pageId: string, pageAccessToken: string): Promise<boolean> {
  const subscribedFields = 'messages,messaging_postbacks,message_deliveries,message_reads,messaging_referrals,message_reactions';
  const params = new URLSearchParams({ subscribed_fields: subscribedFields, access_token: pageAccessToken });
  const proof = appsecretProof(pageAccessToken);
  if (proof) params.set('appsecret_proof', proof);
  const res = await fetch(`${GRAPH_BASE}/${encodeURIComponent(pageId)}/subscribed_apps`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
    cache: 'no-store',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.error) {
    console.warn('[socialInbox] subscribePageToWebhook failed:', data?.error?.message);
    return false;
  }
  return true;
}

/**
 * Best-effort fetch of a participant's public profile (name / username / avatar)
 * using the Page access token. Messenger webhooks rarely include the sender name
 * and Instagram webhooks never do — without this they show as "Unknown".
 */
export async function fetchSocialParticipantProfile(
  platform: SocialInboxPlatform,
  participantId: string,
  accessToken: string,
): Promise<{ name?: string; username?: string; profilePic?: string }> {
  try {
    const fields = platform === 'instagram' ? 'name,username,profile_pic' : 'name,profile_pic';
    const proof = appsecretProof(accessToken);
    const url = `${GRAPH_BASE}/${encodeURIComponent(participantId)}?fields=${fields}`
      + `&access_token=${encodeURIComponent(accessToken)}`
      + (proof ? `&appsecret_proof=${proof}` : '');
    const res = await fetch(url, { cache: 'no-store' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data?.error) return {};
    return {
      name: cleanString(data?.name) || undefined,
      username: cleanString(data?.username) || undefined,
      profilePic: cleanString(data?.profile_pic) || undefined,
    };
  } catch {
    return {};
  }
}

function isGenericParticipantName(name: string): boolean {
  const n = cleanString(name);
  return !n || n === 'Unknown' || /^User\s/.test(n);
}

function mapAttachmentMessageType(mimeType: string): SocialInboxParsedEvent['messageType'] {
  const m = mimeType.toLowerCase();
  if (m.startsWith('image/')) return 'image';
  if (m.startsWith('video/')) return 'video';
  if (m.startsWith('audio/')) return 'audio';
  if (m) return 'document';
  return 'unsupported';
}

/**
 * Import historical Messenger/Instagram conversations + messages for a connected
 * account into the social inbox. Uses the SAME colon-format conversationKey as the
 * live webhook path (getConversationKey) and dedupes messages by externalMessageId,
 * so it merges cleanly with live conversations and is safe to re-run.
 */
export async function importFacebookConversationHistory(
  resolvedAccount: ResolvedSocialInboxAccount & { ownerUserId?: string },
  opts: { maxConversations?: number; messagesPerConv?: number } = {},
): Promise<{ conversations: number; messages: number }> {
  const maxConversations = opts.maxConversations ?? 100;
  const messagesPerConv = opts.messagesPerConv ?? 25;
  const Conversation = getSocialInboxConversation();
  const Message = getSocialInboxMessage();
  const now = new Date();
  const ownerId = resolvedAccount.ownerUserId || resolvedAccount.scope.ownerUserId;
  const scopeFilter = {
    accountScopeType: resolvedAccount.scope.scopeType,
    accountScopeKey: resolvedAccount.scope.scopeKey,
  };

  const platformParam = resolvedAccount.platform === 'instagram' ? '&platform=instagram' : '';
  const fields = `participants,updated_time,messages.limit(${messagesPerConv}){id,message,from,to,created_time,attachments}`;
  const proof = appsecretProof(resolvedAccount.accessToken);
  let next: string | null = `${GRAPH_BASE}/${encodeURIComponent(resolvedAccount.graphNodeId)}/conversations`
    + `?fields=${encodeURIComponent(fields)}&limit=50${platformParam}`
    + `&access_token=${encodeURIComponent(resolvedAccount.accessToken)}`
    + (proof ? `&appsecret_proof=${proof}` : '');

  let convCount = 0;
  let msgCount = 0;
  let guard = 0;

  while (next && guard < 20 && convCount < maxConversations) {
    guard += 1;
    const res = await fetch(next, { cache: 'no-store' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data?.error) {
      console.warn('[socialInbox] history fetch failed:', data?.error?.message);
      break;
    }

    for (const conv of (Array.isArray(data?.data) ? data.data : [])) {
      if (convCount >= maxConversations) break;
      const participants = Array.isArray(conv?.participants?.data) ? conv.participants.data : [];
      const participant = participants.find((p: any) => cleanString(p?.id) !== resolvedAccount.accountId) || participants[0];
      const participantId = cleanString(participant?.id);
      if (!participantId) continue;
      const participantName = cleanString(participant?.name) || cleanString(participant?.username) || `User ${participantId.slice(-6)}`;
      const conversationKey = getConversationKey(resolvedAccount.platform, resolvedAccount.accountId, participantId);

      const rawMessages = Array.isArray(conv?.messages?.data) ? conv.messages.data : [];
      // Graph returns newest-first; sort ascending so the inbox renders in order.
      const sorted = [...rawMessages].sort(
        (a, b) => new Date(a?.created_time || 0).getTime() - new Date(b?.created_time || 0).getTime(),
      );

      const lastMsg = sorted[sorted.length - 1];
      const lastDirection: 'inbound' | 'outbound' = lastMsg && cleanString(lastMsg?.from?.id) === resolvedAccount.accountId ? 'outbound' : 'inbound';
      const lastAt = lastMsg?.created_time ? new Date(lastMsg.created_time) : (conv?.updated_time ? new Date(conv.updated_time) : now);

      await Conversation.updateOne(
        { conversationKey, ...scopeFilter },
        {
          $set: {
            platform: resolvedAccount.platform,
            accountId: resolvedAccount.accountId,
            accountName: resolvedAccount.accountName,
            accountHandle: resolvedAccount.accountHandle,
            participantId,
            participantName,
            lastMessage: cleanString(lastMsg?.message) || (sorted.length ? '[media]' : '[Imported conversation]'),
            lastMessageAt: lastAt,
            lastMessageDirection: lastDirection,
            updatedAt: now,
          },
          $setOnInsert: {
            conversationKey,
            ...scopeFilter,
            createdByUserId: ownerId,
            assignedToUserId: ownerId,
            status: 'new_lead',
            labels: [],
            notes: '',
            unreadCount: 0,
            isBlocked: false,
            createdAt: now,
          },
        },
        { upsert: true },
      );
      convCount += 1;

      const conversationDoc = await Conversation.findOne({ conversationKey, ...scopeFilter }).select('_id').lean<any>();
      if (!conversationDoc?._id) continue;

      for (const m of sorted) {
        const externalMessageId = cleanString(m?.id);
        const direction: 'inbound' | 'outbound' = cleanString(m?.from?.id) === resolvedAccount.accountId ? 'outbound' : 'inbound';
        const text = cleanString(m?.message);
        const firstAttachment = Array.isArray(m?.attachments?.data) ? m.attachments.data[0] : undefined;
        const mediaUrl = cleanString(
          firstAttachment?.image_data?.url || firstAttachment?.video_data?.url || firstAttachment?.file_url,
        );
        const mimeType = cleanString(firstAttachment?.mime_type);
        if (!externalMessageId && !text && !mediaUrl) continue;

        const messageDoc: Record<string, any> = {
          conversationId: conversationDoc._id,
          conversationKey,
          platform: resolvedAccount.platform,
          ...scopeFilter,
          accountId: resolvedAccount.accountId,
          externalMessageId: externalMessageId || undefined,
          senderId: direction === 'inbound' ? participantId : resolvedAccount.accountId,
          recipientId: direction === 'inbound' ? resolvedAccount.accountId : participantId,
          direction,
          messageContent: text || '',
          messageType: text ? 'text' : mapAttachmentMessageType(mimeType),
          mediaUrl: mediaUrl || '',
          mediaType: mimeType || (firstAttachment ? 'media' : ''),
          sentAt: m?.created_time ? new Date(m.created_time) : now,
          isRead: true,
          metadata: m || {},
        };

        if (externalMessageId) {
          const result = await Message.updateOne(
            { platform: resolvedAccount.platform, ...scopeFilter, externalMessageId },
            { $setOnInsert: messageDoc },
            { upsert: true },
          );
          if ((result as any).upsertedCount > 0) msgCount += 1;
        } else {
          await Message.create(messageDoc);
          msgCount += 1;
        }
      }
    }

    next = cleanString(data?.paging?.next) || null;
  }

  return { conversations: convCount, messages: msgCount };
}

export function getDecodedTokenFromRequest(request: Request | { headers: Headers }) {
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : '';
  return verifyToken(token);
}
