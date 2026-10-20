import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin, getViewerUserId } from '@/lib/crm-handlers';
import {
  getBunnyWhatsAppAccount,
  saveBunnyWhatsAppAccount,
  deleteBunnyWhatsAppAccount,
} from '@/lib/bunnyWhatsAppAccounts';
import { resubscribeWABAWebhooks } from '@/lib/whatsapp';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);

    if (!decoded?.isAdmin && !decoded?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const viewerUserId = getViewerUserId(decoded);
    const superAdmin = isSuperAdmin(decoded, request);

    const bunnyAccount = await getBunnyWhatsAppAccount(viewerUserId);
    const accounts = bunnyAccount ? [bunnyAccount] : [];

    return NextResponse.json({
      success: true,
      data: {
        accounts,
        total: accounts.length,
        webhookUrl: 'https://crm.swaryoga.com/api/whatsapp/webhook',
        verifyToken: 'swaryoga_verify_token',
      },
    }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch accounts';
    console.error('❌ GET /whatsapp-accounts error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);

    if (!decoded?.isAdmin && !decoded?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const viewerUserId = getViewerUserId(decoded);
    const body = await request.json().catch(() => ({}));
    const {
      accountName,
      metaPhoneNumber,
      metaPhoneNumberId,
      metaBusinessAccountId,
      metaAppId,
      metaAppSecret,
      metaAccessToken,
      metaVerifyToken,
    } = body;

    if (!metaPhoneNumberId || !metaAccessToken) {
      return NextResponse.json(
        { error: 'Meta Phone Number ID and Permanent Access Token are required.' },
        { status: 400 }
      );
    }

    const saved = await saveBunnyWhatsAppAccount({
      userId: viewerUserId,
      accountName: accountName || `Meta WhatsApp (${metaPhoneNumber || metaPhoneNumberId})`,
      metaPhoneNumber: metaPhoneNumber ? String(metaPhoneNumber).trim() : '',
      metaPhoneNumberId: String(metaPhoneNumberId).trim(),
      metaBusinessAccountId: metaBusinessAccountId ? String(metaBusinessAccountId).trim() : '',
      metaAppId: metaAppId ? String(metaAppId).trim() : '',
      metaAppSecret: metaAppSecret ? String(metaAppSecret).trim() : '',
      metaAccessToken: String(metaAccessToken).trim(),
      metaVerifyToken: metaVerifyToken ? String(metaVerifyToken).trim() : '',
    });

    // Optionally auto-subscribe webhook if business account id provided
    if (metaBusinessAccountId && metaAccessToken) {
      resubscribeWABAWebhooks({
        accessToken: metaAccessToken,
        wabaId: metaBusinessAccountId,
      }).catch((err) => {
        console.warn('WABA resubscription warning:', err);
      });
    }

    return NextResponse.json({
      success: true,
      data: saved.account,
      message: 'Meta WhatsApp account connected successfully',
    }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to save account';
    console.error('❌ POST /whatsapp-accounts error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);

    if (!decoded?.isAdmin && !decoded?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const viewerUserId = getViewerUserId(decoded);
    await deleteBunnyWhatsAppAccount(viewerUserId);

    return NextResponse.json({
      success: true,
      message: 'WhatsApp account disconnected',
    }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete account';
    console.error('❌ DELETE /whatsapp-accounts error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
