import { HeyGenStatus } from './heygen';

export interface CustomAvatarSubmitParams {
  avatarPrompt?: string; // AI generated avatar description
  avatarId?: string; // Pre-existing image URL, video URL, or ID
  voiceId: string; // OpenAI TTS voice name ('alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer') or voice audio sample URL
  script: string;
  width?: number;
  height?: number;
}

const BUNNY_API_KEY = process.env.BUNNY_STORAGE_API_KEY || process.env.BUNNY_STORAGE_KEY;
const BUNNY_STORAGE_ZONE = process.env.BUNNY_STORAGE_ZONE_NAME || 'swaryogadb';
const BUNNY_CDN_URL = process.env.BUNNY_STORAGE_CDN_HOST
  ? `https://${process.env.BUNNY_STORAGE_CDN_HOST}`
  : 'https://swaryogacrm.b-cdn.net';

// Helper: Upload Buffer directly to Bunny Storage
async function uploadBufferToBunny(buffer: Buffer, fileName: string, contentType: string): Promise<string> {
  if (!BUNNY_API_KEY) {
    throw new Error('Bunny Storage API key not configured');
  }

  const bunnyUploadUrl = `https://storage.bunnycdn.com/${BUNNY_STORAGE_ZONE}/materials/${fileName}`;
  const uploadResponse = await fetch(bunnyUploadUrl, {
    method: 'PUT',
    headers: {
      'AccessKey': BUNNY_API_KEY,
      'Content-Type': contentType,
    },
    body: buffer as any,
  });

  if (!uploadResponse.ok) {
    throw new Error(`Failed to upload to Bunny Storage: ${uploadResponse.statusText}`);
  }

  return `${BUNNY_CDN_URL}/materials/${fileName}`;
}

// Helper: Generate TTS Audio using OpenAI TTS API and upload to Bunny CDN
async function generateTtsAudio(script: string, voice: string = 'alloy'): Promise<string> {
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  if (!OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is missing for TTS generation.');

  // Valid OpenAI voices: alloy, echo, fable, onyx, nova, shimmer
  const validVoices = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'];
  const selectedVoice = validVoices.includes(voice.toLowerCase()) ? voice.toLowerCase() : 'alloy';

  const ttsRes = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'tts-1',
      input: script.slice(0, 4000), // Max chunk for single TTS
      voice: selectedVoice,
      response_format: 'mp3',
      speed: 1.0,
    }),
  });

  if (!ttsRes.ok) {
    const errText = await ttsRes.text();
    throw new Error(`OpenAI TTS generation failed: ${errText}`);
  }

  const audioBuffer = Buffer.from(await ttsRes.arrayBuffer());
  const fileName = `tts_${Date.now()}_${Math.random().toString(36).substring(7)}.mp3`;
  return await uploadBufferToBunny(audioBuffer, fileName, 'audio/mpeg');
}

// Submits the video generation request to Replicate AI pipeline
export async function submitAvatarVideo(params: CustomAvatarSubmitParams): Promise<string> {
  const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;
  if (!REPLICATE_API_TOKEN) throw new Error('REPLICATE_API_TOKEN environment variable is missing.');

  if (!params.script || !params.script.trim()) {
    throw new Error('Script text is required to generate avatar video.');
  }

  // 1. Generate or resolve TTS Audio
  let audioUrl = params.voiceId?.startsWith('http') ? params.voiceId : '';
  if (!audioUrl) {
    audioUrl = await generateTtsAudio(params.script, params.voiceId || 'alloy');
  }

  // 2. Resolve Avatar Image / Face
  let faceImageUrl = params.avatarId;
  if (!faceImageUrl || !faceImageUrl.startsWith('http')) {
    // Default fallback avatar image on CDN if none selected
    faceImageUrl = `${BUNNY_CDN_URL}/materials/swar_yoga_avatar_default.jpg`;
  }

  // 3. Call Replicate SadTalker with GFPGAN enhancer for face restoration
  const payload = {
    version: "a6cb187228a01103c39a3fbbaf92e921d7b30f40fb178d6cb582ff655fdb60ec",
    input: {
      source_image: faceImageUrl,
      driven_audio: audioUrl,
      still: false,
      enhancer: "gfpgan", // GFPGAN enhances face resolution to 1080p/2K
      preprocess: "full",
    }
  };

  const response = await fetch('https://api.replicate.com/v1/predictions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${REPLICATE_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload)
  });

  const prediction = await response.json();
  if (response.status !== 201 && response.status !== 200) {
    throw new Error(prediction?.detail || 'Replicate prediction failed to start.');
  }

  return prediction.id;
}

// Check the status of the Replicate prediction (called by GET jobs/[id])
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
