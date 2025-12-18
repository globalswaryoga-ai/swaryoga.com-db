import { NextRequest, NextResponse } from 'next/server';
import { connectDB, Account, Transaction } from '@/lib/db';
import { isAdminAuthorized } from '@/lib/adminAuth';

const getAdminOwner = (request: NextRequest) => {
  if (!isAdminAuthorized(request)) return null;
  return { ownerType: 'admin' as const, ownerId: 'admin' };
};

const buildTransactionPayload = (body: Record<string, any>, defaults = false) => {
  const amountRaw = typeof body.amount === 'number' ? body.amount : Number(body.amount);
  const payload: Record<string, any> = {
    type: body.type,
    amount: Number.isNaN(amountRaw) ? undefined : amountRaw,
    description: body.description,
    category: body.category,
    accountId: body.account_id ?? body.accountId,
    accountName: body.account_name ?? body.accountName,
    date: body.date ? new Date(body.date) : undefined,
    mode: body.mode
  };

  if (defaults) {
    payload.category ??= 'General';
    payload.mode ??= 'cash';
  }

  if (!defaults) {
    Object.keys(payload).forEach(key => {
      if (payload[key] === undefined) {
        delete payload[key];
      }
    });
  }

  return payload;
};

const formatTransactionResponse = (transaction: any) => ({
  id: transaction._id?.toString(),
  type: transaction.type,
  amount: transaction.amount,
  description: transaction.description,
  category: transaction.category,
  account_id: transaction.accountId,
  account_name: transaction.accountName,
  date: transaction.date ? transaction.date.toISOString().split('T')[0] : '',
  mode: transaction.mode,
  created_at: transaction.createdAt ? transaction.createdAt.toISOString() : ''
});

export async function GET(request: NextRequest) {
  try {
    const owner = getAdminOwner(request);
    if (!owner) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const transactions = await Transaction.find(owner).sort({ createdAt: -1 }).limit(100).lean();

    return NextResponse.json({
      success: true,
      data: transactions.map(formatTransactionResponse)
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 });
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
    const payload = buildTransactionPayload(body, true);

    if (!payload.type || payload.amount === undefined || payload.amount === null || Number.isNaN(payload.amount) || !payload.description || !payload.accountId) {
      return NextResponse.json({ error: 'Required fields missing' }, { status: 400 });
    }

    const account = await Account.findOne({ _id: payload.accountId, ...owner });
    if (!account) {
      return NextResponse.json({ error: 'Invalid account' }, { status: 400 });
    }

    payload.accountName = payload.accountName || account.name;

    const newTransaction = new Transaction({
      ...owner,
      ...payload
    });

    const savedTransaction = await newTransaction.save();

    return NextResponse.json({
      success: true,
      data: formatTransactionResponse(savedTransaction)
    });
  } catch (error) {
    console.error('Error creating transaction:', error);
    return NextResponse.json({ error: 'Failed to create transaction' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const owner = getAdminOwner(request);
    if (!owner) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Transaction ID is required' }, { status: 400 });
    }

    const body = await request.json();
    const payload = buildTransactionPayload(body);

    if (payload.accountId) {
      const account = await Account.findOne({ _id: payload.accountId, ...owner });
      if (!account) {
        return NextResponse.json({ error: 'Invalid account' }, { status: 400 });
      }
      payload.accountName = payload.accountName || account.name;
    }

    const updatedTransaction = await Transaction.findOneAndUpdate(
      { _id: id, ...owner },
      { ...payload, updatedAt: new Date() },
      { new: true }
    );

    if (!updatedTransaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: formatTransactionResponse(updatedTransaction)
    });
  } catch (error) {
    console.error('Error updating transaction:', error);
    return NextResponse.json({ error: 'Failed to update transaction' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const owner = getAdminOwner(request);
    if (!owner) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Transaction ID is required' }, { status: 400 });
    }

    const deletedTransaction = await Transaction.findOneAndDelete({ _id: id, ...owner });

    if (!deletedTransaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Transaction deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting transaction:', error);
    return NextResponse.json({ error: 'Failed to delete transaction' }, { status: 500 });
  }
}
