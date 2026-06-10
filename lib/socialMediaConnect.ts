import crypto from 'crypto';
import { SocialMediaAccount } from '@/lib/db';
import { encryptCredential } from '@/lib/encryption';
import { buildSocialMediaScopeFilter, type SocialMediaScope } from '@/lib/socialMediaScope';
import {
  importFacebookConversationHistory,
  resolveSocialInboxAccountByAccountId,
  subscribePageToWebhook,
} from '@/lib/socialInbox';

const META_GRAPH_API_VERSION = process.env.META_GRAPH_API_VERSION || 'v24.0';
const META_APP_SECRET = process.env.META_APP_SECRET || '';

export type UpsertSocialAccountInput = {
  scope: SocialMediaScope;
  platform: 'facebook' | 'instagram' | 'youtube' | 'x' | 'linkedin' | 'tiktok';
  accountName: string;
  accountHandle: string;
  accountId: string;
  accountEmail?: string;
  accessToken: string;
  refreshToken?: string;
  metadata?: Record<string, any>;
};

export type FacebookConnectionInfo = {
  pageName: string;
  pageId: string;
  pageHandle?: string;
  pageProfileImage?: string;
  instagram?: {
    id: string;
    username?: string;
    name?: string;
    profileImage?: string;
    followers?: number;
    postsCount?: number;
  };
};

/**
 * Upsert a connected social account scoped to a single tenant (or super admin).
 * Writes the canonical scope fields (scopeType/scopeKey/ownerUserId/tenantSlug)
 * that buildSocialMediaScopeFilter reads — this is the ONLY correct way to persist
 * a SocialMediaAccount for the multi-tenant inbox.
 */
export async function upsertConnectedAccount(input: UpsertSocialAccountInput) {
  const encryptedAccessToken = encryptCredential(input.accessToken);
  const encryptedRefreshToken = input.refreshToken ? encryptCredential(input.refreshToken) : '';

  const existingAccount = await SocialMediaAccount.findOne({
    ...buildSocialMediaScopeFilter(input.scope),
    platform: input.platform,
    accountId: input.accountId,
  });

  if (existingAccount) {
    existingAccount.accountName = input.accountName;
    existingAccount.accountHandle = input.accountHandle;
    existingAccount.accountEmail = input.accountEmail || existingAccount.accountEmail || '';
    existingAccount.accessToken = encryptedAccessToken;
    existingAccount.refreshToken = encryptedRefreshToken || existingAccount.refreshToken || '';
    existingAccount.metadata = {
      ...(existingAccount.metadata || {}),
      ...(input.metadata || {}),
    };
    existingAccount.scopeType = input.scope.scopeType;
    existingAccount.scopeKey = input.scope.scopeKey;
    existingAccount.ownerUserId = input.scope.ownerUserId;
    existingAccount.tenantSlug = input.scope.tenantSlug;
    existingAccount.isConnected = true;
    existingAccount.connectedAt = existingAccount.connectedAt || new Date();
    existingAccount.disconnectedAt = undefined;
    existingAccount.updatedAt = new Date();
    await existingAccount.save();
    return { account: existingAccount, created: false };
  }

  const newAccount = new SocialMediaAccount({
    scopeType: input.scope.scopeType,
    scopeKey: input.scope.scopeKey,
    ownerUserId: input.scope.ownerUserId,
    tenantSlug: input.scope.tenantSlug,
    platform: input.platform,
    accountName: input.accountName,
    accountHandle: input.accountHandle,
    accountId: input.accountId,
    accountEmail: input.accountEmail,
    accessToken: encryptedAccessToken,
    refreshToken: encryptedRefreshToken,
    metadata: input.metadata || {},
    isConnected: true,
    connectedAt: new Date(),
  });

  await newAccount.save();
  return { account: newAccount, created: true };
}

/**
 * Fetch a Facebook Page's display info + any linked Instagram business account.
 */
