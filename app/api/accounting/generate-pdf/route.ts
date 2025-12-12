import { NextRequest, NextResponse } from 'next/server';

// Simple HTML to PDF using a library-free approach
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { reportType, year, accounts, transactions, investments, stats } = body;

    let htmlContent = '';

    if (reportType === 'pl') {
      htmlContent = generatePLStatement(year, transactions, stats);
    } else if (reportType === 'balancesheet') {
      htmlContent = generateBalanceSheet(year, accounts, investments, stats);
    } else if (reportType === 'income') {
      htmlContent = generateIncomeExpenseReport(year, transactions, stats);
    }

    // For now, return HTML as base64 encoded
    // In production, you would use a library like puppeteer or pdfkit
    const htmlBase64 = Buffer.from(htmlContent).toString('base64');

    return NextResponse.json({
      success: true,
      html: htmlBase64,
      message: 'PDF content generated'
    });
  } catch (error) {
    console.error('PDF generation error:', error);
    return NextResponse.json({ error: 'PDF generation failed' }, { status: 500 });
  }
}

function generatePLStatement(year: number, transactions: any[], stats: any) {
  const incomeTransactions = transactions.filter(t => t.type === 'income');
  const expenseTransactions = transactions.filter(t => t.type === 'expense');

  const incomeByCategory = groupByCategory(incomeTransactions);
  const expenseByCategory = groupByCategory(expenseTransactions);

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Profit & Loss Statement</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          margin: 40px;
          color: #333;
        }
        h1, h2 { color: #2c3e50; }
        table {
          width: 100%;
          border-collapse: collapse;
          margin: 20px 0;
        }
        th, td {
          border: 1px solid #ddd;
          padding: 12px;
          text-align: right;
        }
        th { background-color: #3498db; color: white; }
        .label { text-align: left; }
        .total-row { font-weight: bold; background-color: #ecf0f1; }
        .header { text-align: center; margin-bottom: 30px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>PROFIT & LOSS STATEMENT</h1>
        <p>For the Year Ended December 31, ${year}</p>
      </div>

      <h2>INCOME</h2>
      <table>
        <tr><th class="label">Category</th><th>Amount</th></tr>
        ${Object.entries(incomeByCategory).map(([category, amount]: any) => `
          <tr><td class="label">${category}</td><td>₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td></tr>
        `).join('')}
        <tr class="total-row"><td class="label">Total Income</td><td>₹${stats.totalIncome.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td></tr>
      </table>

      <h2>EXPENSES</h2>
      <table>
        <tr><th class="label">Category</th><th>Amount</th></tr>
        ${Object.entries(expenseByCategory).map(([category, amount]: any) => `
          <tr><td class="label">${category}</td><td>₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td></tr>
        `).join('')}
        <tr class="total-row"><td class="label">Total Expenses</td><td>₹${stats.totalExpenses.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td></tr>
      </table>

      <h2 style="text-align: right; color: ${stats.netProfit >= 0 ? 'green' : 'red'};">
        NET PROFIT: ₹${stats.netProfit.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
      </h2>

      <p style="margin-top: 40px; font-size: 12px; color: #999;">
        Generated on ${new Date().toLocaleDateString('en-IN')}
      </p>
    </body>
    </html>
  `;
}

function generateBalanceSheet(year: number, accounts: any[], investments: any[], stats: any) {
  const assets = accounts.reduce((sum, acc) => sum + acc.balance, 0);
  const totalAssets = assets + stats.totalInvestments;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Balance Sheet</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          margin: 40px;
          color: #333;
        }
        h1, h2 { color: #2c3e50; }
        table {
          width: 100%;
          border-collapse: collapse;
          margin: 20px 0;
        }
        th, td {
          border: 1px solid #ddd;
          padding: 12px;
          text-align: right;
        }
        th { background-color: #27ae60; color: white; }
        .label { text-align: left; }
        .total-row { font-weight: bold; background-color: #ecf0f1; }
        .header { text-align: center; margin-bottom: 30px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>BALANCE SHEET</h1>
        <p>As at December 31, ${year}</p>
      </div>

      <h2>ASSETS</h2>
      <table>
        <tr><th class="label">Account</th><th>Amount</th></tr>
        ${accounts.map((acc: any) => `
          <tr><td class="label">${acc.name} (${acc.type})</td><td>₹${acc.balance.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td></tr>
        `).join('')}
        ${investments.length > 0 ? `
          <tr><td class="label">Investments</td><td>₹${stats.totalInvestments.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td></tr>
        ` : ''}
        <tr class="total-row"><td class="label">Total Assets</td><td>₹${totalAssets.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td></tr>
      </table>

      <h2>NET WORTH</h2>
      <table>
        <tr class="total-row"><td class="label">Net Worth</td><td>₹${stats.netWorth.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td></tr>
      </table>

      <p style="margin-top: 40px; font-size: 12px; color: #999;">
        Generated on ${new Date().toLocaleDateString('en-IN')}
      </p>
    </body>
    </html>
  `;
}

function generateIncomeExpenseReport(year: number, transactions: any[], stats: any) {
  const incomeByCategory = groupByCategory(transactions.filter(t => t.type === 'income'));
  const expenseByCategory = groupByCategory(transactions.filter(t => t.type === 'expense'));

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Income & Expense Report</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          margin: 40px;
          color: #333;
        }
        h1, h2 { color: #2c3e50; }
        table {
          width: 100%;
          border-collapse: collapse;
          margin: 20px 0;
        }
        th, td {
          border: 1px solid #ddd;
          padding: 12px;
          text-align: right;
        }
        th { background-color: #8e44ad; color: white; }
        .label { text-align: left; }
        .total-row { font-weight: bold; background-color: #ecf0f1; }
        .header { text-align: center; margin-bottom: 30px; }
        .percentage { font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>INCOME & EXPENSE REPORT</h1>
        <p>For the Year ${year}</p>
      </div>

      <h2>INCOME BY CATEGORY</h2>
      <table>
        <tr>
          <th class="label">Category</th>
          <th>Amount</th>
          <th>% of Income</th>
        </tr>
        ${Object.entries(incomeByCategory).map(([category, amount]: any) => `
          <tr>
            <td class="label">${category}</td>
            <td>₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
            <td>${((amount / stats.totalIncome) * 100).toFixed(2)}%</td>
          </tr>
        `).join('')}
        <tr class="total-row">
          <td class="label">Total Income</td>
          <td>₹${stats.totalIncome.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
          <td>100%</td>
        </tr>
      </table>

      <h2>EXPENSES BY CATEGORY</h2>
      <table>
        <tr>
          <th class="label">Category</th>
          <th>Amount</th>
          <th>% of Expenses</th>
        </tr>
        ${Object.entries(expenseByCategory).map(([category, amount]: any) => `
          <tr>
            <td class="label">${category}</td>
            <td>₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
            <td>${((amount / stats.totalExpenses) * 100).toFixed(2)}%</td>
          </tr>
        `).join('')}
        <tr class="total-row">
          <td class="label">Total Expenses</td>
          <td>₹${stats.totalExpenses.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
          <td>100%</td>
        </tr>
      </table>

      <h2>SUMMARY</h2>
      <table>
        <tr><td class="label">Total Income</td><td>₹${stats.totalIncome.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td></tr>
        <tr><td class="label">Total Expenses</td><td>₹${stats.totalExpenses.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td></tr>
        <tr class="total-row">
          <td class="label">Net Profit/(Loss)</td>
          <td style="color: ${stats.netProfit >= 0 ? 'green' : 'red'};">₹${stats.netProfit.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
        </tr>
      </table>

      <p style="margin-top: 40px; font-size: 12px; color: #999;">
        Generated on ${new Date().toLocaleDateString('en-IN')}
      </p>
    </body>
    </html>
  `;
}

function groupByCategory(transactions: any[]) {
  return transactions.reduce((acc, t) => {
    acc[t.category] = (acc[t.category] || 0) + t.amount;
    return acc;
  }, {} as Record<string, number>);
}
