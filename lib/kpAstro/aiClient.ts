// Shared Gemini/OpenAI caller for the KP Astro horoscope feature — delegates
// to the shared lib/ai/generateWithFallback.ts so a Gemini failure (quota,
// overload) actually falls back to OpenAI here too, instead of just
// returning the error as the chat reply.

import { generateAIText } from '@/lib/ai/generateWithFallback';

export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

export async function callAI(systemPrompt: string, history: ChatTurn[], message: string, maxOutputTokens = 2000): Promise<string> {
  try {
    return await generateAIText({ systemPrompt, history, message, maxOutputTokens, temperature: 0.4 });
  } catch (err) {
    console.error('[KP Astro AI Error]', err);
    return `AI error: ${err instanceof Error ? err.message : 'Request failed'}`;
  }
}
