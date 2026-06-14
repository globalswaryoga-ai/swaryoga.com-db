import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { getWhatsAppAccount } from '@/lib/schemas/enterpriseSchemas';
import { verifyToken } from '@/lib/auth';
import { tenantFilter, getViewerUserId } from '@/lib/crm-handlers';
import { Types } from 'mongoose';
import { encryptCredential, decryptCredential } from '@/lib/encryption';
import { resubscribeWABAWebhooks } from '@/lib/whatsapp';

export const dynamic = 'force-dynamic';

// Mark as dynamic since this route uses request.headers or request.url


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
    const tf = tenantFilter(decoded);

    await connectDB();
    const WhatsAppAccount = getWhatsAppAccount();

    if (!Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: 'Invalid account ID' }, { status: 400 });
    }

    const raw = await WhatsAppAccount.findOne({ _id: params.id, ...tf }).lean();

    if (!raw) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    // Never return raw/encrypted secrets — just flag whether a token is on
    // file so the UI can show "connected" without exposing the value.
    const { metaAccessToken, metaVerifyToken, commonApiKey, commonApiSecret, ...rest } = raw as any;
    const account = { ...rest, hasAccessToken: !!metaAccessToken };

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
    const tf = tenantFilter(decoded);

    await connectDB();
    const WhatsAppAccount = getWhatsAppAccount();

    if (!Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: 'Invalid account ID' }, { status: 400 });
    }

    const body = await request.json();
    const {
      accountName,
      commonProvider,
      commonPhoneNumber,
      commonProviderId,
      commonApiKey,
      commonApiSecret,
      metaPhoneNumberId,
      metaPhoneNumber,
      metaBusinessAccountId,
      metaAccessToken,
      metaVerifyToken,
      isDefault,
      isActive,
      status,
    } = body;

    const updateData: any = {};
    if (accountName) updateData.accountName = accountName;
    if (commonProvider) updateData.commonProvider = commonProvider;
    if (commonPhoneNumber) updateData.commonPhoneNumber = commonPhoneNumber;
    if (commonProviderId) updateData.commonProviderId = commonProviderId;
    if (metaPhoneNumberId) updateData.metaPhoneNumberId = metaPhoneNumberId;
    if (metaPhoneNumber) updateData.metaPhoneNumber = metaPhoneNumber;
    if (metaBusinessAccountId) updateData.metaBusinessAccountId = metaBusinessAccountId;
    if (metaAccessToken) updateData.metaAccessToken = encryptCredential(metaAccessToken);
    if (metaVerifyToken) updateData.metaVerifyToken = encryptCredential(metaVerifyToken);
    if (commonApiKey) updateData.commonApiKey = encryptCredential(commonApiKey);
    if (commonApiSecret) updateData.commonApiSecret = encryptCredential(commonApiSecret);
    if (typeof isActive === 'boolean') updateData.isActive = isActive;
    if (status) updateData.status = status;

    // If setting as default, unset others of same type
    if (isDefault) {
      const account = await WhatsAppAccount.findOne({ _id: params.id, ...tf });
      if (account) {
        await WhatsAppAccount.updateMany(
          { accountType: account.accountType, _id: { $ne: params.id }, isDefault: true, ...tf },
          { isDefault: false }
        );
      }
      updateData.isDefault = true;
    }

    const updated = await WhatsAppAccount.findOneAndUpdate({ _id: params.id, ...tf }, updateData, {
      new: true,
    }).lean();

    if (!updated) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    // For tenant-owned Meta accounts, (re)subscribe our app to their WABA so
    // inbound webhooks for their number are delivered to our callback URL.
    if ((updated as any).accountType === 'meta' && (updated as any).metaAccessToken && (updated as any).metaBusinessAccountId) {
      const accessToken = decryptCredential((updated as any).metaAccessToken);
      const sub = await resubscribeWABAWebhooks({ accessToken, wabaId: (updated as any).metaBusinessAccountId });
      if (sub.success) {
        await WhatsAppAccount.updateOne({ _id: params.id }, { $unset: { connectionError: 1 } });
        delete (updated as any).connectionError;
      } else {
        const connectionError = `Webhook subscription failed: ${sub.error}`;
        await WhatsAppAccount.updateOne({ _id: params.id }, { $set: { connectionError } });
        (updated as any).connectionError = connectionError;
      }
    }

    const updatedObj = updated as any;
    const { metaAccessToken: _t, metaVerifyToken: _v, commonApiKey: _ck, commonApiSecret: _cs, ...safeUpdated } = updatedObj;

    return NextResponse.json(
      { success: true, data: { ...safeUpdated, hasAccessToken: !!updatedObj.metaAccessToken } },
      { status: 200 }
    );
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
    const tf = tenantFilter(decoded);

    await connectDB();
    const WhatsAppAccount = getWhatsAppAccount();

    if (!Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: 'Invalid account ID' }, { status: 400 });
    }

    const deleted = await WhatsAppAccount.findOneAndDelete({ _id: params.id, ...tf });

    if (!deleted) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    return NextResponse.json(
      { success: true, message: 'Account deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete account';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
