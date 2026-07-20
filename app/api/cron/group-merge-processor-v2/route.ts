import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import mongoose from 'mongoose';
import { getNextGroupOperationGap, shouldStopDueToFailureRate, addErrorToLog } from '@/lib/safeGroupMergeV2';
import { checkSessionHealth, sendSessionHeartbeat } from '@/lib/whatsappConnectionManager';
import { isQRSendAllowed, getCurrentISTTime } from '@/lib/qrTimeGuard';
import { ObjectId } from 'mongodb';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes max

// How many times a transient (network/bridge) failure may retry the same
// participant before giving up and counting them as failed.
const MAX_TRANSIENT_RETRIES = 3;

/**
 * Execute single add/remove operation with WhatsApp bridge.
 *
 * Uses the bridge's real group-participants endpoint (`POST /group-participants/:jid`
 * with `{ action, participants: [...] }`) and identifies the session via headers,
 * matching the convention used by whatsappConnectionManager.ts — the bridge has no
 * `/add-participant` or `/remove-participant` routes and ignores a body-only sessionKey.
 */
async function executeGroupOperation(
  operation: 'add' | 'remove',
  groupId: string,
  participantId: string,
  userId: string,
  sessionKey: string,
  bridgeUrl: string,
  bridgeSecret: string
): Promise<{ success: boolean; error?: string; transient?: boolean }> {
  try {
    const response = await fetch(`${bridgeUrl}/group-participants/${encodeURIComponent(groupId)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-bridge-secret': bridgeSecret,
        'x-user-id': userId,
        'x-session-key': sessionKey,
        'x-tenant-id': sessionKey,
      },
      body: JSON.stringify({
        action: operation,
        participants: [participantId],
      }),
      signal: AbortSignal.timeout(20000),
    });

    if (!response.ok) {
      return {
        success: false,
        error: `Bridge returned ${response.status}`,
        // 5xx (incl. the bridge's 503 "Not connected"), 429 and 408 are
        // bridge/connection problems, not WhatsApp rejecting this member —
        // the same participant should be retried, not skipped.
        transient: response.status >= 500 || response.status === 429 || response.status === 408,
      };
    }

    return { success: true };
  } catch (error) {
    // fetch threw: network failure or timeout — always retryable
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      transient: true,
    };
  }
}

/**
 * After a "remove" job finishes, check whether the merged group has any real
 * members left. If only the bridge's own account remains, the group has been
 * fully emptied by admin action — leave it so it's disbanded rather than left
 * as an orphaned, member-less group.
 */
async function autoDeleteIfEmpty(
  groupId: string,
  userId: string,
  sessionKey: string,
  bridgeUrl: string,
  bridgeSecret: string
): Promise<{ deleted: boolean; remaining?: number; error?: string }> {
  const headers = {
    'Content-Type': 'application/json',
    'x-bridge-secret': bridgeSecret,
    'x-user-id': userId,
    'x-session-key': sessionKey,
    'x-tenant-id': sessionKey,
  };

  try {
    const [statusRes, groupInfoRes] = await Promise.all([
      fetch(`${bridgeUrl}/status`, { headers, signal: AbortSignal.timeout(8000) }),
      fetch(`${bridgeUrl}/group-info/${encodeURIComponent(groupId)}`, { headers, signal: AbortSignal.timeout(8000) }),
    ]);

    if (!statusRes.ok || !groupInfoRes.ok) {
      return { deleted: false, error: `Bridge returned ${statusRes.status}/${groupInfoRes.status}` };
    }

    const status = await statusRes.json();
    const groupInfo = await groupInfoRes.json();
    const ownPhone = status?.phone?.id ? String(status.phone.id) : null;

    const realParticipants = (groupInfo.participants || []).filter((p: any) => {
      const phone = String(p.id || '').split('@')[0];
      return !ownPhone || phone !== ownPhone;
    });

    if (realParticipants.length > 0) {
      return { deleted: false, remaining: realParticipants.length };
    }

    const leaveRes = await fetch(`${bridgeUrl}/group-leave/${encodeURIComponent(groupId)}`, {
      method: 'POST',
      headers,
      signal: AbortSignal.timeout(8000),
    });

    if (!leaveRes.ok) {
      return { deleted: false, remaining: 0, error: `Leave failed: bridge returned ${leaveRes.status}` };
    }

    return { deleted: true, remaining: 0 };
  } catch (error) {
    return { deleted: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Process single merge operation
 */
async function processMergeOperation(
  item: any,
  bridgeUrl: string,
  bridgeSecret: string,
  db: any
) {
  const collection = db.collection('merge_group_v2_queue');

  console.log(
    `[Group Merge V2] Processing: ${item._id} (${item.operationType} to ${item.targetGroupId})`
  );

  try {
    // CHECK 0: Session health (prevents auto-signout cascade)
    const sessionHealth = await checkSessionHealth(
      item.userId,
      item.sessionKey,
      bridgeUrl,
      bridgeSecret
    );

    if (!sessionHealth.connected) {
      console.warn(`[Group Merge V2] ⚠️ Session health check failed. Pausing.`);
      await collection.updateOne(
        { _id: item._id },
        {
          $set: {
            status: 'paused',
            lastError: 'Auto-signout detected - pausing to reconnect',
            updatedAt: new Date(),
          },
        }
      );
      return {
        status: 'paused',
        reason: 'auto_signout_detected',
      };
    }

    // Session is healthy — if this job was paused by a disconnect, resume it.
    if (item.status === 'paused') {
      await collection.updateOne(
        { _id: item._id },
        {
          $set: { status: 'in-progress', updatedAt: new Date() },
          $unset: { lastError: '' },
        }
      );
      console.log(`[Group Merge V2] ▶️ Session healthy again — resuming ${item._id}`);
    }

    // Check if should proceed (based on delay)
    const now = new Date();
    if (item.nextOperationTime > now) {
      // Heartbeat check every 5 operations
      if (item.completedOperations % 5 === 0) {
        const heartbeat = await sendSessionHeartbeat(item.userId, item.sessionKey, bridgeUrl, bridgeSecret);
        if (!heartbeat.alive) {
          console.warn(`[Group Merge V2] 🚨 Session lost during merge. Pausing.`);
          await collection.updateOne(
            { _id: item._id },
            {
              $set: {
                status: 'paused',
                lastError: 'Auto-signout detected - pausing to reconnect',
                updatedAt: new Date(),
              },
            }
          );
          return {
            status: 'paused',
            reason: 'auto_signout_during_merge',
          };
        }
      }

      return {
        status: 'waiting',
        nextCheckIn: item.nextOperationTime.getTime() - now.getTime(),
      };
    }

    // Check if should stop due to failure rate
    if (shouldStopDueToFailureRate(item.failedOperations, item.completedOperations + item.failedOperations)) {
      console.error(`[Group Merge V2] High failure rate detected. Stopping.`);

      await collection.updateOne(
        { _id: item._id },
        {
          $set: {
            status: 'failed',
            lastError: `High failure rate (${item.failedOperations}/${item.completedOperations + item.failedOperations})`,
            updatedAt: new Date(),
          },
        }
      );

      return {
        status: 'failed',
        reason: 'high_failure_rate',
      };
    }

    // Get next participant
    if (item.currentParticipantIndex >= item.participantIds.length) {
      // All done
      const update: Record<string, any> = {
        status: 'completed',
        completedAt: new Date(),
        updatedAt: new Date(),
      };

      // Once a remove job fully drains, check whether the merged group is now
      // empty (only the bridge account left) and disband it if so.
      if (item.operationType === 'remove') {
        const autoDelete = await autoDeleteIfEmpty(
          item.targetGroupId,
          item.userId,
          item.sessionKey,
          bridgeUrl,
          bridgeSecret
        );
        if (autoDelete.deleted) {
          update.groupDeleted = true;
          update.groupDeletedAt = new Date();
          console.log(`[Group Merge V2] 🗑️ Group ${item.targetGroupId} emptied out — auto-deleted`);
        } else if (autoDelete.error) {
          console.warn(`[Group Merge V2] Auto-delete check failed for ${item.targetGroupId}: ${autoDelete.error}`);
        }
      }

      await collection.updateOne({ _id: item._id }, { $set: update });

      console.log(
        `[Group Merge V2] ✅ Complete: ${item.completedOperations} succeeded, ${item.failedOperations} failed`
      );

      return {
        status: 'completed',
        completed: item.completedOperations,
        failed: item.failedOperations,
        groupDeleted: !!update.groupDeleted,
      };
    }

    // Execute operation for current participant
    const participantId = item.participantIds[item.currentParticipantIndex];

    // ── SHARED RATE LIMIT (per WhatsApp number, not per job) ──
    // This cron calls the bridge directly, bypassing the qr-bridge proxy's
    // own group-op rate-limit gate — so without this check, N concurrent v2
    // jobs on the same number would each pace themselves to ~15/hr
    // independently, multiplying real traffic to that number by N. Reserve a
    // slot from the same shared budget everything else draws from before
    // performing the operation.
    const { reserveGroupOpSlot } = await import('@/lib/qrGroupOpRateLimit');
    const rateCheck = await reserveGroupOpSlot(item.userId);
    if (!rateCheck.allowed) {
      console.warn(`[Group Merge V2] ⏸️ Shared group-op rate limit hit (${rateCheck.reason}) — deferring ${item._id} until ${rateCheck.resetAt.toISOString()}`);
      await collection.updateOne(
        { _id: item._id },
        { $set: { nextOperationTime: rateCheck.resetAt, updatedAt: new Date() } }
      );
      return {
        status: 'waiting',
        reason: 'rate_limited',
        nextCheckIn: rateCheck.resetAt.getTime() - now.getTime(),
      };
    }

    const result = await executeGroupOperation(
      item.operationType,
      item.targetGroupId,
      participantId,
      item.userId,
      item.sessionKey,
      bridgeUrl,
      bridgeSecret
    );

    // Calculate next delay
    const nextDelay = getNextGroupOperationGap(item.completedOperations + item.failedOperations);
    const nextOperationTime = new Date(now.getTime() + nextDelay);

    const retryCount = item.currentRetryCount || 0;

    if (result.success) {
      await collection.updateOne(
        { _id: item._id },
        {
          $set: {
            status: 'in-progress',
            completedOperations: item.completedOperations + 1,
            currentParticipantIndex: item.currentParticipantIndex + 1,
            currentRetryCount: 0,
            lastOperationTime: now,
            nextOperationTime,
            operationDelayMs: nextDelay,
            updatedAt: new Date(),
          },
        }
      );

      console.log(
        `[Group Merge V2] ✓ ${item.operationType} ${item.completedOperations + 1}/${item.totalOperations} (${(nextDelay / 1000).toFixed(1)}s delay)`
      );
    } else if (result.transient && retryCount < MAX_TRANSIENT_RETRIES) {
      // Temporary bridge/network problem — retry the SAME member after the
      // normal gap. Don't skip them and don't count this toward the 20%
      // failure breaker; only real WhatsApp rejections should trip it.
      await collection.updateOne(
        { _id: item._id },
        {
          $set: {
            status: 'in-progress',
            currentRetryCount: retryCount + 1,
            lastOperationTime: now,
            nextOperationTime,
            operationDelayMs: nextDelay,
            lastError: `Temporary: ${result.error} (retry ${retryCount + 1}/${MAX_TRANSIENT_RETRIES} for same member)`,
            updatedAt: new Date(),
          },
        }
      );

      console.warn(
        `[Group Merge V2] ↻ ${item.operationType} temporary failure (${result.error}) — will retry same member (${retryCount + 1}/${MAX_TRANSIENT_RETRIES})`
      );
    } else {
      await collection.updateOne(
        { _id: item._id },
        {
          $set: {
            status: 'in-progress',
            failedOperations: item.failedOperations + 1,
            currentParticipantIndex: item.currentParticipantIndex + 1,
            currentRetryCount: 0,
            lastOperationTime: now,
            nextOperationTime,
            operationDelayMs: nextDelay,
            lastError: result.error,
            errorLog: [
              ...item.errorLog,
              {
                participantId,
                error: result.error,
                timestamp: new Date(),
              },
            ],
            updatedAt: new Date(),
          },
        }
      );

      console.error(
        `[Group Merge V2] ✗ ${item.operationType} ${item.completedOperations + item.failedOperations}/${item.totalOperations} failed: ${result.error}`
      );
    }

    return {
      status: 'in-progress',
      operationIndex: item.currentParticipantIndex + 1,
      total: item.totalOperations,
    };
  } catch (error) {
    console.error(`[Group Merge V2] Error:`, error);

    await collection.updateOne(
      { _id: item._id },
      {
        $set: {
          status: 'failed',
          lastError: error instanceof Error ? error.message : 'Unknown error',
          updatedAt: new Date(),
        },
      }
    );

    return {
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * GET: Process all pending merge operations
 */
export async function GET(req: NextRequest) {
  try {
    // Verify cron secret — Vercel Cron sends "Authorization: Bearer {CRON_SECRET}",
    // so strip the "Bearer " prefix before comparing (also accept ?secret=).
    const rawAuth = req.headers.get('authorization') || '';
    const cronSecret = rawAuth.replace(/^Bearer\s+/i, '').trim() || req.nextUrl.searchParams.get('secret') || '';
    if (!process.env.CRON_SECRET || cronSecret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ── TIME-WINDOW GUARD ──
    // Group adds are even more ban-sensitive than messages. Never add people
    // outside 5:00 AM – 10:00 PM IST — adding strangers to groups at 3 AM is the
    // single most bot-like signal. In-progress merges resume automatically at
    // 5 AM (currentParticipantIndex preserves exactly where we stopped).
    if (!isQRSendAllowed()) {
      console.log(`[Group Merge V2] ⏰ Outside allowed hours (5:00 AM – 10:00 PM IST), now ${getCurrentISTTime()}. Holding all merges.`);
      return NextResponse.json({
        success: true,
        timestamp: new Date().toISOString(),
        processedOperations: 0,
        results: [],
        note: 'Outside allowed merge window (5:00 AM – 10:00 PM IST) — resumes at 5 AM',
      });
    }

    await connectDB();

    const db = mongoose.connection.db!;
    const collection = db.collection('merge_group_v2_queue');

    const bridgeUrl = process.env.WHATSAPP_BRIDGE_HTTP_URL || 'http://localhost:3333';
    const bridgeSecret = process.env.WHATSAPP_BRIDGE_SECRET || 'swar-bridge-secret-2024';

    // Find active operations. 'paused' is included so jobs paused by a
    // disconnect are re-checked every tick and auto-resume once the session
    // health check passes again.
    const operations = await collection
      .find({
        status: { $in: ['pending', 'in-progress', 'paused'] },
      })
      .toArray();

    console.log(`[Group Merge V2] Found ${operations.length} active operations`);

    const results: any[] = [];
    for (const op of operations) {
      const result = await processMergeOperation(op, bridgeUrl, bridgeSecret, db);
      results.push({
        operationId: op._id.toString(),
        operationType: op.operationType,
        targetGroupId: op.targetGroupId,
        ...result,
      });
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      processedOperations: results.length,
      results,
      note: '✅ Group merge operations processed with WhatsApp-safe variable gaps',
    });
  } catch (error) {
    console.error('[Group Merge V2] Fatal error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
