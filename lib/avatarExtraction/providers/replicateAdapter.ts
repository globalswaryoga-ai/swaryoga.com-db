import { VideoValidationInput, VideoValidationResult } from '../types';

export class ReplicateAdapter {
  private getApiToken(): string | null {
    return process.env.REPLICATE_API_TOKEN || null;
  }

  public isConfigured(): boolean {
    return Boolean(this.getApiToken());
  }

  public validateSourceVideo(input: VideoValidationInput): VideoValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    let qualityScore = 100;

    const format = input.format?.toLowerCase() || 'mp4';
    if (!['mp4', 'mov', 'webm'].includes(format)) {
      errors.push('Replicate LivePortrait/SadTalker requires MP4, MOV, or WebM format.');
      qualityScore -= 35;
    }

    if (input.fileSizeBytes && input.fileSizeBytes > 250 * 1024 * 1024) {
      warnings.push('File size exceeds 250MB. Processing may take several minutes.');
      qualityScore -= 15;
    }

    let resolutionLabel = '1080p Full HD';
    if (input.height) {
      if (input.height < 512) {
        errors.push('Resolution is too low (below 512px). Face extraction requires at least 720p.');
        qualityScore -= 40;
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
   * Initializes identity extraction and face alignment on Replicate.
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
    const token = this.getApiToken();
    if (!token) {
      return {
        providerJobId: '',
        status: 'failed',
        error: 'REPLICATE_API_TOKEN is not configured on the server.',
      };
    }

    try {
      // Create a Replicate prediction using SadTalker with GFPGAN face enhancer
      const res = await fetch('https://api.replicate.com/v1/predictions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          version: 'a6cb187228a01103c39a3fbbaf92e921d7b30f40fb178d6cb582ff655fdb60ec',
          input: {
            source_image: params.extractedFaceUrl,
            still: true,
            enhancer: 'gfpgan',
            preprocess: 'crop',
          },
        }),
      });

      const prediction = await res.json();
      if (res.status === 201 || res.status === 200) {
        return {
          providerJobId: prediction.id,
          providerAvatarId: `rep_live_${prediction.id}`,
          status: 'training',
        };
      }

      return {
        providerJobId: `rep_err_${Date.now()}`,
        status: 'failed',
        error: prediction?.detail || 'Replicate prediction failed to start',
      };
    } catch (err: any) {
      return {
        providerJobId: `rep_err_${Date.now()}`,
        status: 'failed',
        error: err.message || 'Failed to call Replicate API',
      };
    }
  }

  /**
   * Check status of Replicate prediction
   */
  public async checkJobStatus(predictionId: string): Promise<{
    status: 'completed' | 'training' | 'failed';
    outputUrl?: string;
    error?: string;
  }> {
    const token = this.getApiToken();
    if (!token) return { status: 'failed', error: 'REPLICATE_API_TOKEN is missing' };

    try {
      const res = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) return { status: 'failed', error: data?.detail || 'Failed to check status' };

      if (data.status === 'succeeded') {
        return {
          status: 'completed',
          outputUrl: typeof data.output === 'string' ? data.output : data.output?.[0],
        };
      } else if (data.status === 'failed' || data.status === 'canceled') {
        return { status: 'failed', error: data.error || 'Replicate job failed' };
      }

      return { status: 'training' };
    } catch (err: any) {
      return { status: 'failed', error: err.message };
    }
  }

  /**
   * Real AI Cutout: Removes background using cjwbw/rembg to extract isolated subject/avatar cutout
   */
  public async extractAvatarCutout(imageUrl: string): Promise<{
    predictionId?: string;
    outputUrl?: string;
    error?: string;
  }> {
    const token = this.getApiToken();
    if (!token) return { error: 'REPLICATE_API_TOKEN is not configured.' };

    try {
      const res = await fetch('https://api.replicate.com/v1/predictions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          version: 'fb8af171cfa1616ddcf1242c093f9c46bcada5ad4cf6f2fbe8b81b330ec5c003',
          input: { image: imageUrl },
        }),
      });

      const prediction = await res.json();
      if (!res.ok) {
        return { error: prediction?.detail || 'Cutout prediction failed to start' };
      }

      // If finished immediately
      if (prediction.status === 'succeeded' && prediction.output) {
        return {
          predictionId: prediction.id,
          outputUrl: typeof prediction.output === 'string' ? prediction.output : prediction.output?.[0],
        };
      }

      // Poll until finished (typically takes 2-4 seconds)
      const pollUrl = `https://api.replicate.com/v1/predictions/${prediction.id}`;
      for (let i = 0; i < 20; i++) {
        await new Promise((r) => setTimeout(r, 1500));
        const checkRes = await fetch(pollUrl, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const checkData = await checkRes.json();
        if (checkData.status === 'succeeded' && checkData.output) {
          return {
            predictionId: prediction.id,
            outputUrl: typeof checkData.output === 'string' ? checkData.output : checkData.output?.[0],
          };
        }
        if (checkData.status === 'failed' || checkData.status === 'canceled') {
          return { error: checkData.error || 'Cutout processing failed' };
        }
      }

      return { error: 'Cutout extraction timed out on Replicate' };
    } catch (err: any) {
      return { error: err.message || 'Failed to execute cutout extraction' };
    }
  }
}

export const replicateAdapter = new ReplicateAdapter();
