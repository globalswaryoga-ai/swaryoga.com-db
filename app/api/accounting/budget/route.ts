import { NextRequest, NextResponse } from 'next/server';
import { connectDB, BudgetPlan } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import type { AuthContext, BudgetAllocation, NormalizedAllocationsResult } from '@/lib/types';

export const dynamic = 'force-dynamic';

const getUserOwner = (request: NextRequest): AuthContext | null => {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : null;
  if (!token) return null;
  const decoded = verifyToken(token);
  if (!decoded?.userId) return null;
  return { ownerType: 'user', ownerId: decoded.userId };
};

const normalizeAllocations = (allocations: unknown[]): NormalizedAllocationsResult => {
  const list = Array.isArray(allocations) ? allocations : [];
  const normalized = list
    .filter(Boolean)
    .map((a: any): BudgetAllocation => ({
      key: String(a?.key ?? '').trim(),
      label: String(a?.label ?? '').trim(),
      percent: typeof a?.percent === 'number' ? a.percent : Number(a?.percent),
      kind: a?.kind === 'profit' ? 'profit' : 'expense',
    }))
    .filter((a): a is BudgetAllocation => !!(a.key && a.label && Number.isFinite(a.percent)));

  for (const a of normalized) {
    if (a.percent < 0 || a.percent > 100) {
      return { allocations: normalized, error: 'Allocation percent must be between 0 and 100' };
    }
  }

  const sum = normalized.reduce((s, a) => s + a.percent, 0);
  // allow tiny floating error
  if (Math.abs(sum - 100) > 0.01) {
    return { allocations: normalized, error: `Allocation total must be 100%. Current: ${sum.toFixed(2)}%` };
  }

  // Ensure at most one profit bucket.
  const profitBuckets = normalized.filter((a) => a.kind === 'profit');
  if (profitBuckets.length > 1) {
    return { allocations: normalized, error: 'Only one Profit bucket is allowed' };
  }

  return { allocations: normalized };
};

const defaultBudgetPlan = (year: number): Record<string, any> => ({
  year,
  currency: 'INR',
  incomeTargetYearly: 0,
  incomeTargetMonthly: 0,
  incomeTargetWeekly: 0,
  allocations: [
    { key: 'profit', label: 'Profit Ratio', percent: 30, kind: 'profit' },
    { key: 'self', label: 'Self Expense', percent: 15, kind: 'expense' },
    { key: 'family', label: 'Family Expense', percent: 15, kind: 'expense' },
    { key: 'health', label: 'Health', percent: 5, kind: 'expense' },
    { key: 'lic', label: 'LIC / Insurance', percent: 5, kind: 'expense' },
    { key: 'saving', label: 'Saving', percent: 10, kind: 'expense' },
    { key: 'fd', label: 'FD', percent: 5, kind: 'expense' },
    { key: 'investment', label: 'Investment', percent: 10, kind: 'expense' },
    { key: 'growth_fund', label: 'Growth Fund', percent: 3, kind: 'expense' },
    { key: 'asset', label: 'Asset Expense', percent: 1, kind: 'expense' },
    { key: 'new_asset', label: 'New Asset', percent: 1, kind: 'expense' },
  ],
  notes: '',
});

const formatBudgetPlan = (doc: any): Record<string, any> => ({
  id: doc?._id?.toString(),
  year: doc?.year,
  currency: doc?.currency ?? 'INR',
  incomeTargetYearly: doc?.incomeTargetYearly ?? 0,
  incomeTargetMonthly: doc?.incomeTargetMonthly ?? 0,
  incomeTargetWeekly: doc?.incomeTargetWeekly ?? 0,
  allocations: Array.isArray(doc?.allocations) ? doc.allocations : [],
  notes: doc?.notes ?? '',
  createdAt: doc?.createdAt ? doc.createdAt.toISOString() : undefined,
  updatedAt: doc?.updatedAt ? doc.updatedAt.toISOString() : undefined,
});

export async function GET(request: NextRequest) {
  try {
    const owner = getUserOwner(request);
    if (!owner) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const yearParam = searchParams.get('year');
    const year = yearParam ? Number(yearParam) : new Date().getFullYear();

    if (!Number.isFinite(year) || year < 2000 || year > 3000) {
      return NextResponse.json({ error: 'Invalid year' }, { status: 400 });
    }

    await connectDB();

    const plan = await BudgetPlan.findOne({ ...owner, year }).lean();

    return NextResponse.json({
      success: true,
      data: plan ? formatBudgetPlan(plan) : defaultBudgetPlan(year),
    });
  } catch (error) {
    console.error('Error fetching budget plan:', error);
    return NextResponse.json({ error: 'Failed to fetch budget plan' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const owner = getUserOwner(request);
    if (!owner) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const year = Number(body?.year);
    if (!Number.isFinite(year) || year < 2000 || year > 3000) {
      return NextResponse.json({ error: 'Invalid year' }, { status: 400 });
    }

    const incomeTargetYearly = Number(body?.incomeTargetYearly ?? 0);
    const incomeTargetMonthly = Number(body?.incomeTargetMonthly ?? 0);
    const incomeTargetWeekly = Number(body?.incomeTargetWeekly ?? 0);

    if (![incomeTargetYearly, incomeTargetMonthly, incomeTargetWeekly].every((n) => Number.isFinite(n) && n >= 0)) {
      return NextResponse.json({ error: 'Income targets must be non-negative numbers' }, { status: 400 });
    }

    const currency = String(body?.currency ?? 'INR').trim() || 'INR';
    const notes = typeof body?.notes === 'string' ? body.notes : '';

    const { allocations, error } = normalizeAllocations(body?.allocations);
    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }

    await connectDB();

    const plan = await BudgetPlan.findOneAndUpdate(
      { ...owner, year },
      {
        ...owner,
        year,
        currency,
        incomeTargetYearly,
        incomeTargetMonthly,
        incomeTargetWeekly,
        allocations,
        notes,
        updatedAt: new Date(),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return NextResponse.json({ success: true, data: formatBudgetPlan(plan) });
  } catch (error) {
    console.error('Error saving budget plan:', error);
    return NextResponse.json({ error: 'Failed to save budget plan' }, { status: 500 });
  }
}
