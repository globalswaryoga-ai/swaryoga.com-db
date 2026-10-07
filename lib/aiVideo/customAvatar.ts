import { HeyGenStatus } from './heygen';

export interface CustomAvatarSubmitParams {
  avatarPrompt?: string; // AI generated avatar description
  avatarId?: string; // Pre-existing image URL or ID
  voiceId: string;
  script: string;
  width?: number;
  height?: number;
}

// Submits the video generation request to Replicate/Fal.ai pipeline
export async function submitAvatarVideo(params: CustomAvatarSubmitParams): Promise<string> {
  const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;
  if (!REPLICATE_API_TOKEN) throw new Error('REPLICATE_API_TOKEN environment variable is missing.');
  
  // Phase 3.1: Text-to-Speech (TTS)
  // For now, we simulate the submission to a Replicate lip-sync model like `cjwbw/sadtalker`.
  // In a full implementation, you would:
  // 1. Generate Avatar Image using flux-schnell via Replicate
  // 2. Generate Audio using Bark or OpenAI TTS
  // 3. Combine both using SadTalker or video-retalking on Replicate.
  
  const payload = {
    version: "a6cb187228a01103c39a3fbbaf92e921d7b30f40fb178d6cb582ff655fdb60ec", // cjwbw/sadtalker example version
    input: {
      source_image: params.avatarId || "https://example.com/default-avatar.png", // Replace with Flux generated image URL
      driven_audio: "https://example.com/tts-audio.wav", // Replace with OpenAI TTS Audio URL
      still: true,
      enhancer: "gfpgan"
    }
  };

  const response = await fetch('https://api.replicate.com/v1/predictions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${REPLICATE_API_TOKEN}`,
      'Content-Type': 'application/json',
      'Prefer': 'wait'
    },
    body: JSON.stringify(payload)
  });

  const prediction = await response.json();
  if (response.status !== 201 && response.status !== 200) {
    throw new Error(prediction?.detail || 'Replicate prediction failed');
  }

  // Return the prediction ID so the frontend can poll it later
  return prediction.id;
}

// Check the status of the Replicate prediction (called by GET jobs/[id])
// Re-uses the HeyGenStatus interface for frontend backwards compatibility
export async function checkCustomVideoStatus(predictionId: string): Promise<HeyGenStatus> {
  const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;
  if (!REPLICATE_API_TOKEN) throw new Error('REPLICATE_API_TOKEN environment variable is missing.');

  const res = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
    headers: { 'Authorization': `Bearer ${REPLICATE_API_TOKEN}` }
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Replicate status check failed: ${data?.detail || res.statusText}`);
  }

  const raw = data.status; // "starting", "processing", "succeeded", "failed", "canceled"
  const status: HeyGenStatus['status'] =
    raw === 'succeeded' ? 'completed' : raw === 'failed' || raw === 'canceled' ? 'failed' : 'processing';

  return {
    status,
    videoUrl: status === 'completed' ? data.output : undefined,
    errorMessage: data.error,
  };
}
