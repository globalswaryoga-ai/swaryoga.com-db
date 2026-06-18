// Shared Gemini/OpenAI caller for the KP Astro horoscope feature — mirrors the
// pattern already used in app/api/admin/crm/tally/chat/route.ts (no SDK, plain
// fetch, Gemini free tier first, OpenAI fallback) so both the report generator
// and the chat endpoint stay consistent with the rest of the codebase.

export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

export async function callAI(systemPrompt: string, history: ChatTurn[], message: string, maxOutputTokens = 2000): Promise<string> {
  const geminiKey = process.env.GEMINI_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  if (!geminiKey && !openaiKey) {
    return 'AI is not configured yet. Please add GEMINI_API_KEY (free) or OPENAI_API_KEY to your environment variables.';
  }

  if (geminiKey) {
    const model = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`;

    const contents = [
      ...history.slice(-8).map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      })),
      { role: 'user', parts: [{ text: message }] },
    ];

    const res = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents,
        generationConfig: { temperature: 0.4, maxOutputTokens },
      }),
    });

    const data = await res.json();
    if (!res.ok || data.error) {
      console.error('[KP Astro AI Gemini Error]', data);
      return `AI error: ${data?.error?.message || 'Gemini request failed'}`;
    }
    return data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response from AI.';
  }

  const messages = [
    { role: 'system', content: systemPrompt },
    ...history.slice(-8).map((m) => ({ role: m.role, content: m.content })),
    { role: 'user', content: message },
  ];

  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${openaiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model, messages, temperature: 0.4, max_tokens: maxOutputTokens }),
  });

  const data = await res.json();
  if (!res.ok) {
    console.error('[KP Astro AI OpenAI Error]', data);
    return `AI error: ${data?.error?.message || 'OpenAI request failed'}`;
  }
  return data.choices?.[0]?.message?.content || 'No response from AI.';
}
