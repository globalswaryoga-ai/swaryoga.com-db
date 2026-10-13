import { NextRequest, NextResponse } from 'next/server';
import { GET as runGet } from '../run/route';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/crm/sadhana-scheduler/check
 * Legacy check endpoint - forwards directly to the unified /run cron handler
 */
export async function GET(request: NextRequest) {
  return runGet(request);
}
