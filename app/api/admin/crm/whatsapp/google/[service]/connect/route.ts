import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getGoogleOAuthUrl } from '@/lib/googleDriveSync';

export const dynamic = 'force-dynamic';

const GOOGLE_SERVICE_SCOPES = {
  contacts: ['https://www.googleapis.com/auth/contacts'],
  // Gmail is only granted send permission; the CRM never reads mailbox data.
  gmail: ['https://www.googleapis.com/auth/gmail.send'],
} as const;

function getService(value: string): keyof typeof GOOGLE_SERVICE_SCOPES | null {
  return value === 'contacts' || value === 'gmail' ? value : null;
}

function callbackUrl(request: NextRequest, service: string): string {
  const base = process.env.NEXTAUTH_URL || process.env.VERCEL_URL || request.nextUrl.origin;
  return `${base.replace(/\/$/, '')}/api/admin/crm/whatsapp/google/${service}/callback`;
}

/** Starts a user-scoped Google Contacts or Gmail OAuth connection. */
export async function GET(request: NextRequest, context: { params: { service: string } }) {
  const service = getService(context.params.service);
  if (!service) return NextResponse.json({ error: 'Unknown Google service' }, { status: 404 });

  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length) || request.nextUrl.searchParams.get('token');
    const decoded = verifyToken(token || undefined);
    if (!decoded?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!process.env.GOOGLE_CLIENT_ID) return NextResponse.json({ error: 'GOOGLE_CLIENT_ID not configured on the server' }, { status: 500 });

    return NextResponse.json({
      success: true,
      authUrl: getGoogleOAuthUrl(callbackUrl(request, service), token || '', [...GOOGLE_SERVICE_SCOPES[service]]),
    });
  } catch (error: any) {
    console.error(`[Google ${service} Connect]`, error);
    return NextResponse.json({ error: error?.message || 'Failed to start Google connection' }, { status: 500 });
  }
}
