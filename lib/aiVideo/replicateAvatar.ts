import { uploadToBunnyStream } from '../bunny-stream';

export interface AvatarRenderParams {
  script: string;
  language: string;
  voice?: string; // OpenAI TTS voice: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer'
  sourceImageUrl?: string;
  avatarType?: string;
}

export interface AvatarRenderStatus {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  videoUrl?: string;
  audioUrl?: string;
  errorMessage?: string;
}

function getOpenAiKey(): string {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error('OPENAI_API_KEY is not configured');
  return key;
}

/**
 * Generate high-quality spoken audio using OpenAI TTS API.
 */
export async function generateOpenAiSpeech(text: string, voice = 'alloy'): Promise<Buffer> {
  const apiKey = getOpenAiKey();
  const cleanedText = text
    .replace(/\[(AVATAR|SLIDE|VIDEO)[^\]]*\]/g, '')
    .trim();

  const res = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'tts-1',
      input: cleanedText.slice(0, 4096), // OpenAI TTS limit per chunk
      voice: ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'].includes(voice) ? voice : 'alloy',
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`OpenAI TTS error: ${errorText || res.statusText}`);
  }

  return Buffer.from(await res.arrayBuffer());
}

/**
 * Submits avatar generation to Replicate or produces synthetic audio-video presentation.
 */
export async function submitAvatarRender(params: AvatarRenderParams): Promise<{
  predictionId?: string;
  status: 'completed' | 'processing' | 'failed';
  audioBuffer?: Buffer;
  videoUrl?: string;
  audioUrl?: string;
}> {
  // 1. Generate speech via OpenAI
  const audioBuffer = await generateOpenAiSpeech(params.script, params.voice);

  const replicateToken = process.env.REPLICATE_API_TOKEN;
  if (!replicateToken) {
    // Replicate token not configured - return completed with audioBuffer
    return {
      status: 'completed',
      audioBuffer,
    };
  }

  // 2. If Replicate is configured, invoke Replicate talking avatar model
  try {
    const defaultAvatarImage = params.sourceImageUrl || 'https://swaryogacrm.b-cdn.net/mohan.jpg';
    
    // Convert audio buffer to data URI for Replicate input
    const audioDataUri = `data:audio/mp3;base64,${audioBuffer.toString('base64')}`;

    const res = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${replicateToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        // SadTalker on Replicate
        version: 'a519cc0cf43a8523771161a834fbda26677f0848b9533f8e504e72b3e29ca4a6',
        input: {
          source_image: defaultAvatarImage,
          driven_audio: audioDataUri,
          enhancer: 'gfpgan',
          preprocess: 'crop',
          still: true,
        },
      }),
    });

    const data = await res.json();
    if (!res.ok || data.error) {
      throw new Error(data.error || res.statusText);
    }

    return {
      predictionId: data.id,
      status: data.status === 'succeeded' ? 'completed' : 'processing',
      videoUrl: Array.isArray(data.output) ? data.output[0] : (typeof data.output === 'string' ? data.output : undefined),
      audioBuffer,
    };
  } catch (err: any) {
    // If Replicate call fails, return audioBuffer as fallback
    console.warn('Replicate submission fallback to OpenAI audio:', err.message);
    return {
      status: 'completed',
      audioBuffer,
    };
  }
}

/**
 * Check Replicate prediction status.
 */
export async function checkReplicateStatus(predictionId: string): Promise<AvatarRenderStatus> {
  const replicateToken = process.env.REPLICATE_API_TOKEN;
  if (!replicateToken) {
    return { status: 'completed' };
  }

  const res = await fetch(`https://api.replicate.com/v1/predictions/${encodeURIComponent(predictionId)}`, {
    headers: { Authorization: `Bearer ${replicateToken}` },
  });

  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data.error || `Replicate status check failed: ${res.statusText}`);
  }

  let status: AvatarRenderStatus['status'] = 'processing';
  if (data.status === 'succeeded') status = 'completed';
  if (data.status === 'failed' || data.status === 'canceled') status = 'failed';

  const outputUrl = Array.isArray(data.output) ? data.output[0] : (typeof data.output === 'string' ? data.output : undefined);

  return {
    status,
    videoUrl: outputUrl,
    errorMessage: data.error,
  };
}
