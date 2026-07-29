import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { encryptCredential } from '@/lib/encryption';
import { getQrWhatsappGoogleServiceConnection } from '@/lib/schemas/enterpriseSchemas';
import { exchangeCodeForTokens, getGoogleUserEmail } from '@/lib/googleDriveSync';

export const dynamic = 'force-dynamic';

function getService(value: string): 'contacts' | 'gmail' | null {
  return value === 'contacts' || value === 'gmail' ? value : null;
}

function callbackUrl(request: NextRequest, service: string): string {
  const base = process.env.NEXTAUTH_URL || process.env.VERCEL_URL || request.nextUrl.origin;
  return `${base.replace(/\/$/, '')}/api/admin/crm/whatsapp/google/${service}/callback`;
}

export async function GET(request: NextRequest, context: { params: { service: string } }) {
  const service = getService(context.params.service);
  const redirect = (result: string, reason?: string) => {
    const url = new URL('/admin/crm/qr?tab=settings', request.url);
    url.searchParams.set(`${service || 'google'}Connect`, result);
    if (reason) url.searchParams.set('reason', reason);
    return NextResponse.redirect(url);
  };
  if (!service) return redirect('error', 'unknown_service');

  const error = request.nextUrl.searchParams.get('error');
  const code = request.nextUrl.searchParams.get('code');
  const state = request.nextUrl.searchParams.get('state');
  if (error) return redirect('error', error);
  if (!code) return redirect('error', 'missing_code');

  const decoded = verifyToken(state || undefined);
  if (!decoded?.userId) return redirect('error', 'session_expired');

  try {
    const { accessToken, refreshToken } = await exchangeCodeForTokens(code, callbackUrl(request, service));
    if (!refreshToken) return redirect('error', 'no_refresh_token');

    await connectDB();
    const Connection = getQrWhatsappGoogleServiceConnection();
    const googleEmail = await getGoogleUserEmail(accessToken);
    await Connection.updateOne(
      { userId: decoded.userId, service },
      { $set: { userId: decoded.userId, service, googleEmail, refreshToken: encryptCredential(refreshToken), needsReconnect: false, lastError: '', connectedAt: new Date() } },
      { upsert: true }
    );
    return redirect('success');
  } catch (err: any) {
    console.error(`[Google ${service} Callback]`, err);
    return redirect('error', err?.message || 'internal_error');
  }
}
