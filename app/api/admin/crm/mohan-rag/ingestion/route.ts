import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';
import { isMohanRagModule } from '@/lib/mohanRag/knowledgeRepository';
import { enqueueVideoSources, listVideoIngestionJobs } from '@/lib/mohanRag/videoIngestionQueue';

export const dynamic = 'force-dynamic';

function getAdmin(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || '';
    const decoded = verifyToken(token);
    return decoded && isSuperAdmin(decoded, request) ? decoded : null;
  } catch { return null; }
}

export async function GET(request: NextRequest) {
  if (!getAdmin(request)) return NextResponse.json({ error: 'Super admin access required' }, { status: 403 });
  try {
    return NextResponse.json({ success: true, jobs: await listVideoIngestionJobs(150) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not load video ingestion queue' }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  const admin = getAdmin(request);
  if (!admin) return NextResponse.json({ error: 'Super admin access required' }, { status: 403 });
  try {
    const body = await request.json();
    const moduleId = String(body?.moduleId || '');
    const urls = typeof body?.urls === 'string' ? body.urls.split(/[\r\n,\t ]+/).filter(Boolean) : body?.urls;
    const language = String(body?.language || 'auto');
    const topic = String(body?.topic || '').trim();
    if (!isMohanRagModule(moduleId)) return NextResponse.json({ error: 'Choose a knowledge library.' }, { status: 400 });
    if (!Array.isArray(urls) || !urls.length) return NextResponse.json({ error: 'Paste one or more Bunny or YouTube URLs.' }, { status: 400 });
    if (urls.length > 500) return NextResponse.json({ error: 'Queue up to 500 video URLs at a time.' }, { status: 413 });
    if (!['auto', 'en', 'hi', 'mr'].includes(language)) return NextResponse.json({ error: 'Choose Auto, English, Hindi, or Marathi.' }, { status: 400 });
    const userId = String((admin as any).userId || (admin as any).username || 'admin');
    const result = await enqueueVideoSources({ urls: urls.map(String), moduleId, topic, language, createdBy: userId });
    return NextResponse.json({ success: true, ...result, message: 'Videos are queued for the overnight ingestion window (10:00 PM–6:00 AM Asia/Kolkata).' }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not queue video sources' }, { status: 503 });
  }
}
