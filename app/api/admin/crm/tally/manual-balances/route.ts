/**
 * Tally Manual Balances API — Opening Balances from CA Reports
 *
 * GET  /api/admin/crm/tally/manual-balances?fy=2023-24           — list all manual entries for FY
 * POST /api/admin/crm/tally/manual-balances  { action: 'add', ... }    — add new entry
 * POST /api/admin/crm/tally/manual-balances  { action: 'update', id, ... } — update entry
 * POST /api/admin/crm/tally/manual-balances  { action: 'delete', id }  — delete entry
 * POST /api/admin/crm/tally/manual-balances  { action: 'bulk-add', entries: [...] } — bulk add
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';
import { getTallyManualBalance } from '@/lib/schemas/enterpriseSchemas';

export const dynamic = 'force-dynamic';

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
    if (!isSuperAdmin(decoded)) {
      return NextResponse.json({ error: 'Forbidden: Superadmin access required for Tally data' }, { status: 403 });
    }

    await connectDB();
    const ManualBalance = getTallyManualBalance();

    const { searchParams } = request.nextUrl;
    const fy = searchParams.get('fy') || '2023-24';

    const entries = await ManualBalance.find({ financialYear: fy })
      .sort({ category: 1, parentGroup: 1, ledgerName: 1 })
      .lean();

    // Calculate totals — respect Dr/Cr direction
    // Assets: Dr = positive (normal), Cr = negative (reduces)
    // Liabilities: Cr = positive (normal), Dr = negative (reduces)
    // Income: Cr = positive (normal)
    // Expenses: Dr = positive (normal)
    const assets = entries.filter((e: any) => e.category === 'asset');
    const liabilities = entries.filter((e: any) => e.category === 'liability');
    const income = entries.filter((e: any) => e.category === 'income');
    const expenses = entries.filter((e: any) => e.category === 'expense');

    const effectiveAmt = (e: any) => {
      const amt = Math.abs(e.amount || 0);
      if (e.category === 'asset') return e.drCr === 'Cr' ? -amt : amt;
      if (e.category === 'liability') return e.drCr === 'Dr' ? -amt : amt;
      if (e.category === 'income') return e.drCr === 'Dr' ? -amt : amt;
      if (e.category === 'expense') return e.drCr === 'Cr' ? -amt : amt;
      return amt;
    };

    const totalAssets = assets.reduce((s: number, e: any) => s + effectiveAmt(e), 0);
    const totalLiabilities = liabilities.reduce((s: number, e: any) => s + effectiveAmt(e), 0);
    const totalIncome = income.reduce((s: number, e: any) => s + effectiveAmt(e), 0);
    const totalExpenses = expenses.reduce((s: number, e: any) => s + effectiveAmt(e), 0);

    return NextResponse.json({
      success: true,
      count: entries.length,
      entries,
      totals: { totalAssets, totalLiabilities, totalIncome, totalExpenses },
      financialYear: fy,
    });
  } catch (error: any) {
    console.error('[Manual Balances GET Error]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return unauthorized();
    const decoded = verifyToken(authHeader.split(' ')[1]);
    if (!decoded || !decoded.isAdmin) return unauthorized();
    if (!isSuperAdmin(decoded)) {
      return NextResponse.json({ error: 'Forbidden: Superadmin access required for Tally data' }, { status: 403 });
    }

    await connectDB();
    const ManualBalance = getTallyManualBalance();

    const body = await request.json().catch(() => ({}));
    const { action } = body;

    switch (action) {
      case 'add': {
        const { ledgerName, parentGroup, category, amount, drCr, financialYear, asOnDate, notes } = body;
        if (!ledgerName || !parentGroup || !category || amount === undefined || !financialYear) {
          return apiError('Missing required fields: ledgerName, parentGroup, category, amount, financialYear');
        }
        const entry = await ManualBalance.create({
          ledgerName: ledgerName.trim(),
          parentGroup: parentGroup.trim(),
          category,
          amount: Math.abs(Number(amount)),
          drCr: drCr || (category === 'asset' || category === 'expense' ? 'Dr' : 'Cr'),
          financialYear,
          asOnDate: asOnDate || '',
          notes: notes || '',
          createdBy: decoded.userId || 'admin',
        });
        return NextResponse.json({ success: true, entry });
      }

      case 'update': {
        const { id, ...updates } = body;
        if (!id) return apiError('Missing entry id');
        const allowed = ['ledgerName', 'parentGroup', 'category', 'amount', 'drCr', 'asOnDate', 'notes'];
        const upd: any = {};
        for (const key of allowed) {
          if (updates[key] !== undefined) {
            upd[key] = key === 'amount' ? Math.abs(Number(updates[key])) : updates[key];
          }
        }
        const updated = await ManualBalance.findByIdAndUpdate(id, upd, { new: true });
        if (!updated) return apiError('Entry not found', 404);
        return NextResponse.json({ success: true, entry: updated });
      }

      case 'delete': {
        const { id } = body;
        if (!id) return apiError('Missing entry id');
        const deleted = await ManualBalance.findByIdAndDelete(id);
        if (!deleted) return apiError('Entry not found', 404);
        return NextResponse.json({ success: true, deleted: true });
      }

      case 'bulk-add': {
        const { entries, financialYear } = body;
        if (!entries || !Array.isArray(entries) || entries.length === 0) {
          return apiError('Missing entries array');
        }
        const fy = financialYear || '2023-24';
        const docs = entries.map((e: any) => ({
          ledgerName: (e.ledgerName || '').trim(),
          parentGroup: (e.parentGroup || '').trim(),
          category: e.category || 'asset',
          amount: Math.abs(Number(e.amount || 0)),
          drCr: e.drCr || (e.category === 'asset' || e.category === 'expense' ? 'Dr' : 'Cr'),
          financialYear: fy,
          asOnDate: e.asOnDate || '',
          notes: e.notes || '',
          createdBy: decoded.userId || 'admin',
        })).filter((d: any) => d.ledgerName && d.parentGroup && d.amount > 0);

        if (docs.length === 0) return apiError('No valid entries to add');
        const result = await ManualBalance.insertMany(docs);
        return NextResponse.json({ success: true, count: result.length });
      }

      case 'delete-all': {
        const { financialYear } = body;
        if (!financialYear) return apiError('Missing financialYear');
        const result = await ManualBalance.deleteMany({ financialYear });
        return NextResponse.json({ success: true, deleted: result.deletedCount });
      }

      case 'carry-forward': {
        // Carry forward ALL ledger balances from source FY → opening balances in target FY
        // BS items (assets + liabilities) keep their closing balance
        // P&L items (income + expenses) get zero opening balance (ledger exists but resets)
        const sourceFY = body.sourceFY || '2023-24';
        const targetFY = body.targetFY || '2024-25';

        if (sourceFY === targetFY) return apiError('Source and target FY must be different');

        // Get ALL source FY entries (prefer CA-audited, fallback to any)
        let sourceEntries = await ManualBalance.find({
          financialYear: sourceFY,
          createdBy: 'ca-report-import',
        }).lean();

        // If no CA entries, use any entries from that FY (deduplicate by ledgerName)
        if (sourceEntries.length === 0) {
          const allEntries = await ManualBalance.find({ financialYear: sourceFY }).lean();
          const seen = new Set<string>();
          sourceEntries = allEntries.filter((e: any) => {
            if (seen.has(e.ledgerName)) return false;
            seen.add(e.ledgerName);
            return true;
          });
        }

        if (sourceEntries.length === 0) {
          return apiError(`No balance entries found for FY ${sourceFY}`);
        }

        // Delete old carry-forward entries in target FY
        const deleted = await ManualBalance.deleteMany({
          financialYear: targetFY,
          createdBy: 'carry-forward',
        });

        // Create opening balances for target FY
        // BS items: carry closing balance, P&L items: zero opening balance
        let bsCount = 0, plCount = 0;
        const openingEntries = sourceEntries.map((e: any) => {
          const isBS = e.category === 'asset' || e.category === 'liability';
          if (isBS) bsCount++; else plCount++;
          return {
            ledgerName: e.ledgerName,
            parentGroup: e.parentGroup,
            category: e.category,
            amount: isBS ? e.amount : 0,
            drCr: e.drCr,
            financialYear: targetFY,
            asOnDate: targetFY.split('-')[0] + '-04-01',
            notes: isBS
              ? `Opening balance carried forward from FY ${sourceFY}`
              : `Ledger carried from FY ${sourceFY} (P&L reset to zero)`,
            createdBy: 'carry-forward',
          };
        });

        const inserted = await ManualBalance.insertMany(openingEntries);

        // Calculate totals for verification (only BS items have non-zero amounts)
        let totalDr = 0, totalCr = 0;
        openingEntries.forEach((e: any) => {
          if (e.amount > 0) {
            if (e.drCr === 'Dr') totalDr += e.amount;
            else totalCr += e.amount;
          }
        });

        return NextResponse.json({
          success: true,
          sourceFY,
          targetFY,
          carried: inserted.length,
          bsItems: bsCount,
          plItems: plCount,
          deletedOld: deleted.deletedCount,
          totalDr,
          totalCr,
          balanced: Math.abs(totalDr - totalCr) < 1,
        });
      }

      default:
        return apiError('Invalid action. Use: add, update, delete, bulk-add, delete-all, carry-forward');
    }
  } catch (error: any) {
    console.error('[Manual Balances POST Error]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
