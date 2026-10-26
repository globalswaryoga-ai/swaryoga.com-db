import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin, getViewerUserId } from '@/lib/crm-handlers';
import * as XLSX from 'xlsx';
import { createBunnySale } from '@/lib/bunnySalesRepository';
import { getBunnyLeadByPhone } from '@/lib/bunnyLeadsRepository';
import { autoLeadForSale } from '@/lib/crm/autoLead';

export const dynamic = 'force-dynamic';

function normalizePaymentMode(raw: any): 'payu' | 'card' | 'bank_transfer' | 'cash' | 'other' {
  const s = String(raw || '').trim().toLowerCase();
  if (!s) return 'payu';
  if (s === 'payu' || s === 'upi' || s === 'online') return 'payu';
  if (s === 'card' || s === 'credit card' || s === 'debit card') return 'card';
  if (s === 'bank' || s === 'bank_transfer' || s === 'bank transfer' || s === 'neft' || s === 'imps' || s === 'rtgs') {
    return 'bank_transfer';
  }
  if (s === 'cash') return 'cash';
  return 'other';
}

function parseExcelDate(v: any): Date | null {
  if (!v) return null;
  if (v instanceof Date && !Number.isNaN(v.getTime())) return v;
  if (typeof v === 'number' && Number.isFinite(v)) {
    const d = XLSX.SSF.parse_date_code(v);
    if (d) {
      return new Date(Date.UTC(d.y, d.m - 1, d.d, d.H, d.M, d.S));
    }
  }
  const s = String(v).trim();
  if (!s) return null;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

/**
 * POST: Upload bulk Sales from Excel file into Bunny Database
 */
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin && !decoded?.userId) {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 401 });
    }

    const viewerUserId = getViewerUserId(decoded);
    if (!viewerUserId) {
      return NextResponse.json({ error: 'Unauthorized: Missing user identity' }, { status: 401 });
    }
    const superAdmin = isSuperAdmin(decoded);

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const requestedReportedBy = formData.get('reportedByUserId');
    const reportedByUserId =
      superAdmin && requestedReportedBy && String(requestedReportedBy).trim()
        ? String(requestedReportedBy).trim()
        : viewerUserId;

    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(new Uint8Array(buffer), { type: 'array' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const rawData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

    if (!Array.isArray(rawData) || rawData.length === 0) {
      return NextResponse.json({ error: 'Excel file is empty' }, { status: 400 });
    }

    const results = {
      imported: 0,
      skipped: 0,
      failed: 0,
      errors: [] as any[],
    };

    for (const row of rawData as any[]) {
      try {
        const customerId = String(
          row['Customer ID'] || row.CustomerId || row.customerId || row.LeadNumber || row['Lead Number'] || ''
        ).trim();

        const customerName = String(row.Name || row.CustomerName || row.customerName || '').trim();
        const customerPhone = String(
          row.Mobile || row.Phone || row['Phone Number'] || row.customerPhone || row.customerPhoneNumber || ''
        ).trim();

        const workshopName = String(
          row.Workshop || row['Workshop/Program'] || row.Program || row.workshopName || row.WorkshopName || ''
        ).trim();

        const batchDate = parseExcelDate(row['Batch Date'] || row.BatchDate || row.batchDate || '');
        const saleDate = parseExcelDate(row['Sale Date'] || row.SaleDate || row.saleDate || '') || new Date();

        const saleAmountRaw = row.Amount ?? row.SaleAmount ?? row.saleAmount ?? '';
        const saleAmount = Number(saleAmountRaw);
        if (!Number.isFinite(saleAmount) || saleAmount <= 0) {
          results.skipped++;
          results.errors.push({ row, reason: 'Missing/invalid Amount' });
          continue;
        }

        const paymentMode = normalizePaymentMode(row['Payment Mode'] || row.PaymentMode || row.paymentMode || '');
        const bankName = String(row.Bank || row['Bank Name'] || row.BankName || row.bankName || '').trim();

        let leadId: string | undefined;
        if (customerPhone) {
          const matchedLead = await getBunnyLeadByPhone(customerPhone).catch(() => null);
          if (matchedLead?._id) leadId = String(matchedLead._id);
        }

        const reportedByFromRow = String(row.reportedByUserId || row.ReportedByUserId || row['Reported By'] || '').trim();
        const finalReportedBy = superAdmin && reportedByFromRow ? reportedByFromRow : reportedByUserId;

        let resolvedCustomerId = customerId;
        if (!leadId) {
          const autoLead = await autoLeadForSale({
            tenantUserId: finalReportedBy,
            name: customerName,
            phone: customerPhone,
            workshopName,
          });
          if (autoLead) {
            leadId = autoLead.id;
            if (!resolvedCustomerId) resolvedCustomerId = autoLead.leadNumber;
          }
        }

        await createBunnySale({
          leadId,
          customerId: resolvedCustomerId || undefined,
          customerName: customerName || undefined,
          customerPhone: customerPhone || undefined,
          workshopName: workshopName || undefined,
          batchDate: batchDate ? batchDate.toISOString() : undefined,
          saleAmount,
          paymentMode,
          bankName: bankName || undefined,
          saleDate: saleDate.toISOString(),
          reportedByUserId: finalReportedBy,
          metadata: {
            import: {
              filename: file.name,
              importedAt: new Date().toISOString(),
            },
          },
        });

        results.imported++;
      } catch (err) {
        results.failed++;
        results.errors.push({ row, reason: err instanceof Error ? err.message : 'Unknown error' });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${rawData.length} rows: ${results.imported} imported, ${results.skipped} skipped, ${results.failed} failed.`,
      results,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to process Excel file';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
