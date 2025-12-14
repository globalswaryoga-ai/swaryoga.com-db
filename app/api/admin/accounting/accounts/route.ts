import { NextRequest, NextResponse } from 'next/server';
import { connectDB, Account } from '@/lib/db';

const verifyAdminToken = (token: string): boolean => {
  const adminToken = process.env.ADMIN_PANEL_TOKEN || 'admin_swar_yoga_2024';
  return token === adminToken || token.startsWith('admin_');
};

const getAdminOwner = (request: NextRequest) => {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : '';
  if (!token || !verifyAdminToken(token)) return null;
  return { ownerType: 'admin' as const, ownerId: 'admin' };
};

const formatAccountResponse = (account: any) => ({
  id: account._id?.toString(),
  name: account.name,
  type: account.type,
  accountNumber: account.accountNumber ?? '',
  bankName: account.bankName ?? '',
  balance: account.balance ?? 0,
  created_at: account.createdAt ? account.createdAt.toISOString() : ''
});

export async function GET(request: NextRequest) {
  try {
    const owner = getAdminOwner(request);
    if (!owner) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const accounts = await Account.find(owner).sort({ createdAt: -1 });

    return NextResponse.json({
      success: true,
      data: accounts.map(formatAccountResponse)
    });
  } catch (error) {
    console.error('Error fetching accounts:', error);
    return NextResponse.json({ error: 'Failed to fetch accounts' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const owner = getAdminOwner(request);
    if (!owner) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const body = await request.json();

    const account = await Account.create({
      ...owner,
      name: body.name,
      type: body.type,
      accountNumber: body.accountNumber,
      bankName: body.bankName,
      balance: body.balance || 0,
    });

    return NextResponse.json({
      success: true,
      data: formatAccountResponse(account)
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating account:', error);
    return NextResponse.json({ error: 'Failed to create account' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const owner = getAdminOwner(request);
    if (!owner) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Account ID is required' }, { status: 400 });
    }

    await connectDB();
    const body = await request.json();

    const account = await Account.findOneAndUpdate(
      { _id: id, ...owner },
      {
        name: body.name,
        type: body.type,
        accountNumber: body.accountNumber,
        bankName: body.bankName,
        balance: body.balance,
        updatedAt: new Date(),
      },
      { new: true }
    );

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: formatAccountResponse(account)
    });
  } catch (error) {
    console.error('Error updating account:', error);
    return NextResponse.json({ error: 'Failed to update account' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const owner = getAdminOwner(request);
    if (!owner) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Account ID is required' }, { status: 400 });
    }

    await connectDB();
    const account = await Account.findOneAndDelete({ _id: id, ...owner });

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Account deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting account:', error);
    return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 });
  }
}
