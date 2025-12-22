import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { connectDB, BudgetPlan, Transaction } from '@/lib/db';

const getUserOwner = (request: NextRequest) => {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : null;
  if (!token) return null;
  const decoded = verifyToken(token);
  if (!decoded?.userId) return null;
  return { ownerType: 'user' as const, ownerId: decoded.userId };
};

const escapeHtml = (s: any) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const money = (n: any, currency: string) => {
  const num = typeof n === 'number' ? n : Number(n);
  if (!Number.isFinite(num)) return `${currency} 0`;
  return `${currency} ${Math.round(num).toLocaleString()}`;
};

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

  const start = new Date(params.startDateISO);
  const end = new Date(params.endDateISO);
  const days = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);

  const monthly = Number(params.plan?.incomeTargetMonthly ?? 0);
  const yearly = Number(params.plan?.incomeTargetYearly ?? 0);
  const weekly = Number(params.plan?.incomeTargetWeekly ?? 0);

  if (days <= 8 && weekly > 0) return weekly;
  if (days <= 35 && monthly > 0) return monthly;
  if (yearly > 0) {
    if (days >= 360) return yearly;
    return (yearly / 365) * days;
  }

  return params.incomeActual;
};

const baseStyles = `
  <style>
    body{font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial; margin:24px; color:#0f172a;}
    h1{margin:0 0 8px 0; font-size:22px;}
    .muted{color:#475569; font-size:12px;}
    .card{border:1px solid #e2e8f0; border-radius:12px; padding:16px; margin:14px 0;}
    table{width:100%; border-collapse:collapse; margin-top:12px;}
    th,td{border-bottom:1px solid #e2e8f0; padding:10px 8px; text-align:left; font-size:13px;}
    th{background:#f8fafc; font-size:12px; text-transform:uppercase; letter-spacing:0.08em; color:#334155;}
    .right{text-align:right;}
    .good{color:#15803d; font-weight:600;}
    .bad{color:#b91c1c; font-weight:600;}
    .pill{display:inline-block; padding:2px 10px; border-radius:999px; background:#eef2ff; color:#3730a3; font-size:12px; font-weight:600;}
    .note{white-space:pre-wrap;}
  </style>
`;

const renderBudgetPlanHtml = (plan: any) => {
  const currency = plan?.currency ?? 'INR';
  const allocations = Array.isArray(plan?.allocations) ? plan.allocations : [];

  const rows = allocations
    .map((a: any) => {
      const key = escapeHtml(a?.key);
      const label = escapeHtml(a?.label);
      const kind = escapeHtml(a?.kind ?? 'expense');
      const percent = Number(a?.percent ?? 0);
      return `<tr><td>${label}</td><td>${key}</td><td>${kind}</td><td class="right">${Number.isFinite(percent) ? percent.toFixed(2) : '0.00'}%</td></tr>`;
    })
    .join('');

  return `
    <!doctype html>
    <html><head><meta charset="utf-8" />${baseStyles}</head>
    <body>
      <h1>My Budget Plan (${escapeHtml(plan?.year)})</h1>
      <div class="muted">Swar Yoga Life Planner • Generated ${escapeHtml(new Date().toISOString())}</div>

      <div class="card">
        <div><span class="pill">Income Targets</span></div>
        <table>
          <tbody>
            <tr><th>Yearly</th><td class="right">${money(plan?.incomeTargetYearly, currency)}</td></tr>
            <tr><th>Monthly</th><td class="right">${money(plan?.incomeTargetMonthly, currency)}</td></tr>
            <tr><th>Weekly</th><td class="right">${money(plan?.incomeTargetWeekly, currency)}</td></tr>
          </tbody>
        </table>
      </div>

      <div class="card">
        <div><span class="pill">100% Allocation</span></div>
        <table>
          <thead><tr><th>Bucket</th><th>Key</th><th>Kind</th><th class="right">Percent</th></tr></thead>
          <tbody>${rows || '<tr><td colspan="4">No buckets configured</td></tr>'}</tbody>
        </table>
      </div>

      <div class="card">
        <div><span class="pill">Notes</span></div>
        <div class="note">${escapeHtml(plan?.notes || '')}</div>
      </div>
    </body></html>
  `;
};

