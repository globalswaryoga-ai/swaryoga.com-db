import { NextRequest, NextResponse } from 'next/server';
import { connectDB, Account } from '@/lib/db';

const formatAccountResponse = (account: any) => ({
  id: account._id?.toString(),
  name: account.name,
  type: account.type,
  accountNumber: account.accountNumber ?? '',
  bankName: account.bankName ?? '',
  balance: account.balance ?? 0,
  created_at: account.createdAt ? account.createdAt.toISOString() : ''
});

export async function GET(_request: NextRequest) {
  try {
    await connectDB();
    const accounts = await Account.find().sort({ createdAt: -1 });

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
    await connectDB();
    const body = await request.json();

    const account = await Account.create({
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
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Account ID is required' }, { status: 400 });
    }

    await connectDB();
    const body = await request.json();

    const account = await Account.findByIdAndUpdate(
      id,
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
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Account ID is required' }, { status: 400 });
    }

    await connectDB();
    const account = await Account.findByIdAndDelete(id);

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
