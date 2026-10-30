// Voice cloning for the Mohan Sir avatar via Replicate (lucataco/xtts-v2).
// The reference speaker clip comes from the Bunny-hosted avatar vault.

const REPLICATE_API = 'https://api.replicate.com/v1';
// Pinned version of lucataco/xtts-v2 (verified against the Replicate model schema).
const XTTS_VERSION = '684bc3855b37866c0c65add2ff39c78f3dea3f4ff103a436465326e0f438d55e';

// XTTS-v2 supports Hindi but not Marathi, so only these are verified for the clone.
export const CLONE_SUPPORTED_LANGUAGES = ['en', 'hi'];

export interface ReplicatePredictionState {
  id: string;
  status: 'starting' | 'processing' | 'succeeded' | 'failed' | 'canceled' | string;
  output?: string | null;
  error?: string | null;
}

function token(): string {
  const key = process.env.REPLICATE_API_TOKEN;
  if (!key) throw new Error('REPLICATE_API_TOKEN is not configured on the server.');
  return key;
}

export async function startVoiceCloneSample(params: {
  speakerUrl: string;
  text: string;
  language: string;
}): Promise<ReplicatePredictionState> {
  const res = await fetch(`${REPLICATE_API}/predictions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      version: XTTS_VERSION,
      input: {
        speaker: params.speakerUrl,
        text: params.text,
        language: params.language,
        cleanup_voice: false,
      },
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.detail || data?.title || `Replicate rejected the voice clone request (${res.status}).`);
  return normalize(data);
}

export async function getVoiceCloneSample(predictionId: string): Promise<ReplicatePredictionState> {
  const res = await fetch(`${REPLICATE_API}/predictions/${encodeURIComponent(predictionId)}`, {
    headers: { Authorization: `Bearer ${token()}` },
    cache: 'no-store',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.detail || `Could not read Replicate prediction (${res.status}).`);
  return normalize(data);
}

function normalize(data: any): ReplicatePredictionState {
  return {
    id: String(data?.id || ''),
    status: String(data?.status || 'starting'),
    output: typeof data?.output === 'string' ? data.output : null,
    error: data?.error ? String(data.error) : null,
  };
}
