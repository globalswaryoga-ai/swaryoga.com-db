/**
 * Bunny Edge Storage - Full storage solution replacing AWS S3
 *
 * Drop-in replacement for lib/aws-s3.ts - all exports are API-compatible.
 *
 * Setup:
 * 1. Create a Storage Zone in Bunny.net dashboard
 * 2. Enable a connected Pull Zone for CDN delivery
 * 3. Set environment variables:
 *    - BUNNY_STORAGE_ZONE_NAME
 *    - BUNNY_STORAGE_API_KEY  (from FTP & API Access)
 *    - BUNNY_STORAGE_CDN_HOST (e.g. yourzone.b-cdn.net)
 *    - BUNNY_STORAGE_REGION   (de | ny | la | sg | syd)
 *    - BUNNY_CDN_TOKEN_KEY    (optional - for signed/private URLs)
 *    - BUNNY_STREAM_LIBRARY_ID (for Sadhana/Stream video uploads - e.g. 638748)
 *    - BUNNY_API_KEY (for Stream API calls)
 */

import { createHash } from 'crypto';

// ============================================
// CONFIGURATION
// ============================================

const REGION_HOSTS: Record<string, string> = {
  de: 'storage.bunnycdn.com',
  ny: 'ny.storage.bunnycdn.com',
  la: 'la.storage.bunnycdn.com',
  sg: 'sg.storage.bunnycdn.com',
  syd: 'syd.storage.bunnycdn.com',
};

export function isBunnyStorageConfigured(): boolean {
  return !!(
    process.env.BUNNY_STORAGE_ZONE_NAME &&
    process.env.BUNNY_STORAGE_API_KEY &&
    process.env.BUNNY_STORAGE_CDN_HOST
  );
}

function getStorageHost(): string {
  const region = process.env.BUNNY_STORAGE_REGION || 'de';
  return REGION_HOSTS[region] || REGION_HOSTS.de;
}

function getCDNHost(): string {
  return process.env.BUNNY_STORAGE_CDN_HOST || '';
}

/**
 * Get the base URL for the app (used for proxy URLs).
 * In production, uses NEXT_PUBLIC_BASE_URL or VERCEL_URL.
 * Falls back to localhost for development.
 */
function getAppBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_BASE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '') ||
    'http://localhost:3000'
  );
}

/**
 * Build a publicly accessible URL for a storage file.
 * Uses CDN URL if CDN is working, otherwise uses the app's proxy endpoint.
 * Set BUNNY_CDN_SUSPENDED=true to force proxy mode.
 */
export function getPublicFileUrl(storageKey: string): string {
  const cdnHost = getCDNHost();
  const cleanKey = storageKey.replace(/^\/+/, '');

  // If CDN is explicitly marked as suspended or not configured, use proxy
  const cdnSuspended = process.env.BUNNY_CDN_SUSPENDED === 'true' || !cdnHost;
  if (cdnSuspended) {
    const base = getAppBaseUrl();
    return `${base}/api/media/bunny/${cleanKey}`;
  }

  return `https://${cdnHost}/${cleanKey}`;
}

function getZoneName(): string {
  return process.env.BUNNY_STORAGE_ZONE_NAME || '';
}

function getApiKey(): string {
  // BUNNY_STORAGE_KEY is the fallback in case BUNNY_STORAGE_API_KEY is placeholder
  const key = process.env.BUNNY_STORAGE_API_KEY || process.env.BUNNY_STORAGE_KEY || '';
  // Reject placeholder values
  if (key === 'your_bunny_api_key_here') return process.env.BUNNY_STORAGE_KEY || '';
  return key;
}

function ensureConfigured() {
  const zoneName = getZoneName();
  const apiKey = getApiKey();
  const cdnHost = getCDNHost();
  if (!zoneName || !apiKey || !cdnHost) {
    throw new Error(
      'Bunny Storage not configured. Set BUNNY_STORAGE_ZONE_NAME, BUNNY_STORAGE_API_KEY, BUNNY_STORAGE_CDN_HOST in .env.local'
    );
  }
  return { zoneName, apiKey, cdnHost };
}

