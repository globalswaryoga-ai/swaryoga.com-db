import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { encryptCredential } from '@/lib/encryption';
import { resolveSocialMediaScope } from '@/lib/socialMediaScope';
import { fetchFacebookConnectionInfo, upsertConnectedAccount } from '@/lib/socialMediaConnect';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization');
    const decoded = verifyToken(authHeader || undefined);
    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 401 });
    }

    const scope = await resolveSocialMediaScope(decoded);
    let accounts: any[] = [];
    try {
      const { bunnyExecute } = await import('@/lib/bunnyDatabase');
      const res = await bunnyExecute({
        sql: "SELECT id, document_json FROM mongo_documents WHERE collection_name = 'socialmediaaccounts'",
      });
      for (const row of res.rows) {
        try {
          const parsed = JSON.parse(String(row.document_json || '{}'));
          if (parsed.isConnected && (scope.scopeType === 'super_admin' || (parsed.scopeType === 'tenant' && parsed.scopeKey === scope.scopeKey))) {
            const { accessToken: _at, refreshToken: _rt, ...safe } = parsed;
            if (!safe._id) safe._id = String(row.id);
            accounts.push(safe);
          }
        } catch {}
      }
    } catch (bunnyErr: any) {
      console.error('[SocialMedia] Bunny DB error:', bunnyErr.message);
    }

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
    const authHeader = request.headers.get('authorization');
    const decoded = verifyToken(authHeader || undefined);
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
    const { bunnyExecute } = await import('@/lib/bunnyDatabase');
    const res = await bunnyExecute({
      sql: "SELECT id, document_json FROM mongo_documents WHERE collection_name = 'socialmediaaccounts'"
    });
    
    let existingAccount: any = null;
    for (const row of res.rows) {
      try {
        const parsed = JSON.parse(String(row.document_json || '{}'));
        if (
          parsed.platform === platform &&
          parsed.accountId === resolvedAccountId &&
          (scope.scopeType === 'super_admin' ? (parsed.scopeType === 'super_admin' || !parsed.scopeType) : (parsed.scopeType === 'tenant' && parsed.scopeKey === scope.scopeKey))
        ) {
          existingAccount = parsed;
          break;
        }
      } catch {}
    }

    if (existingAccount) {
      return NextResponse.json(
        { error: 'Account already connected' },
        { status: 400 }
      );
    }

    // Encrypt sensitive tokens
    const encryptedAccessToken = encryptCredential(accessToken);
    const encryptedRefreshToken = refreshToken ? encryptCredential(refreshToken) : '';

    const crypto = await import('crypto');
    const newId = crypto.randomUUID();

    // Create new social media account
    const newAccount = {
      _id: newId,
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
      connectedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await bunnyExecute({
      sql: "INSERT INTO mongo_documents (id, collection_name, document_json, created_at, updated_at) VALUES (?, 'socialmediaaccounts', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
      args: [newId, JSON.stringify(newAccount)]
    });

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
