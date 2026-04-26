import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/crm/reports/download
 * Download reports as CSV or PDF
 */
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);

    if (!decoded?.isAdmin && !decoded?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const format = url.searchParams.get('format') || 'csv';
    const range = url.searchParams.get('range') || 'month';

    // Mock report data
    const reportData = {
      totalRevenue: 125000,
      totalLeads: 234,
      conversionRate: 18.5,
      avgDealValue: 25000,
      emailsSent: 2850,
      emailOpens: 892,
      qrBroadcastsSent: 12,
      qrViews: 3420,
      qrClicks: 687,
      telegramMessages: 1234,
      whatsappMessages: 5678,
      chatbotConversations: 456,
    };

    if (format === 'csv') {
      const csv = generateCSV(reportData, range);
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="report-${range}.csv"`,
        },
      });
    } else if (format === 'pdf') {
      // For PDF, generate a simple text response
      // In production, use a library like PDFKit or html2pdf
      const pdf = generatePDF(reportData, range);
      return new NextResponse(pdf, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="report-${range}.pdf"`,
        },
      });
    }

    return NextResponse.json({ error: 'Invalid format' }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to download report';
    console.error('Download error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function generateCSV(data: any, range: string): string {
  const headers = ['Metric', 'Value', 'Unit'];
  const rows = [
    ['Total Revenue', data.totalRevenue, '₹'],
    ['Total Leads', data.totalLeads, 'count'],
    ['Conversion Rate', data.conversionRate, '%'],
    ['Average Deal Value', data.avgDealValue, '₹'],
    ['Emails Sent', data.emailsSent, 'count'],
    ['Email Opens', data.emailOpens, 'count'],
    ['QR Broadcasts Sent', data.qrBroadcastsSent, 'count'],
    ['QR Views', data.qrViews, 'count'],
    ['QR Clicks', data.qrClicks, 'count'],
    ['Telegram Messages', data.telegramMessages, 'count'],
    ['WhatsApp Messages', data.whatsappMessages, 'count'],
    ['Chatbot Conversations', data.chatbotConversations, 'count'],
  ];

  const csv = [
    `CRM Report - ${range.charAt(0).toUpperCase() + range.slice(1)}`,
    `Generated: ${new Date().toISOString()}`,
    '',
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
  ].join('\n');

  return csv;
}

function generatePDF(data: any, range: string): string {
  // Simple text-based PDF alternative
  // In production, use a proper PDF library
  const content = `
CRM REPORT - ${range.toUpperCase()}
Generated: ${new Date().toISOString()}

FINANCIAL METRICS
==================
Total Revenue: ₹${data.totalRevenue}
Average Deal Value: ₹${data.avgDealValue}

LEAD METRICS
============
Total Leads: ${data.totalLeads}
Conversion Rate: ${data.conversionRate}%

EMAIL CAMPAIGNS
===============
Emails Sent: ${data.emailsSent}
Email Opens: ${data.emailOpens}

QR BROADCASTS
=============
Broadcasts Sent: ${data.qrBroadcastsSent}
Total Views: ${data.qrViews}
Total Clicks: ${data.qrClicks}

MESSAGING
=========
Telegram Messages: ${data.telegramMessages}
WhatsApp Messages: ${data.whatsappMessages}

AUTOMATION
==========
Chatbot Conversations: ${data.chatbotConversations}

---
End of Report
  `;

  return content;
}
