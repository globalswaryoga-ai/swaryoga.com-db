import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';
import { bunnyExecute } from '@/lib/bunnyDatabase';
import { saveMohanRagAvatarConfig } from '@/lib/mohanRag/avatarConfig';
import {
  CLONE_SUPPORTED_LANGUAGES,
  getVoiceCloneSample,
  startVoiceCloneSample,
} from '@/lib/mohanRag/replicateVoiceClone';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const SAMPLE_TEXT = 'Welcome to Swar Yoga. When your solar Pingala breath flows, inner vitality and spiritual focus awaken.';

function authorized(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || '';
    const decoded = verifyToken(token);
    return decoded && isSuperAdmin(decoded, request) ? decoded : null;
  } catch {
    return null;
  }
}

// The clone's reference clip is the first uploaded vault video (stable order by slot id).
async function pickReferenceVideo(): Promise<{ url: string; label: string } | null> {
  const res = await bunnyExecute({
    sql: "SELECT slot_id, file_name, file_url FROM mohan_avatar_vault_sql WHERE file_url IS NOT NULL AND file_url <> '' ORDER BY slot_id ASC LIMIT 1",
    args: [],
  });
  const row: any = res.rows?.[0];
  if (!row) return null;
  return { url: String(row.file_url), label: String(row.file_name || row.slot_id) };
}

// POST: start training (voice clone sample from the vault reference video)
export async function POST(request: NextRequest) {
  const admin = authorized(request);
  if (!admin) return NextResponse.json({ error: 'Super admin access required' }, { status: 403 });
  try {
    const reference = await pickReferenceVideo();
    if (!reference) {
      return NextResponse.json({ error: 'Upload at least one reference video to the vault before training.' }, { status: 400 });
    }
    const prediction = await startVoiceCloneSample({ speakerUrl: reference.url, text: SAMPLE_TEXT, language: 'en' });
    return NextResponse.json({ success: true, predictionId: prediction.id, status: prediction.status, reference: reference.label });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not start avatar training';
    return NextResponse.json({ error: message }, { status: 503 });
  }
}

// GET ?predictionId=...: poll training; on success save the clone as ready
export async function GET(request: NextRequest) {
  const admin = authorized(request);
  if (!admin) return NextResponse.json({ error: 'Super admin access required' }, { status: 403 });
  const predictionId = request.nextUrl.searchParams.get('predictionId') || '';
  if (!predictionId) return NextResponse.json({ error: 'predictionId is required' }, { status: 400 });
  try {
    const state = await getVoiceCloneSample(predictionId);
    if (state.status === 'failed' || state.status === 'canceled') {
      return NextResponse.json({ success: true, status: state.status, error: state.error || 'Voice clone training failed.' });
    }
    if (state.status !== 'succeeded' || !state.output) {
      return NextResponse.json({ success: true, status: state.status });
    }

    const reference = await pickReferenceVideo();
    if (!reference) return NextResponse.json({ error: 'Reference video is missing from the vault.' }, { status: 400 });
    const config = await saveMohanRagAvatarConfig({
      avatarId: reference.url,
      voiceId: reference.url,
      avatarType: 'avatar',
      avatarLabel: 'Mohan Sir clone',
      supportedLanguages: CLONE_SUPPORTED_LANGUAGES,
      authorized: true,
      updatedBy: String((admin as any).userId || (admin as any).username || 'admin'),
    });
    return NextResponse.json({ success: true, status: 'succeeded', sampleUrl: state.output, config });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not read avatar training status';
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
