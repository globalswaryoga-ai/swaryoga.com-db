import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { getExpense } from '@/lib/schemas/enterpriseSchemas';
import { getViewerUserId, isSuperAdmin } from '@/lib/crm-handlers';

export const dynamic = 'force-dynamic';

/**
 * Expense Tracking API
 * GET: Fetch expenses with filters
 * POST: Create new expense
 * PUT: Update expense
 * DELETE: Delete expense
 */

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const Expense = getExpense();

    const url = new URL(request.url);
    const category = url.searchParams.get('category');
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');
    const month = url.searchParams.get('month'); // YYYY-MM format
    const view = url.searchParams.get('view') || 'list'; // list, summary, monthly

    const filter: any = {};
    if (category) filter.category = category;
    
    if (month) {
      const [year, monthNum] = month.split('-').map(Number);
      filter.expenseDate = {
        $gte: new Date(year, monthNum - 1, 1),
        $lt: new Date(year, monthNum, 1),
      };
    } else if (startDate || endDate) {
      filter.expenseDate = {};
      if (startDate) filter.expenseDate.$gte = new Date(startDate);
      if (endDate) filter.expenseDate.$lte = new Date(endDate);
    }

    if (view === 'summary') {
      // Get summary by category
      const summary = await Expense.aggregate([
        { $match: filter },
        {
          $group: {
            _id: '$category',
            total: { $sum: '$amount' },
            count: { $sum: 1 },
          },
        },
        { $sort: { total: -1 } },
      ]);

      const grandTotal = summary.reduce((sum: number, item: any) => sum + item.total, 0);

      return NextResponse.json({
        success: true,
        data: {
          byCategory: Object.fromEntries(summary.map((s: any) => [s._id, { total: s.total, count: s.count }])),
          grandTotal,
        },
      });
    }

    if (view === 'monthly') {
      // Get monthly breakdown
      const monthly = await Expense.aggregate([
        { $match: filter },
        {
          $group: {
            _id: {
              year: { $year: '$expenseDate' },
              month: { $month: '$expenseDate' },
              category: '$category',
            },
            total: { $sum: '$amount' },
            count: { $sum: 1 },
          },
        },
        { $sort: { '_id.year': -1, '_id.month': -1 } },
      ]);

      return NextResponse.json({
        success: true,
        data: { monthly },
      });
    }

    // Default: list view
    const expenses = await Expense.find(filter)
      .sort({ expenseDate: -1 })
      .limit(500)
      .lean();

    return NextResponse.json({
      success: true,
      data: { expenses },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch expenses';
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

    const viewerUserId = getViewerUserId(decoded);
    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const { category, subCategory, amount, title, description, expenseDate, metaMessageCount, metaCostPerMessage } = body;

    if (!category || amount === undefined) {
      return NextResponse.json({ error: 'category and amount are required' }, { status: 400 });
    }

    await connectDB();
    const Expense = getExpense();

    const expense = await Expense.create({
      category,
      subCategory,
      amount: Number(amount),
      title,
      description,
      expenseDate: expenseDate ? new Date(expenseDate) : new Date(),
      metaMessageCount: metaMessageCount || 0,
      metaCostPerMessage: metaCostPerMessage || 0,
      createdByUserId: viewerUserId,
    });

    return NextResponse.json({ success: true, data: expense }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create expense';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    await connectDB();
    const Expense = getExpense();

    const updateData: any = {};
    if (body.category) updateData.category = body.category;
    if (body.subCategory !== undefined) updateData.subCategory = body.subCategory;
    if (body.amount !== undefined) updateData.amount = Number(body.amount);
    if (body.title !== undefined) updateData.title = body.title;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.expenseDate) updateData.expenseDate = new Date(body.expenseDate);
    if (body.approved !== undefined) {
      updateData.approved = body.approved;
      if (body.approved) {
        updateData.approvedByUserId = getViewerUserId(decoded);
        updateData.approvedAt = new Date();
      }
    }

    const expense = await Expense.findByIdAndUpdate(id, updateData, { new: true });
    if (!expense) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: expense });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update expense';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin || !isSuperAdmin(decoded)) {
      return NextResponse.json({ error: 'Unauthorized: Super admin required' }, { status: 401 });
    }

    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    await connectDB();
    const Expense = getExpense();

    await Expense.findByIdAndDelete(id);

    return NextResponse.json({ success: true, message: 'Expense deleted' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete expense';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