// ============================================
// CONTENT TYPE DETECTION
// ============================================

/** Determine subfolder for content-cache based on file extension */
const IMAGE_EXTENSIONS = new Set(['jpg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico', 'tif']);
const DOCUMENT_EXTENSIONS = new Set(['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'csv', 'rtf', 'odt', 'ods']);
const VIDEO_EXTENSIONS = new Set(['mp4', 'webm', 'mov', 'avi', 'mkv', 'mpg', 'wmv']);

function getContentSubfolder(ext: string): string {
  if (IMAGE_EXTENSIONS.has(ext)) return 'Images/';
  if (DOCUMENT_EXTENSIONS.has(ext)) return 'Documents/';
  if (VIDEO_EXTENSIONS.has(ext)) return 'screenshots/'; // videos & screen recordings
  return ''; // other types stay in root
}

function getContentType(fileName: string): string {
  const ext = fileName.toLowerCase().split('.').pop();
  const contentTypes: Record<string, string> = {
    jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif',
    webp: 'image/webp', svg: 'image/svg+xml',
    mp4: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime', avi: 'video/x-msvideo',
    pdf: 'application/pdf', doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    txt: 'text/plain', json: 'application/json', zip: 'application/zip',
    mp3: 'audio/mpeg', ogg: 'audio/ogg', wav: 'audio/wav',
  };
  return contentTypes[ext || ''] || 'application/octet-stream';
}

// ============================================
// CORE STORAGE OPERATIONS
// ============================================

/**
 * Upload a file buffer to Bunny Storage (content-addressed for de-duplication)
 * Drop-in replacement for uploadToS3()
 * @returns CDN URL of the uploaded file
 */
export async function uploadToBunnyStorage(
  fileBuffer: Buffer,
  fileName: string,
  options: S3UploadOptions = {}
): Promise<string> {
  const { zoneName, apiKey, cdnHost } = ensureConfigured();
  const storageHost = getStorageHost();

  // Content-addressed de-duplication (same as S3 version)
  const hash = createHash('md5').update(fileBuffer).digest('hex');
  const rawExt = (fileName.split('.').pop() || '').toLowerCase();
  // Normalize common extension aliases to prevent duplicates (e.g. jpeg→jpg)
  const EXTENSION_ALIASES: Record<string, string> = {
    jpeg: 'jpg', jfif: 'jpg', tiff: 'tif', htm: 'html', mpeg: 'mpg',
  };
  const extension = EXTENSION_ALIASES[rawExt] || rawExt;

  // Organize files into subfolders by type
  const subfolder = getContentSubfolder(extension);
  const contentKey = `uploads/content-cache/${subfolder}${hash}.${extension}`;

  // Check if already exists by trying a HEAD-like GET (Bunny doesn't have HEAD)
  const checkUrl = `https://${storageHost}/${zoneName}/${contentKey}`;
  try {
    const checkRes = await fetch(checkUrl, {
      method: 'GET',
      headers: { AccessKey: apiKey, Range: 'bytes=0-0' },
    });
    if (checkRes.ok || checkRes.status === 206) {
      const publicUrl = getPublicFileUrl(contentKey);
      console.log(`♻️  File content already exists in Bunny, reusing: ${publicUrl}`);
      return publicUrl;
    }
  } catch {
    // File doesn't exist, proceed with upload
  }

  const contentType = options.contentType || getContentType(fileName);
  const url = `https://${storageHost}/${zoneName}/${contentKey}`;

  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      AccessKey: apiKey,
      'Content-Type': contentType,
    },
    body: new Uint8Array(fileBuffer),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Bunny Storage upload failed (${res.status}): ${text}`);
  }

  const publicUrl = getPublicFileUrl(contentKey);
  console.log(`✅ Uploaded to Bunny Storage: ${publicUrl}`);
  return publicUrl;
}

// Alias: drop-in for aws-s3 uploadToS3
export const uploadToS3 = uploadToBunnyStorage;

/**
 * Upload to a specific path (without content-addressing)
 */
async function uploadToPath(
  fileBuffer: Buffer,
  path: string,
  contentType?: string
): Promise<string> {
  const { zoneName, apiKey, cdnHost } = ensureConfigured();
  const storageHost = getStorageHost();
  const cleanPath = path.replace(/^\/+/, '');
  const url = `https://${storageHost}/${zoneName}/${cleanPath}`;

  const headers: Record<string, string> = { AccessKey: apiKey };
  if (contentType) headers['Content-Type'] = contentType;

  const res = await fetch(url, { method: 'PUT', headers, body: new Uint8Array(fileBuffer) });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Bunny Storage upload failed (${res.status}): ${text}`);
  }

  return getPublicFileUrl(cleanPath);
}

/**
 * Delete a file from Bunny Storage
 * Drop-in replacement for deleteFromS3()
 */
export async function deleteFromBunnyStorage(key: string, _bucket?: string): Promise<boolean> {
  const { zoneName, apiKey } = ensureConfigured();
  const storageHost = getStorageHost();
  const cleanPath = key.replace(/^\/+/, '');
  const url = `https://${storageHost}/${zoneName}/${cleanPath}`;

  try {
    const res = await fetch(url, {
      method: 'DELETE',
      headers: { AccessKey: apiKey },
    });
    if (!res.ok && res.status !== 404) {
      console.error(`❌ Bunny Storage delete failed (${res.status})`);
      return false;
    }
    return true;
  } catch (error) {
    console.error('❌ Bunny Storage delete error:', error);
    return false;
  }
}

// Alias: drop-in for aws-s3 deleteFromS3
export const deleteFromS3 = deleteFromBunnyStorage;

/**
 * List files in a Bunny Storage directory
 * Drop-in replacement for S3 ListObjectsV2
 */
export async function listFiles(
  prefix: string
): Promise<{ key: string; size: number; lastModified: Date }[]> {
  const { zoneName, apiKey } = ensureConfigured();
  const storageHost = getStorageHost();
  const cleanPath = prefix.replace(/^\/+/, '').replace(/\/?$/, '/');
  const url = `https://${storageHost}/${zoneName}/${cleanPath}`;

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { AccessKey: apiKey, Accept: 'application/json' },
    });
    if (!res.ok) return [];
    const items: any[] = await res.json();
    return items
      .filter((item: any) => !item.IsDirectory)
      .map((item: any) => ({
        key: `${cleanPath}${item.ObjectName}`,
        size: item.Length || 0,
        lastModified: new Date(item.LastChanged || item.DateCreated),
      }));
  } catch (error) {
    console.error('❌ Bunny Storage list error:', error);
    return [];
  }
}