const renderGuideHtml = () => {
  return `
    <!doctype html>
    <html><head><meta charset="utf-8" />${baseStyles}</head>
    <body>
      <h1>Budget Guide (Millionaire/Billionaire Path)</h1>
      <div class="muted">This is an educational guide (not financial advice). Generated ${escapeHtml(new Date().toISOString())}</div>

      <div class="card">
        <h2 style="margin:0 0 8px 0; font-size:16px;">1) Rule of the game</h2>
        <ul>
          <li><b>Income ↑</b>: increase skills + sales + scalable product.</li>
          <li><b>Expense ↓</b>: control lifestyle inflation.</li>
          <li><b>Invest ↑</b>: convert profit into assets.</li>
        </ul>
      </div>

      <div class="card">
        <h2 style="margin:0 0 8px 0; font-size:16px;">2) Use 100% budgeting</h2>
        <p class="muted">Every rupee gets a job: expenses, savings, investments, and profit target.</p>
        <ul>
          <li>Set a <b>profit ratio</b> target (example: 30%).</li>
          <li>Split remaining into: self, family, health, insurance, savings, FD, investment, growth fund, etc.</li>
          <li>Keep buckets simple and aligned with your transaction categories.</li>
        </ul>
      </div>

      <div class="card">
        <h2 style="margin:0 0 8px 0; font-size:16px;">3) Weekly review (non-negotiable)</h2>
        <ul>
          <li>Check variance: which buckets exceeded budget?</li>
          <li>Fix the system: automation (SIP/FD), limits, remove waste.</li>
          <li>Track only what matters: income, outflow, profit, net worth.</li>
        </ul>
      </div>

      <div class="card">
        <h2 style="margin:0 0 8px 0; font-size:16px;">4) Reality vs Budget = Wealth engine</h2>
        <p>When reality differs from the plan, the report shows “errors”. These errors are not shame—they are signals.</p>
        <ul>
          <li><b>Overspend</b> → cut, negotiate, or redesign habit.</li>
          <li><b>Under-invest</b> → automate investment first.</li>
          <li><b>Low income</b> → increase sales/skills; don’t only reduce expense.</li>
        </ul>
      </div>

      <div class="card">
        <p class="muted">Disclaimer: This document is for education. Consult a qualified professional for financial decisions.</p>
      </div>
    </body></html>
  `;
};

const renderRealityHtml = (params: {
  year: number;
  startDate: string;
  endDate: string;
  currency: string;
  income: number;
  outflow: number;
  profit: number;
  outflowByCategory: Array<{ category: string; amount: number }>;
}) => {
  const rows = params.outflowByCategory
    .sort((a, b) => b.amount - a.amount)
    .map(
      (r) =>
        `<tr><td>${escapeHtml(r.category || 'uncategorized')}</td><td class="right">${money(r.amount, params.currency)}</td></tr>`
    )
    .join('');

  return `
    <!doctype html>
    <html><head><meta charset="utf-8" />${baseStyles}</head>
    <body>
      <h1>Reality (Actuals) • ${escapeHtml(params.year)}</h1>
      <div class="muted">Range ${escapeHtml(params.startDate)} → ${escapeHtml(params.endDate)} • Generated ${escapeHtml(new Date().toISOString())}</div>

      <div class="card">
        <div><span class="pill">Totals</span></div>
        <table>
          <tbody>
            <tr><th>Income</th><td class="right">${money(params.income, params.currency)}</td></tr>
            <tr><th>Outflow (Expense + Investment + EMI)</th><td class="right">${money(params.outflow, params.currency)}</td></tr>
            <tr><th>Profit</th><td class="right">${money(params.profit, params.currency)}</td></tr>
            <tr><th>Profit Ratio</th><td class="right">${params.income > 0 ? ((params.profit / params.income) * 100).toFixed(2) : '0.00'}%</td></tr>
          </tbody>
        </table>
      </div>

      <div class="card">
        <div><span class="pill">Outflow by Category</span></div>
        <table>
          <thead><tr><th>Category</th><th class="right">Amount</th></tr></thead>
          <tbody>${rows || '<tr><td colspan="2">No outflow in selected range.</td></tr>'}</tbody>
        </table>
      </div>
    </body></html>
  `;
};

