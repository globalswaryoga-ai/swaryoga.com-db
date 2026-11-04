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
  const apiKey = getApiKey();
  const scenes = parseScriptScenes(params.script);
  const isMultiScene = scenes.length > 1;

  // For single-scene avatar scripts, use HeyGen v3 API with Avatar V (highest quality neural digital twin)
  if (!isMultiScene) {
    try {
      const v3Payload: any = {
        type: 'avatar',
        avatar_id: params.avatarId || '11236c340a0f4ece98638134c021b166',
        script: params.script,
        voice_id: params.voiceId || '43961498a7894b25be7eb6c3382b6502',
        title: `Avatar Video - ${new Date().toISOString().slice(0, 10)}`,
        resolution: (params.height && params.height >= 1080) ? '1080p' : '720p',
        aspect_ratio: 'auto',
        engine: { type: 'avatar_v' },
      };

      const res = await fetch(`${HEYGEN_BASE_URL}/v3/videos`, {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(v3Payload),
      });

      const data = await res.json();
      if (res.ok && data?.data?.video_id) {
        return data.data.video_id;
      }

      // If credit issue, provide clear user-friendly guidance
      if (data?.error?.code === 'insufficient_credit' || res.status === 402) {
        throw new Error('HeyGen Notice: Insufficient credits in HeyGen account (swarsakshi9@gmail.com). Please purchase credit packs at app.heygen.com/settings?nav=Billing to render new custom videos.');
      }

      // If avatar_v is not supported for this particular avatar, retry with avatar_iv
      if (data?.error?.message?.includes('engine') || data?.error?.param === 'engine') {
        const fallbackRes = await fetch(`${HEYGEN_BASE_URL}/v3/videos`, {
          method: 'POST',
          headers: {
            'x-api-key': apiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ ...v3Payload, engine: { type: 'avatar_iv' } }),
        });
        const fallbackData = await fallbackRes.json();
        if (fallbackRes.ok && fallbackData?.data?.video_id) {
          return fallbackData.data.video_id;
        }
      }

      // If error is not a fallback case, log and fall through to v2
      console.warn('HeyGen v3 submit failed, attempting v2 fallback:', data?.error?.message || res.statusText);
    } catch (v3Err: any) {
      if (v3Err.message?.includes('Insufficient credits')) throw v3Err;
      console.warn('HeyGen v3 error:', v3Err.message);
    }
  }

  // Fallback to HeyGen v2 multi-scene endpoint
  const avatarType = params.avatarType || 'avatar';
  const videoInputs = await Promise.all(
    scenes.map(async (scene) => {
      const voice = { type: 'text', input_text: scene.text, voice_id: params.voiceId };

      if (scene.mode === 'avatar') {
        const character = avatarType === 'talking_photo'
          ? { type: 'talking_photo', talking_photo_id: params.avatarId }
          : { type: 'avatar', avatar_id: params.avatarId };
        return { character, voice };
      }

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
      'X-Api-Key': apiKey,
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

// HeyGen renders asynchronously on their own infra — this checks status via v3 or v1
export async function checkVideoStatus(heygenVideoId: string): Promise<HeyGenStatus> {
  const apiKey = getApiKey();

  // Try HeyGen v3 status endpoint first
  try {
    const v3Res = await fetch(`${HEYGEN_BASE_URL}/v3/videos/${encodeURIComponent(heygenVideoId)}`, {
      headers: { 'x-api-key': apiKey },
    });
    if (v3Res.ok) {
      const v3Data = await v3Res.json();
      const item = v3Data?.data;
      if (item) {
        const raw = item.status;
        const status: HeyGenStatus['status'] =
          raw === 'completed' ? 'completed' : raw === 'failed' ? 'failed' : 'processing';
        return {
          status,
          videoUrl: item.video_url,
          errorMessage: item.error_message || item.failed_reason,
        };
      }
    }
  } catch (v3Err) {
    console.warn('HeyGen v3 status check error:', v3Err);
  }

  // Fallback to legacy v1 status check
  const res = await fetch(`${HEYGEN_BASE_URL}/v1/video_status.get?video_id=${encodeURIComponent(heygenVideoId)}`, {
    headers: { 'X-Api-Key': apiKey },
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
