import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { WhatsAppAccount } from '@/lib/schemas/enterpriseSchemas';
import { verifyToken } from '@/lib/auth';
import { Types } from 'mongoose';

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);

    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const skip = parseInt(searchParams.get('skip') || '0', 10);
    const accountType = searchParams.get('accountType');
    const isActive = searchParams.get('isActive');

    const filter: any = {};
    if (accountType) filter.accountType = accountType;
    if (isActive !== null) filter.isActive = isActive === 'true';

    const accounts = await WhatsAppAccount.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .lean();

    const total = await WhatsAppAccount.countDocuments(filter);

    return NextResponse.json(
      { success: true, data: { accounts, total, limit, skip } },
      { status: 200 }
    );
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

    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();
    const {
      accountName,
      accountType,
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
    } = body;

    // Validation
    if (!accountName || !accountType) {
      return NextResponse.json(
        { error: 'Account name and type are required' },
        { status: 400 }
      );
    }

    if (accountType === 'common' && !commonPhoneNumber) {
      return NextResponse.json(
        { error: 'Phone number required for common gateway' },
        { status: 400 }
      );
    }

    if (accountType === 'meta' && !metaPhoneNumber) {
      return NextResponse.json(
        { error: 'Phone number required for Meta account' },
        { status: 400 }
      );
    }

    // Check for duplicate phone numbers
    const existingPhone = await WhatsAppAccount.findOne({
      $or: [
        { commonPhoneNumber: accountType === 'common' ? commonPhoneNumber : null },
        { metaPhoneNumber: accountType === 'meta' ? metaPhoneNumber : null },
      ],
    });

    if (existingPhone) {
      return NextResponse.json(
        { error: 'This phone number is already registered', data: existingPhone },
        { status: 409 }
      );
    }

    // If setting as default, unset other defaults
    if (isDefault) {
      await WhatsAppAccount.updateMany(
        { accountType, isDefault: true },
        { isDefault: false }
      );
    }

    const newAccount = await WhatsAppAccount.create({
      accountName,
      accountType,
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
      isDefault: isDefault || false,
      isActive: isActive !== false,
      createdByUserId: decoded.userId || decoded.username,
    });

    return NextResponse.json(
      { success: true, data: newAccount },
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create account';
    console.error('❌ POST /whatsapp-accounts error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
