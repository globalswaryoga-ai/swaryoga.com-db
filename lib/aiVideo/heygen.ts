// Thin client for HeyGen's avatar video generation API. Isolated here so the
// rest of the AI-video pipeline never has to change once the user creates
// their avatar/voice clone in HeyGen's own dashboard (a manual, one-time step
// HeyGen requires for identity/consent reasons — not something this codebase
// can automate) and adds HEYGEN_API_KEY to the environment.

const HEYGEN_BASE_URL = 'https://api.heygen.com';

export interface HeyGenSubmitParams {
  avatarId: string;
  voiceId: string;
  script: string;
  width?: number;
  height?: number;
  // HeyGen's "Instant Avatar" flow (record/upload a photo or short video in
  // their dashboard, what this codebase's setup docs point users to) creates
  // a "talking_photo" avatar, which uses a different request shape than the
  // older "avatar" (Studio Avatar) type — confirmed live via
  // GET /v2/avatar_group.list, group_type: "PHOTO". Default to talking_photo
  // since that's what every avatar created via that flow will be.
  avatarType?: 'avatar' | 'talking_photo';
}

export interface HeyGenStatus {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  videoUrl?: string;
  errorMessage?: string;
}

function getApiKey(): string {
  const key = process.env.HEYGEN_API_KEY;
  if (!key) throw new Error('HEYGEN_API_KEY is not configured');
  return key;
}

export async function submitAvatarVideo(params: HeyGenSubmitParams): Promise<string> {
  const avatarType = params.avatarType || 'talking_photo';
  const character = avatarType === 'talking_photo'
    ? { type: 'talking_photo', talking_photo_id: params.avatarId }
    : { type: 'avatar', avatar_id: params.avatarId };

  const res = await fetch(`${HEYGEN_BASE_URL}/v2/video/generate`, {
    method: 'POST',
    headers: {
      'X-Api-Key': getApiKey(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      video_inputs: [
        {
          character,
          voice: { type: 'text', input_text: params.script, voice_id: params.voiceId },
        },
      ],
      dimension: { width: params.width || 1280, height: params.height || 720 },
      caption: false,
    }),
  });

  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(`HeyGen video submit failed: ${data?.error?.message || data?.message || res.statusText}`);
  }
  const videoId = data?.data?.video_id;
  if (!videoId) throw new Error('HeyGen response missing data.video_id');
  return videoId;
}

// HeyGen renders asynchronously on their own infra — this just checks status,
// it never blocks waiting for completion. Callers should poll this from a
// short-lived API route, not loop inside one.
export async function checkVideoStatus(heygenVideoId: string): Promise<HeyGenStatus> {
  const res = await fetch(`${HEYGEN_BASE_URL}/v1/video_status.get?video_id=${encodeURIComponent(heygenVideoId)}`, {
    headers: { 'X-Api-Key': getApiKey() },
  });

  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(`HeyGen status check failed: ${data?.error?.message || data?.message || res.statusText}`);
  }

  const raw = data?.data?.status as string | undefined;
  const status: HeyGenStatus['status'] =
    raw === 'completed' ? 'completed' : raw === 'failed' ? 'failed' : raw === 'processing' || raw === 'pending' ? raw : 'pending';

  return {
    status,
    videoUrl: data?.data?.video_url,
    errorMessage: data?.data?.error?.message,
  };
}
