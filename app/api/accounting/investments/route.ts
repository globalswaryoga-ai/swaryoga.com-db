import { NextRequest, NextResponse } from 'next/server';
import { connectDB, Account, Investment } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

const getUserOwner = (request: NextRequest) => {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : null;
  if (!token) return null;
  const decoded = verifyToken(token);
  if (!decoded?.userId) return null;
  return { ownerType: 'user' as const, ownerId: decoded.userId };
};

const parseNullableDate = (value?: string | null) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const buildInvestmentPayload = (body: Record<string, any>, defaults = false) => {
  const amountRaw = typeof body.amount === 'number' ? body.amount : Number(body.amount);
  const payload: Record<string, any> = {
    name: body.name,
    type: body.type,
    amount: Number.isNaN(amountRaw) ? undefined : amountRaw,
    interestRate: body.interest_rate ?? body.interestRate,
    dividendRate: body.dividend_rate ?? body.dividendRate,
    repaymentMode: body.repayment_mode ?? body.repaymentMode,
    reminderEnabled: body.reminder_enabled ?? body.reminderEnabled,
    nextDueDate: parseNullableDate(body.next_due_date ?? body.nextDueDate),
    accountId: body.account_id ?? body.accountId,
    accountName: body.account_name ?? body.accountName,
    status: body.status
  };

  if (defaults) {
    payload.interestRate ??= 0;
    payload.dividendRate ??= 0;
    payload.repaymentMode ??= 'monthly';
    payload.reminderEnabled ??= false;
    payload.status ??= 'active';
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

const formatInvestmentResponse = (investment: any) => ({
  id: investment._id?.toString(),
  name: investment.name,
  type: investment.type,
  amount: investment.amount,
  interest_rate: investment.interestRate ?? 0,
  dividend_rate: investment.dividendRate ?? 0,
  repayment_mode: investment.repaymentMode,
  reminder_enabled: investment.reminderEnabled ?? false,
  next_due_date: investment.nextDueDate ? investment.nextDueDate.toISOString() : '',
  account_id: investment.accountId,
  account_name: investment.accountName,
  status: investment.status,
  created_at: investment.createdAt ? investment.createdAt.toISOString() : ''
});

export async function GET(request: NextRequest) {
  try {
    const owner = getUserOwner(request);
    if (!owner) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const investments = await Investment.find(owner).sort({ createdAt: -1 }).limit(100);

    return NextResponse.json({
      success: true,
      data: investments.map(formatInvestmentResponse)
    });
  } catch (error) {
    console.error('Error fetching investments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch investments' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const owner = getUserOwner(request);
    if (!owner) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();
    const payload = buildInvestmentPayload(body, true);

    const amountValue = payload.amount;

    if (!payload.name || !payload.type || amountValue === undefined || amountValue === null || Number.isNaN(amountValue) || !payload.accountId) {
      return NextResponse.json(
        { error: 'Required fields missing' },
        { status: 400 }
      );
    }

    const account = await Account.findOne({ _id: payload.accountId, ...owner });
    if (!account) {
      return NextResponse.json({ error: 'Invalid account' }, { status: 400 });
    }

    payload.accountName = payload.accountName || account.name;

    const newInvestment = new Investment({
      ...owner,
      ...payload
    });
    const savedInvestment = await newInvestment.save();

    return NextResponse.json({
      success: true,
      data: formatInvestmentResponse(savedInvestment)
    });
  } catch (error) {
    console.error('Error creating investment:', error);
    return NextResponse.json(
      { error: 'Failed to create investment' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const owner = getUserOwner(request);
    if (!owner) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Investment ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const payload = buildInvestmentPayload(body);

    if (payload.accountId) {
      const account = await Account.findOne({ _id: payload.accountId, ...owner });
      if (!account) {
        return NextResponse.json({ error: 'Invalid account' }, { status: 400 });
      }
      payload.accountName = payload.accountName || account.name;
    }

    const updatedInvestment = await Investment.findOneAndUpdate(
      { _id: id, ...owner },
      { ...payload, updatedAt: new Date() },
      { new: true }
    );

    if (!updatedInvestment) {
      return NextResponse.json(
        { error: 'Investment not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: formatInvestmentResponse(updatedInvestment)
    });
  } catch (error) {
    console.error('Error updating investment:', error);
    return NextResponse.json(
      { error: 'Failed to update investment' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const owner = getUserOwner(request);
    if (!owner) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Investment ID is required' },
        { status: 400 }
      );
    }

    const deletedInvestment = await Investment.findOneAndDelete({ _id: id, ...owner });

    if (!deletedInvestment) {
      return NextResponse.json(
        { error: 'Investment not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Investment deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting investment:', error);
    return NextResponse.json(
      { error: 'Failed to delete investment' },
      { status: 500 }
    );
  }
}
