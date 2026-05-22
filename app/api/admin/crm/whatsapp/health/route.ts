/**
 * WhatsApp Protection Health API
 * 
 * Provides health status for both Meta and EC2 Bridge providers.
 * Used by the admin dashboard to monitor WhatsApp integrations.
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

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
    if (!decoded?.isAdmin && !decoded?.userId) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    await connectDB();

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