// ============================================
// DUPLICATE PREVENTION (for images & files)
// ============================================

/**
 * Check if a file exists in Bunny Storage by path
 */
export async function fileExists(storageKey: string): Promise<boolean> {
  try {
    const result = await fetchFromStorage(storageKey);
    return !!result.buffer;
  } catch (err) {
    return false;
  }
}

/**
 * Find a file by name (case-insensitive) in a prefix/category
 * Used to prevent duplicate image/thumbnail uploads
 */
export async function findFileByName(
  fileName: string,
  prefix: string = 'uploads'
): Promise<string | null> {
  try {
    const files = await listFiles(prefix);
    const normalized = fileName.toLowerCase().trim();

    const found = files.find(
      (f: any) => f.key?.split('/').pop()?.toLowerCase().trim() === normalized
    );

    if (found) {
      return found.key;
    }

    return null;
  } catch (err) {
    console.error('[Bunny Storage] Error finding file:', err);
    return null;
  }
}

/**
 * Check if a file with the same size exists (for deduplication)
 * Helps identify potentially identical files
 */
export async function findFilesBySize(
  fileSize: number,
  prefix: string = 'uploads'
): Promise<string[]> {
  try {
    const files = await listFiles(prefix);

    return files
      .filter((f: any) => f.size === fileSize)
      .map((f: any) => f.key);
  } catch (err) {
    console.error('[Bunny Storage] Error finding files by size:', err);
    return [];
  }
}

