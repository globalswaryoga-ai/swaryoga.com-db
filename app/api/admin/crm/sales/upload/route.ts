import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { Lead, SalesReport } from '@/lib/schemas/enterpriseSchemas';
import * as XLSX from 'xlsx';
import { normalizeLeadNumberInput } from '@/lib/crm/leadNumber';
import { Types } from 'mongoose';

function getViewerUserId(decoded: any): string {
  return String(decoded?.userId || decoded?.username || '').trim();
}

function isSuperAdmin(decoded: any): boolean {
  return (
    decoded?.userId === 'admin' ||
    (Array.isArray(decoded?.permissions) && decoded.permissions.includes('all'))
  );
}

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

  // XLSX sometimes returns Date objects depending on cell type.
  if (v instanceof Date && !Number.isNaN(v.getTime())) return v;

  // Excel serial date number.
  if (typeof v === 'number' && Number.isFinite(v)) {
    const d = XLSX.SSF.parse_date_code(v);
    if (d) {
      // Convert to UTC date
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
 * POST: Upload bulk Sales from Excel file
 */
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 401 });
    }

    const viewerUserId = getViewerUserId(decoded);
    if (!viewerUserId) {
      return NextResponse.json({ error: 'Unauthorized: Missing user identity' }, { status: 401 });
    }

    const superAdmin = isSuperAdmin(decoded);
    const url = new URL(request.url);
    const reportedByParam = url.searchParams.get('reportedByUserId');
    const reportedByUserId = superAdmin && reportedByParam && String(reportedByParam).trim()
      ? String(reportedByParam).trim()
      : viewerUserId;

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(new Uint8Array(buffer), { type: 'array' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const rawData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

    if (!Array.isArray(rawData) || rawData.length === 0) {
      return NextResponse.json({ error: 'Excel file is empty' }, { status: 400 });
    }

    await connectDB();

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
          results.errors.push({ row: row, reason: 'Missing/invalid Amount' });
          continue;
        }

        const paymentMode = normalizePaymentMode(row['Payment Mode'] || row.PaymentMode || row.paymentMode || '');

        // Optional: link to Lead by ObjectId or leadNumber
        let leadId: Types.ObjectId | undefined;
        const leadIdRaw = String(row.leadId || row.LeadId || '').trim();
        if (leadIdRaw && Types.ObjectId.isValid(leadIdRaw)) {
          leadId = new Types.ObjectId(leadIdRaw);
        } else {
          const normalizedLeadNumber = normalizeLeadNumberInput(customerId);
          if (normalizedLeadNumber) {
            const lead: any = await Lead.findOne({ leadNumber: normalizedLeadNumber }).select('_id').lean();
            if (lead && lead._id) leadId = lead._id as any;
          }
        }

        const reportedByFromRow = String(row.reportedByUserId || row.ReportedByUserId || row['Reported By'] || '').trim();
        const finalReportedBy = superAdmin && reportedByFromRow ? reportedByFromRow : reportedByUserId;

        await SalesReport.create({
          ...(leadId ? { leadId } : {}),
          customerId: customerId || undefined,
          customerName: customerName || undefined,
          customerPhone: customerPhone || undefined,
          workshopName: workshopName || undefined,
          ...(batchDate ? { batchDate } : {}),
          saleAmount,
          paymentMode,
          saleDate,
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
        results.errors.push({
          row,
          reason: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }

    return NextResponse.json({ success: true, data: results }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to upload sales';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
