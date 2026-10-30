import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';
import { normalizeVideoSourceUrl } from '@/lib/mohanRag/videoIngestionQueue';
import { analyzeMediaBuffer, fetchBunnyMedia, fetchYouTubeMedia } from '@/lib/mohanRag/mediaTranscription';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const MAX_UPLOAD_BYTES = 150 * 1024 * 1024;
const SUPPORTED_EXTENSIONS = new Set(['mp4', 'webm', 'mov', 'mp3', 'm4a', 'wav']);

function getAdmin(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || '';
    const decoded = verifyToken(token);
    return decoded && isSuperAdmin(decoded, request) ? decoded : null;
  } catch { return null; }
}

export async function POST(request: NextRequest) {
  if (!getAdmin(request)) return NextResponse.json({ error: 'Super admin access required' }, { status: 403 });
  try {
    const form = await request.formData();
    const file = form.get('file');
    const rawUrl = String(form.get('url') || '').trim();
    const language = String(form.get('language') || 'hi');
    if (!['auto', 'en', 'hi', 'mr'].includes(language)) return NextResponse.json({ error: 'Choose Auto, Hindi, Marathi, or English.' }, { status: 400 });
    let media: { buffer: Buffer; title: string; extension: string };

    if (file instanceof File) {
      const extension = file.name.split('.').pop()?.toLowerCase() || '';
      if (!SUPPORTED_EXTENSIONS.has(extension)) return NextResponse.json({ error: 'Upload MP4, WebM, MOV, MP3, M4A, or WAV media.' }, { status: 415 });
      if (!file.size || file.size > MAX_UPLOAD_BYTES) return NextResponse.json({ error: 'Upload a media file no larger than 150 MB.' }, { status: 413 });
      media = { buffer: Buffer.from(await file.arrayBuffer()), title: file.name.replace(/\.[^.]+$/, '').slice(0, 240), extension };
    } else {
      const source = normalizeVideoSourceUrl(rawUrl);
      if (!source) return NextResponse.json({ error: 'Enter a valid YouTube or Bunny video URL, or choose a media file.' }, { status: 400 });
      media = source.provider === 'youtube'
        ? await fetchYouTubeMedia(source.url)
        : await fetchBunnyMedia(source.url);
    }

    const analysis = await analyzeMediaBuffer({ ...media, language });
    return NextResponse.json({ success: true, ...analysis, plainTranscript: analysis.timeline });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Video transcription and cue analysis failed.';
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
