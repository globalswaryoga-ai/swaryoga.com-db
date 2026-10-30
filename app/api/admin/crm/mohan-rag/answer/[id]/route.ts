import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';
import { checkVideoStatus, submitAvatarVideo } from '@/lib/aiVideo/heygen';
import { uploadToPath } from '@/lib/bunny-storage';
import { getRagAnswer, setRagAnswerVideo } from '@/lib/mohanRag/answerService';
import { getMohanRagAvatarConfig } from '@/lib/mohanRag/avatarConfig';
import { parseAvatarScript } from '@/lib/avatarEmotionParser';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

type RouteContext = { params: { id: string } };

function authorized(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || '';
    const decoded = verifyToken(token);
    return Boolean(decoded && isSuperAdmin(decoded, request));
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  if (!authorized(request)) return NextResponse.json({ error: 'Super admin access required' }, { status: 403 });
  try {
    let answer = await getRagAnswer(params.id);
    if (!answer) return NextResponse.json({ error: 'RAG answer not found' }, { status: 404 });
    if (answer.status !== 'rendering' || !answer.providerVideoId) return NextResponse.json({ success: true, answer });

    const render = await checkVideoStatus(answer.providerVideoId);
    if (render.status === 'completed' && render.videoUrl) {
      const videoResponse = await fetch(render.videoUrl);
      if (!videoResponse.ok) throw new Error(`Failed to retrieve completed avatar video (${videoResponse.status})`);
      const declaredSize = Number(videoResponse.headers.get('content-length') || 0);
      if (declaredSize > 250 * 1024 * 1024) throw new Error('Generated video exceeds the 250 MB Bunny delivery limit.');
      const buffer = Buffer.from(await videoResponse.arrayBuffer());
      if (buffer.length > 250 * 1024 * 1024) throw new Error('Generated video exceeds the 250 MB Bunny delivery limit.');
      const videoUrl = await uploadToPath(buffer, `mohan-rag/answers/${params.id}.mp4`, 'video/mp4');
      answer = await setRagAnswerVideo(params.id, { status: 'completed', videoUrl, errorMessage: null }) as NonNullable<typeof answer>;
    } else if (render.status === 'failed') {
      answer = await setRagAnswerVideo(params.id, { status: 'failed', errorMessage: render.errorMessage || 'Avatar video rendering failed.' }) as NonNullable<typeof answer>;
    }
    return NextResponse.json({ success: true, answer, renderStatus: render.status });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to refresh avatar render status';
    try { await setRagAnswerVideo(params.id, { status: 'failed', errorMessage: message }); } catch {}
    return NextResponse.json({ error: message }, { status: 503 });
  }
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  if (!authorized(request)) return NextResponse.json({ error: 'Super admin access required' }, { status: 403 });
  try {
    const answer = await getRagAnswer(params.id);
    if (!answer) return NextResponse.json({ error: 'RAG answer not found' }, { status: 404 });
    if (!answer.sufficientContext || !answer.citations.length) return NextResponse.json({ error: 'An answer with approved source citations is required before avatar rendering.' }, { status: 400 });
    if (answer.status === 'rendering' || answer.status === 'completed') return NextResponse.json({ success: true, answer });

    const clone = await getMohanRagAvatarConfig();
    if (!clone?.authorized || !clone.avatarId || !clone.voiceId) {
      return NextResponse.json({ error: 'Configure your authorized HeyGen avatar and cloned voice in the AI Avatar — My Clone section first.' }, { status: 409 });
    }
    if (!['hi', 'mr', 'en'].includes(answer.language) || !clone.supportedLanguages.includes(answer.language)) {
      return NextResponse.json({ error: 'Run the answer preview in a language verified for the configured cloned voice.' }, { status: 400 });
    }
    if (!process.env.HEYGEN_API_KEY) return NextResponse.json({ error: 'HEYGEN_API_KEY is not configured on the server.' }, { status: 503 });

    const avatarScript = parseAvatarScript(answer.answer);
    if (!avatarScript.fullSpeechText.trim()) return NextResponse.json({ error: 'The answer contains no speech after removing avatar cue metadata.' }, { status: 400 });

    const providerVideoId = await submitAvatarVideo({
      avatarId: clone.avatarId,
      voiceId: clone.voiceId,
      script: avatarScript.fullSpeechText,
      width: 1080,
      height: 1920,
      avatarType: clone.avatarType,
    });
    const updated = await setRagAnswerVideo(params.id, { status: 'rendering', providerVideoId, errorMessage: null });
    return NextResponse.json({ success: true, answer: updated }, { status: 202 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not start avatar video render';
    try { await setRagAnswerVideo(params.id, { status: 'failed', errorMessage: message }); } catch {}
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
