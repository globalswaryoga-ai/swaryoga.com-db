import { NextRequest, NextResponse } from 'next/server';
import { generateAccountingReportHtml } from '@/lib/accountingReportHtml';
import { isAdminAuthorized } from '@/lib/adminAuth';

// Simple HTML to PDF using a library-free approach
export async function POST(request: NextRequest) {
  try {
    if (!isAdminAuthorized(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { reportType, year, accounts, transactions, investments, stats, periodLabel, startDate, endDate, fileTag } = body;

    if (reportType !== 'pl' && reportType !== 'balancesheet' && reportType !== 'income') {
      return NextResponse.json({ error: 'Invalid report type' }, { status: 400 });
    }

    const htmlContent = generateAccountingReportHtml({
      reportType,
      year,
      periodLabel,
      startDate,
      endDate,
      accounts: Array.isArray(accounts) ? accounts : [],
      transactions: Array.isArray(transactions) ? transactions : [],
      investments: Array.isArray(investments) ? investments : [],
      stats
    });

    const safeFileTag = typeof fileTag === 'string' && fileTag.trim() ? fileTag.trim() : String(year ?? 'report');

    return new NextResponse(htmlContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `attachment; filename="${reportType}-${safeFileTag}.html"`,
        'Cache-Control': 'no-store'
      }
    });
  } catch (error) {
    console.error('PDF generation error:', error);
    return NextResponse.json({ error: 'PDF generation failed' }, { status: 500 });
  }
}