// ============================================
// URL GENERATION (replaces S3 presigned URLs)
// ============================================

/**
 * Generate a CDN URL for a file.
 * If BUNNY_CDN_TOKEN_KEY is set, generates a token-authenticated URL.
 * Falls back to storage API direct download URL when CDN is not available.
 * Drop-in replacement for generatePresignedUrl()
 */
export async function generatePresignedUrl(
  key: string,
  options: S3PresignedUrlOptions = {}
): Promise<string> {
  const cdnHost = getCDNHost();
  if (!cdnHost) throw new Error('Bunny CDN host not configured');

  const cleanKey = key.replace(/^\/+/, '');
  const tokenKey = process.env.BUNNY_CDN_TOKEN_KEY;

  if (tokenKey) {
    // Token-authenticated URL (for private content)
    const expiresIn = options.expiresIn || 3600;
    const expiry = Math.floor(Date.now() / 1000) + expiresIn;
    const path = `/${cleanKey}`;
    const hashableBase = `${tokenKey}${path}${expiry}`;
    const token = createHash('sha256').update(hashableBase).digest('base64url');
    return `https://${cdnHost}${path}?token=${token}&expires=${expiry}`;
  }

  // Public CDN URL
  return `https://${cdnHost}/${cleanKey}`;
}

/**
 * Generate a direct storage download URL (bypasses CDN).
 * Useful when CDN Pull Zone is not configured or returns 403.
 * This URL is proxied through the Bunny Storage API.
 */
export function generateDirectStorageUrl(key: string): string {
  const { zoneName } = ensureConfigured();
  const storageHost = getStorageHost();
  const cleanKey = key.replace(/^\/+/, '');
  return `https://${storageHost}/${zoneName}/${cleanKey}`;
}

/**
 * Fetch a file from Bunny Storage directly (server-side only, requires API key).
 * Use this when CDN returns 403 (Pull Zone not configured).
 */
export async function fetchFromStorage(key: string): Promise<{ buffer: Buffer; contentType: string }> {
  const { zoneName, apiKey } = ensureConfigured();
  const storageHost = getStorageHost();
  const cleanKey = key.replace(/^\/+/, '');
  const url = `https://${storageHost}/${zoneName}/${cleanKey}`;
  
  const res = await fetch(url, {
    headers: { AccessKey: apiKey },
  });
  
  if (!res.ok) {
    throw new Error(`Failed to fetch from storage (${res.status})`);
  }
  
  const arrayBuffer = await res.arrayBuffer();
  const contentType = res.headers.get('content-type') || getContentType(key);
  return { buffer: Buffer.from(arrayBuffer), contentType };
}

/**
 * Generate a "presigned upload URL" - for Bunny this returns the storage API URL
 * that the client can PUT to directly (with the API key in header).
 * In practice, prefer server-side uploads via uploadToBunnyStorage().
 * Drop-in replacement for generateUploadUrl()
 */
export async function generateUploadUrl(
  fileName: string,
  contentType: string,
  options: S3PresignedUrlOptions = {}
): Promise<string> {
  const { zoneName, cdnHost } = ensureConfigured();
  const storageHost = getStorageHost();
  const cleanPath = fileName.replace(/^\/+/, '');
  // Return the storage upload URL - client will need AccessKey header
  return `https://${storageHost}/${zoneName}/${cleanPath}`;
}

// ============================================
// TYPES (compatible with aws-s3.ts)
// ============================================

export type S3AccessLevel = 'public' | 'admin' | 'community';

export interface S3UploadOptions {
  bucket?: string;       // ignored (Bunny uses storage zones)
  acl?: string;          // ignored (Bunny uses Pull Zone settings)
  metadata?: Record<string, string>; // stored as part of path structure
  accessLevel?: S3AccessLevel;
  communityId?: string;
  contentType?: string;
}

