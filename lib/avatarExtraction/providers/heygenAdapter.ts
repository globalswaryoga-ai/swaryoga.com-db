import { VideoValidationInput, VideoValidationResult, FaceBiometrics } from '../types';

const HEYGEN_BASE_URL = 'https://api.heygen.com';
const HEYGEN_UPLOAD_URL = 'https://upload.heygen.com';

export class HeyGenAdapter {
  private getApiKey(): string | null {
    return process.env.HEYGEN_API_KEY || null;
  }

  public isConfigured(): boolean {
    return Boolean(this.getApiKey());
  }

  public validateSourceVideo(input: VideoValidationInput): VideoValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    let qualityScore = 100;

    const format = input.format?.toLowerCase() || 'mp4';
    if (!['mp4', 'mov', 'webm'].includes(format)) {
      errors.push('HeyGen requires MP4, MOV, or WebM video format.');
      qualityScore -= 40;
    }

    if (input.fileSizeBytes && input.fileSizeBytes > 500 * 1024 * 1024) {
      errors.push('Video exceeds HeyGen 500MB file limit.');
      qualityScore -= 30;
    }

    if (input.durationSeconds) {
      if (input.durationSeconds < 5) {
        errors.push('Video must be at least 5 seconds long for identity registration.');
        qualityScore -= 30;
      } else if (input.durationSeconds > 600) {
        warnings.push('Videos over 10 minutes may take longer to process on HeyGen.');
        qualityScore -= 10;
      }
    }

    let resolutionLabel = '1080p Full HD';
    if (input.height) {
      if (input.height < 720) {
        warnings.push('Resolution is below 720p. 1080p is recommended for sharp facial details.');
        resolutionLabel = `${input.height}p`;
        qualityScore -= 20;
      } else if (input.height >= 2160) {
        resolutionLabel = '4K Ultra HD';
      } else if (input.height >= 1080) {
        resolutionLabel = '1080p Full HD';
      } else {
        resolutionLabel = '720p HD';
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      qualityScore: Math.max(10, qualityScore),
      resolutionLabel,
    };
  }

  /**
   * Fetches official avatars already trained in HeyGen account (e.g. Mohan Kalburgi)
   */
  public async fetchExistingAvatars(): Promise<Array<{ id: string; name: string; previewImageUrl: string; previewVideoUrl?: string }>> {
    const apiKey = this.getApiKey();
    if (!apiKey) return [];

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(`${HEYGEN_BASE_URL}/v2/avatars`, {
        headers: { 'X-Api-Key': apiKey },
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!res.ok) return [];
      const data = await res.json();
      const avatars = data?.data?.avatars || [];

      return avatars.map((a: any) => ({
        id: a.avatar_id,
        name: a.avatar_name || a.name || 'HeyGen Avatar',
        previewImageUrl: a.preview_image_url || '',
        previewVideoUrl: a.preview_video_url || '',
      }));
    } catch (err) {
      console.warn('HeyGen fetchExistingAvatars error:', err);
      return [];
    }
  }

  /**
   * Register a new avatar on HeyGen using the extracted high-res face frame or source video.
   */
  public async createAvatar(params: {
    avatarName: string;
    sourceVideoUrl: string;
    extractedFaceUrl: string;
  }): Promise<{
    providerJobId: string;
    providerAvatarId?: string;
    status: 'completed' | 'training' | 'failed';
    error?: string;
  }> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      return {
        providerJobId: '',
        status: 'failed',
        error: 'HEYGEN_API_KEY environment variable is not configured on the server.',
      };
    }

    // First check if an avatar with this name or Mohan Kalburgi already exists in HeyGen
    const existing = await this.fetchExistingAvatars();
    const matched = existing.find(
      (a) =>
        a.name.toLowerCase().includes('mohan') ||
        a.name.toLowerCase() === params.avatarName.toLowerCase()
    );

    if (matched) {
      return {
        providerJobId: `heygen_linked_${matched.id}`,
        providerAvatarId: matched.id,
        status: 'completed',
      };
    }

    // Try creating a talking photo avatar from the extracted face image on HeyGen
    try {
      const faceRes = await fetch(params.extractedFaceUrl);
      if (!faceRes.ok) throw new Error('Could not download extracted face image from storage');
      const imageBuffer = Buffer.from(await faceRes.arrayBuffer());

      const uploadRes = await fetch(`${HEYGEN_UPLOAD_URL}/v1/talking_photo`, {
        method: 'POST',
        headers: {
          'X-Api-Key': apiKey,
          'Content-Type': 'image/jpeg',
        },
        body: imageBuffer,
      });

      const uploadData = await uploadRes.json();
      if (uploadRes.ok && uploadData?.data?.talking_photo_id) {
        return {
          providerJobId: uploadData.data.talking_photo_id,
          providerAvatarId: uploadData.data.talking_photo_id,
          status: 'completed',
        };
      }

      // If HeyGen requires specific enterprise API credits or consent video:
      const msg = uploadData?.message || uploadData?.msg || 'HeyGen rejected talking photo creation';
      return {
        providerJobId: `heygen_err_${Date.now()}`,
        status: 'failed',
        error: `HeyGen Notice: ${msg}. (Tip: Mohan Kalburgi's verified HeyGen avatar ID '11236c340a0f4ece98638134c021b166' is available in your account)`,
      };
    } catch (err: any) {
      return {
        providerJobId: `heygen_err_${Date.now()}`,
        status: 'failed',
        error: `HeyGen API request error: ${err.message || err}`,
      };
    }
  }
}

export const heygenAdapter = new HeyGenAdapter();
