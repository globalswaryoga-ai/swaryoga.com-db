import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { getLead, getSalesReport } from '@/lib/schemas/enterpriseSchemas';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin, getViewerUserId } from '@/lib/crm-handlers';
import { formatPersonName } from '@/lib/formatName';
import { normalizeLeadNumberInput } from '@/lib/crm/leadNumber';
import { Types } from 'mongoose';

export const dynamic = 'force-dynamic';


function normalizePaymentMode(raw: any): 'payu' | 'card' | 'bank_transfer' | 'cash' | 'other' {
  const s = String(raw || '').trim().toLowerCase();
  if (!s) return 'payu';
  if (s === 'payu' || s === 'upi' || s === 'online') return 'payu';
  if (s === 'card' || s === 'credit card' || s === 'debit card') return 'card';
  if (s === 'bank' || s === 'bank_transfer' || s === 'bank transfer' || s === 'neft' || s === 'imps' || s === 'rtgs') return 'bank_transfer';
  if (s === 'cash') return 'cash';
  return 'other';
}

/**
 * POST: Bulk-import sales from a pre-parsed JSON array (CSV upload path).
 *
 * Body: {
 *   records: Array<{
 *     customerName?: string;
 *     customerPhone?: string;
 *     customerEmail?: string;
 *     customerAddress?: string;
 *     workshopName?: string;
 *     batchDate?: string;
 *     saleAmount: number;
 *     paymentMode?: string;
 *     saleDate?: string;
 *     customerId?: string;
 *     status?: string;
 *     labels?: string[];
 *   }>;
 *   reportedByUserId?: string;
 * }
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
    const body = await request.json();
    const records: any[] = Array.isArray(body?.records) ? body.records : [];

    if (records.length === 0) {
      return NextResponse.json({ error: 'No records provided' }, { status: 400 });
    }

    const reportedByParam = body?.reportedByUserId;
    const reportedByUserId =
      superAdmin && reportedByParam && String(reportedByParam).trim()
        ? String(reportedByParam).trim()
        : viewerUserId;

    await connectDB();
    const SalesReport = getSalesReport();
    const Lead = getLead();

    const results = { imported: 0, skipped: 0, failed: 0, errors: [] as any[] };

    for (const rec of records) {
      try {
        const saleAmount = Number(rec.saleAmount || rec.amount || 0);
        if (!Number.isFinite(saleAmount) || saleAmount <= 0) {
          results.skipped++;
          results.errors.push({ record: rec, reason: 'Missing/invalid amount' });
          continue;
        }

        const customerName = formatPersonName(rec.customerName || rec.name);
        const customerPhone = String(rec.customerPhone || rec.phone || rec.phoneNumber || '').trim();
        const customerEmail = String(rec.customerEmail || rec.email || '').trim();
        const customerAddress = String(rec.customerAddress || rec.address || '').trim();
        const workshopName = String(rec.workshopName || rec.workshop || '').trim();
        const paymentMode = normalizePaymentMode(rec.paymentMode);
        const customerId = String(rec.customerId || '').trim();
        const status = String(rec.status || 'completed').trim();

        const batchDate = rec.batchDate ? new Date(rec.batchDate) : undefined;
        const saleDate = rec.saleDate ? new Date(rec.saleDate) : new Date();

        // Try to link to Lead by customerId (leadNumber)
        let leadId: Types.ObjectId | undefined;
        if (customerId) {
          const normalizedLN = normalizeLeadNumberInput(customerId);
          if (normalizedLN) {
            const lead: any = await Lead.findOne({ leadNumber: normalizedLN }).select('_id').lean();
            if (lead?._id) leadId = lead._id as any;
          }
        }

        const labels = Array.isArray(rec.labels) ? rec.labels.map((l: any) => String(l).trim()).filter(Boolean) : [];

        await SalesReport.create({
          ...(leadId ? { leadId } : {}),
          customerId: customerId || undefined,
          customerName: customerName || undefined,
          customerPhone: customerPhone || undefined,
          customerEmail: customerEmail || undefined,
          customerAddress: customerAddress || undefined,
          workshopName: workshopName || undefined,
          ...(batchDate && !Number.isNaN(batchDate.getTime()) ? { batchDate } : {}),
          saleAmount,
          paymentMode,
          saleDate,
          status,
          ...(labels.length ? { labels } : {}),
          reportedByUserId,
          metadata: {
            import: {
              source: 'csv-bulk-import',
              importedAt: new Date().toISOString(),
            },
          },
        });

        results.imported++;
      } catch (err) {
        results.failed++;
        results.errors.push({
          record: rec,
          reason: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }

    return NextResponse.json({ success: true, data: results }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to bulk-import sales';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
