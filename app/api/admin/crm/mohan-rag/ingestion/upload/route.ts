import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';
import { uploadToBunnyStorage } from '@/lib/bunny-storage';
import { isMohanRagModule } from '@/lib/mohanRag/knowledgeRepository';
import { enqueueVideoSources } from '@/lib/mohanRag/videoIngestionQueue';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const MAX_UPLOAD_BYTES = 150 * 1024 * 1024;
const SUPPORTED_MEDIA = new Set(['mp4', 'webm', 'mov', 'mp3', 'm4a', 'wav']);

function getAdmin(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || '';
    const decoded = verifyToken(token);
    return decoded && isSuperAdmin(decoded, request) ? decoded : null;
  } catch { return null; }
}

export async function POST(request: NextRequest) {
  const admin = getAdmin(request);
  if (!admin) return NextResponse.json({ error: 'Super admin access required' }, { status: 403 });

  try {
    const form = await request.formData();
    const file = form.get('file');
    const moduleId = String(form.get('moduleId') || '');
    const topic = String(form.get('topic') || '').trim();
    const language = String(form.get('language') || 'auto');
    if (!(file instanceof File) || !isMohanRagModule(moduleId)) {
      return NextResponse.json({ error: 'Choose a media file and knowledge library.' }, { status: 400 });
    }
    const extension = file.name.split('.').pop()?.toLowerCase() || '';
    if (!SUPPORTED_MEDIA.has(extension)) return NextResponse.json({ error: 'Upload MP4, WebM, MOV, MP3, M4A, or WAV media.' }, { status: 415 });
    if (!file.size || file.size > MAX_UPLOAD_BYTES) return NextResponse.json({ error: 'Media uploads must be 150 MB or smaller.' }, { status: 413 });
    if (!['auto', 'en', 'hi', 'mr'].includes(language)) return NextResponse.json({ error: 'Choose Auto, English, Hindi, or Marathi.' }, { status: 400 });

    const bytes = Buffer.from(await file.arrayBuffer());
    const fileName = file.name.replace(/[\\/\u0000-\u001f]/g, '_').slice(0, 240);
    const contentTypes: Record<string, string> = {
      mp4: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime',
      mp3: 'audio/mpeg', m4a: 'audio/mp4', wav: 'audio/wav',
    };
    const bunnyUrl = await uploadToBunnyStorage(bytes, fileName, { contentType: contentTypes[extension] });
    const userId = String((admin as any).userId || (admin as any).username || 'admin');
    const result = await enqueueVideoSources({
      urls: [bunnyUrl], titles: [fileName.replace(/\.[^.]+$/, '')], moduleId, topic, language, createdBy: userId,
    });
    if (result.errors.length) return NextResponse.json({ error: result.errors[0].error }, { status: 422 });
    return NextResponse.json({ success: true, bunnyUrl, ...result, message: 'Uploaded once to Bunny Storage; queued for overnight transcription and emotion suggestions.' }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not upload media to the RAG queue.' }, { status: 503 });
  }
}
