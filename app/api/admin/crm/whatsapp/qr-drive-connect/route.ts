import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDriveOAuthUrl } from '@/lib/googleDriveSync';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

// Simple in-memory store for temporary OAuth state (userId mapped to state ID)
// In production, use Redis or a proper session store
const stateStore = new Map<string, { userId: string; expiresAt: number }>();

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

    // Generate a simple state ID and store the userId temporarily
    const stateId = crypto.randomBytes(16).toString('hex');
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minute expiry
    stateStore.set(stateId, { userId: decoded.userId, expiresAt });

    // Clean up expired entries periodically
    if (stateStore.size > 100) {
      for (const [key, val] of stateStore.entries()) {
        if (val.expiresAt < Date.now()) {
          stateStore.delete(key);
        }
      }
    }

    console.log('[QR Drive Connect] Generated state:', stateId, 'for userId:', decoded.userId);
    const authUrl = getDriveOAuthUrl(redirectUriFor(request), stateId);
    return NextResponse.json({ success: true, authUrl });
  } catch (error: any) {
    console.error('[QR Drive Connect] Error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to start Drive connection' }, { status: 500 });
  }
}

// Export for callback to use
export { stateStore };
