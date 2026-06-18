import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import {
  parsePagination,
  handleCrmError,
  formatCrmSuccess,
  buildMetadata,
  isValidObjectId,
  toObjectId,
  getViewerUserId,
  getVisibleUserIds,
  generateInvoiceNumber,
} from '@/lib/crm-handlers';

export const dynamic = 'force-dynamic';
import { getSalesReport, getLead } from '@/lib/schemas/enterpriseSchemas';
import mongoose from 'mongoose';
import { verifyToken } from '@/lib/auth';
import { notifyRefundSuccessful, notifyAmountReceived } from '@/lib/notifications';
import { autoLeadForSale } from '@/lib/crm/autoLead';

// Mark as dynamic since this route uses request.headers or request.url

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
    await connectDB();
    const SalesReport = getSalesReport();
    const Lead = getLead(); // Ensure Lead is registered for population

    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin) throw new Error('Unauthorized: Admin access required');

    const viewerUserId = getViewerUserId(decoded);
    if (!viewerUserId) throw new Error('Unauthorized: Missing user identity');

    const visibleUserIds = getVisibleUserIds(decoded);

    const url = new URL(request.url);
    const saleId = url.searchParams.get('id'); // Single sale fetch by ID
    const view = url.searchParams.get('view') || 'list';
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');
    const userId = url.searchParams.get('userId');
    const paymentMode = url.searchParams.get('paymentMode');
    const bankName = url.searchParams.get('bankName');
    const workshop = url.searchParams.get('workshop') || url.searchParams.get('workshopName');
    const batchFrom = url.searchParams.get('batchFrom') || url.searchParams.get('batchStart');
    const batchTo = url.searchParams.get('batchTo') || url.searchParams.get('batchEnd');
    const reportedByUserIdParam = url.searchParams.get('reportedByUserId') || url.searchParams.get('adminUser');
    const format = (url.searchParams.get('format') || '').toLowerCase();
    const { limit, skip } = parsePagination(request);

    await connectDB();

    // If fetching single sale by ID
    if (saleId) {
      if (!isValidObjectId(saleId)) {
        return NextResponse.json({ success: false, error: 'Invalid sale ID' }, { status: 400 });
      }
      const sale = await SalesReport.findById(toObjectId(saleId))
        .populate('userId', 'name email')
        .populate('leadId', 'phoneNumber name leadNumber')
        .lean();
      if (!sale) {
        return NextResponse.json({ success: false, error: 'Sale not found' }, { status: 404 });
      }

      // TENANT ISOLATION: Verify user has access to this sale
      const isSuperAdmin = visibleUserIds === null;
      if (!isSuperAdmin && visibleUserIds && !visibleUserIds.includes(sale.reportedByUserId)) {
        return NextResponse.json({ success: false, error: 'Forbidden: You do not have access to this sale' }, { status: 403 });
      }

      return NextResponse.json({ success: true, data: sale });
    }

    const filter: any = {};

    // Multi-user access (3-tier):
    // - super-admin: can see all sales and can filter by reporter
    // - manager: can see their team's sales, optionally filter by team member
    // - regular admin: see only their own recorded sales
    if (visibleUserIds === null) {
      // Super admin: optionally filter by reporter
      if (reportedByUserIdParam && String(reportedByUserIdParam).trim()) {
        filter.reportedByUserId = String(reportedByUserIdParam).trim();
      }
    } else if (visibleUserIds.length > 1) {
      // Manager: can see team's sales
      if (reportedByUserIdParam && visibleUserIds.includes(reportedByUserIdParam)) {
        filter.reportedByUserId = String(reportedByUserIdParam).trim();
      } else {
        filter.reportedByUserId = { $in: visibleUserIds };
      }
    } else {
      // Regular admin: only their own sales
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
    if (bankName) filter.bankName = bankName;

    if (workshop && String(workshop).trim()) {
      const names = String(workshop)
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      if (names.length > 1) {
        // Multi-select checklist: exact (case-insensitive) match against any selected workshop
        const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        filter.workshopName = { $in: names.map((n) => new RegExp(`^${escapeRegex(n)}$`, 'i')) };
      } else if (names.length === 1) {
        // Partial match for UX
        filter.workshopName = { $regex: names[0], $options: 'i' };
      }
    }
    if (batchFrom || batchTo) {
      filter.batchDate = {};
      if (batchFrom) filter.batchDate.$gte = new Date(String(batchFrom));
      if (batchTo) filter.batchDate.$lte = new Date(String(batchTo));
    }

    // JSON export for PDF/Excel downloads (ignores pagination, but enforces a safety limit)
    if (format === 'json') {
      const maxRows = 50000;
      const rows = await SalesReport.find(filter)
        .limit(maxRows)
        .lean();

      const paymentModeLabel = (mode: any): string => {
        const map: Record<string, string> = {
          cash: 'Cash',
          bank_transfer: 'Bank Transfer',
          upi: 'UPI',
          card: 'Card',
          payu: 'PayU (Online)',
          cashfree: 'Cashfree (Online)',
          paypal: 'PayPal (Online)',
          other: 'Other',
        };
        const key = String(mode || '').trim();
        return map[key] || key;
      };

      const exportRows = rows
        .map((r: any) => {
          // The date-range filter is on batchDate, so the report date follows it
          // (falling back to saleDate for older records recorded without one).
          const reportDate = r.batchDate || r.saleDate;
          return {
            date: reportDate ? new Date(reportDate).toISOString().slice(0, 10) : '',
            name: r.customerName || '',
            mobile: r.customerPhone || '',
            workshop: r.workshopName || '',
            amount: r.saleAmount ?? '',
            bankOrCash: r.bankName ? `${paymentModeLabel(r.paymentMode)} (${r.bankName})` : paymentModeLabel(r.paymentMode),
            transactionDetails: r.transactionId || '',
          };
        })
        // Sort by the same `date` used for monthly grouping below — some sales
        // have no batchDate and fall back to saleDate, so sorting on the raw
        // DB field instead would scatter those rows out of date order and
        // split a single month's total across two non-adjacent blocks.
        .sort((a, b) => a.date.localeCompare(b.date));

      return formatCrmSuccess({ rows: exportRows }, { count: exportRows.length });
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
        'BankName',
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
            csvEscape((r as any).bankName),
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
        .populate('leadId', 'phoneNumber name leadNumber')
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
    } else if (view === 'weekly') {
      const weekly = await SalesReport.aggregate([
        { $match: filter },
        { $group: { _id: { $concat: [{ $toString: { $year: '$saleDate' } }, '-W', { $toString: { $week: '$saleDate' } }] }, totalSales: { $sum: '$saleAmount' }, count: { $sum: 1 } } },
        { $sort: { _id: -1 } },
        { $limit: 52 },
      ]);
      return formatCrmSuccess({ weekly }, {});
    } else if (view === 'yearly') {
      const yearly = await SalesReport.aggregate([
        { $match: filter },
        { $group: { _id: { $year: '$saleDate' }, totalSales: { $sum: '$saleAmount' }, count: { $sum: 1 } } },
        { $sort: { _id: -1 } },
      ]);
      return formatCrmSuccess({ yearly }, {});
    } else {
      throw new Error('Invalid view parameter');
    }
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
      bankName,
      transactionId,
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
      customerEmail,
      workshopName,
      batchDate,
    } = body;
    if (!saleAmount) throw new Error('Missing: saleAmount');

    await connectDB();
    const SalesReport = getSalesReport();

    // Admin JWTs use string userIds like "admincrm". Only treat as ObjectId if valid.
    const reporterObjectId = adminUserId && isValidObjectId(adminUserId) ? toObjectId(adminUserId) : undefined;

    if (leadId && !isValidObjectId(leadId)) throw new Error('Invalid leadId');
    if (saleId && !isValidObjectId(saleId)) throw new Error('Invalid saleId');

    const safePaymentMode = ['payu', 'cashfree', 'card', 'bank_transfer', 'cash', 'upi', 'paypal', 'other'].includes(paymentMode)
      ? paymentMode
      : 'payu';

    const safeTransactionId = transactionId !== undefined && transactionId !== null ? String(transactionId).trim() : '';

    const safeStatus = normalizeSaleStatus(status);
    const safeLabels = normalizeLabels(labels);

    const safeCustomerId = customerId !== undefined && customerId !== null ? String(customerId).trim() : '';
    const safeCustomerName = customerName !== undefined && customerName !== null ? String(customerName).trim() : '';
    const safeCustomerPhone = customerPhone !== undefined && customerPhone !== null ? String(customerPhone).trim() : '';
    const safeCustomerEmail = customerEmail !== undefined && customerEmail !== null ? String(customerEmail).trim().toLowerCase() : '';
    const safeWorkshopName = workshopName !== undefined && workshopName !== null ? String(workshopName).trim() : '';
    const safeBankName = bankName !== undefined && bankName !== null ? String(bankName).trim() : '';
    const parsedBatchDate = batchDate ? new Date(String(batchDate)) : null;
    const saleDate = new Date();
    const receiptNumber = await generateInvoiceNumber(saleDate);

    // Every sale should be traceable to a lead. If none was supplied, find/create
    // one automatically (by phone if given, otherwise a synthetic placeholder).
    const resolvedLeadId = leadId
      ? toObjectId(leadId)
      : await autoLeadForSale({
          tenantUserId: adminUserId,
          name: safeCustomerName,
          phone: safeCustomerPhone,
          workshopName: safeWorkshopName,
        });

    const sale = await SalesReport.create({
      saleId: saleId || undefined,
      userId: reporterObjectId,
      leadId: resolvedLeadId || undefined,
      saleAmount: Number(saleAmount),
      paymentMode: safePaymentMode,
      ...(safeTransactionId ? { transactionId: safeTransactionId } : {}),
      receiptNumber,
      ...(safeStatus ? { status: safeStatus } : {}),
      ...(safeLabels.length ? { labels: safeLabels } : {}),
      saleDate,
      funnelStage: funnelStage || undefined,
      conversionPath: Array.isArray(conversionPath) ? conversionPath : undefined,
      daysToConversion: daysToConversion || undefined,
      touchpointCount: touchpointCount || undefined,
      targetAchieved: Boolean(targetAchieved) || false,
      reportedBy: reporterObjectId,
      ...(safeCustomerId ? { customerId: safeCustomerId } : {}),
      ...(safeCustomerName ? { customerName: safeCustomerName } : {}),
      ...(safeCustomerPhone ? { customerPhone: safeCustomerPhone } : {}),
      ...(safeCustomerEmail ? { customerEmail: safeCustomerEmail } : {}),
      ...(safeWorkshopName ? { workshopName: safeWorkshopName } : {}),
      ...(safeBankName ? { bankName: safeBankName } : {}),
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

    const visibleUserIds = getVisibleUserIds(decoded);
    const superAdmin = visibleUserIds === null; // Super admin can see all users

    const body = await request.json().catch(() => null);
    if (!body) throw new Error('Invalid JSON body');

    const { saleId, ...updates } = body;
    if (!saleId) throw new Error('Missing: saleId');
    if (!isValidObjectId(saleId)) throw new Error('Invalid saleId');

    await connectDB();
    const SalesReport = getSalesReport();
    const existing = await SalesReport.findById(saleId).lean();
    if (!existing) throw new Error('Sale record not found');
    
    const saleOwnerId = String((existing as any).reportedByUserId || '');
    // Check access: super admin (visibleUserIds=null) can edit any, manager can edit team's, regular admin only own
    if (visibleUserIds !== null && !visibleUserIds.includes(saleOwnerId)) {
      throw new Error('Unauthorized: Cannot edit other user sales');
    }

    const allowedPaymentModes = ['payu', 'cashfree', 'card', 'bank_transfer', 'cash', 'upi', 'paypal', 'other'];
    const safeUpdates: any = {};

    if (updates.leadId !== undefined) {
      if (updates.leadId && !isValidObjectId(updates.leadId)) throw new Error('Invalid leadId');
      safeUpdates.leadId = updates.leadId ? toObjectId(updates.leadId) : null;
    }

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

    if (updates.transactionId !== undefined) safeUpdates.transactionId = String(updates.transactionId || '').trim() || undefined;
    if (updates.certificatePhotoUrl !== undefined) safeUpdates.certificatePhotoUrl = String(updates.certificatePhotoUrl || '').trim() || undefined;
    if (updates.certificatePhotoZoom !== undefined) {
      const n = Number(updates.certificatePhotoZoom);
      safeUpdates.certificatePhotoZoom = Number.isFinite(n) && n > 0 ? n : 1;
    }
    if (updates.certificatePhotoOffsetX !== undefined) {
      const n = Number(updates.certificatePhotoOffsetX);
      safeUpdates.certificatePhotoOffsetX = Number.isFinite(n) ? n : 0;
    }
    if (updates.certificatePhotoOffsetY !== undefined) {
      const n = Number(updates.certificatePhotoOffsetY);
      safeUpdates.certificatePhotoOffsetY = Number.isFinite(n) ? n : 0;
    }
    if (updates.certificateTitle !== undefined) {
      const allowedTitles = ['Mr', 'Miss', 'Mrs', 'Ms', 'Dr'];
      const title = String(updates.certificateTitle || '').trim();
      safeUpdates.certificateTitle = allowedTitles.includes(title) ? title : undefined;
    }
    if (updates.certificateName !== undefined) safeUpdates.certificateName = String(updates.certificateName || '').trim() || undefined;
    if (updates.certificateAddress !== undefined) safeUpdates.certificateAddress = String(updates.certificateAddress || '').trim() || undefined;
    if (updates.certificateMobile !== undefined) safeUpdates.certificateMobile = String(updates.certificateMobile || '').trim() || undefined;
    if (updates.certificatePlace !== undefined) safeUpdates.certificatePlace = String(updates.certificatePlace || '').trim() || undefined;
    if (updates.certificatePincode !== undefined) safeUpdates.certificatePincode = String(updates.certificatePincode || '').trim() || undefined;
    if (updates.certificateState !== undefined) safeUpdates.certificateState = String(updates.certificateState || '').trim() || undefined;
    if (updates.certificateCountry !== undefined) safeUpdates.certificateCountry = String(updates.certificateCountry || '').trim() || undefined;
    if (updates.customerId !== undefined) safeUpdates.customerId = String(updates.customerId || '').trim() || undefined;
    if (updates.customerName !== undefined) safeUpdates.customerName = String(updates.customerName || '').trim() || undefined;
    if (updates.customerPhone !== undefined) safeUpdates.customerPhone = String(updates.customerPhone || '').trim() || undefined;
    if (updates.customerEmail !== undefined) safeUpdates.customerEmail = String(updates.customerEmail || '').trim().toLowerCase() || undefined;
    if (updates.workshopName !== undefined) safeUpdates.workshopName = String(updates.workshopName || '').trim() || undefined;
    if (updates.bankName !== undefined) safeUpdates.bankName = String(updates.bankName || '').trim() || undefined;
    if (updates.receiptNumber !== undefined) safeUpdates.receiptNumber = String(updates.receiptNumber || '').trim() || undefined;

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

    // Only super admin can approve sales
    if (superAdmin && updates.superAdminApproved !== undefined) {
      safeUpdates.superAdminApproved = Boolean(updates.superAdminApproved);
      if (safeUpdates.superAdminApproved) {
        safeUpdates.superAdminApprovedAt = new Date();
        safeUpdates.superAdminApprovedBy = updates.superAdminApprovedBy || viewerUserId;
      } else {
        // If unapproving, clear the approval info
        safeUpdates.superAdminApprovedAt = null;
        safeUpdates.superAdminApprovedBy = null;
      }
    }

    const sale = await SalesReport.findByIdAndUpdate(saleId, { $set: safeUpdates }, { new: true });
    if (!sale) throw new Error('Sale record not found');

    // Fire-and-forget: Send notifications for status changes
    const saleData = sale.toObject ? sale.toObject() : sale;
    let customerEmail = (saleData as any).customerEmail || '';
    let customerName = (saleData as any).customerName || '';
    let customerPhone = (saleData as any).customerPhone || '';

    // Fallback: Look up email from linked lead if not on sale record
    if (!customerEmail && (saleData as any).leadId) {
      try {
        const Lead = getLead();
        const lead = await Lead.findById((saleData as any).leadId).lean();
        if (lead) {
          customerEmail = (lead as any).email || '';
          customerName = customerName || (lead as any).name || '';
          customerPhone = customerPhone || (lead as any).phoneNumber || '';
        }
      } catch { /* non-fatal */ }
    }

    // Refund notification
    if (updates.status === 'refunded' && customerEmail) {
      notifyRefundSuccessful(
        { name: customerName, email: customerEmail, phone: customerPhone },
        {
          amount: (saleData as any).saleAmount,
          workshopName: (saleData as any).workshopName,
          saleId: saleId,
        },
      ).catch(err => console.error('[Sales] Refund notification error:', err));
    }

    // Amount received / super admin approved notification
    if (updates.superAdminApproved === true && customerEmail) {
      notifyAmountReceived(
        { name: customerName, email: customerEmail, phone: customerPhone },
        {
          amount: (saleData as any).saleAmount,
          workshopName: (saleData as any).workshopName,
          paymentMode: (saleData as any).paymentMode,
          confirmedBy: viewerUserId,
          saleId: saleId,
        },
      ).catch(err => console.error('[Sales] Amount received notification error:', err));
    }

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

    const visibleUserIds = getVisibleUserIds(decoded);

    const url = new URL(request.url);
    const saleId = url.searchParams.get('saleId');
    if (!saleId) throw new Error('saleId parameter required');
    if (!isValidObjectId(saleId)) throw new Error('Invalid saleId');

    await connectDB();
    const SalesReport = getSalesReport();
    const existing = await SalesReport.findById(saleId).lean();
    if (!existing) throw new Error('Sale record not found');
    
    const saleOwnerId = String((existing as any).reportedByUserId || '');
    // Check access: super admin (visibleUserIds=null) can delete any, manager can delete team's, regular admin only own
    if (visibleUserIds !== null && !visibleUserIds.includes(saleOwnerId)) {
      throw new Error('Unauthorized: Cannot delete other user sales');
    }

    const result = await SalesReport.findByIdAndDelete(saleId);
    if (!result) throw new Error('Sale record not found');
    return formatCrmSuccess({ deleted: true }, {});
  } catch (error) {
    return handleCrmError(error, 'DELETE sales');
  }
}
