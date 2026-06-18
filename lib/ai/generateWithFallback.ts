// Shared Gemini-primary/OpenAI-fallback text generation, used by every
// AI feature in this codebase (KP Astro, Tally chat, cloud-translate,
// RAG-Video). Centralizing this because every call site used to have its
// own copy of "if (geminiKey) { ... } else { openai }" — which meant a
// Gemini failure (quota, overload) returned an error directly instead of
// actually falling back, even when an OpenAI key was configured. Confirmed
// live: this codebase's Gemini key hit the free tier's 20-requests/day cap
// on gemini-2.5-flash from real use, breaking KP Astro, Tally chat, and
// RAG-Video simultaneously since they all share one key.

export interface AiHistoryTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface GenerateTextParams {
  systemPrompt?: string;
  history?: AiHistoryTurn[];
  message: string;
  maxOutputTokens?: number;
  temperature?: number;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getGeminiModel(): string {
  // gemini-2.0-flash's free-tier quota is now 0 (sunset) — confirmed live, 2.5-flash works.
  return process.env.GEMINI_MODEL || 'gemini-2.5-flash';
}

async function callGemini(params: GenerateTextParams, attempt = 1): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not configured');

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${getGeminiModel()}:generateContent?key=${apiKey}`;
  const contents = [
    ...(params.history || []).slice(-8).map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    })),
    { role: 'user', parts: [{ text: params.message }] },
  ];

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...(params.systemPrompt ? { system_instruction: { parts: [{ text: params.systemPrompt }] } } : {}),
      contents,
      generationConfig: { temperature: params.temperature ?? 0.3, maxOutputTokens: params.maxOutputTokens ?? 2000 },
    }),
  });

  const data = await res.json();
  if (!res.ok || data.error) {
    const details: any[] = data?.error?.details || [];
    const isDailyCap = details.some((d) => String(d?.quotaId || '').includes('PerDay'));
    const retryDelaySeconds = Number((details.find((d) => d?.retryDelay)?.retryDelay || '').replace(/s$/, '')) || null;

    if (!isDailyCap && (res.status === 503 || res.status === 429) && attempt < 3) {
      await sleep((retryDelaySeconds ? retryDelaySeconds * 1000 : attempt * 3000) + 500);
      return callGemini(params, attempt + 1);
    }

    const baseMessage = data?.error?.message || res.statusText;
    throw new Error(isDailyCap ? `Gemini free-tier daily limit reached: ${baseMessage}` : `Gemini error: ${baseMessage}`);
  }

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Gemini returned no text');
  return text;
}

async function callOpenAI(params: GenerateTextParams): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY is not configured');

  const messages = [
    ...(params.systemPrompt ? [{ role: 'system', content: params.systemPrompt }] : []),
    ...(params.history || []).slice(-8).map((m) => ({ role: m.role, content: m.content })),
    { role: 'user', content: params.message },
  ];

  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, messages, temperature: params.temperature ?? 0.3, max_tokens: params.maxOutputTokens ?? 2000 }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(`OpenAI error: ${data?.error?.message || res.statusText}`);
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error('OpenAI returned no text');
  return text;
}

// Tries Gemini first (free tier); on ANY Gemini failure — not just a
// missing key — falls back to OpenAI if OPENAI_API_KEY is configured.
// Throws only if both fail or neither is configured.
export async function generateAIText(params: GenerateTextParams): Promise<string> {
  const hasGemini = Boolean(process.env.GEMINI_API_KEY);
  const hasOpenAI = Boolean(process.env.OPENAI_API_KEY);

  if (!hasGemini && !hasOpenAI) {
    throw new Error('AI is not configured — add GEMINI_API_KEY (free) or OPENAI_API_KEY to your environment variables.');
  }

  if (hasGemini) {
    try {
      return await callGemini(params);
    } catch (geminiError) {
      if (!hasOpenAI) throw geminiError;
      try {
        return await callOpenAI(params);
      } catch (openaiError) {
        const g = geminiError instanceof Error ? geminiError.message : String(geminiError);
        const o = openaiError instanceof Error ? openaiError.message : String(openaiError);
        throw new Error(`Both providers failed. Gemini: ${g} | OpenAI: ${o}`);
      }
    }
  }

  return callOpenAI(params);
}
