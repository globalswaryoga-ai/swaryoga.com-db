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

  let userId: string | null = null;

  // Try to verify state token
  if (state) {
    try {
      const decoded = verifyToken(state);
      userId = decoded?.userId || null;
      if (userId) console.log('[QR Drive Callback] User verified from state token:', userId);
    } catch (tokenErr: any) {
      console.warn('[QR Drive Callback] State token verification failed:', tokenErr?.message);
    }
  }

  if (!userId) {
    console.error('[QR Drive Callback] Could not verify user from state token');
    return NextResponse.redirect(new URL(`${SETTINGS_REDIRECT}&driveConnect=error&reason=unauthorized`, request.url));
  }

  try {
    const base = process.env.NEXTAUTH_URL || process.env.VERCEL_URL || 'http://localhost:3000';
    const redirectUri = `${base.replace(/\/$/, '')}/api/admin/crm/whatsapp/qr-drive-connect/callback`;

    console.log('[QR Drive Callback] Exchanging code for tokens...');
    const { accessToken, refreshToken } = await exchangeCodeForTokens(code, redirectUri);
    if (!refreshToken) {
      console.warn('[QR Drive Callback] No refresh token received from Google');
      return NextResponse.redirect(new URL(`${SETTINGS_REDIRECT}&driveConnect=error&reason=no_refresh_token`, request.url));
    }

    console.log('[QR Drive Callback] Getting Google user email...');
    const googleEmail = await getGoogleUserEmail(accessToken);

    await connectDB();
    const CRMUserSettings = getCRMUserSettings();
    const settings = await CRMUserSettings.findOne({ userId }, { qrConnectedPhoneNumber: 1 }).lean();
    const connectedPhone = (settings as any)?.qrConnectedPhoneNumber || '';

    console.log('[QR Drive Callback] Ensuring Drive folder exists...');
    const folderId = await ensureDriveFolder(accessToken);

    console.log('[QR Drive Callback] Saving connection to database...');
    const DriveConn = getQrWhatsappDriveConnection();
    await DriveConn.updateOne(
      { userId },
      {
        $set: {
          userId,
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
        console.log('[QR Drive Callback] Building initial chat export...');
        const { chats, truncated } = await buildChatHistoryExport(userId, connectedPhone);
        const html = renderChatHistoryHtml(connectedPhone, chats, truncated);
        await upsertFileInDriveFolder(
          accessToken,
          folderId,
          `whatsapp-chat-history-${connectedPhone}.html`,
          Buffer.from(html, 'utf-8'),
          'text/html'
        );
        await DriveConn.updateOne({ userId }, { $set: { lastSyncedAt: new Date() } });
        console.log('[QR Drive Callback] Initial backup completed');
      }
    } catch (backupErr: any) {
      console.warn('[QR Drive Callback] Initial backup failed (non-fatal):', backupErr?.message);
    }

    console.log('[QR Drive Callback] Success! Redirecting with email:', googleEmail);
    return NextResponse.redirect(new URL(`${SETTINGS_REDIRECT}&driveConnect=success&email=${encodeURIComponent(googleEmail)}`, request.url));
  } catch (error: any) {
    console.error('[QR Drive Callback] Error during callback:', error?.message || error);
    return NextResponse.redirect(new URL(`${SETTINGS_REDIRECT}&driveConnect=error&reason=${encodeURIComponent(error?.message || 'internal_error')}`, request.url));
  }
}
