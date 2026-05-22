import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { getLead } from '@/lib/schemas/enterpriseSchemas';

/**
 * Bulk Group Merge API (Background Job)
 * 
 * POST /api/admin/crm/whatsapp/qr/bulk-group-merge
 * 
 * Starts a background merge job that combines 5 (or more) groups into a target group.
 * Returns immediately with a job ID - no need to wait for completion.
 * 
 * Request Body:
 * {
 *   "targetGroupId": "120363123456789-1234567890@g.us",
 *   "sourceGroupIds": [
 *     "120363123456789-1111111111@g.us",
 *     "120363123456789-2222222222@g.us",
 *     "120363123456789-3333333333@g.us",
 *     "120363123456789-4444444444@g.us",
 *     "120363123456789-5555555555@g.us"
 *   ],
 *   "removeFromSource": false  // optional: remove members from source groups after merge
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "jobId": "merge_1234567890_abc",
 *   "message": "Merge job started in background - 5 groups (approx 150+ members) over 240+ minutes",
 *   "status": "queued"
 * }
 */

interface MergeJobRequest {
  targetGroupId: string;
  sourceGroupIds: string[];
  removeFromSource?: boolean;
}

export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '') || '';
  const decoded = verifyToken(token);
  if (!decoded) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json() as MergeJobRequest;
    const { targetGroupId, sourceGroupIds, removeFromSource = false } = body;

    // Validate inputs
    if (!targetGroupId) return NextResponse.json({ error: 'targetGroupId required' }, { status: 400 });
    if (!sourceGroupIds || !Array.isArray(sourceGroupIds) || sourceGroupIds.length === 0) {
      return NextResponse.json({ error: 'sourceGroupIds array required (min 1 group)' }, { status: 400 });
    }

    // Generate unique job ID
    const jobId = `merge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // ✅ START BACKGROUND JOB (async, no await - returns immediately)
    startBackgroundMergeJob({
      jobId,
      userId: decoded.userId || '',
      targetGroupId,
      sourceGroupIds,
      removeFromSource,
      bridgeUrl: process.env.NEXT_PUBLIC_WHATSAPP_BRIDGE_HTTP_URL || process.env.WHATSAPP_BRIDGE_HTTP_URL || '',
      bridgeSecret: process.env.WHATSAPP_BRIDGE_SECRET || '',
    }).catch((err) => {
      console.error(`❌ Merge job ${jobId} failed:`, err);
    });

    return NextResponse.json({
      success: true,
      jobId,
      message: `Merge job started in background - ${sourceGroupIds.length} groups over 240+ minutes (Option B ultra-safe)`,
      status: 'queued',
      estimatedDurationMinutes: '240+',
    }, { status: 202 }); // 202 Accepted
  } catch (error: any) {
    console.error('Bulk merge error:', error);
    return NextResponse.json({ error: error.message || 'Merge failed' }, { status: 500 });
  }
}

/**
 * Background merge job processor
 * Runs in background without blocking API response
 */
async function startBackgroundMergeJob({
  jobId,
  userId,
  targetGroupId,
  sourceGroupIds,
  removeFromSource,
  bridgeUrl,
  bridgeSecret,
}: {
  jobId: string;
  userId: string;
  targetGroupId: string;
  sourceGroupIds: string[];
  removeFromSource: boolean;
  bridgeUrl: string;
  bridgeSecret?: string;
}) {
  console.log(`🚀 [${jobId}] Starting background merge job for user ${userId}`);

  try {
    await connectDB();

    // Export rate limiter functions
    const { getRandomMergeBatchSize, getRandomMergeDelay, sleepWithJitter } = await import('@/lib/whatsappRateLimiter');

    // Default bridge config
    const bridge = bridgeUrl || 'http://localhost:3333';
    const secret = bridgeSecret || 'default-secret';
    const headers = {
      'x-user-id': userId,
      'x-bridge-secret': secret,
      'Content-Type': 'application/json',
    };

    // ═══ STEP 1: Collect all unique members from source groups ═══
    console.log(`📥 [${jobId}] Step 1: Collecting members from ${sourceGroupIds.length} source groups...`);
    const uniqueMembers = new Set<string>();
    const existingMembers = new Set<string>();

    // Get existing members of target group (to avoid duplicates)
    try {
      const targetRes = await fetch(`${bridge}/group-info/${encodeURIComponent(targetGroupId)}`, { headers });
      if (targetRes.ok) {
        const targetInfo: any = await targetRes.json();
        if (targetInfo?.participants) {
          for (const p of targetInfo.participants) {
            existingMembers.add(p.id);
          }
        }
      }
    } catch (err) {
      console.warn(`[${jobId}] Could not fetch target group members:`, err);
    }

    // Collect from all source groups
    for (let i = 0; i < sourceGroupIds.length; i++) {
      const sourceId = sourceGroupIds[i];
      console.log(`[${jobId}] Fetching group ${i + 1}/${sourceGroupIds.length}: ${sourceId}`);
      
      try {
        const res = await fetch(`${bridge}/group-info/${encodeURIComponent(sourceId)}`, { headers });
        if (res.ok) {
          const groupInfo: any = await res.json();
          if (groupInfo?.participants) {
            for (const p of groupInfo.participants) {
              if (!existingMembers.has(p.id) && !p.id.endsWith('@g.us')) {
                uniqueMembers.add(p.id);
              }
            }
          }
        }
      } catch (err: any) {
        console.warn(`[${jobId}] Failed to fetch group ${sourceId}:`, err.message);
      }

      // Small delay between group fetches
      await sleepWithJitter(2000, 0.5); // 2 sec ±50%
    }

    const membersToAdd = Array.from(uniqueMembers);
    console.log(`✅ [${jobId}] Collected ${membersToAdd.length} unique members to add (${existingMembers.size} already in target)`);

    if (membersToAdd.length === 0) {
      console.log(`⚠️  [${jobId}] No new members to add - job complete`);
      return;
    }

    // ═══ STEP 2: Add members to target group with Option B pacing ═══
    console.log(`➕ [${jobId}] Step 2: Adding members to target group (Option B: 2-3 per batch, 1-3 min delays)...`);
    let addedCount = 0;
    let batchNum = 0;
    let errors: string[] = [];

    for (let i = 0; i < membersToAdd.length; i += 1) {
      // Get random micro-batch size (2-3)
      const batchSize = getRandomMergeBatchSize();
      const batch = membersToAdd.slice(i, Math.min(i + batchSize, membersToAdd.length));

      if (batch.length === 0) break;

      batchNum++;
      const progress = Math.min(i + batchSize, membersToAdd.length);
      const percent = Math.round((progress / membersToAdd.length) * 100);

      console.log(`[${jobId}] Batch ${batchNum}: Adding ${batch.length} members (${progress}/${membersToAdd.length} • ${percent}%)`);

      try {
        const res = await fetch(`${bridge}/group-participants/${encodeURIComponent(targetGroupId)}`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            action: 'add',
            participants: batch,
          }),
        });

        if (res.ok) {
          addedCount += batch.length;
          console.log(`✅ [${jobId}] Batch ${batchNum}: Success (+${batch.length})`);
        } else {
          const err = await res.text();
          throw new Error(`HTTP ${res.status}: ${err}`);
        }
      } catch (err: any) {
        const errMsg = err.message || String(err);
        console.error(`❌ [${jobId}] Batch ${batchNum} failed:`, errMsg);
        errors.push(`Batch ${batchNum}: ${errMsg}`);
      }

      // OPTION B: 60-180 second delay between batches (1-3 minutes)
      if (i + batchSize < membersToAdd.length) {
        const delayMs = getRandomMergeDelay();
        const delaySec = delayMs / 1000;
        console.log(`⏳ [${jobId}] Waiting ${delaySec.toFixed(0)}s before next batch...`);
        await sleepWithJitter(delayMs, 0.2); // ±20% jitter
      }
    }

    console.log(`✅ [${jobId}] Added ${addedCount}/${membersToAdd.length} members to target group`);

    // ═══ STEP 3: Remove from source groups (if requested) ═══
    if (removeFromSource) {
      console.log(`🗑️  [${jobId}] Step 3: Removing members from source groups...`);
      for (let i = 0; i < sourceGroupIds.length; i++) {
        const sourceId = sourceGroupIds[i];
        console.log(`[${jobId}] Removing from group ${i + 1}/${sourceGroupIds.length}...`);

        try {
          for (let j = 0; j < membersToAdd.length; j += 5) {
            const batch = membersToAdd.slice(j, Math.min(j + 5, membersToAdd.length));
            const res = await fetch(`${bridge}/group-participants/${encodeURIComponent(sourceId)}`, {
              method: 'POST',
              headers,
              body: JSON.stringify({
                action: 'remove',
                participants: batch,
              }),
            });
            if (!res.ok) {
              console.warn(`[${jobId}] Remove batch ${j} from source failed: ${res.status}`);
            }
            await sleepWithJitter(3000, 0.3); // 3 sec ±30% between batches
          }
        } catch (err: any) {
          console.error(`[${jobId}] Failed to remove from source group ${sourceId}:`, err.message);
        }
      }
    }

    // ═══ COMPLETE ═══
    console.log(`\n${'🎉'.repeat(3)} [${jobId}] MERGE JOB COMPLETE ${'🎉'.repeat(3)}`);
    console.log(`✅ Added: ${addedCount} members`);
    console.log(`📍 Target: ${targetGroupId}`);
    console.log(`📊 Sources: ${sourceGroupIds.length} groups`);
    console.log(`⏱️  Duration: ${Math.round(Date.now() / 1000 / 60)}+ minutes`);
    if (errors.length > 0) {
      console.log(`⚠️  Errors: ${errors.join(' | ')}`);
    }
  } catch (error: any) {
    console.error(`\n❌ [${jobId}] MERGE JOB FAILED:`, error);
  }
}
