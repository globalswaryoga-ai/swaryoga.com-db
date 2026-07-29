import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

interface GoogleConnectRequest {
  action: 'get-auth-url' | 'callback' | 'disconnect';
  code?: string;
  state?: string;
}

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/admin/crm/qr/auth/google-connect/callback`;

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const db = (global as any).mongoClient?.db('swaryoga_admin_crm');
    if (!db) return NextResponse.json({ error: 'Database not connected' }, { status: 500 });

    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);

    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (decoded as any).userId || (decoded as any).id;
    const { action, code, state } = (await request.json()) as GoogleConnectRequest;

    switch (action) {
      case 'get-auth-url': {
        if (!GOOGLE_CLIENT_ID) {
          return NextResponse.json({
            error: 'Google OAuth not configured',
            setupRequired: true,
            instruction: 'Admin needs to add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to .env.local',
          }, { status: 400 });
        }

        const scope = 'https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/contacts.readonly';
        const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
        authUrl.searchParams.append('client_id', GOOGLE_CLIENT_ID);
        authUrl.searchParams.append('redirect_uri', REDIRECT_URI);
        authUrl.searchParams.append('response_type', 'code');
        authUrl.searchParams.append('scope', scope);
        authUrl.searchParams.append('access_type', 'offline');
        authUrl.searchParams.append('state', userId); // Store userId in state for verification

        return NextResponse.json({
          success: true,
          authUrl: authUrl.toString(),
          redirectUri: REDIRECT_URI,
        });
      }

      case 'callback': {
        if (!code || !state || state !== userId) {
          return NextResponse.json({ error: 'Invalid callback state' }, { status: 400 });
        }

        // Exchange code for tokens
        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: GOOGLE_CLIENT_ID!,
            client_secret: GOOGLE_CLIENT_SECRET!,
            code,
            grant_type: 'authorization_code',
            redirect_uri: REDIRECT_URI,
          }).toString(),
        });

        if (!tokenResponse.ok) {
          const error = await tokenResponse.text();
          console.error('[Google Auth] Token exchange failed:', error);
          return NextResponse.json({ error: 'Failed to exchange code for token' }, { status: 500 });
        }

        const tokens = await tokenResponse.json();

        // Save tokens to database
        await db.collection('qr_user_accounts').updateOne(
          { _id: userId },
          {
            $set: {
              googleDriveConnected: true,
              googleAccessToken: tokens.access_token,
              googleRefreshToken: tokens.refresh_token,
              googleTokenExpiry: new Date(Date.now() + tokens.expires_in * 1000),
              googleConnectedAt: new Date(),
            },
          }
        );

        return NextResponse.json({
          success: true,
          message: 'Google Drive connected successfully',
        });
      }

      case 'disconnect': {
        await db.collection('qr_user_accounts').updateOne(
          { _id: userId },
          {
            $set: {
              googleDriveConnected: false,
              googleAccessToken: null,
              googleRefreshToken: null,
              googleTokenExpiry: null,
            },
          }
        );

        return NextResponse.json({
          success: true,
          message: 'Google Drive disconnected',
        });
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('[Google Connect] Error:', error);
    return NextResponse.json({ error: error.message || 'Connection failed' }, { status: 500 });
  }
}
