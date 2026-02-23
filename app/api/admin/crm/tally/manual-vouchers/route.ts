/**
 * Tally Manual Vouchers API — Receipts, Payments, Journal entries
 *
 * GET  ?fy=2023-24&type=Receipt         — list vouchers for FY and type
 * GET  ?fy=2023-24&type=all             — list ALL voucher types for FY (day book)
 * POST { action: 'add', ... }           — add new voucher
 * POST { action: 'update', id, ... }    — update voucher
 * POST { action: 'delete', id }         — delete voucher
 * POST { action: 'bulk-add', entries }  — bulk add vouchers
 * POST { action: 'stats', financialYear } — get summary totals
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { getTallyManualVoucher } from '@/lib/schemas/enterpriseSchemas';

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

function apiError(msg: string, status = 400) {
  return NextResponse.json({ success: false, error: msg }, { status });
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return unauthorized();
    const decoded = verifyToken(authHeader.split(' ')[1]);
    if (!decoded || !decoded.isAdmin) return unauthorized();

    await connectDB();
    const ManualVoucher = getTallyManualVoucher();

    const { searchParams } = request.nextUrl;
    const fy = searchParams.get('fy') || '2023-24';
    const type = searchParams.get('type') || 'all';

    const filter: any = { financialYear: fy };
    if (type !== 'all') filter.voucherType = type;

    const entries = await ManualVoucher.find(filter).sort({ date: -1, createdAt: -1 }).lean();

    const total = entries.reduce((s: number, e: any) => s + (e.amount || 0), 0);

    return NextResponse.json({
      success: true,
      count: entries.length,
      entries,
      total,
      financialYear: fy,
      voucherType: type,
    });
  } catch (error: any) {
    console.error('[Manual Vouchers GET Error]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return unauthorized();
    const decoded = verifyToken(authHeader.split(' ')[1]);
    if (!decoded || !decoded.isAdmin) return unauthorized();

    await connectDB();
    const ManualVoucher = getTallyManualVoucher();

    const body = await request.json().catch(() => ({}));
    const { action } = body;

    switch (action) {
      case 'add': {
        const { voucherType, voucherNumber, date, partyName, ledgerName, amount, narration, paymentMode, financialYear } = body;
        if (!voucherType || !date || !partyName || amount === undefined || !financialYear) {
          return apiError('Missing required fields: voucherType, date, partyName, amount, financialYear');
        }

        // Auto-generate voucher number if not provided
        let vNum = voucherNumber;
        if (!vNum) {
          const count = await ManualVoucher.countDocuments({ financialYear, voucherType });
          const prefix = voucherType === 'Receipt' ? 'RCP' : voucherType === 'Payment' ? 'PAY' : voucherType === 'Journal' ? 'JRN' : voucherType === 'Sales' ? 'SAL' : voucherType === 'Purchase' ? 'PUR' : 'CNT';
          vNum = `${prefix}-${String(count + 1).padStart(4, '0')}`;
        }

        const entry = await ManualVoucher.create({
          voucherType,
          voucherNumber: vNum,
          date,
          partyName: partyName.trim(),
          ledgerName: ledgerName?.trim() || '',
          amount: Math.abs(Number(amount)),
          narration: narration?.trim() || '',
          paymentMode: paymentMode?.trim() || '',
          financialYear,
          createdBy: decoded.userId || 'admin',
        });
        return NextResponse.json({ success: true, entry, message: 'Voucher added' });
      }

      case 'update': {
        const { id, ...updates } = body;
        if (!id) return apiError('Missing id');
        const allowed = ['voucherType', 'voucherNumber', 'date', 'partyName', 'ledgerName', 'amount', 'narration', 'paymentMode'];
        const upd: any = {};
        for (const key of allowed) {
          if (updates[key] !== undefined) {
            upd[key] = key === 'amount' ? Math.abs(Number(updates[key])) : typeof updates[key] === 'string' ? updates[key].trim() : updates[key];
          }
        }
        const updated = await ManualVoucher.findByIdAndUpdate(id, upd, { new: true }).lean();
        if (!updated) return apiError('Voucher not found', 404);
        return NextResponse.json({ success: true, entry: updated, message: 'Voucher updated' });
      }

      case 'delete': {
        const { id: delId } = body;
        if (!delId) return apiError('Missing id');
        const deleted = await ManualVoucher.findByIdAndDelete(delId);
        if (!deleted) return apiError('Voucher not found', 404);
        return NextResponse.json({ success: true, message: 'Voucher deleted' });
      }

      case 'bulk-add': {
        const { entries, financialYear: bulkFY } = body;
        if (!entries?.length || !bulkFY) return apiError('Missing entries array or financialYear');
        const docs = entries.map((e: any, idx: number) => ({
          voucherType: e.voucherType || 'Receipt',
          voucherNumber: e.voucherNumber || `IMP-${String(idx + 1).padStart(4, '0')}`,
          date: e.date,
          partyName: e.partyName?.trim() || 'Unknown',
          ledgerName: e.ledgerName?.trim() || '',
          amount: Math.abs(Number(e.amount)) || 0,
          narration: e.narration?.trim() || '',
          paymentMode: e.paymentMode?.trim() || '',
          financialYear: bulkFY,
          createdBy: decoded.userId || 'admin',
        }));
        const result = await ManualVoucher.insertMany(docs);
        return NextResponse.json({ success: true, insertedCount: result.length, message: `${result.length} vouchers imported` });
      }

      case 'stats': {
        const { financialYear: statFY } = body;
        const fy = statFY || '2023-24';
        const pipeline = [
          { $match: { financialYear: fy } },
          {
            $group: {
              _id: '$voucherType',
              count: { $sum: 1 },
              total: { $sum: '$amount' },
            },
          },
        ];
        const stats = await ManualVoucher.aggregate(pipeline);
        const result: any = {};
        for (const s of stats) {
          result[s._id] = { count: s.count, total: s.total };
        }
        return NextResponse.json({ success: true, stats: result, financialYear: fy });
      }

      default:
        return apiError('Invalid action. Use: add, update, delete, bulk-add, stats');
    }
  } catch (error: any) {
    console.error('[Manual Vouchers POST Error]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
