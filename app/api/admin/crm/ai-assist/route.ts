export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { aiFixText, aiSmartReply, cannedReply, autoCorrectTextFull, fixSentences } from '@/lib/aiComposerAssist';

/**
 * AI Assistant endpoint.
 * Features:
 * 1. Auto-correct (while typing)
 * 2. Full Grammar/Spelling Fix
 * 3. Smart Reply Generation
 *
 * Each mode calls a real AI model first (lib/aiComposerAssist.ts) and only
 * falls back to the offline dictionary/canned-reply logic if every
 * configured AI provider fails or none are configured.
 */
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : authHeader;
    const decoded = verifyToken(token || undefined);

    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { text, mode, context } = await req.json();

    // Mode: 'autocorrect' (Real-time while typing)
    if (mode === 'autocorrect') {
      if (!text) {
        return NextResponse.json({ success: true, result: '', corrections: [] });
      }

      const aiFixed = await aiFixText(text);
      if (aiFixed !== null) {
        return NextResponse.json({ success: true, result: aiFixed, original: text, changed: aiFixed !== text, provider: 'ai' });
      }

      const { corrected, corrections } = await autoCorrectTextFull(text);
      return NextResponse.json({
        success: true,
        result: corrected,
        original: text,
        corrections,
        changed: corrected !== text,
        provider: 'dictionary-fallback',
      });
    }

    // Mode: 'fix' (Full grammar/spelling fix)
    if (mode === 'fix') {
      if (!text) {
        return NextResponse.json({ error: 'Text required' }, { status: 400 });
      }

      const aiFixed = await aiFixText(text);
      if (aiFixed !== null) {
        return NextResponse.json({ success: true, result: aiFixed, original: text, provider: 'ai' });
      }

      const { corrected } = await autoCorrectTextFull(text);
      let fixed = fixSentences(corrected);
      if (fixed.length > 0 && !/[.!?]$/.test(fixed.trim())) {
        fixed = fixed.trim() + '.';
      }
      return NextResponse.json({ success: true, result: fixed, original: text, provider: 'dictionary-fallback' });
    }

    // Mode: 'reply' (Generate Response)
    if (mode === 'reply') {
      const aiReply = await aiSmartReply(String(context || ''));
      if (aiReply) {
        return NextResponse.json({ success: true, result: aiReply, provider: 'ai' });
      }
      return NextResponse.json({ success: true, result: cannedReply(String(context || '')), provider: 'canned-fallback' });
    }

    return NextResponse.json({ error: 'Invalid mode' }, { status: 400 });
  } catch (error: any) {
    console.error('AI Assist error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
