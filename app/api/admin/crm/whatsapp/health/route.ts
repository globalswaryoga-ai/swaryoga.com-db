/**
 * WhatsApp Protection Health API
 * 
 * Provides health status for both Meta and EC2 Bridge providers.
 * Used by the admin dashboard to monitor WhatsApp integrations.
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { registrationViewer } from '@/lib/registrationAuth';
import { getMetaCredentialsForTenant } from '@/lib/whatsappAccounts';
import { probeMetaHealth } from '@/lib/metaHealth';

export const dynamic = 'force-dynamic';
import {
  getProtectionMetrics,
  checkBridgeHealth,
  checkMetaHealth,
  getAllProvidersHealth,
} from '@/lib/whatsappProtection';

export async function GET(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    if (req.nextUrl.searchParams.get('provider') === 'meta') {
      const viewer = registrationViewer(req);
      if (!viewer) return NextResponse.json({ error: 'Admin authentication required' }, { status: 401 });
      const credentials = await getMetaCredentialsForTenant(viewer.userId);
      if (!credentials && !viewer.superAdmin) return NextResponse.json({
        success: false, data: { healthy: false, latencyMs: 0, error: 'Connect your own Meta WhatsApp account.' },
      });
      const data = await probeMetaHealth(credentials);
      return NextResponse.json({ success: data.healthy, data: { ...data, registrationAutomationConfigured: Boolean(process.env.CRON_SECRET) } }, { headers: { 'Cache-Control': 'private, no-store' } });
    }

    // Run health checks in parallel
    const [bridgeHealth, metaHealth] = await Promise.all([
      checkBridgeHealth(),
      checkMetaHealth(),
    ]);

    const metrics = getProtectionMetrics();

    return NextResponse.json({
      success: true,
      data: {
        timestamp: new Date().toISOString(),
        providers: {
          meta: {
            ...metrics.meta,
            liveCheck: metaHealth,
          },
          qr_bridge: {
            ...metrics.qr_bridge,
            liveCheck: bridgeHealth,
          },
        },
        circuitBreakers: metrics.circuitBreakers,
        queuedMessages: metrics.queuedMessages,
        summary: {
          allHealthy: metaHealth.healthy && bridgeHealth.connected,
          primaryProvider: metaHealth.healthy ? 'meta' : (bridgeHealth.connected ? 'qr_bridge' : 'none'),
          hasBackup: metaHealth.healthy && bridgeHealth.connected,
        },
      },
    });
  } catch (error) {
    console.error('[Protection Health API] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
