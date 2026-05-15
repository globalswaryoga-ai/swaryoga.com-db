const BUNNY_STORAGE_ZONE = process.env.BUNNY_STORAGE_ZONE || 'swaryoga';
const BUNNY_STORAGE_API_KEY = process.env.BUNNY_STORAGE_API_KEY;
const BUNNY_CDN_URL = process.env.BUNNY_CDN_URL || 'https://swaryoga.b-cdn.net';

interface UploadResponse {
  success: boolean;
  url?: string;
  error?: string;
  bunnyId?: string;
}

/**
 * Upload file to Bunny Storage
 */
export async function uploadToBunny(
  file: Buffer | File,
  fileName: string,
  folder: string = 'ritucharya'
): Promise<UploadResponse> {
  try {
    if (!BUNNY_STORAGE_API_KEY) {
      return { success: false, error: 'Bunny API key not configured' };
    }

    // Convert File to Buffer if needed
    let fileBuffer: Buffer;
    if (file instanceof File) {
      fileBuffer = Buffer.from(await file.arrayBuffer());
    } else {
      fileBuffer = file;
    }

    // Create unique filename
    const timestamp = Date.now();
    const uniqueFileName = `${timestamp}-${fileName}`;
    const filePath = `${folder}/${uniqueFileName}`;

    // Upload to Bunny
    const response = await fetch(`https://storage.bunnycdn.com/${BUNNY_STORAGE_ZONE}/${filePath}`, {
      method: 'PUT',
      headers: {
        AccessKey: BUNNY_STORAGE_API_KEY,
        'Content-Type': 'application/octet-stream',
      },
      body: fileBuffer,
    });

    if (!response.ok) {
      const error = await response.text();
      return { success: false, error: `Upload failed: ${error}` };
    }

    // Construct CDN URL
    const cdnUrl = `${BUNNY_CDN_URL}/${filePath}`;

    return {
      success: true,
      url: cdnUrl,
      bunnyId: uniqueFileName,
    };
  } catch (error) {
    console.error('Bunny upload error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Upload image to Bunny
 */
export async function uploadImage(
  file: File | Buffer,
  fileName: string
): Promise<UploadResponse> {
  return uploadToBunny(file, fileName, 'ritucharya/images');
}

/**
 * Upload video to Bunny
 */
export async function uploadVideo(
  file: File | Buffer,
  fileName: string
): Promise<UploadResponse> {
  return uploadToBunny(file, fileName, 'ritucharya/videos');
}

/**
 * Upload PDF to Bunny
 */
export async function uploadPDF(
  file: File | Buffer,
  fileName: string
): Promise<UploadResponse> {
  return uploadToBunny(file, fileName, 'ritucharya/pdfs');
}

/**
 * Delete file from Bunny Storage
 */
export async function deleteFromBunny(filePath: string): Promise<UploadResponse> {
  try {
    if (!BUNNY_STORAGE_API_KEY) {
      return { success: false, error: 'Bunny API key not configured' };
    }

    const response = await fetch(`https://storage.bunnycdn.com/${BUNNY_STORAGE_ZONE}/${filePath}`, {
      method: 'DELETE',
      headers: {
        AccessKey: BUNNY_STORAGE_API_KEY,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      return { success: false, error: `Delete failed: ${error}` };
    }

    return { success: true };
  } catch (error) {
    console.error('Bunny delete error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Validate image file
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  const maxSize = 5 * 1024 * 1024; // 5MB

  if (!validTypes.includes(file.type)) {
    return { valid: false, error: 'Invalid image format. Use JPG, PNG, WebP, or GIF.' };
  }

  if (file.size > maxSize) {
    return { valid: false, error: 'Image size exceeds 5MB limit.' };
  }

  return { valid: true };
}

/**
 * Validate video file
 */
export function validateVideoFile(file: File): { valid: boolean; error?: string } {
  const validTypes = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'];
  const maxSize = 100 * 1024 * 1024; // 100MB

  if (!validTypes.includes(file.type)) {
    return { valid: false, error: 'Invalid video format. Use MP4, WebM, OGG, or MOV.' };
  }

  if (file.size > maxSize) {
    return { valid: false, error: 'Video size exceeds 100MB limit.' };
  }

  return { valid: true };
}

/**
 * Validate PDF file
 */
export function validatePDFFile(file: File): { valid: boolean; error?: string } {
  const maxSize = 20 * 1024 * 1024; // 20MB

  if (file.type !== 'application/pdf') {
    return { valid: false, error: 'File must be a PDF.' };
  }

  if (file.size > maxSize) {
    return { valid: false, error: 'PDF size exceeds 20MB limit.' };
  }

  return { valid: true };
}

export const BunnyConfig = {
  storageZone: BUNNY_STORAGE_ZONE,
  cdnUrl: BUNNY_CDN_URL,
  folders: {
    images: 'ritucharya/images',
    videos: 'ritucharya/videos',
    pdfs: 'ritucharya/pdfs',
  },
};