const renderVarianceHtml = (params: {
  year: number;
  startDate: string;
  endDate: string;
  currency: string;
  baseMode: 'actual' | 'target';
  baseIncome: number;
  income: number;
  outflow: number;
  profit: number;
  buckets: Array<{
    key: string;
    label: string;
    kind: 'expense' | 'profit';
    percent: number;
    budgetAmount: number;
    actualAmount: number;
    varianceAmount: number;
  }>;
}) => {
  const rows = params.buckets
    .map((b) => {
      const bad = b.kind === 'profit' ? b.actualAmount < b.budgetAmount : b.actualAmount > b.budgetAmount;
      const cls = bad ? 'bad' : 'good';
      return `
        <tr>
          <td>${escapeHtml(b.label)}</td>
          <td>${escapeHtml(b.key)}</td>
          <td>${escapeHtml(b.kind)}</td>
          <td class="right">${Number.isFinite(b.percent) ? b.percent.toFixed(2) : '0.00'}%</td>
          <td class="right">${money(b.budgetAmount, params.currency)}</td>
          <td class="right">${money(b.actualAmount, params.currency)}</td>
          <td class="right ${cls}">${money(b.varianceAmount, params.currency)}</td>
        </tr>
      `;
    })
    .join('');

  return `
    <!doctype html>
    <html><head><meta charset="utf-8" />${baseStyles}</head>
    <body>
      <h1>Error Report (Budget vs Reality) • ${escapeHtml(params.year)}</h1>
      <div class="muted">Range ${escapeHtml(params.startDate)} → ${escapeHtml(params.endDate)} • Base: ${escapeHtml(params.baseMode)} • Generated ${escapeHtml(new Date().toISOString())}</div>

      <div class="card">
        <div><span class="pill">Summary</span></div>
        <table>
          <tbody>
            <tr><th>Base Income</th><td class="right">${money(params.baseIncome, params.currency)}</td></tr>
            <tr><th>Actual Income</th><td class="right">${money(params.income, params.currency)}</td></tr>
            <tr><th>Actual Outflow</th><td class="right">${money(params.outflow, params.currency)}</td></tr>
            <tr><th>Actual Profit</th><td class="right">${money(params.profit, params.currency)}</td></tr>
            <tr><th>Actual Profit Ratio</th><td class="right">${params.income > 0 ? ((params.profit / params.income) * 100).toFixed(2) : '0.00'}%</td></tr>
          </tbody>
        </table>
      </div>

      <div class="card">
        <div><span class="pill">Bucket Variance</span></div>
        <table>
          <thead>
            <tr>
              <th>Bucket</th>
              <th>Key</th>
              <th>Kind</th>
              <th class="right">%</th>
              <th class="right">Budget</th>
              <th class="right">Actual</th>
              <th class="right">Variance</th>
            </tr>
          </thead>
          <tbody>${rows || '<tr><td colspan="7">No buckets configured.</td></tr>'}</tbody>
        </table>
      </div>
    </body></html>
  `;
};

