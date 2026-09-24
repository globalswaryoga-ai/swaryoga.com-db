import { NextRequest } from 'next/server';
import { aiFixText, aiSmartReply, cannedReply, autoCorrectTextFull, fixSentences } from '@/lib/aiComposerAssist';
import { extensionJson, extensionOptions, requireExtensionAccess } from '@/lib/extensionAccess';

export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return extensionOptions();
}

/**
 * POST /api/extension/ai
 * Body: { mode: 'fix' | 'reply', text?: string, context?: string }
 * Same logic as /api/admin/crm/ai-assist (lib/aiComposerAssist.ts), gated by
 * extension approval rather than just general CRM login.
 */
export async function POST(req: NextRequest) {
  try {
    const decoded = await requireExtensionAccess(req);
    if (!decoded) {
      return extensionJson({ success: false, error: 'Extension access not approved for this user' }, 403);
    }

    const { text, mode, context } = await req.json();

    if (mode === 'fix') {
      if (!text) return extensionJson({ success: false, error: 'Text required' }, 400);
      const aiFixed = await aiFixText(text);
      if (aiFixed !== null) {
        return extensionJson({ success: true, result: aiFixed, provider: 'ai' });
      }
      const { corrected } = await autoCorrectTextFull(text);
      let fixed = fixSentences(corrected);
      if (fixed.length > 0 && !/[.!?]$/.test(fixed.trim())) fixed = fixed.trim() + '.';
      return extensionJson({ success: true, result: fixed, provider: 'dictionary-fallback' });
    }

    if (mode === 'reply') {
      const aiReply = await aiSmartReply(String(context || ''));
      if (aiReply) return extensionJson({ success: true, result: aiReply, provider: 'ai' });
      return extensionJson({ success: true, result: cannedReply(String(context || '')), provider: 'canned-fallback' });
    }

    return extensionJson({ success: false, error: 'Invalid mode' }, 400);
  } catch (err) {
    console.error('[extension/ai]', err);
    return extensionJson({ success: false, error: 'Internal error' }, 500);
  }
}
