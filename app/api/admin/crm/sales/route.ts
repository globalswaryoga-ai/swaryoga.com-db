import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import {
  verifyAdminAccess,
  parsePagination,
  handleCrmError,
  formatCrmSuccess,
  buildMetadata,
  isValidObjectId,
  toObjectId,
} from '@/lib/crm-handlers';
import { SalesReport } from '@/lib/schemas/enterpriseSchemas';
import mongoose from 'mongoose';

/**
 * Sales reporting and tracking
 * GET: Fetch sales reports with filtering and aggregation
 * POST: Record a new sale
 * PUT: Update sale record
 * DELETE: Delete sale record
 */

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 401 });
    }

    const url = new URL(request.url);
    const view = url.searchParams.get('view') || 'list'; // list, summary, daily, monthly
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');
    const userId = url.searchParams.get('userId');
    const paymentMode = url.searchParams.get('paymentMode');
    const limit = Math.min(Number(url.searchParams.get('limit') || 50) || 50, 500);
    const skip = Math.max(Number(url.searchParams.get('skip') || 0) || 0, 0);

    await connectDB();

    // Build filter
    const filter: any = {};
    if (startDate || endDate) {
      filter.saleDate = {};
      if (startDate) filter.saleDate.$gte = new Date(startDate);
      if (endDate) filter.saleDate.$lte = new Date(endDate);
    }
    if (userId) {
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return NextResponse.json({ error: 'Invalid userId' }, { status: 400 });
      }
      filter.userId = new mongoose.Types.ObjectId(userId);
    }
    if (paymentMode) filter.paymentMode = paymentMode;

    if (view === 'list') {
      const sales = await SalesReport.find(filter)
        .sort({ saleDate: -1 })
        .skip(skip)
        .limit(limit)
        .populate('userId', 'name email')
        .populate('leadId', 'phoneNumber name')
        .lean();

      const total = await SalesReport.countDocuments(filter);

      return NextResponse.json(
        { success: true, data: { sales, total, limit, skip } },
        { status: 200 }
      );
    } else if (view === 'summary') {
      // Aggregate sales summary
      const summary = await SalesReport.aggregate([
        { $match: filter },
        {
          $group: {
            _id: null,
            totalSales: { $sum: '$saleAmount' },
            totalTransactions: { $sum: 1 },
            averageSale: { $avg: '$saleAmount' },
            maxSale: { $max: '$saleAmount' },
            minSale: { $min: '$saleAmount' },
            targetAchieved: { $sum: { $cond: [{ $eq: ['$targetAchieved', true] }, 1, 0] } },
          },
        },
      ]);

      return NextResponse.json(
        {
          success: true,
          data: summary[0] || {
            totalSales: 0,
            totalTransactions: 0,
            averageSale: 0,
            maxSale: 0,
            minSale: 0,
            targetAchieved: 0,
          },
        },
        { status: 200 }
      );
    } else if (view === 'daily') {
      // Daily sales breakdown
      const daily = await SalesReport.aggregate([
        { $match: filter },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$saleDate' } },
            totalSales: { $sum: '$saleAmount' },
            transactionCount: { $sum: 1 },
          },
        },
        { $sort: { _id: -1 } },
        { $limit: 30 },
      ]);

      return NextResponse.json({ success: true, data: { daily } }, { status: 200 });
    } else if (view === 'monthly') {
      // Monthly sales breakdown
      const monthly = await SalesReport.aggregate([
        { $match: filter },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m', date: '$saleDate' } },
            totalSales: { $sum: '$saleAmount' },
            transactionCount: { $sum: 1 },
          },
        },
        { $sort: { _id: -1 } },
      ]);

      return NextResponse.json({ success: true, data: { monthly } }, { status: 200 });
    }

    return NextResponse.json({ error: 'Invalid view parameter' }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch sales reports';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { userId, leadId, saleAmount, paymentMode, saleId } = body;

    if (saleAmount === undefined || saleAmount === null || saleAmount === '') {
      return NextResponse.json({ error: 'Missing: saleAmount' }, { status: 400 });
    }

    await connectDB();

    if (userId && !mongoose.Types.ObjectId.isValid(String(userId))) {
      return NextResponse.json({ error: 'Invalid userId' }, { status: 400 });
    }
    if (leadId && !mongoose.Types.ObjectId.isValid(String(leadId))) {
      return NextResponse.json({ error: 'Invalid leadId' }, { status: 400 });
    }
    if (saleId && !mongoose.Types.ObjectId.isValid(String(saleId))) {
      return NextResponse.json({ error: 'Invalid saleId' }, { status: 400 });
    }

    const safePaymentMode = ['payu', 'card', 'bank_transfer', 'cash', 'other'].includes(paymentMode)
      ? paymentMode
      : 'payu';

    const sale = await SalesReport.create({
      saleId: saleId || undefined,
      userId: userId || (decoded?.userId as any) || undefined,
      leadId: leadId || undefined,
      saleAmount: Number(saleAmount),
      paymentMode: safePaymentMode,
      saleDate: new Date(),
      funnelStage: body.funnelStage || undefined,
      conversionPath: Array.isArray(body.conversionPath) ? body.conversionPath : undefined,
      daysToConversion: body.daysToConversion || undefined,
      touchpointCount: body.touchpointCount || undefined,
      targetAchieved: Boolean(body.targetAchieved) || false,
      reportedBy: decoded?.userId as any,
      metadata: body.metadata || undefined,
    });

    return NextResponse.json({ success: true, data: sale }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create sale record';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { saleId, ...updates } = body;

    if (!saleId) {
      return NextResponse.json({ error: 'Missing: saleId' }, { status: 400 });
    }

    if (!mongoose.Types.ObjectId.isValid(String(saleId))) {
      return NextResponse.json({ error: 'Invalid saleId' }, { status: 400 });
    }

    await connectDB();

    const sale = await SalesReport.findByIdAndUpdate(saleId, { $set: updates }, { new: true });

    if (!sale) {
      return NextResponse.json({ error: 'Sale record not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: sale }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update sale record';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 401 });
    }

    const url = new URL(request.url);
    const saleId = url.searchParams.get('saleId');

    if (!saleId) {
      return NextResponse.json({ error: 'saleId parameter required' }, { status: 400 });
    }

    if (!mongoose.Types.ObjectId.isValid(saleId)) {
      return NextResponse.json({ error: 'Invalid saleId' }, { status: 400 });
    }

    await connectDB();

    const result = await SalesReport.findByIdAndDelete(saleId);

    if (!result) {
      return NextResponse.json({ error: 'Sale record not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: { deleted: true } }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete sale record';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
