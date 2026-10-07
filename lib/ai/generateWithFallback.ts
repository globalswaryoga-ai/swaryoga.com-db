// Shared OpenAI/Anthropic-primary, Gemini-last text generation, used by
// every AI feature in this codebase (KP Astro, Tally chat, cloud-translate,
// WhatsApp auto-reply, e-learning video Q&A, RAG-Video). Centralizing this
// because every call site used to have its own copy of
// "if (geminiKey) { ... } else { openai }" — which meant a Gemini failure
// (quota, overload) returned an error directly instead of actually falling
// back, even when a fallback key was configured.
//
// Default order used to be Gemini-first, with only RAG-Video overriding to
// put Gemini last. That left every *other* feature still hammering Gemini
// first, which burns the free tier's 20-requests/day cap (shared across
// every feature using this one key) before RAG-Video's own Gemini fallback
// (used only when its OpenAI Whisper transcription step fails) ever gets a
// turn — confirmed live: RAG-Video kept hitting "Gemini quota exceeded"
// even after its own call site was fixed, because the other five callers
// were still exhausting the shared quota first. Gemini is now last by
// default everywhere; callers can still pass `providerOrder` to override.

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
  // Override the default Gemini-first order — e.g. RAG-Video passes
  // ['Anthropic', 'OpenAI', 'Gemini'] since Gemini's shared free-tier quota
  // (20/day across every feature using this one key) made it unreliable as
  // a primary there. Unrecognized/omitted names fall back to default order.
  providerOrder?: string[];
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
      // Cap the wait even when Gemini suggests a longer retryDelay (seen:
      // 30s+ on non-daily 429s) — a capped retry here means the fallbacks
      // below still kick in quickly instead of stalling the whole request
      // behind Gemini's own suggested backoff.
      const delayMs = Math.min((retryDelaySeconds ? retryDelaySeconds * 1000 : attempt * 3000) + 500, 8000);
      await sleep(delayMs);
      return callGemini(params, attempt + 1);
    }

    const baseMessage = data?.error?.message || res.statusText;
    throw new Error(isDailyCap ? `Gemini free-tier daily limit reached: ${baseMessage}` : `Gemini error: ${baseMessage}`);
  }

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Gemini returned no text');
  return text;
}

async function callAnthropic(params: GenerateTextParams): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not configured');

  const messages = [
    ...(params.history || []).slice(-8).map((m) => ({ role: m.role, content: m.content })),
    { role: 'user', content: params.message },
  ];

  const model = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6';
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      max_tokens: params.maxOutputTokens ?? 2000,
      temperature: params.temperature ?? 0.3,
      ...(params.systemPrompt ? { system: params.systemPrompt } : {}),
      messages,
    }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(`Anthropic error: ${data?.error?.message || res.statusText}`);
  const text = data.content?.[0]?.text;
  if (!text) throw new Error('Anthropic returned no text');
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

async function callReplicate(params: GenerateTextParams): Promise<string> {
  const apiKey = process.env.REPLICATE_API_TOKEN;
  if (!apiKey) throw new Error('REPLICATE_API_TOKEN is not configured');

  const historyText = (params.history || []).map((m: any) =>
    `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`
  ).join('\n');

  // Llama 3 8B Instruct
  const LLAMA3_VERSION = '5a6809ca6288247d06daf6365557e5e429063f32a21146b2a807c682652136b8';

  const res = await fetch('https://api.replicate.com/v1/predictions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Prefer': 'wait=60'
    },
    body: JSON.stringify({
      version: LLAMA3_VERSION,
      input: {
        prompt: `${historyText}\nUser: ${params.message}\nAssistant:`,
        system_prompt: params.systemPrompt || '',
        max_new_tokens: params.maxOutputTokens ?? 2000,
        temperature: params.temperature ?? 0.3,
      }
    })
  });

  const prediction = await res.json();
  if (!res.ok) throw new Error(`Replicate error: ${prediction?.detail || res.statusText}`);
  
  if (prediction.status === 'succeeded') {
    const text = Array.isArray(prediction.output) ? prediction.output.join('') : String(prediction.output);
    return text;
  }

  // Poll
  const pollUrl = prediction.urls?.get || `https://api.replicate.com/v1/predictions/${prediction.id}`;
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 2000));
    const pollRes = await fetch(pollUrl, {
      headers: { 'Authorization': `Bearer ${apiKey}` }
    });
    const data = await pollRes.json();
    if (data.status === 'succeeded') {
      return Array.isArray(data.output) ? data.output.join('') : String(data.output);
    }
    if (data.status === 'failed') throw new Error(data.error || 'Replicate prediction failed');
  }
  throw new Error('Replicate timed out');
}

// Tries Gemini first (free tier); on ANY Gemini failure — not just a
// missing key — falls back to Anthropic, then OpenAI, for whichever of
// those have a configured key. Throws only if every configured provider
// fails (or none are configured at all).
export async function generateAIText(params: GenerateTextParams): Promise<string> {
  const allProviders: Record<string, { configured: boolean; call: () => Promise<string> }> = {
    Replicate: { configured: Boolean(process.env.REPLICATE_API_TOKEN), call: () => callReplicate(params) },
    Gemini: { configured: Boolean(process.env.GEMINI_API_KEY), call: () => callGemini(params) },
    Anthropic: { configured: Boolean(process.env.ANTHROPIC_API_KEY), call: () => callAnthropic(params) },
    OpenAI: { configured: Boolean(process.env.OPENAI_API_KEY), call: () => callOpenAI(params) },
  };
  const order = params.providerOrder?.filter((name) => allProviders[name]) || ['Replicate', 'OpenAI', 'Anthropic', 'Gemini'];
  const providers = order
    .map((name) => ({ name, ...allProviders[name] }))
    .filter((p) => p.configured);

  if (!providers.length) {
    throw new Error('AI is not configured — add REPLICATE_API_TOKEN, GEMINI_API_KEY, ANTHROPIC_API_KEY, or OPENAI_API_KEY to your environment variables.');
  }

  const errors: string[] = [];
  for (const provider of providers) {
    try {
      return await provider.call();
    } catch (err) {
      errors.push(`${provider.name}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  throw new Error(`All configured AI providers failed. ${errors.join(' | ')}`);
}
