import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin, getViewerUserId } from '@/lib/crm-handlers';
import {
  getBunnyWhatsAppAccountById,
  deleteBunnyWhatsAppAccount,
  saveBunnyWhatsAppAccount,
} from '@/lib/bunnyWhatsAppAccounts';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);

    if (!decoded?.isAdmin && !decoded?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const viewerUserId = getViewerUserId(decoded);
    const superAdmin = isSuperAdmin(decoded, request);

    const account = await getBunnyWhatsAppAccountById(params.id);

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    if (!superAdmin && account.createdByUserId !== viewerUserId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    return NextResponse.json(
      { success: true, data: account },
      { status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch account';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);

    if (!decoded?.isAdmin && !decoded?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const viewerUserId = getViewerUserId(decoded);
    const superAdmin = isSuperAdmin(decoded, request);

    const account = await getBunnyWhatsAppAccountById(params.id);
    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }
    if (!superAdmin && account.createdByUserId !== viewerUserId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const body = await request.json();
    const result = await saveBunnyWhatsAppAccount({
      userId: account.createdByUserId,
      accountName: body.accountName || account.accountName,
      metaPhoneNumber: body.metaPhoneNumber || account.metaPhoneNumber,
      metaPhoneNumberId: body.metaPhoneNumberId || account.metaPhoneNumberId,
      metaBusinessAccountId: body.metaBusinessAccountId || account.metaBusinessAccountId,
      metaAppId: body.metaAppId || account.metaAppId,
      metaAppSecret: body.metaAppSecret,
      metaAccessToken: body.metaAccessToken || account.metaAccessToken,
      metaVerifyToken: body.metaVerifyToken,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update account';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);

    if (!decoded?.isAdmin && !decoded?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const viewerUserId = getViewerUserId(decoded);
    const superAdmin = isSuperAdmin(decoded, request);

    const account = await getBunnyWhatsAppAccountById(params.id);
    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }
    if (!superAdmin && account.createdByUserId !== viewerUserId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const result = await deleteBunnyWhatsAppAccount(account.createdByUserId);
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete account';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
