import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin, getViewerUserId } from '@/lib/crm-handlers';
import { formatPersonName } from '@/lib/formatName';
import { createBunnySale } from '@/lib/bunnySalesRepository';
import { getBunnyLeadByPhone } from '@/lib/bunnyLeadsRepository';

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
 * POST: Bulk-import sales from a pre-parsed JSON array into Bunny Database
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

        let leadId: string | undefined;
        if (customerPhone) {
          const matchedLead = await getBunnyLeadByPhone(customerPhone).catch(() => null);
          if (matchedLead?._id) leadId = String(matchedLead._id);
        }

        const labels = Array.isArray(rec.labels) ? rec.labels.map((l: any) => String(l).trim()).filter(Boolean) : [];

        await createBunnySale({
          leadId,
          customerId: customerId || undefined,
          customerName: customerName || undefined,
          customerPhone: customerPhone || undefined,
          customerEmail: customerEmail || undefined,
          customerAddress: customerAddress || undefined,
          workshopName: workshopName || undefined,
          batchDate: batchDate ? batchDate.toISOString() : undefined,
          saleAmount,
          paymentMode,
          status,
          saleDate: saleDate.toISOString(),
          reportedByUserId,
          labels,
        });

        results.imported++;
      } catch (err) {
        results.failed++;
        results.errors.push({ record: rec, reason: err instanceof Error ? err.message : 'Unknown error' });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Bulk import completed: ${results.imported} imported, ${results.skipped} skipped, ${results.failed} failed.`,
      results,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to bulk-import sales';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
