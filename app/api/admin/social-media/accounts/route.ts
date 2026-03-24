import { NextRequest, NextResponse } from 'next/server';
import { connectDB, SocialMediaAccount } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { encryptCredential } from '@/lib/encryption';
import { buildSocialMediaScopeFilter, resolveSocialMediaScope, type SocialMediaScope } from '@/lib/socialMediaScope';

const META_GRAPH_API_VERSION = process.env.META_GRAPH_API_VERSION || 'v24.0';

type UpsertSocialAccountInput = {
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

type FacebookConnectionInfo = {
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

async function upsertConnectedAccount(input: UpsertSocialAccountInput) {
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

async function fetchFacebookConnectionInfo(pageId: string, accessToken: string): Promise<FacebookConnectionInfo> {
  const fields = [
    'id',
    'name',
    'username',
    'picture{url}',
    'instagram_business_account{id,username,name,profile_picture_url,followers_count,media_count}',
  ].join(',');
  const url = `https://graph.facebook.com/${META_GRAPH_API_VERSION}/${pageId}?fields=${encodeURIComponent(fields)}&access_token=${encodeURIComponent(accessToken)}`;
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

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 401 });
    }

    // Connect to database
    await connectDB();
    const scope = await resolveSocialMediaScope(decoded);

    // Fetch all connected social media accounts
    const accounts = await SocialMediaAccount.find({
      isConnected: true,
      ...buildSocialMediaScopeFilter(scope),
    })
      .select('-accessToken -refreshToken') // Don't return encrypted tokens to client
      .lean();

    return NextResponse.json({
      success: true,
      data: accounts,
      scope: {
        type: scope.scopeType,
        key: scope.scopeKey,
        label: scope.scopeLabel,
      },
    });
  } catch (error) {
    console.error('Error fetching social media accounts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch accounts' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 401 });
    }

    const { platform, accountName, accountHandle, accountId, accountEmail, accessToken, refreshToken, metadata } = await request.json();

    // Allow accountId to be omitted by the setup UI; use handle as a stable identifier.
    const resolvedAccountId = (accountId || accountHandle || '').toString().trim();

    // Validate required fields
    if (!platform || !accountName || !accountHandle || !resolvedAccountId || !accessToken) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    await connectDB();
    const scope = await resolveSocialMediaScope(decoded);

    if (platform === 'facebook') {
      const connectionInfo = await fetchFacebookConnectionInfo(resolvedAccountId, accessToken);
      const facebookHandle = (accountHandle || connectionInfo.pageHandle || '').trim() || `page_${connectionInfo.pageId}`;

      const facebookResult = await upsertConnectedAccount({
        scope,
        platform: 'facebook',
        accountName: connectionInfo.pageName || accountName,
        accountHandle: facebookHandle,
        accountId: connectionInfo.pageId,
        accountEmail,
        accessToken,
        refreshToken,
        metadata: {
          ...(metadata || {}),
          profileImage: connectionInfo.pageProfileImage,
          messengerConnected: true,
          linkedInstagramAccountId: connectionInfo.instagram?.id || null,
        },
      });

      const autoConnectedPlatforms = ['messenger'];
      let instagramResult: { account: any; created: boolean } | null = null;

      if (connectionInfo.instagram?.id) {
        instagramResult = await upsertConnectedAccount({
          scope,
          platform: 'instagram',
          accountName: connectionInfo.instagram.name || connectionInfo.instagram.username || `${connectionInfo.pageName} Instagram`,
          accountHandle: connectionInfo.instagram.username ? `@${String(connectionInfo.instagram.username).replace(/^@/, '')}` : `ig_${connectionInfo.instagram.id}`,
          accountId: connectionInfo.instagram.id,
          accessToken,
          metadata: {
            autoConnectedVia: 'facebook',
            linkedPageId: connectionInfo.pageId,
            linkedPageName: connectionInfo.pageName,
            profileImage: connectionInfo.instagram.profileImage,
            followers: connectionInfo.instagram.followers || 0,
            postsCount: connectionInfo.instagram.postsCount || 0,
          },
        });
        autoConnectedPlatforms.push('instagram');
      }

      const verb = facebookResult.created ? 'connected' : 'updated';
      const autoSummary = autoConnectedPlatforms.includes('instagram')
        ? ' Messenger and linked Instagram were connected automatically.'
        : ' Messenger is now linked automatically. No Instagram Business account was found on that Page yet.';

      return NextResponse.json(
        {
          success: true,
          message: `Facebook Page ${verb} successfully.${autoSummary}`,
          data: {
            _id: facebookResult.account._id,
            platform: facebookResult.account.platform,
            accountName: facebookResult.account.accountName,
            accountHandle: facebookResult.account.accountHandle,
            scope: {
              type: scope.scopeType,
              key: scope.scopeKey,
              label: scope.scopeLabel,
            },
            autoConnectedPlatforms,
            messengerPageId: connectionInfo.pageId,
            instagramAccount: instagramResult
              ? {
                  _id: instagramResult.account._id,
                  accountId: instagramResult.account.accountId,
                  accountName: instagramResult.account.accountName,
                  accountHandle: instagramResult.account.accountHandle,
                  created: instagramResult.created,
                }
              : null,
          },
        },
        { status: facebookResult.created ? 201 : 200 }
      );
    }

    // Check if account already exists
    const existingAccount = await SocialMediaAccount.findOne({
      ...buildSocialMediaScopeFilter(scope),
      platform,
      accountId: resolvedAccountId,
    });

    if (existingAccount) {
      return NextResponse.json(
        { error: 'Account already connected' },
        { status: 400 }
      );
    }

    // Encrypt sensitive tokens
    const encryptedAccessToken = encryptCredential(accessToken);
    const encryptedRefreshToken = refreshToken ? encryptCredential(refreshToken) : '';

    // Create new social media account
    const newAccount = new SocialMediaAccount({
      scopeType: scope.scopeType,
      scopeKey: scope.scopeKey,
      ownerUserId: scope.ownerUserId,
      tenantSlug: scope.tenantSlug,
      platform,
      accountName,
      accountHandle,
      accountId: resolvedAccountId,
      accountEmail,
      accessToken: encryptedAccessToken,
      refreshToken: encryptedRefreshToken,
      metadata: metadata || {},
      isConnected: true,
      connectedAt: new Date(),
    });

    await newAccount.save();

    return NextResponse.json(
      {
        success: true,
        message: 'Account connected successfully',
        data: {
          _id: newAccount._id,
          platform: newAccount.platform,
          accountName: newAccount.accountName,
          accountHandle: newAccount.accountHandle,
          scope: {
            type: scope.scopeType,
            key: scope.scopeKey,
            label: scope.scopeLabel,
          },
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error connecting social media account:', error);
    return NextResponse.json(
      { error: 'Failed to connect account' },
      { status: 500 }
    );
  }
}
