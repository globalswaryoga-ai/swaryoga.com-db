// Thin client for HeyGen's avatar video generation API. Isolated here so the
// rest of the AI-video pipeline never has to change once the user creates
// their avatar/voice clone in HeyGen's own dashboard (a manual, one-time step
// HeyGen requires for identity/consent reasons — not something this codebase
// can automate) and adds HEYGEN_API_KEY to the environment.
//
// Scripts can mix three visual modes by placing markers on their own line:
//   [AVATAR]            -> full-frame avatar (default, no marker needed at the start)
//   [SLIDE: <image-url>] -> avatar shrinks to a corner circle, image fills the background
//   [VIDEO: <video-url>] -> same corner layout, background is a looping video clip
// Each marker starts a new HeyGen "scene" (one entry in video_inputs); HeyGen
// concatenates scenes into one continuous rendered video. Confirmed live:
// talking_photo_style "circle" + scale/offset for the inset, background.type
// "image"/"video" with an asset uploaded via HeyGen's own /v1/asset endpoint
// (external URLs aren't accepted directly in background, only asset ids).

const HEYGEN_BASE_URL = 'https://api.heygen.com';
const HEYGEN_UPLOAD_URL = 'https://upload.heygen.com';

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

interface ScriptScene {
  mode: 'avatar' | 'slide' | 'video';
  text: string;
  assetUrl?: string;
}

const MARKER_RE = /^\[(AVATAR)\]$|^\[(SLIDE|VIDEO):\s*(\S+)\]$/;

// Splits script text into ordered scenes on marker lines. Text before the
// first marker is an avatar scene by default, so scripts without any
// markers behave exactly as before (one single avatar scene).
function parseScriptScenes(scriptText: string): ScriptScene[] {
  const lines = scriptText.split('\n');
  const scenes: ScriptScene[] = [{ mode: 'avatar', text: '' }];

  for (const line of lines) {
    const match = line.trim().match(MARKER_RE);
    if (match) {
      if (match[1] === 'AVATAR') {
        scenes.push({ mode: 'avatar', text: '' });
      } else {
        const mode = match[2].toLowerCase() as 'slide' | 'video';
        scenes.push({ mode, text: '', assetUrl: match[3] });
      }
    } else {
      scenes[scenes.length - 1].text += (scenes[scenes.length - 1].text ? '\n' : '') + line;
    }
  }

  return scenes
    .map((s) => ({ ...s, text: s.text.trim() }))
    .filter((s) => s.text.length > 0);
}

// Uploads a file (downloaded from wherever it's hosted, e.g. Bunny Storage)
// to HeyGen's own asset store — required because background.image_asset_id /
// video_asset_id only accept HeyGen-hosted asset ids, not arbitrary URLs.
async function uploadAssetToHeyGen(assetUrl: string): Promise<string> {
  const sourceRes = await fetch(assetUrl);
  if (!sourceRes.ok) throw new Error(`Failed to download asset for HeyGen upload: ${assetUrl}`);
  const buffer = Buffer.from(await sourceRes.arrayBuffer());
  const contentType = sourceRes.headers.get('content-type') || 'application/octet-stream';

  const res = await fetch(`${HEYGEN_UPLOAD_URL}/v1/asset`, {
    method: 'POST',
    headers: { 'X-Api-Key': getApiKey(), 'Content-Type': contentType },
    body: buffer as any,
  });

  const data = await res.json();
  if (!res.ok || data.code !== 100) {
    throw new Error(`HeyGen asset upload failed: ${data?.message || data?.msg || res.statusText}`);
  }
  const assetId = data?.data?.id;
  if (!assetId) throw new Error('HeyGen asset upload response missing data.id');
  return assetId;
}

export async function submitAvatarVideo(params: HeyGenSubmitParams): Promise<string> {
  const avatarType = params.avatarType || 'talking_photo';
  const scenes = parseScriptScenes(params.script);

  const videoInputs = await Promise.all(
    scenes.map(async (scene) => {
      const voice = { type: 'text', input_text: scene.text, voice_id: params.voiceId };

      if (scene.mode === 'avatar') {
        const character = avatarType === 'talking_photo'
          ? { type: 'talking_photo', talking_photo_id: params.avatarId }
          : { type: 'avatar', avatar_id: params.avatarId };
        return { character, voice };
      }

      // Slide/video scene: avatar shrinks to a corner circle inset, the
      // uploaded image/video fills the background. Confirmed live: scale
      // 0.35 + offset 0.32/0.32 (bottom-right) reads clearly without
      // covering much of the slide.
      const assetId = await uploadAssetToHeyGen(scene.assetUrl!);
      const character = avatarType === 'talking_photo'
        ? { type: 'talking_photo', talking_photo_id: params.avatarId, scale: 0.35, offset: { x: 0.32, y: 0.32 }, talking_photo_style: 'circle' }
        : { type: 'avatar', avatar_id: params.avatarId, scale: 0.35, offset: { x: 0.32, y: 0.32 }, avatar_style: 'circle' };
      const background = scene.mode === 'slide'
        ? { type: 'image', image_asset_id: assetId, fit: 'contain' }
        : { type: 'video', video_asset_id: assetId, play_style: 'loop' };

      return { character, voice, background };
    })
  );

  const res = await fetch(`${HEYGEN_BASE_URL}/v2/video/generate`, {
    method: 'POST',
    headers: {
      'X-Api-Key': getApiKey(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      video_inputs: videoInputs,
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
