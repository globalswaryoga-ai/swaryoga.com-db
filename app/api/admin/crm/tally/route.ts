/**
 * Tally Prime CRM Dashboard API
 *
 * GET  /api/admin/crm/tally                   — dashboard summary
 * GET  /api/admin/crm/tally?action=test        — connection test
 * GET  /api/admin/crm/tally?action=ledgers     — all ledgers (optional ?group=Sundry Debtors)
 * GET  /api/admin/crm/tally?action=vouchers&type=Sales&from=20250401&to=20260331
 * GET  /api/admin/crm/tally?action=stock       — stock items
 * GET  /api/admin/crm/tally?action=daybook&from=20260223&to=20260223
 * GET  /api/admin/crm/tally?action=profitloss&from=20240401&to=20250331
 * GET  /api/admin/crm/tally?action=balancesheet&from=20240401&to=20250331
 * POST /api/admin/crm/tally  { action: 'sync', from?, to? } — auto-sync to MongoDB
 * GET  /api/admin/crm/tally?action=syncStatus  — last sync info
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import {
  getTallyConfig,
  testTallyConnection,
  fetchDashboardSummary,
  fetchLedgers,
  fetchVouchers,
  fetchStockItems,
  fetchDayBook,
  fetchProfitAndLoss,
  fetchBalanceSheet,
} from '@/lib/tally/tallyPrimeAPI';
import { runTallyAutoSync, getLastSyncInfo } from '@/lib/tally/tallyAutoSync';
import { getTallyManualVoucher } from '@/lib/schemas/enterpriseSchemas';
import mongoose from 'mongoose';

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

export async function GET(request: NextRequest) {
  try {
    // Auth check — admin only
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return unauthorized();
    const decoded = verifyToken(authHeader.split(' ')[1]);
    if (!decoded || !decoded.isAdmin) return unauthorized();

    await connectDB();

    const { searchParams } = request.nextUrl;
    const action = searchParams.get('action') || 'dashboard';

    // Return current config status (never expose password)
    const config = getTallyConfig();
    const configStatus = {
      url: config.url,
      companyName: config.companyName || '(not set)',
      serialNumber: config.serialNumber ? '••••' + config.serialNumber.slice(-4) : '(not set)',
      email: config.email || '(not set)',
      configured: config.configured,
    };

    switch (action) {
      case 'test': {
        const result = await testTallyConnection();
        return NextResponse.json({ success: true, config: configStatus, connection: result });
      }

      case 'ledgers': {
        const group = searchParams.get('group') || undefined;
        const ledgers = await fetchLedgers(group);
        return NextResponse.json({ success: true, count: ledgers.length, ledgers });
      }

      case 'vouchers': {
        const type = searchParams.get('type') || 'Sales';
        const from = searchParams.get('from') || undefined;
        const to = searchParams.get('to') || undefined;
        const vouchers = await fetchVouchers(type, from, to);
        return NextResponse.json({ success: true, count: vouchers.length, vouchers });
      }

      case 'stock': {
        const items = await fetchStockItems();
        return NextResponse.json({ success: true, count: items.length, items });
      }

      case 'daybook': {
        const from = searchParams.get('from') || undefined;
        const to = searchParams.get('to') || undefined;
        const vouchers = await fetchDayBook(from, to);
        return NextResponse.json({ success: true, count: vouchers.length, vouchers });
      }

      case 'profitloss': {
        const from = searchParams.get('from') || undefined;
        const to = searchParams.get('to') || undefined;
        const fy = searchParams.get('fy') || '2024-25';
        try {
          const pl = await fetchProfitAndLoss(from, to);
          if (pl && ((pl as any).income?.length > 0 || (pl as any).expenses?.length > 0)) {
            return NextResponse.json({ success: true, ...pl });
          }
        } catch { /* Tally not connected, fall back to voucher data */ }

        // Fallback: build P&L from manual vouchers
        const MV = getTallyManualVoucher();
        const plStats = await MV.aggregate([
          { $match: { financialYear: fy } },
          { $group: { _id: '$voucherType', total: { $sum: '$amount' } } },
        ]);
        const plMap: Record<string, number> = {};
        for (const s of plStats) plMap[s._id] = s.total;
        const totalIncome = plMap['Receipt'] || 0;
        const totalExpenses = plMap['Payment'] || 0;
        return NextResponse.json({
          success: true,
          income: [{ name: 'Receipts', amount: totalIncome, children: [{ name: 'Swar Yoga Receipts', amount: totalIncome }] }],
          expenses: [{ name: 'Payments', amount: totalExpenses, children: [{ name: 'Bank Payments', amount: totalExpenses }] }],
          totalIncome,
          totalExpenses,
          netProfit: totalIncome - totalExpenses,
        });
      }

      case 'balancesheet': {
        const from = searchParams.get('from') || undefined;
        const to = searchParams.get('to') || undefined;
        const bs = await fetchBalanceSheet(from, to);
        return NextResponse.json({ success: true, ...bs });
      }

      case 'syncStatus': {
        const syncInfo = await getLastSyncInfo();
        return NextResponse.json({ success: true, ...syncInfo });
      }

      case 'dashboard':
      default: {
        const from = searchParams.get('from') || undefined;
        const to = searchParams.get('to') || undefined;
        const fy = searchParams.get('fy') || '2024-25';

        // Try Tally Prime first, fallback to manual voucher data
        let tallySummary: any = null;
        let tallyConnected = false;
        try {
          tallySummary = await fetchDashboardSummary(from, to);
          if (tallySummary && (tallySummary.totalReceipts > 0 || tallySummary.salesCount > 0)) {
            tallyConnected = true;
          }
        } catch { /* Tally not connected */ }

        // Always fetch manual voucher data from MongoDB
        const ManualVoucher = getTallyManualVoucher();
        const pipeline = [
          { $match: { financialYear: fy } },
          { $group: { _id: '$voucherType', count: { $sum: 1 }, total: { $sum: '$amount' } } },
        ];
        const stats = await ManualVoucher.aggregate(pipeline);
        const manualStats: Record<string, { count: number; total: number }> = {};
        for (const s of stats) {
          manualStats[s._id] = { count: s.count, total: s.total };
        }

        // Recent receipts from manual vouchers
        const recentManualReceipts = await ManualVoucher.find(
          { financialYear: fy, voucherType: 'Receipt' }
        ).sort({ date: -1 }).limit(12).lean();

        // Recent payments from manual vouchers
        const recentManualPayments = await ManualVoucher.find(
          { financialYear: fy, voucherType: 'Payment' }
        ).sort({ date: -1 }).limit(10).lean();

        // Participant count from users collection — filter by FY date range
        const db = mongoose.connection.db;
        let participantCount = 0;
        if (db) {
          const [fyStart] = fy.split('-');
          const fyFrom = new Date(`${fyStart}-04-01T00:00:00.000Z`);
          const fyTo = new Date(`20${fy.split('-')[1]}-03-31T23:59:59.999Z`);
          participantCount = await db.collection('users').countDocuments({
            isAdmin: { $ne: true },
            createdAt: { $gte: fyFrom, $lte: fyTo },
          });
        }

        // Calculate P&L from manual data
        const totalReceipts = manualStats.Receipt?.total || 0;
        const totalPayments = manualStats.Payment?.total || 0;
        const totalContra = manualStats.Contra?.total || 0;
        const profitLoss = totalReceipts - totalPayments;

        // Build summary — use Tally data if connected, else manual data
        const summary = tallyConnected ? tallySummary : {
          company: {
            name: 'Upamnyu International Education Pvt Ltd',
            formalName: 'Swar Yoga',
            state: 'Maharashtra',
            financialYearFrom: fy.split('-')[0],
            financialYearTo: '20' + fy.split('-')[1],
          },
          totalSales: manualStats.Sales?.total || 0,
          totalReceipts,
          totalPurchases: manualStats.Purchase?.total || 0,
          totalDebtors: 0,
          totalCreditors: 0,
          salesCount: manualStats.Sales?.count || 0,
          receiptCount: manualStats.Receipt?.count || 0,
          purchaseCount: manualStats.Purchase?.count || 0,
          debtorCount: 0,
          creditorCount: 0,
          recentSales: [],
          recentReceipts: recentManualReceipts.map((r: any) => ({
            voucherNumber: r.voucherNumber,
            voucherType: 'Receipt',
            date: r.date?.replace(/-/g, '') || '',
            partyName: r.partyName,
            amount: r.amount,
            narration: r.narration,
          })),
        };

        return NextResponse.json({
          success: true,
          config: configStatus,
          summary,
          tallyConnected,
          manualStats,
          totalPayments,
          totalContra,
          profitLoss,
          participantCount,
          recentPayments: recentManualPayments.map((r: any) => ({
            voucherNumber: r.voucherNumber,
            voucherType: 'Payment',
            date: r.date?.replace(/-/g, '') || '',
            partyName: r.partyName,
            amount: r.amount,
            narration: r.narration,
          })),
        });
      }
    }
  } catch (error: any) {
    console.error('[Tally API Error]', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 },
    );
  }
}

// ─── POST: Trigger auto-sync ───────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return unauthorized();
    const decoded = verifyToken(authHeader.split(' ')[1]);
    if (!decoded || !decoded.isAdmin) return unauthorized();

    const body = await request.json().catch(() => ({}));
    const { action, from, to } = body as { action?: string; from?: string; to?: string };

    if (action !== 'sync') {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const result = await runTallyAutoSync(from, to);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[Tally Sync Error]', error);
    return NextResponse.json(
      { error: error.message || 'Sync failed' },
      { status: 500 },
    );
  }
}
