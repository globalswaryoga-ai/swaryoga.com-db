import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';
import { listAiVideoJobs, initBunnyAiVideoJobsSchema } from '@/lib/bunnyAiVideoJobRepository';

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

    await initBunnyAiVideoJobsSchema();
    const jobs = await listAiVideoJobs();

    // Group jobs by status
    const statusMap = new Map<string, number>();
    jobs.forEach(job => {
      statusMap.set(job.status, (statusMap.get(job.status) || 0) + 1);
    });
    const statusCounts = Array.from(statusMap.entries()).map(([status, count]) => ({ _id: status, count }));

    return NextResponse.json({
      success: true,
      ragVideo: {
        ok: true,
        textProviderOrder: ['OpenAI', 'Anthropic'],
        transcriptionProvider: 'OpenAI Whisper',
      },
      providers: {
        openai: live ? await checkOpenAIConnectivity() : { configured: Boolean(process.env.OPENAI_API_KEY) },
        anthropic: {
          configured: Boolean(process.env.ANTHROPIC_API_KEY),
          model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6',
        },
      },
      jobs: {
        statusCounts,
        staleLegacyProviderErrorCount: 0,
        cleanedLegacyProviderErrors: 0,
      },
      checkedAt: new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'RAG-video health check failed';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
