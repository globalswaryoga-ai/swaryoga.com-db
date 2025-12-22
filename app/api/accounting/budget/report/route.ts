import { NextRequest, NextResponse } from 'next/server';
import { connectDB, BudgetPlan, Transaction } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

const getUserOwner = (request: NextRequest) => {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : null;
  if (!token) return null;
  const decoded = verifyToken(token);
  if (!decoded?.userId) return null;
  return { ownerType: 'user' as const, ownerId: decoded.userId };
};

const toISODate = (d: Date) => d.toISOString().split('T')[0];

const normalize = (v: unknown) => String(v ?? '').trim().toLowerCase();

const outflowTypes = new Set(['expense', 'investment_in', 'emi']);
const inflowTypes = new Set(['income', 'loan', 'investment_out']);

const computePeriodBaseIncome = (params: {
  baseMode: 'actual' | 'target';
  plan: any;
  incomeActual: number;
  startDateISO: string;
  endDateISO: string;
  baseIncomeOverride?: number;
}) => {
  if (typeof params.baseIncomeOverride === 'number' && Number.isFinite(params.baseIncomeOverride) && params.baseIncomeOverride >= 0) {
    return params.baseIncomeOverride;
  }

  if (params.baseMode === 'actual') return params.incomeActual;

  // Heuristic: if range is within a month, use monthly target; else yearly.
  const start = new Date(params.startDateISO);
  const end = new Date(params.endDateISO);
  const days = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);

  const monthly = Number(params.plan?.incomeTargetMonthly ?? 0);
  const yearly = Number(params.plan?.incomeTargetYearly ?? 0);
  const weekly = Number(params.plan?.incomeTargetWeekly ?? 0);

  if (days <= 8 && weekly > 0) return weekly;
  if (days <= 35 && monthly > 0) return monthly;
  if (yearly > 0) {
    // If range looks like a full year, use yearly; otherwise prorate.
    if (days >= 360) return yearly;
    return (yearly / 365) * days;
  }

  return params.incomeActual;
};

export async function POST(request: NextRequest) {
  try {
    const owner = getUserOwner(request);
    if (!owner) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();

    const year = Number(body?.year ?? new Date().getFullYear());
    const startDateISO = String(body?.startDate ?? '').trim();
    const endDateISO = String(body?.endDate ?? '').trim();
    const baseMode: 'actual' | 'target' = body?.baseMode === 'target' ? 'target' : 'actual';

    if (!Number.isFinite(year) || year < 2000 || year > 3000) {
      return NextResponse.json({ error: 'Invalid year' }, { status: 400 });
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDateISO) || !/^\d{4}-\d{2}-\d{2}$/.test(endDateISO)) {
      return NextResponse.json({ error: 'Invalid startDate/endDate. Use YYYY-MM-DD.' }, { status: 400 });
    }

    await connectDB();

    const plan = await BudgetPlan.findOne({ ...owner, year });
    if (!plan) {
      return NextResponse.json({ error: 'Budget plan not found. Save your plan first.' }, { status: 404 });
    }

    const startDate = new Date(startDateISO);
    const endDate = new Date(endDateISO);
    // Ensure end-of-day inclusion
    endDate.setHours(23, 59, 59, 999);

    const txns = await Transaction.find({
      ...owner,
      date: { $gte: startDate, $lte: endDate },
    }).select('type amount category date');

    const totals = {
      income: 0,
      outflow: 0,
      profit: 0,
    };

    const outflowByCategory = new Map<string, number>();

    for (const t of txns) {
      const type = String((t as any).type);
      const amount = Number((t as any).amount ?? 0);
      const category = normalize((t as any).category);

      if (!Number.isFinite(amount)) continue;

      if (inflowTypes.has(type)) {
        totals.income += amount;
        continue;
      }

      if (outflowTypes.has(type)) {
        totals.outflow += amount;
        outflowByCategory.set(category, (outflowByCategory.get(category) ?? 0) + amount);
        continue;
      }

      // Ignore unknown types for now.
    }

    totals.profit = totals.income - totals.outflow;

    const baseIncome = computePeriodBaseIncome({
      baseMode,
      plan,
      incomeActual: totals.income,
      startDateISO,
      endDateISO,
      baseIncomeOverride: typeof body?.baseIncome === 'number' ? body.baseIncome : Number(body?.baseIncome),
    });

    const allocations = Array.isArray((plan as any).allocations) ? (plan as any).allocations : [];

    const buckets = allocations.map((a: any) => {
      const key = String(a?.key ?? '').trim();
      const label = String(a?.label ?? key).trim();
      const kind: 'expense' | 'profit' = a?.kind === 'profit' ? 'profit' : 'expense';
      const percent = typeof a?.percent === 'number' ? a.percent : Number(a?.percent);

      const keyNorm = normalize(key);
      const labelNorm = normalize(label);

      const budgetAmount = (Number.isFinite(percent) ? percent : 0) * baseIncome / 100;

      let actualAmount = 0;
      if (kind === 'profit' || keyNorm === 'profit') {
        actualAmount = totals.profit;
      } else {
        // match by key OR label
        actualAmount = (outflowByCategory.get(keyNorm) ?? 0) + (labelNorm && labelNorm !== keyNorm ? (outflowByCategory.get(labelNorm) ?? 0) : 0);
      }

      const varianceAmount = actualAmount - budgetAmount;
      const variancePercent = baseIncome > 0 ? (varianceAmount / baseIncome) * 100 : 0;

      return {
        key,
        label,
        kind,
        percent,
        budgetAmount,
        actualAmount,
        varianceAmount,
        variancePercent,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        year,
        range: {
          startDate: startDateISO,
          endDate: endDateISO,
        },
        currency: (plan as any).currency ?? 'INR',
        baseMode,
        baseIncome,
        totals,
        buckets,
        meta: {
          transactionsCount: txns.length,
          generatedAt: toISODate(new Date()),
        },
      },
    });
  } catch (error) {
    console.error('Error generating budget report:', error);
    return NextResponse.json({ error: 'Failed to generate budget report' }, { status: 500 });
  }
}
