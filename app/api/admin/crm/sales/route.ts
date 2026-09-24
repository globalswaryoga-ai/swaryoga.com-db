import { NextRequest, NextResponse } from 'next/server';
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
import { verifyToken } from '@/lib/auth';
import { notifyRefundSuccessful, notifyAmountReceived } from '@/lib/notifications';
import { autoLeadForSale } from '@/lib/crm/autoLead';
import { formatPersonName } from '@/lib/formatName';
import { loadBunnySales, getBunnySaleById, createBunnySale, updateBunnySale, deleteBunnySale } from '@/lib/bunnySalesRepository';

export const dynamic = 'force-dynamic';

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
    if (out.length >= 25) break; 
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

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin) throw new Error('Unauthorized: Admin access required');

    const viewerUserId = getViewerUserId(decoded);
    if (!viewerUserId) throw new Error('Unauthorized: Missing user identity');

    const visibleUserIds = getVisibleUserIds(decoded);

    const url = new URL(request.url);
    const saleId = url.searchParams.get('id');
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

    if (saleId) {
      const sale = await getBunnySaleById(saleId);
      if (!sale) return NextResponse.json({ success: false, error: 'Sale not found' }, { status: 404 });

      const isSuperAdmin = visibleUserIds === null;
      if (!isSuperAdmin && visibleUserIds && !visibleUserIds.includes(sale.reportedByUserId)) {
        return NextResponse.json({ success: false, error: 'Forbidden: You do not have access to this sale' }, { status: 403 });
      }

      return NextResponse.json({ success: true, data: sale });
    }

    let allSales = await loadBunnySales();

    if (visibleUserIds === null) {
      if (reportedByUserIdParam && String(reportedByUserIdParam).trim()) {
        allSales = allSales.filter(s => s.reportedByUserId === String(reportedByUserIdParam).trim());
      }
    } else if (visibleUserIds.length > 1) {
      if (reportedByUserIdParam && visibleUserIds.includes(reportedByUserIdParam)) {
        allSales = allSales.filter(s => s.reportedByUserId === String(reportedByUserIdParam).trim());
      } else {
        allSales = allSales.filter(s => visibleUserIds.includes(s.reportedByUserId));
      }
    } else {
      allSales = allSales.filter(s => s.reportedByUserId === viewerUserId);
    }

    if (startDate) {
      const d = new Date(startDate);
      allSales = allSales.filter(s => new Date(s.saleDate) >= d);
    }
    if (endDate) {
      const d = new Date(endDate);
      allSales = allSales.filter(s => new Date(s.saleDate) <= d);
    }
    if (userId) allSales = allSales.filter(s => String(s.userId) === userId);
    if (paymentMode) allSales = allSales.filter(s => s.paymentMode === paymentMode);
    if (bankName) allSales = allSales.filter(s => s.bankName === bankName);

    if (workshop && String(workshop).trim()) {
      const names = String(workshop).split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
      allSales = allSales.filter(s => names.some(n => (s.workshopName || '').toLowerCase().includes(n)));
    }
    if (batchFrom) {
      const d = new Date(String(batchFrom));
      allSales = allSales.filter(s => s.batchDate && new Date(s.batchDate) >= d);
    }
    if (batchTo) {
      const d = new Date(String(batchTo));
      allSales = allSales.filter(s => s.batchDate && new Date(s.batchDate) <= d);
    }

    if (format === 'json') {
      const paymentModeLabel = (mode: any): string => {
        const map: Record<string, string> = {
          cash: 'Cash', bank_transfer: 'Bank Transfer', upi: 'UPI', card: 'Card',
          payu: 'PayU (Online)', cashfree: 'Cashfree (Online)', paypal: 'PayPal (Online)', other: 'Other',
        };
        const key = String(mode || '').trim();
        return map[key] || key;
      };

      const exportRows = allSales.map((r: any) => {
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
      }).sort((a, b) => a.date.localeCompare(b.date));

      return formatCrmSuccess({ rows: exportRows }, { count: exportRows.length });
    }

    if (format === 'csv') {
      const header = [
        'SaleDBId', 'CustomerId', 'CustomerName', 'CustomerPhone', 'WorkshopName',
        'Status', 'Labels', 'BatchDate', 'SaleAmount', 'PaymentMode', 'BankName', 'SaleDate', 'ReportedByUserId',
      ];
      const lines = [header.join(',')];
      for (const r of allSales) {
        lines.push([
          csvEscape(r._id), csvEscape(r.customerId), csvEscape(r.customerName), csvEscape(r.customerPhone),
          csvEscape(r.workshopName), csvEscape(r.status), csvEscape(Array.isArray(r.labels) ? r.labels.join('|') : ''),
          csvEscape(r.batchDate ? new Date(r.batchDate).toISOString().slice(0, 10) : ''),
          csvEscape(r.saleAmount), csvEscape(r.paymentMode), csvEscape(r.bankName),
          csvEscape(r.saleDate ? new Date(r.saleDate).toISOString() : ''), csvEscape(r.reportedByUserId),
        ].join(','));
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
      const sales = allSales.slice(skip, skip + limit);
      const meta = buildMetadata(allSales.length, limit, skip);
      return formatCrmSuccess({ sales }, meta);
    } else if (view === 'summary') {
      const summary = allSales.reduce((acc, sale) => {
        acc.totalSales += Number(sale.saleAmount || 0);
        acc.totalTransactions += 1;
        if (acc.minSale === null || sale.saleAmount < acc.minSale) acc.minSale = sale.saleAmount;
        if (acc.maxSale === null || sale.saleAmount > acc.maxSale) acc.maxSale = sale.saleAmount;
        if (sale.targetAchieved) acc.targetAchieved += 1;
        return acc;
      }, { totalSales: 0, totalTransactions: 0, averageSale: 0, minSale: null, maxSale: null, targetAchieved: 0 });
      
      if (summary.totalTransactions > 0) {
        summary.averageSale = summary.totalSales / summary.totalTransactions;
      } else {
        summary.minSale = 0;
        summary.maxSale = 0;
      }
      return formatCrmSuccess({ summary }, {});
    } else if (view === 'daily' || view === 'monthly' || view === 'weekly' || view === 'yearly') {
      const grouped = allSales.reduce((acc, sale) => {
        const d = new Date(sale.saleDate);
        let key = '';
        if (view === 'daily') key = d.toISOString().slice(0, 10);
        else if (view === 'monthly') key = d.toISOString().slice(0, 7);
        else if (view === 'yearly') key = String(d.getFullYear());
        else {
          const startDate = new Date(d.getFullYear(), 0, 1);
          const days = Math.floor((d.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000));
          const weekNumber = Math.ceil(days / 7);
          key = `${d.getFullYear()}-W${weekNumber}`;
        }
        if (!acc[key]) acc[key] = { _id: key, totalSales: 0, count: 0 };
        acc[key].totalSales += Number(sale.saleAmount || 0);
        acc[key].count += 1;
        return acc;
      }, {} as Record<string, any>);
      const arr = (Object.values(grouped) as any[]).sort((a, b) => b._id.localeCompare(a._id));
      return formatCrmSuccess({ [view]: arr.slice(0, view === 'daily' ? 30 : view === 'weekly' ? 52 : undefined) }, {});
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
      saleAmount, paymentMode, bankName, transactionId, leadId, saleId, status, labels,
      funnelStage, conversionPath, daysToConversion, touchpointCount, targetAchieved, metadata,
      customerId, customerName, customerPhone, customerEmail, workshopName, batchDate,
    } = body;
    if (!saleAmount) throw new Error('Missing: saleAmount');

    const safePaymentMode = ['payu', 'cashfree', 'card', 'bank_transfer', 'cash', 'upi', 'paypal', 'other'].includes(paymentMode)
      ? paymentMode : 'payu';

    const safeTransactionId = transactionId !== undefined && transactionId !== null ? String(transactionId).trim() : '';
    const safeStatus = normalizeSaleStatus(status);
    const safeLabels = normalizeLabels(labels);

    const safeCustomerId = customerId !== undefined && customerId !== null ? String(customerId).trim() : '';
    const safeCustomerName = customerName !== undefined && customerName !== null ? formatPersonName(customerName) : '';
    const safeCustomerPhone = customerPhone !== undefined && customerPhone !== null ? String(customerPhone).trim() : '';
    const safeCustomerEmail = customerEmail !== undefined && customerEmail !== null ? String(customerEmail).trim().toLowerCase() : '';
    const safeWorkshopName = workshopName !== undefined && workshopName !== null ? String(workshopName).trim() : '';
    const safeBankName = bankName !== undefined && bankName !== null ? String(bankName).trim() : '';
    const parsedBatchDate = batchDate ? new Date(String(batchDate)) : null;
    const saleDate = new Date();
    const receiptNumber = await generateInvoiceNumber(saleDate);

    let resolvedLeadId = leadId;
    let resolvedCustomerId = safeCustomerId;
    if (!resolvedLeadId) {
      const autoLead = await autoLeadForSale({
        tenantUserId: adminUserId,
        name: safeCustomerName,
        phone: safeCustomerPhone,
        workshopName: safeWorkshopName,
      });
      if (autoLead) {
        resolvedLeadId = autoLead.id;
        if (!resolvedCustomerId) resolvedCustomerId = autoLead.leadNumber;
      }
    }

    const sale = await createBunnySale({
      saleId: saleId || undefined,
      userId: adminUserId,
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
      reportedBy: adminUserId,
      ...(resolvedCustomerId ? { customerId: resolvedCustomerId } : {}),
      ...(safeCustomerName ? { customerName: safeCustomerName } : {}),
      ...(safeCustomerPhone ? { customerPhone: safeCustomerPhone } : {}),
      ...(safeCustomerEmail ? { customerEmail: safeCustomerEmail } : {}),
      ...(safeWorkshopName ? { workshopName: safeWorkshopName } : {}),
      ...(safeBankName ? { bankName: safeBankName } : {}),
      ...(parsedBatchDate && !Number.isNaN(parsedBatchDate.getTime()) ? { batchDate: parsedBatchDate.toISOString() } : {}),
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
    const superAdmin = visibleUserIds === null; 

    const body = await request.json().catch(() => null);
    if (!body) throw new Error('Invalid JSON body');

    const { saleId, ...updates } = body;
    if (!saleId) throw new Error('Missing: saleId');

    const existing = await getBunnySaleById(saleId);
    if (!existing) throw new Error('Sale record not found');
    
    const saleOwnerId = String(existing.reportedByUserId || '');
    if (visibleUserIds !== null && !visibleUserIds.includes(saleOwnerId)) {
      throw new Error('Unauthorized: Cannot edit other user sales');
    }

    const allowedPaymentModes = ['payu', 'cashfree', 'card', 'bank_transfer', 'cash', 'upi', 'paypal', 'other'];
    const safeUpdates: any = {};

    if (updates.leadId !== undefined) safeUpdates.leadId = updates.leadId;

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

    if (updates.status !== undefined) safeUpdates.status = normalizeSaleStatus(updates.status);
    if (updates.labels !== undefined) safeUpdates.labels = normalizeLabels(updates.labels);

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
    if (updates.customerName !== undefined) safeUpdates.customerName = formatPersonName(updates.customerName) || undefined;
    if (updates.customerPhone !== undefined) safeUpdates.customerPhone = String(updates.customerPhone || '').trim() || undefined;
    if (updates.customerEmail !== undefined) safeUpdates.customerEmail = String(updates.customerEmail || '').trim().toLowerCase() || undefined;
    if (updates.workshopName !== undefined) safeUpdates.workshopName = String(updates.workshopName || '').trim() || undefined;
    if (updates.bankName !== undefined) safeUpdates.bankName = String(updates.bankName || '').trim() || undefined;
    if (updates.receiptNumber !== undefined) safeUpdates.receiptNumber = String(updates.receiptNumber || '').trim() || undefined;

    if (updates.batchDate !== undefined) {
      const d = updates.batchDate ? new Date(String(updates.batchDate)) : null;
      safeUpdates.batchDate = d && !Number.isNaN(d.getTime()) ? d.toISOString() : undefined;
    }
    if (updates.saleDate !== undefined) {
      const d = updates.saleDate ? new Date(String(updates.saleDate)) : null;
      safeUpdates.saleDate = d && !Number.isNaN(d.getTime()) ? d.toISOString() : undefined;
    }

    if (superAdmin && updates.reportedByUserId !== undefined) {
      safeUpdates.reportedByUserId = String(updates.reportedByUserId || '').trim() || undefined;
    }

    if (superAdmin && updates.superAdminApproved !== undefined) {
      safeUpdates.superAdminApproved = Boolean(updates.superAdminApproved);
      if (safeUpdates.superAdminApproved) {
        safeUpdates.superAdminApprovedAt = new Date().toISOString();
        safeUpdates.superAdminApprovedBy = updates.superAdminApprovedBy || viewerUserId;
      } else {
        safeUpdates.superAdminApprovedAt = null;
        safeUpdates.superAdminApprovedBy = null;
      }
    }

    const sale = await updateBunnySale(saleId, safeUpdates);
    if (!sale) throw new Error('Sale record not found');

    let customerEmail = sale.customerEmail || '';
    let customerName = sale.customerName || '';
    let customerPhone = sale.customerPhone || '';

    if (updates.status === 'refunded' && customerEmail) {
      notifyRefundSuccessful(
        { name: customerName, email: customerEmail, phone: customerPhone },
        {
          amount: sale.saleAmount,
          workshopName: sale.workshopName,
          saleId: saleId,
        },
      ).catch(err => console.error('[Sales] Refund notification error:', err));
    }

    if (updates.superAdminApproved === true && customerEmail) {
      notifyAmountReceived(
        { name: customerName, email: customerEmail, phone: customerPhone },
        {
          amount: sale.saleAmount,
          workshopName: sale.workshopName,
          paymentMode: sale.paymentMode,
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

    const existing = await getBunnySaleById(saleId);
    if (!existing) throw new Error('Sale record not found');
    
    const saleOwnerId = String(existing.reportedByUserId || '');
    if (visibleUserIds !== null && !visibleUserIds.includes(saleOwnerId)) {
      throw new Error('Unauthorized: Cannot delete other user sales');
    }

    const result = await deleteBunnySale(saleId);
    if (!result) throw new Error('Sale record not found');
    return formatCrmSuccess({ deleted: true }, {});
  } catch (error) {
    return handleCrmError(error, 'DELETE sales');
  }
}
