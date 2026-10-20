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
  collectionId?: string;
}

export const BUNNY_STREAM_COLLECTIONS = {
  HINDI: process.env.BUNNY_STREAM_COLLECTION_HINDI || '563e0c4c-a1d4-490f-a5ba-f9b2073c51b5',
  ENGLISH: process.env.BUNNY_STREAM_COLLECTION_ENGLISH || '015d1b9e-1f88-4f83-b1cd-aaa3ffb0cfdb',
  MARATHI: process.env.BUNNY_STREAM_COLLECTION_MARATHI || '1c320b6a-d9f5-4ddf-9708-8601d05a838e',
};

export function getBunnyCollectionForTopic(topic: string = ''): string {
  const t = String(topic).toLowerCase();
  if (t.includes('marathi')) return BUNNY_STREAM_COLLECTIONS.MARATHI;
  if (t.includes('english')) return BUNNY_STREAM_COLLECTIONS.ENGLISH;
  if (t.includes('hindi')) return BUNNY_STREAM_COLLECTIONS.HINDI;
  return BUNNY_STREAM_COLLECTIONS.HINDI;
}

export interface BunnyUploadResult {
  success: boolean;
  videoId: string;       // Bunny video GUID
  playUrl: string;       // Direct standalone player URL for mobile/desktop browsers
  embedUrl: string;      // Direct embed URL for iframe
  thumbnailUrl: string;  // Auto-generated thumbnail
  error?: string;
}

/**
 * Get Bunny Stream credentials from environment
 */
function getBunnyConfig() {
  const apiKey = process.env.BUNNY_API_KEY;
  const libraryId = process.env.BUNNY_STREAM_LIBRARY_ID || '606386';

  if (!apiKey || !libraryId) {
    throw new Error('Missing BUNNY_API_KEY or BUNNY_STREAM_LIBRARY_ID in environment');
  }

  return { apiKey, libraryId };
}

/**
 * Create a video entry in Bunny Stream library with optional collection assignment
 */
async function createBunnyVideo(title: string, collectionId?: string): Promise<BunnyVideoCreateResponse> {
  const { apiKey, libraryId } = getBunnyConfig();

  const response = await fetch(
    `${BUNNY_API_BASE}/library/${libraryId}/videos`,
    {
      method: 'POST',
      headers: {
        'AccessKey': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title,
        ...(collectionId ? { collectionId } : {}),
      }),
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
 * Direct standalone playback URL (players on mobile & desktop)
 */
export function getBunnyPlayUrl(videoId: string): string {
  const { libraryId } = getBunnyConfig();
  return `https://iframe.mediadelivery.net/play/${libraryId}/${videoId}`;
}

/**
 * Get the embed/playback URL for an iframe
 */
export function getBunnyEmbedUrl(videoId: string): string {
  const { libraryId } = getBunnyConfig();
  return `https://iframe.mediadelivery.net/embed/${libraryId}/${videoId}`;
}

/**
 * Upload a video buffer to Bunny Stream
 * 
 * @param buffer - Video file buffer (already downloaded from Zoom)
 * @param title - Video title (e.g., "Swar Yoga Workshop - Speaker View - 2024-04-15")
 * @param collectionId - Target Bunny Stream collection ID (Hindi, English, or Marathi)
 * @returns Upload result with video ID, playUrl and embedUrl
 */
export async function uploadToBunnyStream(
  buffer: Buffer,
  title: string,
  collectionId?: string
): Promise<BunnyUploadResult> {
  try {
    console.log(`[Bunny Stream] Creating video: ${title} (Collection: ${collectionId || 'default'})`);
    
    // Step 1: Create video entry in designated collection
    const video = await createBunnyVideo(title, collectionId);
    console.log(`[Bunny Stream] Created video ID: ${video.guid} in collection ${video.collectionId || collectionId || 'none'}`);

    // Step 2: Upload the actual video data
    console.log(`[Bunny Stream] Uploading ${(buffer.length / 1024 / 1024).toFixed(1)} MB...`);
    await uploadVideoToBunny(video.guid, buffer);

    const playUrl = getBunnyPlayUrl(video.guid);
    const embedUrl = getBunnyEmbedUrl(video.guid);
    console.log(`[Bunny Stream] ✅ Upload complete. Direct URL: ${playUrl}`);

    return {
      success: true,
      videoId: video.guid,
      playUrl,
      embedUrl,
      thumbnailUrl: video.thumbnailUrl || '',
    };
  } catch (err: any) {
    console.error(`[Bunny Stream] ❌ Upload failed:`, err.message);
    return {
      success: false,
      videoId: '',
      playUrl: '',
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
