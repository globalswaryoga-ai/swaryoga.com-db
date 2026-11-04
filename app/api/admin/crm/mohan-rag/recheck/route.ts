import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';
import { runAiVerbatimRecheck } from '@/lib/mohanRag/verbatimAudioRechecker';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

function requireMohanRagAdmin(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || '';
    const decoded = verifyToken(token);
    return decoded && isSuperAdmin(decoded, request) ? decoded : null;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  const admin = requireMohanRagAdmin(request);
  if (!admin) return NextResponse.json({ error: 'Super admin access required' }, { status: 403 });

  try {
    const body = await request.json();
    const rawTranscript = String(body?.rawTranscript || '').trim();
    const language = String(body?.language || 'auto').trim();

    if (!rawTranscript) {
      return NextResponse.json({ error: 'rawTranscript is required' }, { status: 400 });
    }

    const result = await runAiVerbatimRecheck(rawTranscript, { preferredLanguage: language });

    return NextResponse.json({
      success: true,
      result,
      message: 'Word-to-word verbatim speech re-check completed successfully with complete sentences restored.',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'AI re-checking failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

