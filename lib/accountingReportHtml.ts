type AnyRecord = Record<string, any>;

type ReportType = 'pl' | 'balancesheet' | 'income';

export interface AccountingReportInput {
  reportType: ReportType;
  periodLabel?: string;
  startDate?: string;
  endDate?: string;
  year?: number;
  accounts: AnyRecord[];
  transactions: AnyRecord[];
  investments: AnyRecord[];
  stats?: AnyRecord;
}

const escapeHtml = (value: unknown): string => {
  const s = String(value ?? '');
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

const formatINR = (amount: number): string => {
  const safe = Number.isFinite(amount) ? amount : 0;
  return `₹${safe.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
};

const sumAmounts = (rows: { amount: number }[]) => rows.reduce((s, r) => s + (Number.isFinite(r.amount) ? r.amount : 0), 0);

const groupByCategory = (transactions: AnyRecord[]): { label: string; amount: number }[] => {
  const byCat = transactions.reduce((acc: Record<string, number>, t: AnyRecord) => {
    const cat = (t.category || 'Uncategorized') as string;
    const amt = Number(t.amount) || 0;
    acc[cat] = (acc[cat] || 0) + amt;
    return acc;
  }, {});

  return Object.entries(byCat)
    .map(([label, amount]) => ({ label, amount }))
    .sort((a, b) => b.amount - a.amount);
};

const renderTallyTwoSide = (params: {
  title: string;
  subtitle: string;
  leftTitle: string;
  rightTitle: string;
  leftRows: { label: string; amount: number }[];
  rightRows: { label: string; amount: number }[];
  leftTotalLabel?: string;
  rightTotalLabel?: string;
}) => {
  const leftTotal = sumAmounts(params.leftRows);
  const rightTotal = sumAmounts(params.rightRows);

  const maxLen = Math.max(params.leftRows.length, params.rightRows.length);

  const bodyRows = Array.from({ length: maxLen }).map((_, i) => {
    const l = params.leftRows[i];
    const r = params.rightRows[i];

    return `
      <tr>
        <td class="label">${l ? escapeHtml(l.label) : ''}</td>
        <td class="amount">${l ? formatINR(l.amount) : ''}</td>
        <td class="label">${r ? escapeHtml(r.label) : ''}</td>
        <td class="amount">${r ? formatINR(r.amount) : ''}</td>
      </tr>
    `;
  });

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>${escapeHtml(params.title)}</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          margin: 28px;
          color: #111827;
        }
        .header {
          text-align: center;
          margin-bottom: 18px;
        }
        .header h1 {
          margin: 0;
          font-size: 20px;
          letter-spacing: 0.6px;
        }
        .header p {
          margin: 6px 0 0;
          color: #374151;
          font-size: 12px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 14px;
          table-layout: fixed;
        }
        th, td {
          border: 1px solid #d1d5db;
          padding: 8px 10px;
          vertical-align: top;
          font-size: 12px;
        }
        th {
          background: #f3f4f6;
          font-weight: 700;
          text-align: left;
        }
        .amount { text-align: right; white-space: nowrap; }
        .label { text-align: left; word-wrap: break-word; }
        .section-head th {
          background: #111827;
          color: #ffffff;
          text-align: center;
          font-size: 13px;
        }
        .totals td {
          font-weight: 700;
          background: #f9fafb;
        }
        .footer {
          margin-top: 18px;
          font-size: 11px;
          color: #6b7280;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>${escapeHtml(params.title)}</h1>
        <p>${escapeHtml(params.subtitle)}</p>
      </div>

      <table>
        <tr class="section-head">
          <th colspan="2">${escapeHtml(params.leftTitle)}</th>
          <th colspan="2">${escapeHtml(params.rightTitle)}</th>
        </tr>
        <tr>
          <th>Particulars</th>
          <th class="amount">Amount</th>
          <th>Particulars</th>
          <th class="amount">Amount</th>
        </tr>
        ${bodyRows.join('')}
        <tr class="totals">
          <td class="label">${escapeHtml(params.leftTotalLabel ?? 'Total')}</td>
          <td class="amount">${formatINR(leftTotal)}</td>
          <td class="label">${escapeHtml(params.rightTotalLabel ?? 'Total')}</td>
          <td class="amount">${formatINR(rightTotal)}</td>
        </tr>
      </table>

      <div class="footer">
        Generated on ${escapeHtml(new Date().toLocaleDateString('en-IN'))}
      </div>
    </body>
    </html>
  `;
};

const buildSubtitle = (input: AccountingReportInput): string => {
  if (input.periodLabel) {
    if (input.startDate && input.endDate) {
      return `${input.periodLabel} (From ${input.startDate} to ${input.endDate})`;
    }
    return input.periodLabel;
  }
  if (typeof input.year === 'number') {
    return `Year ${input.year}`;
  }
  return '';
};

export const generateAccountingReportHtml = (input: AccountingReportInput): string => {
  const subtitle = buildSubtitle(input);

  if (input.reportType === 'pl') {
    const incomeRows = groupByCategory(input.transactions.filter((t) => t.type === 'income'));
    const expenseRows = groupByCategory(input.transactions.filter((t) => t.type === 'expense'));

    const totalIncome = sumAmounts(incomeRows);
    const totalExpense = sumAmounts(expenseRows);
    const net = totalIncome - totalExpense;

    // Tally-style balancing:
    // Profit is shown on Debit side; Loss is shown on Credit side.
    const debitRows = [...expenseRows];
    const creditRows = [...incomeRows];

    if (net > 0) debitRows.push({ label: 'Net Profit', amount: net });
    if (net < 0) creditRows.push({ label: 'Net Loss', amount: -net });

    return renderTallyTwoSide({
      title: 'PROFIT & LOSS A/C',
      subtitle,
      leftTitle: 'DEBIT',
      rightTitle: 'CREDIT',
      leftRows: debitRows,
      rightRows: creditRows,
      leftTotalLabel: 'Total',
      rightTotalLabel: 'Total'
    });
  }

  if (input.reportType === 'income') {
    const incomeRows = groupByCategory(input.transactions.filter((t) => t.type === 'income'));
    const expenseRows = groupByCategory(input.transactions.filter((t) => t.type === 'expense'));

    const totalIncome = sumAmounts(incomeRows);
    const totalExpense = sumAmounts(expenseRows);
    const net = totalIncome - totalExpense;

    const debitRows = [...expenseRows];
    const creditRows = [...incomeRows];

    if (net > 0) debitRows.push({ label: 'Net Surplus', amount: net });
    if (net < 0) creditRows.push({ label: 'Net Deficit', amount: -net });

    return renderTallyTwoSide({
      title: 'INCOME & EXPENSE A/C',
      subtitle,
      leftTitle: 'DEBIT',
      rightTitle: 'CREDIT',
      leftRows: debitRows,
      rightRows: creditRows,
      leftTotalLabel: 'Total',
      rightTotalLabel: 'Total'
    });
  }

  // Balance sheet
  const loanAccounts = input.accounts.filter((a) => a.type === 'loan');
  const assetAccounts = input.accounts.filter((a) => a.type !== 'loan');

  const liabilitiesRows: { label: string; amount: number }[] = loanAccounts
    .map((a) => ({ label: `${a.name} (Loan)`, amount: Number(a.balance) || 0 }))
    .sort((a, b) => b.amount - a.amount);

  const investmentsTotal = input.investments
    .filter((inv) => inv.status === 'active')
    .reduce((sum, inv) => sum + (Number(inv.amount) || 0), 0);

  const assetsRows: { label: string; amount: number }[] = assetAccounts
    .map((a) => ({ label: `${a.name} (${a.type})`, amount: Number(a.balance) || 0 }))
    .sort((a, b) => b.amount - a.amount);

  if (investmentsTotal > 0) {
    assetsRows.push({ label: 'Investments', amount: investmentsTotal });
  }

  const assetsTotal = sumAmounts(assetsRows);
  const liabilitiesWithoutCapital = sumAmounts(liabilitiesRows);
  const capital = assetsTotal - liabilitiesWithoutCapital;
  liabilitiesRows.push({ label: 'Capital / Net Worth', amount: capital });

  return renderTallyTwoSide({
    title: 'BALANCE SHEET',
    subtitle,
    leftTitle: 'LIABILITIES',
    rightTitle: 'ASSETS',
    leftRows: liabilitiesRows,
    rightRows: assetsRows,
    leftTotalLabel: 'Total',
    rightTotalLabel: 'Total'
  });
};
