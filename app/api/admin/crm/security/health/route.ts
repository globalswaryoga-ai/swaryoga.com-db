/**
 * Admin-only security health endpoint
 * Shows recent security events, rate-limit stats, and protection status
 * 
 * GET /api/admin/crm/security/health
 * Requires: Authorization header with valid admin JWT
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';
import { securityLog } from '@/lib/security/monitor';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  // Verify super admin auth
  const authHeader = request.headers.get('authorization');
  const decoded = verifyToken(authHeader || undefined);
  if (!decoded?.isAdmin || !isSuperAdmin(decoded)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const summary = securityLog.getSummary(60);
  const recentEvents = securityLog.getRecent(30);

  return NextResponse.json({
    status: 'ok',
    protectionLayers: {
      'L1 - suspiciousRequestBlocking': true,
      'L2 - ipAutoBan': true,
      'L3 - botDetection': true,
      'L4 - rateLimiting': true,
      'L5 - corsStrictMode': true,
      'L6 - securityHeaders': true,
      'L7 - requestIdTracing': true,
      'L8 - ipReputationScoring': true,
      'L9 - adaptiveRateLimiting': true,
    },
    last60min: summary,
    recentEvents,
    timestamp: new Date().toISOString(),
  });
}
