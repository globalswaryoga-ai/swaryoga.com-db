/**
 * Tally Voucher API — Double-Entry Bookkeeping
 * GET  /api/tally/vouchers — List vouchers
 * POST /api/tally/vouchers — Create a balanced voucher
 *
 * RULE: Every voucher MUST have Sum(Debit) === Sum(Credit)
 */

import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { apiError, apiSuccess } from '@/lib/api-error';
import { getAccVoucher, getAccLedger } from '@/lib/schemas/enterpriseSchemas';
import { createVoucher, validateVoucherEntries, invalidateReportCache, updateVoucher, deleteVoucher, type VoucherType } from '@/lib/tally/engine';
import { resolveTallyOwnerId, getTallyOwnerIdForWrite } from '@/lib/tally/access';
import { scopeQuery } from '@/lib/tally/access';

export const dynamic = 'force-dynamic';


function getAuth(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return null;
  try {
    return verifyToken(token);
  } catch { return null; }
}

export async function GET(request: NextRequest) {
  try {
    const decoded = getAuth(request);
    if (!decoded) return apiError('UNAUTHORIZED');

    await connectDB();
    const AccVoucher = getAccVoucher();

    const searchParams = request.nextUrl.searchParams;

    // Single voucher fetch by ID
    const singleId = searchParams.get('id');
    if (singleId) {
      const v = await AccVoucher.findById(singleId).lean() as any;
      if (!v || v.isReversed) return apiError('NOT_FOUND', 'Voucher not found');
      return apiSuccess({
        id: String(v._id),
        voucherNumber: v.voucherNumber,
        date: v.date,
        type: v.type,
        entries: v.entries.map((e: any) => ({
          ledgerId: String(e.ledgerId),
          ledgerName: e.ledgerName,
          amount: e.amount,
          type: e.type,
        })),
        totalDebit: v.totalDebit,
        totalCredit: v.totalCredit,
        narration: v.narration,
        partyName: v.partyName,
        receiptFileUrl: v.receiptFileUrl,
      });
    }

    const fy = searchParams.get('fy') || '2023-24';
    const type = searchParams.get('type'); // RECEIPT, PAYMENT, etc.
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 200);
    const skip = (page - 1) * limit;

    const ownerId = resolveTallyOwnerId(decoded);
    const query: any = ownerId ? { financialYear: fy, isReversed: { $ne: true }, ownerId } : { financialYear: fy, isReversed: { $ne: true } };
    if (type) query.type = type;
    if (dateFrom || dateTo) {
      query.date = {};
      if (dateFrom) query.date.$gte = new Date(dateFrom);
      if (dateTo) query.date.$lte = new Date(dateTo);
    }

    const [vouchers, total] = await Promise.all([
      AccVoucher.find(query).sort({ date: -1, createdAt: -1 }).skip(skip).limit(limit).lean(),
      AccVoucher.countDocuments(query),
    ]);

    return apiSuccess({
      vouchers: (vouchers as any[]).map(v => ({
        id: String(v._id),
        voucherNumber: v.voucherNumber,
        date: v.date,
        type: v.type,
        entries: v.entries.map((e: any) => ({
          ledgerId: String(e.ledgerId),
          ledgerName: e.ledgerName,
          amount: e.amount,
          type: e.type,
        })),
        totalDebit: v.totalDebit,
        totalCredit: v.totalCredit,
        narration: v.narration,
        partyName: v.partyName,
        receiptFileUrl: v.receiptFileUrl,
      })),
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (error: any) {
    console.error('[Tally Vouchers GET]', error);
    return apiError('SERVER_ERROR', error.message);
  }
}

export async function POST(request: NextRequest) {
  try {
    const decoded = getAuth(request);
    if (!decoded) return apiError('UNAUTHORIZED');

    await connectDB();
    const AccLedger = getAccLedger();

    const body = await request.json();
    const { date, type, entries, narration, financialYear, partyLedgerId, partyName, receiptFileUrl, receiptFileName } = body;

    // Basic validation
    if (!date || !type || !entries || !financialYear) {
      return apiError('VALIDATION_ERROR', 'date, type, entries, and financialYear are required');
    }

    const validTypes: VoucherType[] = ['RECEIPT', 'PAYMENT', 'JOURNAL', 'CONTRA', 'SALES', 'PURCHASE', 'DEBIT_NOTE', 'CREDIT_NOTE'];
    if (!validTypes.includes(type)) {
      return apiError('VALIDATION_ERROR', `type must be one of: ${validTypes.join(', ')}`);
    }

    if (!Array.isArray(entries) || entries.length < 2) {
      return apiError('VALIDATION_ERROR', 'At least 2 entries required for double-entry bookkeeping');
    }

    // Validate all ledger IDs exist
    const ledgerIds = entries.map((e: any) => e.ledgerId);
    const ledgers = await AccLedger.find({ _id: { $in: ledgerIds }, financialYear }).lean();
    const ledgerMap = new Map((ledgers as any[]).map(l => [String(l._id), l]));

    for (const entry of entries) {
      if (!ledgerMap.has(entry.ledgerId)) {
        return apiError('VALIDATION_ERROR', `Ledger "${entry.ledgerId}" not found for FY ${financialYear}`);
      }
      // Auto-fill ledger name from DB if not provided
      if (!entry.ledgerName) {
        entry.ledgerName = (ledgerMap.get(entry.ledgerId) as any)?.name || 'Unknown';
      }
    }

    // Validate double-entry balance
    const validation = validateVoucherEntries(entries);
    if (!validation.valid) {
      return apiError('VALIDATION_ERROR', validation.errors.join('; '));
    }

    // Create the voucher
    const writeOwnerId = getTallyOwnerIdForWrite(decoded);
    const voucher = await createVoucher({
      date: new Date(date),
      type,
      entries,
      narration,
      financialYear,
      partyLedgerId,
      partyName,
      createdByUserId: (decoded as any)?.userId,
      receiptFileUrl,
      receiptFileName,
      ownerId: writeOwnerId,
    });

    invalidateReportCache(financialYear);

    return apiSuccess({
      id: String(voucher._id),
      voucherNumber: voucher.voucherNumber,
      type: voucher.type,
      totalDebit: voucher.totalDebit,
      totalCredit: voucher.totalCredit,
      message: `Voucher ${voucher.voucherNumber} created (balanced: ₹${voucher.totalDebit})`,
    }, 201);
  } catch (error: any) {
    console.error('[Tally Vouchers POST]', error);
    if (error.message?.includes('validation failed')) {
      return apiError('VALIDATION_ERROR', error.message);
    }
    return apiError('SERVER_ERROR', error.message);
  }
}

/**
 * PUT /api/tally/vouchers — Update a voucher
 * Body: { id, date?, type?, entries?, narration? }
 */
export async function PUT(request: NextRequest) {
  try {
    const decoded = getAuth(request);
    if (!decoded || !(decoded as any).isAdmin) return apiError('UNAUTHORIZED');

    await connectDB();
    const body = await request.json();
    const { id, date, type, entries, narration } = body;

    if (!id) return apiError('VALIDATION_ERROR', 'Voucher id is required');

    // Validate entries if provided
    if (entries) {
      if (!Array.isArray(entries) || entries.length < 2) {
        return apiError('VALIDATION_ERROR', 'At least 2 entries required for double-entry bookkeeping');
      }
      const validation = validateVoucherEntries(entries);
      if (!validation.valid) {
        return apiError('VALIDATION_ERROR', validation.errors.join('; '));
      }

      // Validate ledger IDs exist
      const AccLedger = getAccLedger();
      const ledgerIds = entries.map((e: any) => e.ledgerId);
      const ledgers = await AccLedger.find({ _id: { $in: ledgerIds } }).lean();
      const ledgerMap = new Map((ledgers as any[]).map(l => [String(l._id), l]));
      for (const entry of entries) {
        if (!ledgerMap.has(entry.ledgerId)) {
          return apiError('VALIDATION_ERROR', `Ledger "${entry.ledgerId}" not found`);
        }
        if (!entry.ledgerName) entry.ledgerName = (ledgerMap.get(entry.ledgerId) as any)?.name || 'Unknown';
      }
    }

    const ownerId = resolveTallyOwnerId(decoded);
    const voucher = await updateVoucher(id, {
      date: date ? new Date(date) : undefined,
      type,
      entries,
      narration,
    }, ownerId);

    return apiSuccess({
      id: String(voucher._id),
      voucherNumber: voucher.voucherNumber,
      type: voucher.type,
      totalDebit: voucher.totalDebit,
      totalCredit: voucher.totalCredit,
      message: `Voucher ${voucher.voucherNumber} updated`,
    });
  } catch (error: any) {
    console.error('[Tally Vouchers PUT]', error);
    if (error.message?.includes('locked') || error.message?.includes('reversed')) {
      return apiError('VALIDATION_ERROR', error.message);
    }
    return apiError('SERVER_ERROR', error.message);
  }
}

/**
 * DELETE /api/tally/vouchers — Delete (reverse) a voucher
 * Body: { id }
 */
export async function DELETE(request: NextRequest) {
  try {
    const decoded = getAuth(request);
    if (!decoded || !(decoded as any).isAdmin) return apiError('UNAUTHORIZED');

    const body = await request.json();
    const { id } = body;

    if (!id) return apiError('VALIDATION_ERROR', 'Voucher id is required');

    const ownerId = resolveTallyOwnerId(decoded);
    const result = await deleteVoucher(id, ownerId);
    return apiSuccess(result);
  } catch (error: any) {
    console.error('[Tally Vouchers DELETE]', error);
    if (error.message?.includes('locked') || error.message?.includes('reversed') || error.message?.includes('not found')) {
      return apiError('VALIDATION_ERROR', error.message);
    }
    return apiError('SERVER_ERROR', error.message);
  }
}
