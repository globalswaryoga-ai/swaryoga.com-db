import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { encryptCredential } from '@/lib/encryption';
import { getCRMUserSettings, getQrWhatsappDriveConnection } from '@/lib/schemas/enterpriseSchemas';
import { exchangeCodeForTokens, getGoogleUserEmail, ensureDriveFolder, upsertFileInDriveFolder } from '@/lib/googleDriveSync';
import { buildChatHistoryExport, renderChatHistoryHtml } from '@/lib/qrWhatsappChatExport';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const SETTINGS_REDIRECT = '/admin/crm/qr?tab=settings';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const oauthError = searchParams.get('error');
  const state = searchParams.get('state'); // bearer token, passed through from the connect step

  if (oauthError) {
    return NextResponse.redirect(new URL(`${SETTINGS_REDIRECT}&driveConnect=error&reason=${encodeURIComponent(oauthError)}`, request.url));
  }
  if (!code) {
    return NextResponse.redirect(new URL(`${SETTINGS_REDIRECT}&driveConnect=error&reason=missing_code`, request.url));
  }

  if (!state) {
    console.error('[QR Drive Callback] No state token provided');
    return NextResponse.redirect(new URL(`${SETTINGS_REDIRECT}&driveConnect=error&reason=missing_state`, request.url));
  }

  let decoded;
  try {
    decoded = verifyToken(state);
  } catch (tokenErr: any) {
    console.error('[QR Drive Callback] Token verification failed:', tokenErr?.message);
  }

  if (!decoded?.userId) {
    console.error('[QR Drive Callback] Invalid or expired token — decoded:', decoded);
    return NextResponse.redirect(new URL(`${SETTINGS_REDIRECT}&driveConnect=error&reason=invalid_token`, request.url));
  }

  try {
    const base = process.env.NEXTAUTH_URL || process.env.VERCEL_URL || 'http://localhost:3000';
    const redirectUri = `${base.replace(/\/$/, '')}/api/admin/crm/whatsapp/qr-drive-connect/callback`;

    const { accessToken, refreshToken } = await exchangeCodeForTokens(code, redirectUri);
    if (!refreshToken) {
      // Happens if the tenant had already granted consent before and Google
      // skipped issuing a new refresh token — ask them to reconnect with the
      // account picker so we force a fresh one (we always request prompt=consent).
      return NextResponse.redirect(new URL(`${SETTINGS_REDIRECT}&driveConnect=error&reason=no_refresh_token`, request.url));
    }

    const googleEmail = await getGoogleUserEmail(accessToken);

    await connectDB();
    const CRMUserSettings = getCRMUserSettings();
    const settings = await CRMUserSettings.findOne({ userId: decoded.userId }, { qrConnectedPhoneNumber: 1 }).lean();
    const connectedPhone = (settings as any)?.qrConnectedPhoneNumber || '';

    const folderId = await ensureDriveFolder(accessToken);

    const DriveConn = getQrWhatsappDriveConnection();
    await DriveConn.updateOne(
      { userId: decoded.userId },
      {
        $set: {
          userId: decoded.userId,
          connectedPhone,
          googleEmail,
          refreshToken: encryptCredential(refreshToken),
          folderId,
          needsReconnect: false,
          lastError: '',
          connectedAt: new Date(),
        },
      },
      { upsert: true }
    );

    // Push an immediate first backup so the tenant sees something in their
    // Drive right away, rather than waiting for tonight's archive cron.
    try {
      if (connectedPhone) {
        const { chats, truncated } = await buildChatHistoryExport(decoded.userId, connectedPhone);
        const html = renderChatHistoryHtml(connectedPhone, chats, truncated);
        await upsertFileInDriveFolder(
          accessToken,
          folderId,
          `whatsapp-chat-history-${connectedPhone}.html`,
          Buffer.from(html, 'utf-8'),
          'text/html'
        );
        await DriveConn.updateOne({ userId: decoded.userId }, { $set: { lastSyncedAt: new Date() } });
      }
    } catch (backupErr) {
      console.warn('[QR Drive Connect] Initial backup failed (non-fatal, connection still saved):', backupErr);
    }

    return NextResponse.redirect(new URL(`${SETTINGS_REDIRECT}&driveConnect=success&email=${encodeURIComponent(googleEmail)}`, request.url));
  } catch (error: any) {
    console.error('[QR Drive Connect] Callback error:', error);
    return NextResponse.redirect(new URL(`${SETTINGS_REDIRECT}&driveConnect=error&reason=${encodeURIComponent(error?.message || 'internal_error')}`, request.url));
  }
}
