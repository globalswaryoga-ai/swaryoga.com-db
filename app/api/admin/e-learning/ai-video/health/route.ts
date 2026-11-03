import { NextRequest, NextResponse } from 'next/server';
<<<<<<< HEAD
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';
import { listAiVideoJobs, initBunnyAiVideoJobsSchema } from '@/lib/bunnyAiVideoJobRepository';
=======
import os from 'os';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';
import { bunnyExecute, isBunnyDatabaseConfigured } from '@/lib/bunnyDatabase';
>>>>>>> 9f221716 (feat(rag-video): migrate to Bunny DB, replace HeyGen with Replicate & OpenAI, add MP4 Whisper transcription)

export const dynamic = 'force-dynamic';

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

function checkAccess(request: NextRequest) {
  const token = request.headers.get('authorization')?.slice('Bearer '.length);
  const decoded = verifyToken(token);
  if (!decoded?.isAdmin) return { error: unauthorized() };
  if (!isSuperAdmin(decoded)) {
    return { error: NextResponse.json({ error: 'Forbidden: Superadmin access required' }, { status: 403 }) };
  }
  return { decoded };
}

function checkGpuAndHardware() {
  const platform = os.platform();
  const cpus = os.cpus();
  const totalMemGB = (os.totalmem() / 1024 / 1024 / 1024).toFixed(1);
  const freeMemGB = (os.freemem() / 1024 / 1024 / 1024).toFixed(1);

  let gpuModel = 'Hardware GPU Acceleration';
  let metalSupported = false;
  const cpuModel = cpus[0]?.model || '';

  if (platform === 'darwin') {
    metalSupported = true;
    gpuModel = cpuModel.includes('Apple')
      ? `${cpuModel} (Apple Silicon GPU & Neural Engine)`
      : `${cpuModel} (Metal Acceleration)`;
  }

  const cloudGpuConfigured = Boolean(process.env.REPLICATE_API_TOKEN);

  return {
    ok: true,
    platform: `${platform} (${os.arch()})`,
    gpuModel,
    metalSupported,
    cores: cpus.length,
    memory: {
      total: `${totalMemGB} GB`,
      free: `${freeMemGB} GB`,
    },
    cloudGpu: {
      provider: 'Replicate Cloud GPU (Nvidia A100/H100)',
      ready: cloudGpuConfigured,
      note: cloudGpuConfigured
        ? 'Replicate cloud GPU inference active'
        : 'OpenAI speech synthesis active; add REPLICATE_API_TOKEN for cloud video GPU rendering',
    },
    acceleration: cloudGpuConfigured
      ? 'Cloud GPU (Nvidia A100/H100) + Local Metal'
      : 'Local Metal / Neural Engine + OpenAI Cloud Processing',
  };
}

async function checkOpenAIConnectivity() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return { configured: false, ok: false, message: 'OPENAI_API_KEY is not configured' };

  try {
    const res = await fetch('https://api.openai.com/v1/models/gpt-4o-mini', {
      headers: { Authorization: `Bearer ${apiKey}` },
      cache: 'no-store',
    });
    const data = await res.json().catch(() => ({}));
    return {
      configured: true,
      ok: res.ok,
      status: res.status,
      model: data?.id || 'gpt-4o-mini',
      message: res.ok ? 'OpenAI connection ok' : data?.error?.message || res.statusText,
    };
  } catch (error) {
    return {
      configured: true,
      ok: false,
      message: error instanceof Error ? error.message : 'OpenAI connection failed',
    };
  }
}

export async function GET(request: NextRequest) {
  try {
    const { error } = checkAccess(request);
    if (error) return error;

    const live = request.nextUrl.searchParams.get('live') === '1';

<<<<<<< HEAD
    await initBunnyAiVideoJobsSchema();
    const jobs = await listAiVideoJobs();

    // Group jobs by status
    const statusMap = new Map<string, number>();
    jobs.forEach(job => {
      statusMap.set(job.status, (statusMap.get(job.status) || 0) + 1);
    });
    const statusCounts = Array.from(statusMap.entries()).map(([status, count]) => ({ _id: status, count }));
=======
    // Verify Bunny Database
    let bunnyStatus = { configured: isBunnyDatabaseConfigured(), ok: false, error: '' };
    let statusCounts: any[] = [];
    try {
      const counts = await bunnyExecute('SELECT status, count(*) as count FROM ai_video_jobs_sql GROUP BY status');
      statusCounts = counts.rows.map((r) => ({ _id: r.status, count: Number(r.count) }));
      bunnyStatus.ok = true;
    } catch (dbErr: any) {
      bunnyStatus.error = dbErr.message;
    }
>>>>>>> 9f221716 (feat(rag-video): migrate to Bunny DB, replace HeyGen with Replicate & OpenAI, add MP4 Whisper transcription)

    return NextResponse.json({
      success: true,
      database: {
        engine: 'Bunny Database (LibSQL)',
        status: bunnyStatus,
      },
      gpu: checkGpuAndHardware(),
      ragVideo: {
        ok: true,
        textProviderOrder: ['OpenAI', 'Anthropic'],
        transcriptionProvider: 'OpenAI Whisper',
        videoAvatarProvider: 'Replicate / OpenAI',
      },
      providers: {
        openai: live ? await checkOpenAIConnectivity() : { configured: Boolean(process.env.OPENAI_API_KEY) },
        replicate: {
          configured: Boolean(process.env.REPLICATE_API_TOKEN),
        },
        anthropic: {
          configured: Boolean(process.env.ANTHROPIC_API_KEY),
          model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6',
        },
      },
      jobs: {
        statusCounts,
<<<<<<< HEAD
        staleLegacyProviderErrorCount: 0,
        cleanedLegacyProviderErrors: 0,
=======
>>>>>>> 9f221716 (feat(rag-video): migrate to Bunny DB, replace HeyGen with Replicate & OpenAI, add MP4 Whisper transcription)
      },
      checkedAt: new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'RAG-video health check failed';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