export interface S3PresignedUrlOptions {
  bucket?: string;       // ignored
  expiresIn?: number;    // seconds, default 3600
}

// ============================================
// PATH BUILDERS
// ============================================

/**
 * Build storage path for organized file storage
 * Drop-in replacement for buildS3Path()
 */
export function buildS3Path(category: string, subcategory?: string, fileName?: string): string {
  const parts = ['swaryoga', category];
  if (subcategory) parts.push(subcategory);
  if (fileName) parts.push(fileName);
  return parts.join('/');
}

/**
 * Generate a unique file path for CRM media uploads
 */
export function generateCRMMediaPath(fileName: string, chatId?: string): string {
  const timestamp = Date.now();
  const rand = Math.random().toString(36).substring(2, 8);
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_').substring(0, 50);
  const folder = chatId ? `crm-media/${chatId}` : 'crm-media/general';
  return `${folder}/${timestamp}-${rand}-${safeName}`;
}

/**
 * Extract storage key from a CDN URL
 * Drop-in replacement for extractS3Key()
 */
export function extractS3Key(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.pathname.slice(1); // remove leading /
  } catch {
    return url;
  }
}

// Alias
export const extractStorageKey = extractS3Key;

// ============================================
// TEMPLATE FILE FUNCTIONS
// ============================================

const MAX_IMAGE_SIZE = 25 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export function validateTemplateFile(
  file: Buffer,
  mimeType: string,
  fileType: string
): { valid: boolean; error?: string } {
  if (fileType === 'image' && file.length > MAX_IMAGE_SIZE)
    return { valid: false, error: 'Image too large (Max 25MB)' };
  if (fileType === 'image' && !ALLOWED_IMAGE_TYPES.includes(mimeType))
    return { valid: false, error: 'Unsupported image type' };
  return { valid: true };
}

/**
 * Generate storage path for template files.
 * Structure: templates/{ownerId}/{templateId}/{timestamp}-{sanitizedFileName}
 * - ownerId: admin username or tenant ID (folder per user/admin)
 * - templateId: ID of the template (subfolder)
 * - timestamp: ensures uniqueness
 */
export function generateTemplateS3Key(id: string, name: string, type: string, ownerId?: string): string {
  const sanitized = name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const owner = ownerId ? String(ownerId).replace(/[^a-zA-Z0-9._-]/g, '_') : 'shared';
  return `templates/${owner}/${id}/${Date.now()}-${sanitized}`;
}

export async function uploadTemplateFileToS3(options: {
  file: Buffer;
  fileName: string;
  mimeType?: string;
  fileType: 'image' | 'document' | 'video';
  templateId: string;
  tenantId?: string;  // used as ownerId (admin username or tenant ID)
}): Promise<string> {
  const key = generateTemplateS3Key(options.templateId, options.fileName, options.fileType, options.tenantId);
  return await uploadToPath(options.file, key, options.mimeType);
}

export async function deleteTemplateFileFromS3(url: string): Promise<boolean> {
  const key = extractS3Key(url);
  return await deleteFromBunnyStorage(key);
}

export async function deleteTemplateFilesFromS3(urls: string[]): Promise<boolean> {
  for (const url of urls) {
    await deleteTemplateFileFromS3(url);
  }
  return true;
}

export function isValidS3Url(url: string): boolean {
  const cdnHost = getCDNHost();
  return url.includes('amazonaws.com') || (!!cdnHost && url.includes(cdnHost));
}

// ============================================
// BUNNY STREAM VIDEO UPLOADS (Sadhana Videos)
// ============================================

/**
 * Upload video to Bunny Stream library (for Sadhana scheduler)
 * Returns direct CDN stream URL: https://vz-{libraryId}.bunnycdn.com/{videoGuid}.mp4
 * 
 * Usage:
 *   const streamUrl = await uploadToBunnyStream(buffer, 'sadhana-video.mp4', 'Sadhana Video', 'sadhana');
 * 
 * @param fileBuffer - Video file buffer
 * @param fileName - Original filename
 * @param title - Video title in Bunny
 * @param collection - Collection/folder name (e.g., 'sadhana') - optional
 */