export async function POST(request: NextRequest) {
  try {
    const owner = getUserOwner(request);
    if (!owner) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const downloadType = String(body?.downloadType ?? 'budget').trim();

    const year = Number(body?.year ?? new Date().getFullYear());
    if (!Number.isFinite(year) || year < 2000 || year > 3000) {
      return NextResponse.json({ error: 'Invalid year' }, { status: 400 });
    }

    const startDateISO = String(body?.startDate ?? '').trim();
    const endDateISO = String(body?.endDate ?? '').trim();
    const baseMode: 'actual' | 'target' = body?.baseMode === 'target' ? 'target' : 'actual';

    if (downloadType !== 'guide') {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(startDateISO) || !/^\d{4}-\d{2}-\d{2}$/.test(endDateISO)) {
        return NextResponse.json({ error: 'Invalid startDate/endDate. Use YYYY-MM-DD.' }, { status: 400 });
      }
    }

    if (downloadType === 'guide') {
      const html = renderGuideHtml();
      return new NextResponse(html, {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Content-Disposition': `attachment; filename="budget-guide-${year}.html"`,
          'Cache-Control': 'no-store',
        },
      });
    }

    await connectDB();
    const plan = await BudgetPlan.findOne({ ...owner, year });

    if (!plan) {
      return NextResponse.json({ error: 'Budget plan not found. Save your plan first.' }, { status: 404 });
    }

    if (downloadType === 'budget') {
      const html = renderBudgetPlanHtml(plan);
      return new NextResponse(html, {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Content-Disposition': `attachment; filename="budget-plan-${year}.html"`,
          'Cache-Control': 'no-store',
        },
      });
    }

    // Compute reality/variance from transactions
    const startDate = new Date(startDateISO);
    const endDate = new Date(endDateISO);
    endDate.setHours(23, 59, 59, 999);

    const txns = await Transaction.find({
      ...owner,
      date: { $gte: startDate, $lte: endDate },
    }).select('type amount category');

    let income = 0;
    let outflow = 0;
    const outflowByCategory = new Map<string, number>();

    for (const t of txns) {
      const type = String((t as any).type);
      const amount = Number((t as any).amount ?? 0);
      if (!Number.isFinite(amount)) continue;

      if (inflowTypes.has(type)) {
        income += amount;
        continue;
      }
      if (outflowTypes.has(type)) {
        outflow += amount;
        const cat = normalize((t as any).category);
        outflowByCategory.set(cat, (outflowByCategory.get(cat) ?? 0) + amount);
      }
    }

    const profit = income - outflow;
    const currency = (plan as any).currency ?? 'INR';

    if (downloadType === 'reality') {
      const list = [...outflowByCategory.entries()].map(([category, amount]) => ({ category, amount }));
      const html = renderRealityHtml({
        year,
        startDate: startDateISO,
        endDate: endDateISO,
        currency,
        income,
        outflow,
        profit,
        outflowByCategory: list,
      });

      return new NextResponse(html, {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Content-Disposition': `attachment; filename="budget-reality-${year}-${startDateISO}_to_${endDateISO}.html"`,
          'Cache-Control': 'no-store',
        },
      });
    }

    if (downloadType === 'variance') {
      const baseIncome = computePeriodBaseIncome({
        baseMode,
        plan,
        incomeActual: income,
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
        const budgetAmount = (Number.isFinite(percent) ? percent : 0) * baseIncome / 100;

        const keyNorm = normalize(key);
        const labelNorm = normalize(label);
        let actualAmount = 0;
        if (kind === 'profit' || keyNorm === 'profit') {
          actualAmount = profit;
        } else {
          actualAmount = (outflowByCategory.get(keyNorm) ?? 0) + (labelNorm && labelNorm !== keyNorm ? (outflowByCategory.get(labelNorm) ?? 0) : 0);
        }

        const varianceAmount = actualAmount - budgetAmount;
        return { key, label, kind, percent, budgetAmount, actualAmount, varianceAmount };
      });

      const html = renderVarianceHtml({
        year,
        startDate: startDateISO,
        endDate: endDateISO,
        currency,
        baseMode,
        baseIncome,
        income,
        outflow,
        profit,
        buckets,
      });

      return new NextResponse(html, {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Content-Disposition': `attachment; filename="budget-variance-${year}-${startDateISO}_to_${endDateISO}.html"`,
          'Cache-Control': 'no-store',
        },
      });
    }

    return NextResponse.json({ error: 'Unsupported downloadType' }, { status: 400 });
  } catch (error) {
    console.error('Error generating budget download:', error);
    return NextResponse.json({ error: 'Failed to generate download' }, { status: 500 });
  }
}
