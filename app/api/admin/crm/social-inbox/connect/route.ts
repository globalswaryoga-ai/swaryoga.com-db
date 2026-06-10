import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';
import { resolveSocialMediaScope } from '@/lib/socialMediaScope';
import { connectFacebookPageForScope } from '@/lib/socialMediaConnect';

export const dynamic = 'force-dynamic';

const PAGE_ACCESS_TOKEN = process.env.META_PAGE_ACCESS_TOKEN || '';
const FACEBOOK_PAGE_ID = process.env.META_FACEBOOK_PAGE_ID || '';

/**
 * Super-admin-only env fallback for connecting the shared Facebook Page using
 * META_PAGE_ACCESS_TOKEN / META_FACEBOOK_PAGE_ID.
 *
 * Tenants must use the per-tenant OAuth flow at /api/admin/crm/social-inbox/oauth
 * (FB.login → pick Page). This route stays only so the owner can wire up the
 * shared Page without going through Facebook Login. It reuses the same correct,
 * scope-keyed connect path (persist + subscribe webhook + import history).
 */
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }
    if (!isSuperAdmin(decoded)) {
      return NextResponse.json(
        { error: 'Use the “Connect Facebook Page” button to connect your own Page.' },
        { status: 403 },
      );
    }

    const { platform } = await request.json().catch(() => ({}));
    if (platform && !['facebook', 'instagram'].includes(platform)) {
      return NextResponse.json({ error: 'Invalid platform' }, { status: 400 });
    }

    if (!PAGE_ACCESS_TOKEN || !FACEBOOK_PAGE_ID) {
      return NextResponse.json(
        { error: 'Shared Page not configured. Set META_PAGE_ACCESS_TOKEN and META_FACEBOOK_PAGE_ID.' },
        { status: 400 },
      );
    }

    await connectDB();
    const scope = await resolveSocialMediaScope(decoded);

    // Connecting the Page auto-links any Instagram business account, subscribes the
    // webhook, and imports historical conversations.
    const result = await connectFacebookPageForScope({
      scope,
      pageId: FACEBOOK_PAGE_ID,
      pageAccessToken: PAGE_ACCESS_TOKEN,
    });

    return NextResponse.json({
      success: true,
      message: `Connected ${result.connectionInfo.pageName}. Imported ${result.history.conversations} conversation(s).`,
      platform: 'facebook',
      accountName: result.connectionInfo.pageName,
      instagramConnected: Boolean(result.instagramAccount),
      webhookSubscribed: result.subscribed,
      imported: result.history,
    });
  } catch (error) {
    console.error('[social-inbox connect]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Connection failed' },
      { status: 500 },
    );
  }
}
