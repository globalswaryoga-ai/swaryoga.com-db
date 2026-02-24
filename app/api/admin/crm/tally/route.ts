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

        // CA-audited P&L figures (final filed numbers)
        const CA_PL: Record<string, any> = {
          '2024-25': {
            totalIncome: 515717,
            totalExpenses: 627048,
            netProfit: -111331,
            income: [{
              name: 'Income',
              amount: 515717,
              children: [
                { name: 'Class Income (Bank)', amount: 270242 },
                { name: 'Cash Workshop (40-batch, Oct)', amount: 96000 },
                { name: 'Cash Workshop (deposited)', amount: 85000 },
                { name: 'Nepal Workshop', amount: 60000 },
                { name: 'Light Bill + Interest', amount: 4475 },
              ],
            }],
            expenses: [
              {
                name: 'Operating Expenses',
                amount: 530886,
                children: [
                  { name: 'All Other Overheads', amount: 419886 },
                  { name: 'Director Remuneration (Mohan)', amount: 75000 },
                  { name: 'Staff Salary (Upamnyu 3K×12)', amount: 36000 },
                ],
              },
              {
                name: 'Depreciation',
                amount: 96162,
                children: [
                  { name: 'Computer', amount: 70836 },
                  { name: 'Apple 15 (Mobile)', amount: 14688 },
                  { name: 'Machinery & Equipment', amount: 5902 },
                  { name: 'Software', amount: 2645 },
                  { name: 'Furniture', amount: 2091 },
                ],
              },
            ],
          },
        };

        // Use CA-audited figures if available
        if (CA_PL[fy]) {
          return NextResponse.json({ success: true, ...CA_PL[fy] });
        }

        // For other FYs: Build P&L from manual vouchers
        const MV = getTallyManualVoucher();
        const detailStats = await MV.aggregate([
          { $match: { financialYear: fy } },
          { $group: {
            _id: { ledgerName: '$ledgerName', voucherType: '$voucherType' },
            total: { $sum: '$amount' },
            count: { $sum: 1 },
          }},
          { $sort: { total: -1 } },
        ]);

        const incomeItems: { name: string; amount: number }[] = [];
        let totalIncome = 0;
        const expenseBuckets: Record<string, number> = {};
        let totalExpenses = 0;

        for (const row of detailStats) {
          const { ledgerName, voucherType } = row._id;
          if (voucherType === 'Receipt') {
            incomeItems.push({ name: ledgerName, amount: row.total });
            totalIncome += row.total;
          } else if (voucherType === 'Payment') {
            expenseBuckets[ledgerName] = (expenseBuckets[ledgerName] || 0) + row.total;
            totalExpenses += row.total;
          }
        }
        incomeItems.sort((a, b) => b.amount - a.amount);
        const expenseItems = Object.entries(expenseBuckets)
          .map(([name, amount]) => ({ name, amount: Math.round(amount * 100) / 100 }))
          .sort((a, b) => b.amount - a.amount);

        if (totalIncome > 0 || totalExpenses > 0) {
          return NextResponse.json({
            success: true,
            income: [{ name: 'Income', amount: totalIncome, children: incomeItems }],
            expenses: [{ name: 'Expenses', amount: totalExpenses, children: expenseItems }],
            totalIncome,
            totalExpenses,
            netProfit: totalIncome - totalExpenses,
          });
        }

        // Last resort: try Tally Prime
        try {
          const pl = await fetchProfitAndLoss(from, to);
          const plAny = pl as any;
          if (pl && (plAny.totalIncome > 0 || plAny.totalExpenses > 0)) {
            return NextResponse.json({ success: true, ...pl });
          }
        } catch { /* Tally not connected */ }

        return NextResponse.json({
          success: true,
          income: [], expenses: [],
          totalIncome: 0, totalExpenses: 0, netProfit: 0,
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

        // Always fetch manual voucher data from MongoDB FIRST
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

        const hasManualData = Object.keys(manualStats).length > 0;

        // Only try Tally Prime if NO manual data exists
        // Tally Prime is desktop software (localhost:9000) — never works on Vercel serverless
        let tallySummary: any = null;
        let tallyConnected = false;
        if (!hasManualData) {
          try {
            tallySummary = await fetchDashboardSummary(from, to);
            if (tallySummary && (tallySummary.totalReceipts > 0 || tallySummary.salesCount > 0)) {
              tallyConnected = true;
            }
          } catch { /* Tally not connected */ }
        }

        // Recent receipts from manual vouchers
        const recentManualReceipts = await ManualVoucher.find(
          { financialYear: fy, voucherType: 'Receipt' }
        ).sort({ date: -1 }).limit(12).lean();

        // Recent payments from manual vouchers
        const recentManualPayments = await ManualVoucher.find(
          { financialYear: fy, voucherType: 'Payment' }
        ).sort({ date: -1 }).limit(10).lean();

        // Participant count — known counts per FY, fallback to DB query
        const KNOWN_PARTICIPANTS: Record<string, number> = {
          '2024-25': 123,
        };
        let participantCount = KNOWN_PARTICIPANTS[fy] || 0;
        if (!participantCount) {
          const db = mongoose.connection.db;
          if (db) {
            const fyTo = new Date(`20${fy.split('-')[1]}-03-31T23:59:59.999Z`);
            participantCount = await db.collection('users').countDocuments({
              isAdmin: { $ne: true },
              createdAt: { $lte: fyTo },
            });
          }
        }

        // Calculate totals from manual data
        const totalReceipts = manualStats.Receipt?.total || 0;
        const totalPayments = manualStats.Payment?.total || 0;
        const totalContra = manualStats.Contra?.total || 0;

        // Use CA-audited profit/loss for known FYs
        const CA_PROFIT_LOSS: Record<string, number> = {
          '2024-25': -111331,  // Net Loss Rs 1,11,331
        };
        const profitLoss = CA_PROFIT_LOSS[fy] ?? (totalReceipts - totalPayments);

        // Bank statement summary — compute deposits/withdrawals from voucher data
        // Deposits = Receipts (Cr) + Contra that are deposits
        // Withdrawals = Payments (Dr) + Contra that are withdrawals
        // For FY 2024-25 we have exact bank statement figures from Kotak bank
        const bankSummaryByFY: Record<string, any> = {
          '2024-25': {
            openingBalance: 37440.78,
            totalDeposits: 1291896.72,
            totalWithdrawals: 1285586.53,
            closingBalance: 43750.97,
            depositCount: 165,
            withdrawalCount: 415,
            bankName: 'Kotak Mahindra Bank',
            accountNumber: '0247296457',
          },
        };
        const bankSummary = bankSummaryByFY[fy] || {
          openingBalance: 0,
          totalDeposits: totalReceipts + totalContra,
          totalWithdrawals: totalPayments + totalContra,
          closingBalance: 0,
          depositCount: (manualStats.Receipt?.count || 0) + (manualStats.Contra?.count || 0),
          withdrawalCount: (manualStats.Payment?.count || 0) + (manualStats.Contra?.count || 0),
          bankName: 'Kotak Mahindra Bank',
          accountNumber: '0247296457',
        };

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
          bankSummary,
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
