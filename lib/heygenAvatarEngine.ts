/**
 * HeyGen Avatar Engine & Batch Video Pipeline
 * Enables 100% realistic Digital Twin creation with natural eye blinking,
 * head micro-movements, facial expressions, and studio lighting.
 */

export interface HeyGenAvatarProfile {
  avatarId: string;
  avatarName: string;
  trainingVideoUrl: string;
  status: 'pending' | 'processing' | 'ready' | 'failed';
  createdAt: string;
}

export interface HeyGenVideoGenerationOptions {
  avatarId: string;
  voiceId?: string;
  audioUrl?: string;
  scriptText?: string;
  title: string;
  dimension?: {
    width: number;
    height: number;
  };
  background?: {
    type: 'color' | 'image' | 'video';
    value: string;
  };
}

export interface HeyGenVideoStatusResponse {
  videoId: string;
  status: 'processing' | 'completed' | 'failed' | 'pending';
  videoUrl?: string;
  thumbnailUrl?: string;
  duration?: number;
  error?: string;
}

/**
 * Pre-configured Master Training Bundle for Mohan Sir
 */
export const MOHAN_SIR_HEYGEN_MASTER_BUNDLE = {
  avatarName: 'Mohan Sir - Green Look (Official Digital Twin)',
  outfit: 'Deep Forest Green Kurta with Vedic Band Collar',
  background: 'White Textured Brick Studio Wall',
  framing: 'Chest-Up Eye-Level Studio Master (1080p Full HD)',
  trainingVideoUrl: 'https://swaryogacrm.b-cdn.net/avatar-studio/heygen-master-training/mohan_sir_green_look/mohan_sir_heygen_training_master_1080p.mp4',
  referenceFrames: {
    eyeGaze: 'https://swaryogacrm.b-cdn.net/avatar-studio/heygen-master-training/mohan_sir_green_look/mohan_sir_eyes_gaze_reference.jpg',
    speakingExpression: 'https://swaryogacrm.b-cdn.net/avatar-studio/heygen-master-training/mohan_sir_green_look/mohan_sir_speaking_expression.jpg',
    gesturesAndPosture: 'https://swaryogacrm.b-cdn.net/avatar-studio/heygen-master-training/mohan_sir_green_look/mohan_sir_gestures_posture.jpg',
    beardAndHairContours: 'https://swaryogacrm.b-cdn.net/avatar-studio/heygen-master-training/mohan_sir_green_look/mohan_sir_beard_hair_contour.jpg',
  },
  specs: {
    duration: '2 minutes 30 seconds (150s)',
    resolution: '1920x1080 (Full HD)',
    fps: 25,
    audioSampleRate: '48000 Hz Stereo',
    facialFeatures: 'Natural Blinking, Direct Pupil Alignment, Micro-head Gestures, Authentic Beard Contours'
  }
};

/**
 * HeyGen API Client
 */
export class HeyGenAvatarEngine {
  private apiKey: string;
  private baseUrl = 'https://api.heygen.com';

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.HEYGEN_API_KEY || '';
  }

  public isConfigured(): boolean {
    return Boolean(this.apiKey && this.apiKey.trim().length > 0);
  }

  /**
   * Submit avatar training video to HeyGen
   */
  async createInstantAvatar(trainingVideoUrl: string = MOHAN_SIR_HEYGEN_MASTER_BUNDLE.trainingVideoUrl, avatarName: string = MOHAN_SIR_HEYGEN_MASTER_BUNDLE.avatarName) {
    if (!this.isConfigured()) {
      throw new Error('HEYGEN_API_KEY is not configured in environment or settings.');
    }

    const res = await fetch(`${this.baseUrl}/v2/avatar/training`, {
      method: 'POST',
      headers: {
        'X-Api-Key': this.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        video_url: trainingVideoUrl,
        avatar_name: avatarName,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`HeyGen Avatar Training failed (${res.status}): ${err}`);
    }

    return await res.json();
  }

  /**
   * Generate video using custom audio or text
   */
  async generateVideo(options: HeyGenVideoGenerationOptions): Promise<{ videoId: string }> {
    if (!this.isConfigured()) {
      throw new Error('HEYGEN_API_KEY is not configured.');
    }

    const payload: any = {
      video_inputs: [
        {
          character: {
            type: 'avatar',
            avatar_id: options.avatarId,
            avatar_style: 'normal',
          },
          voice: options.audioUrl
            ? {
                type: 'audio',
                audio_url: options.audioUrl,
              }
            : {
                type: 'text',
                input_text: options.scriptText || '',
                voice_id: options.voiceId || 'mr-IN-Standard-A',
              },
        },
      ],
      dimension: options.dimension || {
        width: 1920,
        height: 1080,
      },
      title: options.title,
    };

    const res = await fetch(`${this.baseUrl}/v2/video/generate`, {
      method: 'POST',
      headers: {
        'X-Api-Key': this.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`HeyGen video generation failed (${res.status}): ${err}`);
    }

    const data = await res.json();
    return { videoId: data.data?.video_id || data.video_id };
  }

  /**
   * Check status of video generation
   */
  async getVideoStatus(videoId: string): Promise<HeyGenVideoStatusResponse> {
    if (!this.isConfigured()) {
      throw new Error('HEYGEN_API_KEY is not configured.');
    }

    const res = await fetch(`${this.baseUrl}/v1/video_status.get?video_id=${videoId}`, {
      method: 'GET',
      headers: {
        'X-Api-Key': this.apiKey,
      },
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`HeyGen video status failed (${res.status}): ${err}`);
    }

    const data = await res.json();
    const d = data.data || {};
    return {
      videoId,
      status: d.status || 'processing',
      videoUrl: d.video_url,
      thumbnailUrl: d.thumbnail_url,
      duration: d.duration,
      error: d.error,
    };
  }
}

