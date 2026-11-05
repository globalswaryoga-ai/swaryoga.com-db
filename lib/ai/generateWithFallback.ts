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
  signal?: AbortSignal;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getGeminiModels(): string[] {
  const configured = process.env.GEMINI_MODEL;
  if (configured) return [configured];
  return ['gemini-3.1-flash-lite', 'gemini-3.5-flash-lite', 'gemini-flash-lite-latest', 'gemini-2.5-flash'];
}

async function callGemini(params: GenerateTextParams, attempt = 1): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not configured');

  const models = getGeminiModels();
  let lastError: Error | null = null;

  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
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
        signal: params.signal,
        body: JSON.stringify({
          ...(params.systemPrompt ? { system_instruction: { parts: [{ text: params.systemPrompt }] } } : {}),
          contents,
          generationConfig: { temperature: params.temperature ?? 0.3, maxOutputTokens: params.maxOutputTokens ?? 2000 },
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data?.error?.message || res.statusText);
      }

      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error('Gemini returned no text');
      return text;
    } catch (err: any) {
      lastError = err;
      // If quota or not found on this model, try next model in fallback list
      continue;
    }
  }

  throw lastError || new Error('All Gemini models failed');
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
    signal: params.signal,
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
    signal: params.signal,
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

  const fullPrompt = historyText ? `${historyText}\nUser: ${params.message}\nAssistant:` : params.message;

  const res = await fetch('https://api.replicate.com/v1/models/meta/meta-llama-3-70b-instruct/predictions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Prefer': 'wait=60'
    },
    signal: params.signal,
    body: JSON.stringify({
      input: {
        prompt: fullPrompt,
        system_prompt: params.systemPrompt || '',
        max_tokens: params.maxOutputTokens ?? 2000,
        temperature: params.temperature ?? 0.3,
      }
    })
  });

  const prediction = await res.json();
  if (!res.ok) throw new Error(`Replicate error: ${prediction?.detail || res.statusText}`);
  
  if (prediction.status === 'succeeded') {
    const text = Array.isArray(prediction.output) ? prediction.output.join('') : String(prediction.output);
    return text.trim();
  }

  // Poll if not immediately finished
  const pollUrl = prediction.urls?.get || `https://api.replicate.com/v1/predictions/${prediction.id}`;
  for (let i = 0; i < 30; i++) {
    await sleep(1500);
    const pollRes = await fetch(pollUrl, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
      signal: params.signal
    });
    const data = await pollRes.json();
    if (data.status === 'succeeded') {
      const text = Array.isArray(data.output) ? data.output.join('') : String(data.output);
      return text.trim();
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
