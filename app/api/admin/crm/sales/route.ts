import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import {
  parsePagination,
  handleCrmError,
  formatCrmSuccess,
  buildMetadata,
  isValidObjectId,
  toObjectId,
} from '@/lib/crm-handlers';
import { SalesReport } from '@/lib/schemas/enterpriseSchemas';
import mongoose from 'mongoose';
import { verifyToken } from '@/lib/auth';

function getViewerUserId(decoded: any): string {
  return String(decoded?.userId || decoded?.username || '').trim();
}

function isSuperAdmin(decoded: any): boolean {
  return (
    decoded?.userId === 'admin' ||
    (Array.isArray(decoded?.permissions) && decoded.permissions.includes('all'))
  );
}

function csvEscape(v: any): string {
  const s = v === null || v === undefined ? '' : String(v);
  if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

function normalizeLabels(input: any): string[] {
  let arr: string[] = [];
  if (Array.isArray(input)) {
    arr = input.map((v) => String(v));
  } else if (typeof input === 'string') {
    // Support comma/pipe/newline separated input
    arr = input.split(/[,|\n\r]+/g);
  } else if (input === null || input === undefined) {
    arr = [];
  } else {
    arr = [String(input)];
  }

  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of arr) {
    const s = String(raw || '').trim();
    if (!s) continue;
    const key = s.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
    if (out.length >= 25) break; // safety cap
  }
  return out;
}

