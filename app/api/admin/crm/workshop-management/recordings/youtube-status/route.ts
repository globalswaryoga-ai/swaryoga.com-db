import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { decryptCredential } from '@/lib/encryption';
import { bunnyExecute } from '@/lib/bunnyDatabase';

export const dynamic = 'force-dynamic';

function isAdmin(request: NextRequest) {
  const raw = request.headers.get('authorization') || request.cookies.get('token')?.value || '';
  const decoded = verifyToken(raw.startsWith('Bearer ') ? raw.slice(7) : raw);
  return Boolean(decoded?.isAdmin || decoded?.userId || decoded?.username);
}

export async function GET(request: NextRequest) {
  try {
    if (!isAdmin(request)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const clientId = String(process.env.GOOGLE_CLIENT_ID || '').trim();
    const clientSecret = String(process.env.GOOGLE_CLIENT_SECRET || '').trim();

    // 1. Fetch YouTube account from Bunny Database
    const res = await bunnyExecute({
      sql: "SELECT data_json, account_name, account_handle, account_id, is_connected FROM social_media_accounts_sql WHERE platform = 'youtube' AND is_connected = 1 ORDER BY updated_at DESC LIMIT 1"
    });

    const row = res.rows[0] as any;
    if (!row) {
      return NextResponse.json({
        connected: false,
        error: 'No YouTube account connected.',
        reauthUrl: '/api/admin/social-media/youtube/oauth?returnTo=' + encodeURIComponent('/admin/crm/workshop-management')
      });
    }

    const data = JSON.parse(String(row.data_json || '{}'));
    let refreshToken = '';

    // Check environment refresh token first
    if (process.env.YOUTUBE_REFRESH_TOKEN) {
      refreshToken = process.env.YOUTUBE_REFRESH_TOKEN.trim();
    } else if (data.refreshToken) {
      try {
        refreshToken = decryptCredential(data.refreshToken).trim();
      } catch (e) {
        refreshToken = String(data.refreshToken).trim();
      }
    }

    if (!refreshToken) {
      return NextResponse.json({
        connected: false,
        accountName: row.account_name,
        error: 'YouTube account connected but refresh token is missing.',
        reauthUrl: '/api/admin/social-media/youtube/oauth?returnTo=' + encodeURIComponent('/admin/crm/workshop-management')
      });
    }

    // 2. Validate token against Google OAuth endpoint
    const body = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token'
    });

    const googleRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
      cache: 'no-store'
    });

    const googleData = await googleRes.json().catch(() => ({}));

    if (!googleRes.ok || !googleData.access_token) {
      console.warn('[YouTube Status] Token verification failed:', googleData);
      return NextResponse.json({
        connected: false,
        accountName: row.account_name,
        accountHandle: row.account_handle,
        error: googleData.error_description || googleData.error || 'Token has expired or was revoked by Google',
        reauthUrl: '/api/admin/social-media/youtube/oauth?returnTo=' + encodeURIComponent('/admin/crm/workshop-management')
      });
    }

    return NextResponse.json({
      connected: true,
      accountName: row.account_name,
      accountHandle: row.account_handle,
      accountId: row.account_id,
      expiresIn: googleData.expires_in
    });
  } catch (error: any) {
    console.error('[YouTube Status] Error:', error);
    return NextResponse.json({
      connected: false,
      error: error.message || 'Failed to verify YouTube status',
      reauthUrl: '/api/admin/social-media/youtube/oauth?returnTo=' + encodeURIComponent('/admin/crm/workshop-management')
    }, { status: 500 });
  }
}
