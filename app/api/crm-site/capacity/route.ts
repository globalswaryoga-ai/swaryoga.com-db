import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';

/**
 * GET /api/crm-site/capacity
 * 
 * Returns system capacity and growth dashboard data.
 * For admin use — shows tenant utilization, projections, alerts.
 */
export async function GET(request: NextRequest) {
  try {
    // Optional: verify admin token
    const authHeader = request.headers.get('Authorization');
    const isAuthed = authHeader?.startsWith('Bearer ');

    await connectDB();

    const { getGrowthDashboard } = await import('@/lib/crm-site/autoScaleService');
    const dashboard = await getGrowthDashboard();

    return NextResponse.json({
      success: true,
      ...dashboard,
    });
  } catch (err: any) {
    console.error('Capacity API Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * POST /api/crm-site/capacity
 * 
 * Triggers a capacity check and auto-scaling for all tenants.
 * Should be called by cron job every hour.
 */
export async function POST(request: NextRequest) {
  try {
    // Verify cron secret or admin token
    const authHeader = request.headers.get('Authorization');
    const cronSecret = request.headers.get('x-cron-secret');
    
    const isValidCron = cronSecret === process.env.CRON_SECRET;
    const isAdmin = authHeader?.startsWith('Bearer ');
    
    if (!isValidCron && !isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { runCapacityCheck } = await import('@/lib/crm-site/autoScaleService');
    const result = await runCapacityCheck();

    console.log(`📊 Capacity check complete:`, {
      status: result.system.status,
      tenants: result.system.tenantCount,
      leads: result.system.totalLeads,
      needsUpgrade: result.tenantsNeedingUpgrade.length,
      alerts: result.alertsSent,
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (err: any) {
    console.error('Capacity Check Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
