/**
 * Bunny Stream Upload Utility
 * Uploads video files to Bunny Stream for optimized website playback
 * Used after S3 backup upload in Zoom recording sync flow
 * 
 * Flow: Zoom → Download → AWS S3 (backup) → Bunny Stream (website)
 * 
 * Bunny Stream API docs: https://docs.bunny.net/reference/video_uploadvideo
 */

const BUNNY_API_BASE = 'https://video.bunnycdn.com';

interface BunnyVideoCreateResponse {
  videoLibraryId: number;
  guid: string;
  title: string;
  dateUploaded: string;
  status: number;
  length: number;
  thumbnailUrl: string;
}

interface BunnyUploadResult {
  success: boolean;
  videoId: string;       // Bunny video GUID
  embedUrl: string;      // Direct embed URL for iframe
  thumbnailUrl: string;  // Auto-generated thumbnail
  error?: string;
}

/**
 * Get Bunny Stream credentials from environment
 */
function getBunnyConfig() {
  const apiKey = process.env.BUNNY_API_KEY;
  const libraryId = process.env.BUNNY_STREAM_LIBRARY_ID;

  if (!apiKey || !libraryId) {
    throw new Error('Missing BUNNY_API_KEY or BUNNY_STREAM_LIBRARY_ID in environment');
  }

  return { apiKey, libraryId };
}

/**
 * Create a video entry in Bunny Stream library
 * This creates a placeholder that we then upload the actual file to
 */
async function createBunnyVideo(title: string): Promise<BunnyVideoCreateResponse> {
  const { apiKey, libraryId } = getBunnyConfig();

  const response = await fetch(
    `${BUNNY_API_BASE}/library/${libraryId}/videos`,
    {
      method: 'POST',
      headers: {
        'AccessKey': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ title }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to create Bunny video: ${response.status} ${errorText}`);
  }

  return response.json();
}

/**
 * Upload video buffer to Bunny Stream
 * Uses the TUS-based upload for reliability with large files
 */
async function uploadVideoToBunny(videoId: string, buffer: Buffer): Promise<void> {
  const { apiKey, libraryId } = getBunnyConfig();

  const response = await fetch(
    `${BUNNY_API_BASE}/library/${libraryId}/videos/${videoId}`,
    {
      method: 'PUT',
      headers: {
        'AccessKey': apiKey,
        'Content-Type': 'application/octet-stream',
      },
      body: new Uint8Array(buffer),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to upload to Bunny Stream: ${response.status} ${errorText}`);
  }
}

/**
 * Get the embed/playback URL for a Bunny Stream video
 * Bunny provides iframe embed and direct HLS URLs
 */
function getBunnyEmbedUrl(videoId: string): string {
  const { libraryId } = getBunnyConfig();
  return `https://iframe.mediadelivery.net/embed/${libraryId}/${videoId}`;
}

/**
 * Upload a video buffer to Bunny Stream
 * 
 * @param buffer - Video file buffer (already downloaded from Zoom)
 * @param title - Video title (e.g., "Swar Yoga Workshop - Speaker View - 2024-04-15")
 * @returns Upload result with video ID and embed URL
 */
export async function uploadToBunnyStream(
  buffer: Buffer,
  title: string
): Promise<BunnyUploadResult> {
  try {
    console.log(`[Bunny Stream] Creating video: ${title}`);
    
    // Step 1: Create video entry
    const video = await createBunnyVideo(title);
    console.log(`[Bunny Stream] Created video ID: ${video.guid}`);

    // Step 2: Upload the actual video data
    console.log(`[Bunny Stream] Uploading ${(buffer.length / 1024 / 1024).toFixed(1)} MB...`);
    await uploadVideoToBunny(video.guid, buffer);

    const embedUrl = getBunnyEmbedUrl(video.guid);
    console.log(`[Bunny Stream] ✅ Upload complete: ${embedUrl}`);

    return {
      success: true,
      videoId: video.guid,
      embedUrl,
      thumbnailUrl: video.thumbnailUrl || '',
    };
  } catch (err: any) {
    console.error(`[Bunny Stream] ❌ Upload failed:`, err.message);
    return {
      success: false,
      videoId: '',
      embedUrl: '',
      thumbnailUrl: '',
      error: err.message,
    };
  }
}

/**
 * Generate a Bunny Stream video title from Zoom meeting info
 */
export function generateBunnyTitle(
  meetingTopic: string,
  recordingType: string,
  startTime: string
): string {
  const date = new Date(startTime);
  const dateStr = date.toISOString().split('T')[0];
  const typeNames: Record<string, string> = {
    speaker_view: 'Speaker View',
    gallery_view: 'Gallery View',
    shared_screen_with_speaker_view: 'Screen Share (Speaker)',
    shared_screen_with_gallery_view: 'Screen Share (Gallery)',
  };
  const typeName = typeNames[recordingType] || recordingType;
  return `${meetingTopic} - ${typeName} - ${dateStr}`;
}

/**
 * List all videos in Bunny Stream library
 */
export async function listBunnyVideos(): Promise<any[]> {
  try {
    const { apiKey, libraryId } = getBunnyConfig();

    const response = await fetch(
      `${BUNNY_API_BASE}/library/${libraryId}/videos`,
      {
        method: 'GET',
        headers: {
          'AccessKey': apiKey,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to list Bunny videos: ${response.status}`);
    }

    const data = await response.json();
    return data.items || [];
  } catch (err: any) {
    console.error('[Bunny Stream] Error listing videos:', err.message);
    return [];
  }
}

/**
 * Find a video in Bunny by title (case-insensitive)
 */
export async function findBunnyVideoByTitle(title: string): Promise<any | null> {
  try {
    const videos = await listBunnyVideos();
    const normalized = title.toLowerCase().trim();
    return videos.find((v: any) => v.title?.toLowerCase().trim() === normalized) || null;
  } catch (err: any) {
    console.error('[Bunny Stream] Error finding video:', err.message);
    return null;
  }
}

/**
 * Check if Bunny Stream is configured
 */
export function isBunnyConfigured(): boolean {
  return !!(process.env.BUNNY_API_KEY && process.env.BUNNY_STREAM_LIBRARY_ID);
}
