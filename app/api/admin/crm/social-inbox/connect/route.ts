import { NextRequest, NextResponse } from 'next/server';
import { connectDB, SocialMediaAccount } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { encryptCredential } from '@/lib/encryption';
import { resolveSocialMediaScope } from '@/lib/socialMediaScope';

export const dynamic = 'force-dynamic';

const FACEBOOK_GRAPH_API = 'https://graph.facebook.com/v24.0';
const PAGE_ACCESS_TOKEN = process.env.META_PAGE_ACCESS_TOKEN || '';
const FACEBOOK_PAGE_ID = process.env.META_FACEBOOK_PAGE_ID || '';
const INSTAGRAM_ACCOUNT_ID = process.env.META_INSTAGRAM_ACCOUNT_ID || '';

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { platform } = await request.json();
    if (!platform || !['facebook', 'instagram'].includes(platform)) {
      return NextResponse.json({ error: 'Invalid platform' }, { status: 400 });
    }

    if (!PAGE_ACCESS_TOKEN) {
      return NextResponse.json(
        { error: 'Page access token not configured. Add META_PAGE_ACCESS_TOKEN to environment.' },
        { status: 400 }
      );
    }

    await connectDB();
    const scope = await resolveSocialMediaScope(decoded);

    let accountId: string;
    let accountName: string;
    let accountHandle: string;

    if (platform === 'facebook') {
      if (!FACEBOOK_PAGE_ID) {
        return NextResponse.json(
          { error: 'Facebook Page ID not configured. Add META_FACEBOOK_PAGE_ID to environment.' },
          { status: 400 }
        );
      }
      accountId = FACEBOOK_PAGE_ID;

      // Get page name from Graph API
      const pageRes = await fetch(`${FACEBOOK_GRAPH_API}/${FACEBOOK_PAGE_ID}?access_token=${PAGE_ACCESS_TOKEN}`);
      const pageData = await pageRes.json();
      accountName = pageData.name || 'Facebook Page';
      accountHandle = pageData.handle || '';
    } else {
      if (!INSTAGRAM_ACCOUNT_ID) {
        return NextResponse.json(
          { error: 'Instagram Account ID not configured. Add META_INSTAGRAM_ACCOUNT_ID to environment.' },
          { status: 400 }
        );
      }
      accountId = INSTAGRAM_ACCOUNT_ID;

      // Get Instagram account info from Graph API
      const igRes = await fetch(`${FACEBOOK_GRAPH_API}/${INSTAGRAM_ACCOUNT_ID}?fields=username,name&access_token=${PAGE_ACCESS_TOKEN}`);
      const igData = await igRes.json();
      accountName = igData.name || 'Instagram Account';
      accountHandle = igData.username || '';
    }

    const encryptedToken = encryptCredential(PAGE_ACCESS_TOKEN);

    // Upsert account
    await SocialMediaAccount.findOneAndUpdate(
      {
        platform,
        accountScopeType: scope.scopeType,
        accountScopeKey: scope.scopeKey,
      },
      {
        $set: {
          accountId,
          accountName,
          accountHandle,
          accessToken: encryptedToken,
          isConnected: true,
          connectedAt: new Date(),
          updatedAt: new Date(),
        },
      },
      { upsert: true, new: true }
    );

    return NextResponse.json({
      success: true,
      message: `${platform} account connected successfully`,
      platform,
      accountName,
    });
  } catch (error) {
    console.error('[social-inbox connect]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Connection failed' },
      { status: 500 }
    );
  }
}
