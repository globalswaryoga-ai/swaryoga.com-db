import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { WhatsAppAccount } from '@/lib/schemas/enterpriseSchemas';
import { verifyToken } from '@/lib/auth';
import { Types } from 'mongoose';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);

    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    if (!Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: 'Invalid account ID' }, { status: 400 });
    }

    const account = await WhatsAppAccount.findById(params.id).lean();

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
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

    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

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
    if (commonApiKey) updateData.commonApiKey = commonApiKey;
    if (commonApiSecret) updateData.commonApiSecret = commonApiSecret;
    if (metaPhoneNumberId) updateData.metaPhoneNumberId = metaPhoneNumberId;
    if (metaPhoneNumber) updateData.metaPhoneNumber = metaPhoneNumber;
    if (metaBusinessAccountId) updateData.metaBusinessAccountId = metaBusinessAccountId;
    if (metaAccessToken) updateData.metaAccessToken = metaAccessToken;
    if (metaVerifyToken) updateData.metaVerifyToken = metaVerifyToken;
    if (typeof isActive === 'boolean') updateData.isActive = isActive;
    if (status) updateData.status = status;

    // If setting as default, unset others of same type
    if (isDefault) {
      const account = await WhatsAppAccount.findById(params.id);
      if (account) {
        await WhatsAppAccount.updateMany(
          { accountType: account.accountType, _id: { $ne: params.id }, isDefault: true },
          { isDefault: false }
        );
      }
      updateData.isDefault = true;
    }

    const updated = await WhatsAppAccount.findByIdAndUpdate(params.id, updateData, {
      new: true,
    });

    if (!updated) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    return NextResponse.json(
      { success: true, data: updated },
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

    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    if (!Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: 'Invalid account ID' }, { status: 400 });
    }

    const deleted = await WhatsAppAccount.findByIdAndDelete(params.id);

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