export async function fetchFacebookConnectionInfo(pageId: string, accessToken: string): Promise<FacebookConnectionInfo> {
  const fields = [
    'id',
    'name',
    'username',
    'picture{url}',
    'instagram_business_account{id,username,name,profile_picture_url,followers_count,media_count}',
  ].join(',');

  let url = `https://graph.facebook.com/${META_GRAPH_API_VERSION}/${pageId}?fields=${encodeURIComponent(fields)}&access_token=${encodeURIComponent(accessToken)}`;

  // Add appsecret_proof for server-side API calls
  if (META_APP_SECRET) {
    const appsecretProof = crypto.createHmac('sha256', META_APP_SECRET).update(accessToken).digest('hex');
    url += `&appsecret_proof=${appsecretProof}`;
  }

  const response = await fetch(url, { cache: 'no-store' });
  const data = await response.json().catch(() => ({}));

  if (!response.ok || data?.error) {
    throw new Error(data?.error?.message || 'Failed to fetch Facebook Page connection details');
  }

  return {
    pageName: data?.name || pageId,
    pageId: data?.id || pageId,
    pageHandle: data?.username ? `@${String(data.username).replace(/^@/, '')}` : undefined,
    pageProfileImage: data?.picture?.data?.url,
    instagram: data?.instagram_business_account?.id
      ? {
          id: String(data.instagram_business_account.id),
          username: data.instagram_business_account.username,
          name: data.instagram_business_account.name,
          profileImage: data.instagram_business_account.profile_picture_url,
          followers: typeof data.instagram_business_account.followers_count === 'number' ? data.instagram_business_account.followers_count : 0,
          postsCount: typeof data.instagram_business_account.media_count === 'number' ? data.instagram_business_account.media_count : 0,
        }
      : undefined,
  };
}

/**
 * Full per-tenant Facebook Page connect: persist the Page (and any linked Instagram)
 * scoped to the tenant, subscribe the Page to our webhook, and import historical
 * conversations into the inbox. Used by both the OAuth endpoint and the super-admin
 * env fallback.
 */
export async function connectFacebookPageForScope(args: {
  scope: SocialMediaScope;
  pageId: string;
  pageAccessToken: string;
}): Promise<{
  account: any;
  instagramAccount: any | null;
  subscribed: boolean;
  history: { conversations: number; messages: number };
  connectionInfo: FacebookConnectionInfo;
}> {
  const connectionInfo = await fetchFacebookConnectionInfo(args.pageId, args.pageAccessToken);
  const facebookHandle = (connectionInfo.pageHandle || '').trim() || `page_${connectionInfo.pageId}`;

  const facebookResult = await upsertConnectedAccount({
    scope: args.scope,
    platform: 'facebook',
    accountName: connectionInfo.pageName,
    accountHandle: facebookHandle,
    accountId: connectionInfo.pageId,
    accessToken: args.pageAccessToken,
    metadata: {
      profileImage: connectionInfo.pageProfileImage,
      messengerConnected: true,
      linkedInstagramAccountId: connectionInfo.instagram?.id || null,
    },
  });

  let instagramResult: { account: any; created: boolean } | null = null;
  if (connectionInfo.instagram?.id) {
    instagramResult = await upsertConnectedAccount({
      scope: args.scope,
      platform: 'instagram',
      accountName: connectionInfo.instagram.name || connectionInfo.instagram.username || `${connectionInfo.pageName} Instagram`,
      accountHandle: connectionInfo.instagram.username
        ? `@${String(connectionInfo.instagram.username).replace(/^@/, '')}`
        : `ig_${connectionInfo.instagram.id}`,
      accountId: connectionInfo.instagram.id,
      accessToken: args.pageAccessToken,
      metadata: {
        autoConnectedVia: 'facebook',
        linkedPageId: connectionInfo.pageId,
        linkedPageName: connectionInfo.pageName,
        profileImage: connectionInfo.instagram.profileImage,
        followers: connectionInfo.instagram.followers || 0,
        postsCount: connectionInfo.instagram.postsCount || 0,
      },
    });
  }

  // Subscribe the Page to our app webhook so Meta delivers inbound messages.
  const subscribed = await subscribePageToWebhook(connectionInfo.pageId, args.pageAccessToken);

  // Import old conversations + messages into the inbox (idempotent).
  const history = { conversations: 0, messages: 0 };
  // Messenger history (keyed by the Page id).
  try {
    const resolved = await resolveSocialInboxAccountByAccountId('messenger', connectionInfo.pageId);
    if (resolved) {
      const messengerHistory = await importFacebookConversationHistory(resolved);
      history.conversations += messengerHistory.conversations;
      history.messages += messengerHistory.messages;
    }
  } catch (err) {
    console.warn('[socialMediaConnect] Messenger history import failed:', err);
  }
  // Instagram DM history (keyed by the linked IG business account id).
  if (connectionInfo.instagram?.id) {
    try {
      const resolvedIg = await resolveSocialInboxAccountByAccountId('instagram', connectionInfo.instagram.id);
      if (resolvedIg) {
        const igHistory = await importFacebookConversationHistory(resolvedIg);
        history.conversations += igHistory.conversations;
        history.messages += igHistory.messages;
      }
    } catch (err) {
      console.warn('[socialMediaConnect] Instagram history import failed:', err);
    }
  }

  return {
    account: facebookResult.account,
    instagramAccount: instagramResult?.account || null,
    subscribed,
    history,
    connectionInfo,
  };
}
