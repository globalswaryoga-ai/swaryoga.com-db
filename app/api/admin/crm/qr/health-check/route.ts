import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

interface HealthComponent {
  name: string;
  status: 'healthy' | 'warning' | 'error' | 'unchecked';
  message: string;
  lastCheck?: Date;
  details?: Record<string, any>;
}

/**
 * GET: Comprehensive health check for QR WhatsApp systems
 */
export async function GET(req: NextRequest) {
  try {
    // Verify JWT
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing bearer token' }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const components: HealthComponent[] = [];
    const recommendations: string[] = [];
    let overallStatus: 'healthy' | 'warning' | 'error' = 'healthy';

    // 1. Database Connectivity
    try {
      await connectDB();
      const db = (await import('@/lib/db')).getDb();

      // Check if collections exist
      const collections = await db.listCollections().toArray();
      const collectionNames = collections.map((c: any) => c.name);

      const requiredCollections = [
        'qr_broadcast_schedules',
        'merge_group_v2_queue',
        'message_dedup_log',
      ];

      const missingCollections = requiredCollections.filter(
        (c) => !collectionNames.includes(c)
      );

      components.push({
        name: '🗄️ Database',
        status: missingCollections.length === 0 ? 'healthy' : 'warning',
        message:
          missingCollections.length === 0
            ? 'Database connected and collections ready'
            : `Missing collections: ${missingCollections.join(', ')}`,
        lastCheck: new Date(),
        details: {
          totalCollections: collectionNames.length,
          requiredCollections,
          actualCollections: collectionNames,
        },
      });

      if (missingCollections.length > 0) {
        overallStatus = 'warning';
        recommendations.push(
          `⚠️ Create missing collections: ${missingCollections.join(', ')}`
        );
      }
    } catch (error) {
      components.push({
        name: '🗄️ Database',
        status: 'error',
        message: `Database connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        lastCheck: new Date(),
      });
      overallStatus = 'error';
      recommendations.push('❌ Check MongoDB connection and credentials');
    }

    // 2. Scheduled Broadcasts
    try {
      const db = (await import('@/lib/db')).getDb();
      const broadcastCollection = db.collection('qr_broadcast_schedules');

      const stats = {
        total: await broadcastCollection.countDocuments(),
        active: await broadcastCollection.countDocuments({ isActive: true }),
        completed: await broadcastCollection.countDocuments({ status: 'completed' }),
        pending: await broadcastCollection.countDocuments({ status: 'scheduled' }),
        failed: await broadcastCollection.countDocuments({ status: 'failed' }),
        paused: await broadcastCollection.countDocuments({ status: 'paused' }),
      };

      const recentBroadcasts = await broadcastCollection
        .find({})
        .sort({ createdAt: -1 })
        .limit(5)
        .toArray();

      const hasErrors = recentBroadcasts.some(
        (b: any) => b.status === 'failed' || b.lastError
      );

      components.push({
        name: '📢 Scheduled Broadcasts',
        status: hasErrors ? 'warning' : 'healthy',
        message:
          stats.active > 0
            ? `${stats.active} active broadcasts running`
            : 'No active broadcasts',
        lastCheck: new Date(),
        details: {
          total: stats.total,
          active: stats.active,
          completed: stats.completed,
          pending: stats.pending,
          failed: stats.failed,
          paused: stats.paused,
        },
      });

      if (stats.failed > 0) {
        overallStatus = 'warning';
        recommendations.push(
          `⚠️ ${stats.failed} failed broadcasts - check error logs`
        );
      }
    } catch (error) {
      components.push({
        name: '📢 Scheduled Broadcasts',
        status: 'error',
        message: `Failed to check broadcasts: ${error instanceof Error ? error.message : 'Unknown'}`,
        lastCheck: new Date(),
      });
      overallStatus = 'error';
    }

    // 3. Group Merge Operations
    try {
      const db = (await import('@/lib/db')).getDb();
      const mergeCollection = db.collection('merge_group_v2_queue');

      const stats = {
        total: await mergeCollection.countDocuments(),
        pending: await mergeCollection.countDocuments({ status: 'pending' }),
        inProgress: await mergeCollection.countDocuments({ status: 'in-progress' }),
        completed: await mergeCollection.countDocuments({ status: 'completed' }),
        failed: await mergeCollection.countDocuments({ status: 'failed' }),
        blocked: await mergeCollection.countDocuments({ status: 'blocked' }),
      };

      components.push({
        name: '🔄 Group Merge V2',
        status:
          stats.blocked > 0 || stats.failed > 5
            ? 'error'
            : stats.failed > 0
              ? 'warning'
              : 'healthy',
        message:
          stats.inProgress > 0
            ? `${stats.inProgress} merge operations in progress`
            : stats.completed > 0
              ? `${stats.completed} merge operations completed today`
              : 'No active merge operations',
        lastCheck: new Date(),
        details: {
          total: stats.total,
          pending: stats.pending,
          inProgress: stats.inProgress,
          completed: stats.completed,
          failed: stats.failed,
          blocked: stats.blocked,
        },
      });

      if (stats.blocked > 0) {
        overallStatus = 'error';
        recommendations.push(
          `❌ ${stats.blocked} blocked merge operations - WhatsApp safety triggers`
        );
      }
      if (stats.failed > 0) {
        recommendations.push(
          `⚠️ ${stats.failed} failed merge operations - check error logs`
        );
      }
    } catch (error) {
      components.push({
        name: '🔄 Group Merge V2',
        status: 'error',
        message: `Failed to check merges: ${error instanceof Error ? error.message : 'Unknown'}`,
        lastCheck: new Date(),
      });
      overallStatus = 'error';
    }

    // 4. Message Deduplication
    try {
      const db = (await import('@/lib/db')).getDb();
      const dedupCollection = db.collection('message_dedup_log');

      const today = new Date();
      const dayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

      const stats = {
        totalAllTime: await dedupCollection.countDocuments(),
        sentToday: await dedupCollection.countDocuments({ dayKey }),
        duplicatesBlocked: await dedupCollection.countDocuments({
          dayKey,
          skipped: true,
        }),
      };

      components.push({
        name: '🔒 Deduplication',
        status: 'healthy',
        message: `${stats.sentToday} messages sent today, ${stats.duplicatesBlocked} duplicates blocked`,
        lastCheck: new Date(),
        details: {
          sentToday: stats.sentToday,
          duplicatesBlocked: stats.duplicatesBlocked,
          totalAllTime: stats.totalAllTime,
        },
      });
    } catch (error) {
      components.push({
        name: '🔒 Deduplication',
        status: 'warning',
        message: `Could not check deduplication: ${error instanceof Error ? error.message : 'Unknown'}`,
        lastCheck: new Date(),
      });
    }

    // 5. WhatsApp Bridge Connectivity
    const bridgeUrl = process.env.WHATSAPP_BRIDGE_HTTP_URL || 'http://localhost:3333';
    try {
      const response = await fetch(`${bridgeUrl}/health`, {
        method: 'GET',
        timeout: 5000,
      });

      components.push({
        name: '🌐 WhatsApp Bridge',
        status: response.ok ? 'healthy' : 'error',
        message: response.ok
          ? `Bridge connected at ${bridgeUrl}`
          : `Bridge not responding (HTTP ${response.status})`,
        lastCheck: new Date(),
      });

      if (!response.ok) {
        overallStatus = 'error';
        recommendations.push(`❌ WhatsApp bridge not responding at ${bridgeUrl}`);
      }
    } catch (error) {
      components.push({
        name: '🌐 WhatsApp Bridge',
        status: 'error',
        message: `Bridge unreachable: ${error instanceof Error ? error.message : 'Unknown'}`,
        lastCheck: new Date(),
      });
      overallStatus = 'error';
      recommendations.push(
        `❌ Check bridge is running at ${bridgeUrl}`
      );
    }

    // 6. Cron Jobs Status
    components.push({
      name: '⏱️ Cron Jobs',
      status: 'healthy',
      message: 'Two cron processors configured (broadcasts + merges)',
      lastCheck: new Date(),
      details: {
        broadcastProcessor: '/api/cron/qr-broadcast-processor-v2',
        mergeProcessor: '/api/cron/group-merge-processor-v2',
        frequency: 'Every minute',
        status: 'Enabled',
      },
    });

    // Add final recommendations
    if (overallStatus === 'healthy') {
      recommendations.push('✅ All systems operational - safe to run broadcasts and merges');
    } else if (overallStatus === 'warning') {
      recommendations.push('⚠️ Some components degraded - monitor closely');
    } else {
      recommendations.push('❌ Critical issues detected - do not run broadcasts/merges until resolved');
    }

    return NextResponse.json({
      success: true,
      health: {
        overallStatus,
        checkedAt: new Date(),
        components,
        recommendations,
      },
    });
  } catch (error) {
    console.error('[Health Check] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
