import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { getViewerUserId } from '@/lib/crm-handlers';
import { getWhatsAppTeacherAccount } from '@/lib/schemas/enterpriseSchemas';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/crm/whatsapp-teachers/connect
 *
 * Called after a teacher completes Meta's Embedded Signup flow in the browser.
 * Exchanges the short-lived authorization code (best-effort, for audit/logging),
 * subscribes their WABA to our app's webhook using our Tech Provider system user
 * token, and saves the connection so messages can be sent/received for their
 * phone_number_id going forward — no per-teacher token needs to be stored since
 * Embedded Signup grants our business asset access to their WABA.
 */
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin && !decoded?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const viewerUserId = getViewerUserId(decoded) || decoded.username || decoded.userId;

    const body = await request.json().catch(() => null);
    const { code, wabaId, phoneNumberId, businessName, displayPhoneNumber } = body || {};
    if (!wabaId || !phoneNumberId) {
      return NextResponse.json({ error: 'wabaId and phoneNumberId are required' }, { status: 400 });
    }

    const appId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID;
    const appSecret = process.env.META_APP_SECRET;
    const systemUserToken = process.env.WHATSAPP_TECH_PROVIDER_SYSTEM_USER_TOKEN;

    if (!systemUserToken) {
      return NextResponse.json({ error: 'WHATSAPP_TECH_PROVIDER_SYSTEM_USER_TOKEN not configured' }, { status: 500 });
    }

    await connectDB();
    const WhatsAppTeacherAccount = getWhatsAppTeacherAccount();

    // Best-effort code exchange, purely for audit — the system user token is
    // what actually powers ongoing sends/management, not this exchanged token.
    if (code && appId && appSecret) {
      try {
        const exchangeUrl = new URL('https://graph.facebook.com/v25.0/oauth/access_token');
        exchangeUrl.searchParams.set('client_id', appId);
        exchangeUrl.searchParams.set('client_secret', appSecret);
        exchangeUrl.searchParams.set('code', code);
        await fetch(exchangeUrl.toString()).then((r) => r.json());
      } catch (e) {
        console.warn('[whatsapp-teachers/connect] Code exchange failed (non-fatal):', e);
      }
    }

    // Subscribe this WABA to our app's webhook using the system user token.
    // No override_callback_uri needed — the app's webhook is already correctly
    // configured to https://crm.swaryoga.com/api/whatsapp/webhook in Meta's dashboard.
    let webhookSubscribed = false;
    let subscribeError = '';
    try {
      const proof = appSecret
        ? crypto.createHmac('sha256', appSecret).update(systemUserToken).digest('hex')
        : undefined;
      const subUrl = new URL(`https://graph.facebook.com/v25.0/${wabaId}/subscribed_apps`);
      if (proof) subUrl.searchParams.set('appsecret_proof', proof);
      const subRes = await fetch(subUrl.toString(), {
        method: 'POST',
        headers: { Authorization: `Bearer ${systemUserToken}` },
      });
      const subData = await subRes.json().catch(() => ({}));
      webhookSubscribed = !!subData?.success;
      if (!webhookSubscribed) subscribeError = subData?.error?.message || 'Unknown subscribe error';
    } catch (e: any) {
      subscribeError = e?.message || 'Subscribe request failed';
    }

    const account = await WhatsAppTeacherAccount.findOneAndUpdate(
      { phoneNumberId },
      {
        $set: {
          userId: viewerUserId,
          wabaId,
          phoneNumberId,
          displayPhoneNumber: displayPhoneNumber || '',
          businessName: businessName || '',
          coexistenceEnabled: true,
          status: webhookSubscribed ? 'connected' : 'error',
          errorMessage: subscribeError,
          webhookSubscribed,
          connectedAt: new Date(),
        },
      },
      { upsert: true, new: true }
    );

    if (!webhookSubscribed) {
      return NextResponse.json(
        { success: false, error: `Connected but webhook subscribe failed: ${subscribeError}`, data: account },
        { status: 207 }
      );
    }

    return NextResponse.json({ success: true, data: account });
  } catch (error) {
    console.error('[whatsapp-teachers/connect] Error:', error);
    const message = error instanceof Error ? error.message : 'Failed to connect WhatsApp account';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
