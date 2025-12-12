import { NextRequest, NextResponse } from 'next/server';
import { connectDB, Transaction } from '@/lib/db';

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

export async function GET(_request: NextRequest) {
  try {
    await connectDB();

    const transactions = await Transaction.find().sort({ createdAt: -1 }).limit(100);

    return NextResponse.json({
      success: true,
      data: transactions.map(formatTransactionResponse)
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transactions' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const accountId = body.account_id ?? body.accountId;
    const accountName = body.account_name ?? body.accountName;
    const { type, amount, description, category, date, mode } = body;

    if (!type || !amount || !description || !accountId) {
      return NextResponse.json(
        { error: 'Required fields missing' },
        { status: 400 }
      );
    }

    const newTransaction = new Transaction({
      type,
      amount,
      description,
      category,
      accountId,
      accountName,
      date: new Date(date),
      mode
    });

    const savedTransaction = await newTransaction.save();

    return NextResponse.json({
      success: true,
      data: formatTransactionResponse(savedTransaction)
    });
  } catch (error) {
    console.error('Error creating transaction:', error);
    return NextResponse.json(
      { error: 'Failed to create transaction' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Transaction ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json();

    const updatedTransaction = await Transaction.findByIdAndUpdate(
      id,
      { ...body, updatedAt: new Date() },
      { new: true }
    );

    if (!updatedTransaction) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: formatTransactionResponse(updatedTransaction)
    });
  } catch (error) {
    console.error('Error updating transaction:', error);
    return NextResponse.json(
      { error: 'Failed to update transaction' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Transaction ID is required' },
        { status: 400 }
      );
    }

    const deletedTransaction = await Transaction.findByIdAndDelete(id);

    if (!deletedTransaction) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Transaction deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting transaction:', error);
    return NextResponse.json(
      { error: 'Failed to delete transaction' },
      { status: 500 }
    );
  }
}
