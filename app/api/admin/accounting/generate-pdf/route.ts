import { NextRequest, NextResponse } from 'next/server';


import { generateAccountingReportHtml } from '@/lib/accountingReportHtml';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';

export const dynamic = 'force-dynamic';

// Simple HTML to PDF using a library-free approach
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    // Accounting reports are main website data - superadmin only
    if (!isSuperAdmin(decoded)) {
      return NextResponse.json({ error: 'Forbidden: Superadmin access required' }, { status: 403 });
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

