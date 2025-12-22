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
    verifyAdminAccess(request);
    const url = new URL(request.url);
    const view = url.searchParams.get('view') || 'list';
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');
    const userId = url.searchParams.get('userId');
    const paymentMode = url.searchParams.get('paymentMode');
    const { limit, skip } = parsePagination(request);

    await connectDB();

    const filter: any = {};
    if (startDate || endDate) {
      filter.saleDate = {};
      if (startDate) filter.saleDate.$gte = new Date(startDate);
      if (endDate) filter.saleDate.$lte = new Date(endDate);
    }
    if (userId) {
      if (!isValidObjectId(userId)) throw new Error('Invalid userId');
      filter.userId = toObjectId(userId);
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
      const meta = buildMetadata(skip, limit, total);
      return formatCrmSuccess({ sales }, meta);
    } else if (view === 'summary') {
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
      return formatCrmSuccess({ summary: summary[0] || {} }, {});
    } else if (view === 'daily') {
      const daily = await SalesReport.aggregate([
        { $match: filter },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$saleDate' } }, totalSales: { $sum: '$saleAmount' }, count: { $sum: 1 } } },
        { $sort: { _id: -1 } },
        { $limit: 30 },
      ]);
      return formatCrmSuccess({ daily }, {});
    } else if (view === 'monthly') {
      const monthly = await SalesReport.aggregate([
        { $match: filter },
        { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$saleDate' } }, totalSales: { $sum: '$saleAmount' }, count: { $sum: 1 } } },
        { $sort: { _id: -1 } },
      ]);
      return formatCrmSuccess({ monthly }, {});
    }
    throw new Error('Invalid view parameter');
  } catch (error) {
    return handleCrmError(error, 'GET sales');
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = verifyAdminAccess(request);
    const body = await request.json().catch(() => null);
    if (!body) throw new Error('Invalid JSON body');

    const { saleAmount, paymentMode, leadId, saleId, funnelStage, conversionPath, daysToConversion, touchpointCount, targetAchieved, metadata } = body;
    if (!saleAmount) throw new Error('Missing: saleAmount');

    await connectDB();

    if (userId && !isValidObjectId(userId)) throw new Error('Invalid userId');
    if (leadId && !isValidObjectId(leadId)) throw new Error('Invalid leadId');
    if (saleId && !isValidObjectId(saleId)) throw new Error('Invalid saleId');

    const safePaymentMode = ['payu', 'card', 'bank_transfer', 'cash', 'other'].includes(paymentMode)
      ? paymentMode
      : 'payu';

    const sale = await SalesReport.create({
      saleId: saleId || undefined,
      userId: userId || undefined,
      leadId: leadId ? toObjectId(leadId) : undefined,
      saleAmount: Number(saleAmount),
      paymentMode: safePaymentMode,
      saleDate: new Date(),
      funnelStage: funnelStage || undefined,
      conversionPath: Array.isArray(conversionPath) ? conversionPath : undefined,
      daysToConversion: daysToConversion || undefined,
      touchpointCount: touchpointCount || undefined,
      targetAchieved: Boolean(targetAchieved) || false,
      reportedBy: userId,
      metadata: metadata || undefined,
    });

    return formatCrmSuccess({ sale }, {});
  } catch (error) {
    return handleCrmError(error, 'POST sales');
  }
}

export async function PUT(request: NextRequest) {
  try {
    verifyAdminAccess(request);
    const body = await request.json().catch(() => null);
    if (!body) throw new Error('Invalid JSON body');

    const { saleId, ...updates } = body;
    if (!saleId) throw new Error('Missing: saleId');
    if (!isValidObjectId(saleId)) throw new Error('Invalid saleId');

    await connectDB();
    const sale = await SalesReport.findByIdAndUpdate(saleId, { $set: updates }, { new: true });
    if (!sale) throw new Error('Sale record not found');
    return formatCrmSuccess({ sale }, {});
  } catch (error) {
    return handleCrmError(error, 'PUT sales');
  }
}

export async function DELETE(request: NextRequest) {
  try {
    verifyAdminAccess(request);
    const url = new URL(request.url);
    const saleId = url.searchParams.get('saleId');
    if (!saleId) throw new Error('saleId parameter required');
    if (!isValidObjectId(saleId)) throw new Error('Invalid saleId');

    await connectDB();
    const result = await SalesReport.findByIdAndDelete(saleId);
    if (!result) throw new Error('Sale record not found');
    return formatCrmSuccess({ deleted: true }, {});
  } catch (error) {
    return handleCrmError(error, 'DELETE sales');
  }
}
