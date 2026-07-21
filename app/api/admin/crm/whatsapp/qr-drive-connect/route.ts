import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDriveOAuthUrl } from '@/lib/googleDriveSync';

export const dynamic = 'force-dynamic';

function redirectUriFor(request: NextRequest): string {
  const base = process.env.NEXTAUTH_URL || process.env.VERCEL_URL || 'http://localhost:3000';
  return `${base.replace(/\/$/, '')}/api/admin/crm/whatsapp/qr-drive-connect/callback`;
}

/**
 * GET /api/admin/crm/whatsapp/qr-drive-connect
 * Starts the per-tenant "connect your Google Drive" flow for QR WhatsApp
 * chat backup. Returns an authUrl the frontend redirects the browser to.
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length) ||
                  request.nextUrl.searchParams.get('token');
    const decoded = verifyToken(token || undefined);
    if (!decoded?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!process.env.GOOGLE_CLIENT_ID) {
      return NextResponse.json({ error: 'GOOGLE_CLIENT_ID not configured on the server' }, { status: 500 });
    }

    // state carries the bearer token so the callback (a plain browser
    // redirect, no Authorization header) can identify the tenant.
    const authUrl = getDriveOAuthUrl(redirectUriFor(request), token || '');
    return NextResponse.json({ success: true, authUrl });
  } catch (error: any) {
    console.error('[QR Drive Connect] Error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to start Drive connection' }, { status: 500 });
  }
}