export async function uploadToBunnyStream(
  fileBuffer: Buffer,
  fileName: string,
  title: string,
  collection?: string
): Promise<string> {
  const libraryId = process.env.BUNNY_STREAM_LIBRARY_ID;
  const apiKey = process.env.BUNNY_API_KEY;

  if (!libraryId || !apiKey) {
    throw new Error('BUNNY_STREAM_LIBRARY_ID and BUNNY_API_KEY not configured');
  }

  try {
    // Step 1: Create video object in library with collection/category
    const collectionLabel = collection ? ` in "${collection}" collection` : '';
    console.log(`[Bunny Stream] Creating video "${title}"${collectionLabel} in library ${libraryId}...`);

    const videoPayload: any = { title };
    
    // Add collection as a tag/category if specified
    if (collection) {
      videoPayload.collectionId = collection; // Bunny may organize by collectionId
      videoPayload.metaTags = [`collection:${collection}`, 'sadhana']; // Add metadata tags
    }

    const createResponse = await fetch(
      `https://api.bunny.net/videolibrary/${libraryId}/videos`,
      {
        method: 'POST',
        headers: {
          'AccessKey': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(videoPayload),
      }
    );

    if (!createResponse.ok) {
      throw new Error(`Failed to create video: ${createResponse.statusText}`);
    }

    const videoData = await createResponse.json();
    const videoGuid = videoData.guid;

    console.log(`[Bunny Stream] ✅ Video created with GUID: ${videoGuid}`);

    // Step 2: Upload video file to the video object
    console.log(`[Bunny Stream] Uploading file (${Math.round(fileBuffer.length / 1024 / 1024)} MB)...`);

    const uploadResponse = await fetch(
      `https://api.bunny.net/videolibrary/${libraryId}/videos/${videoGuid}`,
      {
        method: 'PUT',
        headers: {
          'AccessKey': apiKey,
          'Content-Type': 'application/octet-stream',
        },
        body: fileBuffer,
      }
    );

    if (!uploadResponse.ok) {
      throw new Error(`Failed to upload video: ${uploadResponse.statusText}`);
    }

    console.log(`[Bunny Stream] ✅ Video file uploaded successfully`);

    // Step 3: Return direct CDN stream URL
    const streamUrl = `https://vz-${libraryId}.bunnycdn.com/${videoGuid}.mp4`;
    console.log(`[Bunny Stream] 🎬 Stream URL: ${streamUrl}`);

    return streamUrl;
  } catch (error: any) {
    console.error('[Bunny Stream] Upload error:', error.message);
    throw error;
  }
}

// ============================================
// ACCESS-CONTROLLED UPLOAD FUNCTIONS
// ============================================

/**
 * Upload PUBLIC file - accessible by anyone via CDN
 * Path: public/{type}/{timestamp}-{filename}
 */
export async function uploadPublicFile(
  fileBuffer: Buffer,
  fileName: string,
  fileType: 'images' | 'documents' | 'videos' = 'images'
): Promise<string> {
  const key = `public/${fileType}/${Date.now()}-${fileName}`;
  return await uploadToPath(fileBuffer, key, getContentType(fileName));
}

/**
 * Upload ADMIN-ONLY file
 * Path: admin/{type}/{timestamp}-{filename}
 */
export async function uploadAdminFile(
  fileBuffer: Buffer,
  fileName: string,
  fileType: 'images' | 'documents' | 'videos' | 'reports' = 'documents'
): Promise<string> {
  const key = `admin/${fileType}/${Date.now()}-${fileName}`;
  return await uploadToPath(fileBuffer, key, getContentType(fileName));
}

/**
 * Upload COMMUNITY file
 * Path: community/{communityId}/{type}/{timestamp}-{filename}
 */
export async function uploadCommunityFile(
  fileBuffer: Buffer,
  fileName: string,
  communityId: string,
  fileType: 'images' | 'documents' | 'videos' = 'images'
): Promise<string> {
  if (!communityId) throw new Error('Community ID is required for community uploads');
  const key = `community/${communityId}/${fileType}/${Date.now()}-${fileName}`;
  return await uploadToPath(fileBuffer, key, getContentType(fileName));
}

/**
 * Upload COMMUNITY VIDEO - non-shareable, only for community members
 * Path: community/{communityId}/videos/{timestamp}-{filename}
 */
export async function uploadCommunityVideo(
  fileBuffer: Buffer,
  fileName: string,
  communityId: string
): Promise<string> {
  if (!communityId) throw new Error('Community ID is required for community video uploads');
  const key = `community/${communityId}/videos/${Date.now()}-${fileName}`;
  return await uploadToPath(fileBuffer, key, getContentType(fileName));
}

/**
 * List all videos for a community
 */
export async function listCommunityVideos(
  communityId: string
): Promise<{ key: string; size: number; lastModified: Date }[]> {
  return await listFiles(`community/${communityId}/videos`);
}

/**
 * Get signed/CDN URL for protected content (admin or community)
 * Drop-in replacement for getProtectedUrl()
 */
export async function getProtectedUrl(
  key: string,
  accessLevel: 'admin' | 'community',
  expiresIn: number = 3600
): Promise<string> {
  // Allow keys that match the access level prefix, content-addressed keys,
  // and legacy S3 keys (for backward compatibility with pre-migration data)
  const isContentAddressed = key.startsWith('uploads/content-cache/');
  const isLegacyKey = !key.startsWith('admin/') && !key.startsWith('community/') && !key.startsWith('public/') && !isContentAddressed;

  if (!isContentAddressed && !isLegacyKey) {
    if (accessLevel === 'admin' && !key.startsWith('admin/')) {
      throw new Error('Invalid access: Key does not match admin access level');
    }
    if (accessLevel === 'community' && !key.startsWith('community/')) {
      throw new Error('Invalid access: Key does not match community access level');
    }
  }
  return await generatePresignedUrl(key, { expiresIn });
}

/**
 * Extract community ID from storage key
 */
export function extractCommunityIdFromKey(key: string): string | null {
  const match = key.match(/^community\/([^/]+)\//);
  return match ? match[1] : null;
}

export function isPublicKey(key: string): boolean {
  return key.startsWith('public/');
}

export function isAdminKey(key: string): boolean {
  return key.startsWith('admin/');
}

export function isCommunityKey(key: string): boolean {
  return key.startsWith('community/');
}

export function isWorkshopKey(key: string): boolean {
  return key.startsWith('workshops/');
}

// ============================================
// WORKSHOP VIDEO FUNCTIONS
// ============================================

/**
 * Upload WORKSHOP VIDEO - enrolled members access via signed URLs
 * Path: workshops/{slug}/batch{batch}/day{day}/{timestamp}-{filename}
 */
export async function uploadWorkshopVideo(
  fileBuffer: Buffer,
  fileName: string,
  options: {
    workshopSlug: string;
    batchNumber?: number | string;
    dayNumber?: number;
  }
): Promise<{ key: string; url: string }> {
  const { workshopSlug, batchNumber = 'general', dayNumber = 1 } = options;
  const cleanFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
  const key = `workshops/${workshopSlug}/batch${batchNumber}/day${dayNumber}/${Date.now()}-${cleanFileName}`;
  const url = await uploadToPath(fileBuffer, key, getContentType(fileName));
  return { key, url };
}

/**
 * List all videos for a workshop batch
 */
export async function listWorkshopVideos(
  workshopSlug: string,
  batchNumber?: number | string
): Promise<{ key: string; size: number; lastModified: Date }[]> {
  const prefix = batchNumber
    ? `workshops/${workshopSlug}/batch${batchNumber}`
    : `workshops/${workshopSlug}`;
  return await listFiles(prefix);
}

/**
 * Get signed URL for workshop video
 */
export async function getWorkshopVideoUrl(
  key: string,
  expiresIn: number = 3600
): Promise<string> {
  if (!key.startsWith('workshops/')) {
    throw new Error('Invalid workshop video key');
  }
  return await generatePresignedUrl(key, { expiresIn });
}

// ============================================
// USER COMPARTMENT STORAGE (per-userId isolation)
// ============================================

/**
 * Get the Bunny storage path prefix for a user.
 * All user files live under: users/{userId}/
 * This ensures complete data isolation between CRM users.
 */
export function getUserStoragePath(userId: string): string {
  if (!userId) throw new Error('userId is required for user storage');
  const safe = userId.replace(/[^a-zA-Z0-9@._-]/g, '_');
  return `users/${safe}`;
}

/**
 * Upload a file to a user's private Bunny storage compartment.
 * Path: users/{userId}/{category}/{timestamp}-{rand}-{filename}
 * 
 * @param fileBuffer - File data
 * @param fileName - Original file name
 * @param userId - CRM user ID (for compartment isolation)
 * @param category - Subfolder: 'media', 'documents', 'images', 'templates', etc.
 * @param contentType - MIME type (auto-detected if omitted)
 */
export async function uploadUserFile(
  fileBuffer: Buffer,
  fileName: string,
  userId: string,
  category: string = 'media',
  contentType?: string
): Promise<{ url: string; storagePath: string; sizeBytes: number }> {
  if (!userId) throw new Error('userId is required for user file upload');
  const timestamp = Date.now();
  const rand = Math.random().toString(36).substring(2, 8);
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_').substring(0, 80);
  const userPrefix = getUserStoragePath(userId);
  const storagePath = `${userPrefix}/${category}/${timestamp}-${rand}-${safeName}`;
  const mime = contentType || getContentType(fileName);
  const url = await uploadToPath(fileBuffer, storagePath, mime);
  console.log(`📦 User upload [${userId}]: ${storagePath} (${(fileBuffer.length / 1024).toFixed(1)} KB)`);
  return { url, storagePath, sizeBytes: fileBuffer.length };
}

/**
 * List all files in a user's storage compartment (optionally filtered by category).
 * Only returns files under users/{userId}/ — never leaks other users' data.
 */
export async function listUserFiles(
  userId: string,
  category?: string
): Promise<{ key: string; size: number; lastModified: Date; url: string }[]> {
  if (!userId) throw new Error('userId is required');
  const userPrefix = getUserStoragePath(userId);
  const prefix = category ? `${userPrefix}/${category}` : userPrefix;
  const files = await listFiles(prefix);
  return files.map(f => ({
    ...f,
    url: getPublicFileUrl(f.key),
  }));
}

/**
 * Delete a file from a user's compartment.
 * SECURITY: Validates that the key actually belongs to the user.
 */
export async function deleteUserFile(userId: string, key: string): Promise<boolean> {
  if (!userId) throw new Error('userId is required');
  const userPrefix = getUserStoragePath(userId);
  if (!key.startsWith(userPrefix + '/')) {
    console.error(`🚫 User ${userId} tried to delete key outside their compartment: ${key}`);
    throw new Error('Access denied: file does not belong to this user');
  }
  return await deleteFromBunnyStorage(key);
}

/**
 * Get total storage used by a user (in bytes).
 */
export async function getUserStorageUsage(userId: string): Promise<{ totalBytes: number; fileCount: number }> {
  if (!userId) throw new Error('userId is required');
  const files = await listUserFiles(userId);
  const totalBytes = files.reduce((sum, f) => sum + f.size, 0);
  return { totalBytes, fileCount: files.length };
}

/**
 * Validate that a storage key belongs to a specific user.
 * Used by API routes to prevent unauthorized access.
 */
export function isUserKey(key: string, userId: string): boolean {
  const userPrefix = getUserStoragePath(userId);
  return key.startsWith(userPrefix + '/');
}

/**
 * Extract userId from a user storage key.
 * e.g. 'users/admin/media/123-file.png' → 'admin'
 */
export function extractUserIdFromKey(key: string): string | null {
  const match = key.match(/^users\/([^/]+)\//);
  return match ? match[1] : null;
}