function normalizeSaleStatus(input: any): string | undefined {
  if (input === null || input === undefined) return undefined;
  const s = String(input).trim().toLowerCase();
  if (!s) return undefined;
  const allowed = ['pending', 'completed', 'refunded', 'cancelled', 'failed'];
  if (!allowed.includes(s)) throw new Error('Invalid status');
  return s;
}

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
    if (!decoded?.isAdmin) throw new Error('Unauthorized: Admin access required');

    const viewerUserId = getViewerUserId(decoded);
    if (!viewerUserId) throw new Error('Unauthorized: Missing user identity');

    const superAdmin = isSuperAdmin(decoded);

    const url = new URL(request.url);
    const view = url.searchParams.get('view') || 'list';
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');
    const userId = url.searchParams.get('userId');
    const paymentMode = url.searchParams.get('paymentMode');
    const workshop = url.searchParams.get('workshop') || url.searchParams.get('workshopName');
    const batchFrom = url.searchParams.get('batchFrom') || url.searchParams.get('batchStart');
    const batchTo = url.searchParams.get('batchTo') || url.searchParams.get('batchEnd');
    const reportedByUserIdParam = url.searchParams.get('reportedByUserId') || url.searchParams.get('adminUser');
    const format = (url.searchParams.get('format') || '').toLowerCase();
    const { limit, skip } = parsePagination(request);

    await connectDB();

    const filter: any = {};

    // Multi-user access:
    // - super-admin can see all sales and can filter by reporter
    // - other admins see only their own recorded sales
    if (superAdmin) {
      if (reportedByUserIdParam && String(reportedByUserIdParam).trim()) {
        filter.reportedByUserId = String(reportedByUserIdParam).trim();
      }
    } else {
      filter.reportedByUserId = viewerUserId;
    }

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

    if (workshop && String(workshop).trim()) {
      // Partial match for UX
      filter.workshopName = { $regex: String(workshop).trim(), $options: 'i' };
    }
    if (batchFrom || batchTo) {
      filter.batchDate = {};
      if (batchFrom) filter.batchDate.$gte = new Date(String(batchFrom));
      if (batchTo) filter.batchDate.$lte = new Date(String(batchTo));
    }

    // CSV export for downloads (ignores pagination, but enforces a safety limit)
    if (format === 'csv') {
      const maxRows = 50000;
      const rows = await SalesReport.find(filter)
        .sort({ saleDate: -1 })
        .limit(maxRows)
        .lean();

      const header = [
        'SaleDBId',
        'CustomerId',
        'CustomerName',
        'CustomerPhone',
        'WorkshopName',
        'Status',
        'Labels',
        'BatchDate',
        'SaleAmount',
        'PaymentMode',
        'SaleDate',
        'ReportedByUserId',
      ];

      const lines = [header.join(',')];
      for (const r of rows) {
        lines.push(
          [
            csvEscape((r as any)._id),
            csvEscape((r as any).customerId),
            csvEscape((r as any).customerName),
            csvEscape((r as any).customerPhone),
            csvEscape((r as any).workshopName),
            csvEscape((r as any).status),
            csvEscape(Array.isArray((r as any).labels) ? (r as any).labels.join('|') : ''),
            csvEscape((r as any).batchDate ? new Date((r as any).batchDate).toISOString().slice(0, 10) : ''),
            csvEscape((r as any).saleAmount),
            csvEscape((r as any).paymentMode),
            csvEscape((r as any).saleDate ? new Date((r as any).saleDate).toISOString() : ''),
            csvEscape((r as any).reportedByUserId),
          ].join(',')
        );
      }

      return new NextResponse(lines.join('\n'), {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="sales_export_${new Date().toISOString().slice(0, 10)}.csv"`,
          'Cache-Control': 'no-store',
        },
      });
    }

    if (view === 'list') {
      const sales = await SalesReport.find(filter)
        .sort({ saleDate: -1 })
        .skip(skip)
        .limit(limit)
        .populate('userId', 'name email')
        .populate('leadId', 'phoneNumber name')
        .lean();
      const total = await SalesReport.countDocuments(filter);
      const meta = buildMetadata(total, limit, skip);
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
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin) throw new Error('Unauthorized: Admin access required');

    const adminUserId = getViewerUserId(decoded);
    if (!adminUserId) throw new Error('Unauthorized: Missing user identity');

    const body = await request.json().catch(() => null);
    if (!body) throw new Error('Invalid JSON body');

    const {
      saleAmount,
      paymentMode,
      leadId,
      saleId,
      status,
      labels,
      funnelStage,
      conversionPath,
      daysToConversion,
      touchpointCount,
      targetAchieved,
      metadata,
      // Customer snapshot fields (UI auto-fill)
      customerId,
      customerName,
      customerPhone,
      workshopName,
      batchDate,
    } = body;
    if (!saleAmount) throw new Error('Missing: saleAmount');

    await connectDB();

    // Admin JWTs use string userIds like "admincrm". Only treat as ObjectId if valid.
    const reporterObjectId = adminUserId && isValidObjectId(adminUserId) ? toObjectId(adminUserId) : undefined;

    if (leadId && !isValidObjectId(leadId)) throw new Error('Invalid leadId');
    if (saleId && !isValidObjectId(saleId)) throw new Error('Invalid saleId');

    const safePaymentMode = ['payu', 'card', 'bank_transfer', 'cash', 'other'].includes(paymentMode)
      ? paymentMode
      : 'payu';

    const safeStatus = normalizeSaleStatus(status);
    const safeLabels = normalizeLabels(labels);

    const safeCustomerId = customerId !== undefined && customerId !== null ? String(customerId).trim() : '';
    const safeCustomerName = customerName !== undefined && customerName !== null ? String(customerName).trim() : '';
    const safeCustomerPhone = customerPhone !== undefined && customerPhone !== null ? String(customerPhone).trim() : '';
    const safeWorkshopName = workshopName !== undefined && workshopName !== null ? String(workshopName).trim() : '';
    const parsedBatchDate = batchDate ? new Date(String(batchDate)) : null;

    const sale = await SalesReport.create({
      saleId: saleId || undefined,
      userId: reporterObjectId,
      leadId: leadId ? toObjectId(leadId) : undefined,
      saleAmount: Number(saleAmount),
      paymentMode: safePaymentMode,
      ...(safeStatus ? { status: safeStatus } : {}),
      ...(safeLabels.length ? { labels: safeLabels } : {}),
      saleDate: new Date(),
      funnelStage: funnelStage || undefined,
      conversionPath: Array.isArray(conversionPath) ? conversionPath : undefined,
      daysToConversion: daysToConversion || undefined,
      touchpointCount: touchpointCount || undefined,
      targetAchieved: Boolean(targetAchieved) || false,
      reportedBy: reporterObjectId,
      ...(safeCustomerId ? { customerId: safeCustomerId } : {}),
      ...(safeCustomerName ? { customerName: safeCustomerName } : {}),
      ...(safeCustomerPhone ? { customerPhone: safeCustomerPhone } : {}),
      ...(safeWorkshopName ? { workshopName: safeWorkshopName } : {}),
      ...(parsedBatchDate && !Number.isNaN(parsedBatchDate.getTime()) ? { batchDate: parsedBatchDate } : {}),
      reportedByUserId: adminUserId,
      metadata: {
        ...(metadata && typeof metadata === 'object' ? metadata : {}),
        reportedByUserId: adminUserId,
      },
    });

    return formatCrmSuccess({ sale }, {});
  } catch (error) {
    return handleCrmError(error, 'POST sales');
  }
}

export async function PUT(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin) throw new Error('Unauthorized: Admin access required');

    const viewerUserId = getViewerUserId(decoded);
    if (!viewerUserId) throw new Error('Unauthorized: Missing user identity');

    const superAdmin = isSuperAdmin(decoded);

    const body = await request.json().catch(() => null);
    if (!body) throw new Error('Invalid JSON body');

    const { saleId, ...updates } = body;
    if (!saleId) throw new Error('Missing: saleId');
    if (!isValidObjectId(saleId)) throw new Error('Invalid saleId');

    await connectDB();
    const existing = await SalesReport.findById(saleId).lean();
    if (!existing) throw new Error('Sale record not found');
    if (!superAdmin && String((existing as any).reportedByUserId || '') !== viewerUserId) {
      throw new Error('Unauthorized: Cannot edit other user sales');
    }

    const allowedPaymentModes = ['payu', 'card', 'bank_transfer', 'cash', 'other'];
    const safeUpdates: any = {};

    if (updates.saleAmount !== undefined) {
      const n = Number(updates.saleAmount);
      if (!Number.isFinite(n) || n <= 0) throw new Error('Invalid saleAmount');
      safeUpdates.saleAmount = n;
    }

    if (updates.paymentMode !== undefined) {
      const pm = String(updates.paymentMode).trim();
      if (!allowedPaymentModes.includes(pm)) throw new Error('Invalid paymentMode');
      safeUpdates.paymentMode = pm;
    }

    if (updates.status !== undefined) {
      safeUpdates.status = normalizeSaleStatus(updates.status);
    }

    if (updates.labels !== undefined) {
      safeUpdates.labels = normalizeLabels(updates.labels);
    }

    if (updates.customerId !== undefined) safeUpdates.customerId = String(updates.customerId || '').trim() || undefined;
    if (updates.customerName !== undefined) safeUpdates.customerName = String(updates.customerName || '').trim() || undefined;
    if (updates.customerPhone !== undefined) safeUpdates.customerPhone = String(updates.customerPhone || '').trim() || undefined;
    if (updates.workshopName !== undefined) safeUpdates.workshopName = String(updates.workshopName || '').trim() || undefined;

    if (updates.batchDate !== undefined) {
      const d = updates.batchDate ? new Date(String(updates.batchDate)) : null;
      safeUpdates.batchDate = d && !Number.isNaN(d.getTime()) ? d : undefined;
    }
    if (updates.saleDate !== undefined) {
      const d = updates.saleDate ? new Date(String(updates.saleDate)) : null;
      safeUpdates.saleDate = d && !Number.isNaN(d.getTime()) ? d : undefined;
    }

    if (superAdmin && updates.reportedByUserId !== undefined) {
      safeUpdates.reportedByUserId = String(updates.reportedByUserId || '').trim() || undefined;
    }

    const sale = await SalesReport.findByIdAndUpdate(saleId, { $set: safeUpdates }, { new: true });
    if (!sale) throw new Error('Sale record not found');
    return formatCrmSuccess({ sale }, {});
  } catch (error) {
    return handleCrmError(error, 'PUT sales');
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin) throw new Error('Unauthorized: Admin access required');

    const viewerUserId = getViewerUserId(decoded);
    if (!viewerUserId) throw new Error('Unauthorized: Missing user identity');

    const superAdmin = isSuperAdmin(decoded);

    const url = new URL(request.url);
    const saleId = url.searchParams.get('saleId');
    if (!saleId) throw new Error('saleId parameter required');
    if (!isValidObjectId(saleId)) throw new Error('Invalid saleId');

    await connectDB();
    const existing = await SalesReport.findById(saleId).lean();
    if (!existing) throw new Error('Sale record not found');
    if (!superAdmin && String((existing as any).reportedByUserId || '') !== viewerUserId) {
      throw new Error('Unauthorized: Cannot delete other user sales');
    }

    const result = await SalesReport.findByIdAndDelete(saleId);
    if (!result) throw new Error('Sale record not found');
    return formatCrmSuccess({ deleted: true }, {});
  } catch (error) {
    return handleCrmError(error, 'DELETE sales');
  }
}
