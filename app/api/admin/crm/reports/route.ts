import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/crm/reports
 * Fetch aggregated metrics from all CRM modules
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
    const range = url.searchParams.get('range') || 'month';

    // Calculate date range
    const now = new Date();
    let startDate = new Date();

    switch (range) {
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'quarter':
        startDate.setMonth(now.getMonth() - 3);
        break;
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      case 'month':
      default:
        startDate.setMonth(now.getMonth() - 1);
    }

    // Mock data - in production, query actual collections
    const reports = {
      dateRange: range,
      startDate: startDate.toISOString(),
      endDate: now.toISOString(),

      // Total metrics
      totalRevenue: 125000,
      conversionRate: 18.5,
      avgDealValue: 25000,

      // Leads
      leads: {
        total: 234,
        new: 45,
        qualified: 89,
        inProgress: 67,
        won: 33,
      },

      // Email
      email: {
        sent: 2850,
        opens: 892,
        openRate: 31.3,
        clicks: 156,
        clickRate: 5.5,
      },

      // QR Broadcasts
      qrBroadcast: {
        sent: 12,
        views: 3420,
        clicks: 687,
        clickRate: 20.1,
      },

      // Messaging
      messaging: {
        telegram: 1234,
        whatsapp: 5678,
        sms: 234,
        responseRate: 42.3,
      },

      // Chatbots
      chatbot: {
        conversations: 456,
        resolutionRate: 78.5,
        avgResponseTime: 2.3,
        satisfaction: 4.6,
      },

      // Sales Funnel
      salesFunnel: {
        awareness: 1200,
        consideration: 450,
        decision: 180,
        closed: 45,
      },
    };

    return NextResponse.json({
      success: true,
      reports,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch reports';
    console.error('Reports error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
