import crypto from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { GpuWorkerRegistry } from '@/lib/avatarEngine/gpuWorkerRegistry';
import { GpuScheduler } from '@/lib/avatarEngine/gpuScheduler';
import { verifyAuthToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

function isWorkerAuthorized(request: NextRequest): boolean {
  const expected = process.env.AVATAR_WORKER_TOKEN;
  const supplied = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!expected || !supplied) return false;

  const expectedBuffer = Buffer.from(expected);
  const suppliedBuffer = Buffer.from(supplied);
  return expectedBuffer.length === suppliedBuffer.length &&
    crypto.timingSafeEqual(expectedBuffer, suppliedBuffer);
}

function isAdminAuthorized(request: NextRequest): boolean {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ||
    request.cookies.get('token')?.value;
  if (!token) return false;
  const payload = verifyAuthToken(token);
  return Boolean(payload?.isAdmin || payload?.userId);
}

/**
 * GET /api/avatar/gpu-workers
 * Returns the status of all 4 GPU worker slots, active tasks, and queue depth.
 */
export async function GET(request: NextRequest) {
  try {
    // Check if worker token or admin token provided
    if (!isWorkerAuthorized(request) && !isAdminAuthorized(request)) {
      // In development or local preview, allow read-only
      if (process.env.NODE_ENV === 'production' && process.env.AVATAR_WORKER_TOKEN) {
        return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 401 });
      }
    }

    // Auto-clean any dead workers
    await GpuWorkerRegistry.cleanExpiredWorkers();
    await GpuScheduler.recoverStuckTasks();

    const workers = await GpuWorkerRegistry.getAllWorkers();
    const tasks = await GpuScheduler.listTasks(10);

    const queueStats = {
      totalQueued: tasks.filter(t => t.status === 'queued').length,
      totalRunning: tasks.filter(t => t.status === 'running').length,
      totalCompleted: tasks.filter(t => t.status === 'completed').length,
      totalFailed: tasks.filter(t => t.status === 'failed').length,
    };

    return NextResponse.json({
      success: true,
      workers,
      queueStats,
      recentTasks: tasks,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[API /api/avatar/gpu-workers GET] Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to fetch workers.' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/avatar/gpu-workers
 * Handles worker actions: register, heartbeat, claim, complete, fail.
 */
export async function POST(request: NextRequest) {
  if (process.env.AVATAR_WORKER_TOKEN && !isWorkerAuthorized(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized worker request.' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const action = body?.action;

    switch (action) {
      case 'register': {
        if (!body.workerId || !body.provider || !body.gpuModel) {
          return NextResponse.json(
            { success: false, error: 'workerId, provider, and gpuModel are required.' },
            { status: 400 }
          );
        }

        const worker = await GpuWorkerRegistry.registerWorker({
          workerId: String(body.workerId),
          slotNumber: body.slotNumber ? Number(body.slotNumber) : undefined,
          accountEmail: body.accountEmail ? String(body.accountEmail) : undefined,
          provider: body.provider,
          gpuModel: String(body.gpuModel),
          totalVramMb: Number(body.totalVramMb || 15360),
          availableVramMb: Number(body.availableVramMb || body.totalVramMb || 15360),
          cudaVersion: String(body.cudaVersion || '12.2'),
          pythonVersion: String(body.pythonVersion || '3.10.12'),
          installedModels: Array.isArray(body.installedModels) ? body.installedModels : [],
          assignedTaskCategory: body.assignedTaskCategory,
          sessionDurationMinutes: body.sessionDurationMinutes ? Number(body.sessionDurationMinutes) : undefined,
        });

        return NextResponse.json({ success: true, worker });
      }

      case 'heartbeat': {
        if (!body.workerId) {
          return NextResponse.json({ success: false, error: 'workerId is required.' }, { status: 400 });
        }

        const success = await GpuWorkerRegistry.recordHeartbeat(String(body.workerId), {
          availableVramMb: body.availableVramMb ? Number(body.availableVramMb) : undefined,
          gpuTemperatureC: body.gpuTemperatureC ? Number(body.gpuTemperatureC) : undefined,
          gpuUtilizationPct: body.gpuUtilizationPct ? Number(body.gpuUtilizationPct) : undefined,
          currentJobId: body.currentJobId ?? undefined,
        });

        return NextResponse.json({ success });
      }

      case 'claim': {
        if (!body.workerId) {
          return NextResponse.json({ success: false, error: 'workerId is required.' }, { status: 400 });
        }

        const task = await GpuScheduler.claimNextTaskForWorker(String(body.workerId));
        return NextResponse.json({ success: true, task });
      }

      case 'complete': {
        if (!body.taskId || !body.workerId || !body.outputArtifactUrl) {
          return NextResponse.json(
            { success: false, error: 'taskId, workerId, and outputArtifactUrl are required.' },
            { status: 400 }
          );
        }

        const completed = await GpuScheduler.completeTask({
          taskId: String(body.taskId),
          workerId: String(body.workerId),
          outputArtifactUrl: String(body.outputArtifactUrl),
        });

        return NextResponse.json({ success: true, task: completed });
      }

      case 'fail': {
        if (!body.taskId || !body.workerId || !body.errorMessage) {
          return NextResponse.json(
            { success: false, error: 'taskId, workerId, and errorMessage are required.' },
            { status: 400 }
          );
        }

        const failed = await GpuScheduler.failTask({
          taskId: String(body.taskId),
          workerId: String(body.workerId),
          errorMessage: String(body.errorMessage),
        });

        return NextResponse.json({ success: true, task: failed });
      }

      default:
        return NextResponse.json({ success: false, error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (error) {
    console.error('[API /api/avatar/gpu-workers POST] Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Worker action failed.' },
      { status: 500 }
    );
  }
}

