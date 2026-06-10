import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { resolveSocialMediaScope } from '@/lib/socialMediaScope';
import { exchangeLongLivedUserToken, listManagedPages } from '@/lib/socialInbox';
import { connectFacebookPageForScope } from '@/lib/socialMediaConnect';

export const dynamic = 'force-dynamic';

/**
 * Per-tenant Facebook Page connect for the social inbox (SaaS, ~1000 tenants).
 *
 * Flow:
 *   1. Client runs FB.login (our shared Meta App) and gets a short-lived user token.
 *   2. POST { action: 'list-pages', userAccessToken } → we exchange for a long-lived
 *      token and return the Pages the user manages (no Page tokens leave the server).
 *   3. POST { action: 'connect-page', userAccessToken, pageId } → we persist that Page
 *      scoped to this tenant, subscribe it to our webhook, and import old conversations.
 */
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const action = String(body?.action || '').trim();
    const userAccessToken = String(body?.userAccessToken || '').trim();

    if (!userAccessToken) {
      return NextResponse.json({ error: 'Facebook access token is required' }, { status: 400 });
    }

    await connectDB();
    const scope = await resolveSocialMediaScope(decoded);

    // Exchange the short-lived token from FB.login for a long-lived one so the
    // derived Page tokens never expire.
    const longLivedToken = await exchangeLongLivedUserToken(userAccessToken);

    let pages;
    try {
      pages = await listManagedPages(longLivedToken);
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : 'Failed to read your Facebook Pages' },
        { status: 400 },
      );
    }

    if (pages.length === 0) {
      return NextResponse.json(
        {
          error:
            'No Facebook Pages found. Make sure you are an admin of a Page and granted the pages_show_list and pages_messaging permissions.',
        },
        { status: 400 },
      );
    }

    if (action === 'list-pages') {
      // Never return Page access tokens to the browser.
      return NextResponse.json({
        success: true,
        pages: pages.map((p) => ({
          pageId: p.pageId,
          name: p.name,
          picture: p.picture || null,
          hasInstagram: p.hasInstagram,
        })),
        scope: { type: scope.scopeType, key: scope.scopeKey, label: scope.scopeLabel },
      });
    }

    if (action === 'connect-page') {
      const pageId = String(body?.pageId || '').trim();
      const selected = pages.find((p) => p.pageId === pageId) || (pages.length === 1 ? pages[0] : null);
      if (!selected) {
        return NextResponse.json(
          { error: 'Select which Facebook Page to connect.' },
          { status: 400 },
        );
      }

      const result = await connectFacebookPageForScope({
        scope,
        pageId: selected.pageId,
        pageAccessToken: selected.pageAccessToken,
      });

      return NextResponse.json({
        success: true,
        message: `Connected ${result.connectionInfo.pageName}. Imported ${result.history.conversations} conversation(s).`,
        account: {
          _id: result.account._id,
          platform: result.account.platform,
          accountId: result.account.accountId,
          accountName: result.account.accountName,
          accountHandle: result.account.accountHandle,
        },
        instagramConnected: Boolean(result.instagramAccount),
        webhookSubscribed: result.subscribed,
        imported: result.history,
        scope: { type: scope.scopeType, key: scope.scopeKey, label: scope.scopeLabel },
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('[social-inbox oauth]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Facebook connection failed' },
      { status: 500 },
    );
  }
}
