// AWS S3 Integration for Swar Yoga
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Readable } from 'stream';
import { createHash } from 'crypto';

// Initialize S3 client with your AWS credentials
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

/**
 * S3 ACCESS CONTROL STRUCTURE:
 * 
 * public/              - Anyone can view (community posts, general images)
 * admin/               - Only admins can access (via signed URLs)
 * community/{id}/      - Only approved community members can access
 *   └── videos/        - Non-shareable community videos
 *   └── documents/     - Community-specific documents
 */

export type S3AccessLevel = 'public' | 'admin' | 'community';

export interface S3UploadOptions {
  bucket?: string;
  acl?: 'public-read' | 'private';
  metadata?: Record<string, string>;
  accessLevel?: S3AccessLevel;
  communityId?: string; // Required when accessLevel is 'community'
  contentType?: string; // Override auto-detected content type
}

export interface S3PresignedUrlOptions {
  bucket?: string;
  expiresIn?: number; // seconds, default 3600 (1 hour)
}

const DEFAULT_BUCKET = process.env.AWS_S3_BUCKET || 'swarygoal1hindi';

/**
 * Upload file to AWS S3
 * @param fileBuffer - File content as Buffer
 * @param fileName - S3 key/filename
 * @param options - Upload options
 * @returns S3 URL of uploaded file
 */
export async function uploadToS3(
  fileBuffer: Buffer,
  fileName: string,
  options: S3UploadOptions = {}
): Promise<string> {
  const bucket = options.bucket || DEFAULT_BUCKET;
  const region = process.env.AWS_REGION || 'us-east-1';

  // 1. Calculate MD5 hash for de-duplication
  const hash = createHash('md5').update(fileBuffer).digest('hex');
  const extension = fileName.split('.').pop() || '';
  
  // 2. Build a content-addressed key to prevent duplicates
  const contentKey = `uploads/content-cache/${hash}.${extension}`;

  try {
    // 3. Check if this content already exists in S3
    await s3Client.send(new HeadObjectCommand({
      Bucket: bucket,
      Key: contentKey,
    }));
    
    // If it exists (didn't throw 404), return the existing URL
    const s3Url = `https://${bucket}.s3.${region}.amazonaws.com/${contentKey}`;
    console.log(`♻️  File content already exists in S3, reusing: ${s3Url}`);
    return s3Url;
  } catch (err: any) {
    // Continue with upload if not found
    if (err.name !== 'NotFound' && err.$metadata?.httpStatusCode !== 404) {
      console.warn('⚠️  S3 existence check failed, proceeding with upload:', err.message);
    }
  }

  const contentType = options.contentType || getContentType(fileName);

  // Build command options - only include ACL if bucket supports it
  const commandOptions: any = {
    Bucket: bucket,
    Key: contentKey,
    Body: fileBuffer,
    ContentType: contentType,
    // Metadata helps in identifying the file later
    Metadata: {
      ...(options.metadata || {}),
      'uploaded-at': new Date().toISOString(),
      'original-filename': encodeURIComponent(fileName),
      'content-hash': hash,
    },
  };

  // Only add ACL if explicitly provided (skip for buckets with ACLs disabled)
  // Most modern S3 buckets use bucket policies instead of ACLs
  if (options.acl) {
    commandOptions.ACL = options.acl;
  }

  const command = new PutObjectCommand(commandOptions);

  try {
    await s3Client.send(command);
    
    // Encode the key for a valid URL
    const encodedKey = contentKey.split('/').map(part => encodeURIComponent(part)).join('/');
    const s3Url = `https://${bucket}.s3.${region}.amazonaws.com/${encodedKey}`;
    
    console.log(`✅ Uploaded to S3 (content-addressed): ${s3Url}`);
    return s3Url;
  } catch (error: any) {
    console.error('❌ S3 Upload Error Details:', {
      message: error.message,
      code: error.code || error.name,
      requestId: error.$metadata?.requestId,
      bucket: bucket,
      region: process.env.AWS_REGION || 'us-east-1'
    });
    throw new Error(`S3 Upload Failed: ${error.message} (${error.code || error.name || 'UnknownError'})`);
  }
}

/**
 * Generate pre-signed URL for S3 object (for restricted access, temporary download, etc.)
 * @param fileName - S3 key/filename
 * @param options - Pre-signed URL options
 * @returns Pre-signed URL valid for specified duration
 */
export async function generatePresignedUrl(
  fileName: string,
  options: S3PresignedUrlOptions = {}
): Promise<string> {
  const bucket = options.bucket || DEFAULT_BUCKET;
  const expiresIn = options.expiresIn || 3600; // 1 hour default

  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: fileName,
  });

  try {
    const url = await getSignedUrl(s3Client, command, { expiresIn });
    return url;
  } catch (error) {
    console.error('❌ Pre-signed URL Generation Error:', error);
    throw error;
  }
}

/**
 * Generate a pre-signed URL for direct client-to-S3 upload (PUT)
 * Useful for large files (up to 25MB+) to bypass server limits.
 */
export async function generateUploadUrl(
  fileName: string,
  contentType: string,
  options: S3PresignedUrlOptions = {}
): Promise<string> {
  const bucket = options.bucket || DEFAULT_BUCKET;
  const expiresIn = options.expiresIn || 600; // 10 minutes default

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: fileName,
    ContentType: contentType,
  });

  try {
    const url = await getSignedUrl(s3Client, command, { expiresIn });
    return url;
  } catch (error) {
    console.error('❌ Upload Pre-signed URL Error:', error);
    throw error;
  }
}

/**
 * Build S3 path for organized storage
 */
export function buildS3Path(category: string, subcategory?: string, fileName?: string): string {
  const parts = ['swaryoga', category];
  if (subcategory) parts.push(subcategory);
  if (fileName) parts.push(fileName);
  return parts.join('/');
}

// TEMPLATE RELATED (Simplified helpers to keep file clean)
const MAX_IMAGE_SIZE = 25 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export function validateTemplateFile(file: Buffer, mimeType: string, fileType: string) {
    if (fileType === 'image' && file.length > MAX_IMAGE_SIZE) return { valid: false, error: 'Image too large (Max 25MB)' };
    if (fileType === 'image' && !ALLOWED_IMAGE_TYPES.includes(mimeType)) return { valid: false, error: 'Unsupported image type' };
    return { valid: true };
}

export async function deleteTemplateFileFromS3(s3Url: string) {
    const key = extractS3Key(s3Url);
    return await deleteFromS3(key);
}

export async function uploadTemplateFileToS3(options: {
    file: Buffer;
    fileName: string;
    mimeType?: string;
    fileType: 'image' | 'document' | 'video';
    templateId: string;
}) {
    const key = generateTemplateS3Key(options.templateId, options.fileName, options.fileType);
    return await uploadToS3(options.file, key, { contentType: options.mimeType });
}

export async function deleteTemplateFilesFromS3(s3Urls: string[]) {
    for (const url of s3Urls) await deleteTemplateFileFromS3(url);
    return true;
}

export function isValidS3Url(url: string) {
    return url.includes('amazonaws.com');
}

export function generateTemplateS3Key(id: string, name: string, type: string) {
    return `templates/${id}/${type}/${Date.now()}-${name}`;
}

export async function deleteFromS3(key: string, bucket?: string): Promise<boolean> {
  const targetBucket = bucket || DEFAULT_BUCKET;
  try {
    await s3Client.send(
      new DeleteObjectCommand({
        Bucket: targetBucket,
        Key: key,
      })
    );
    return true;
  } catch (error) {
    console.error('❌ S3 Delete Error:', error);
    return false;
  }
}

export function extractS3Key(s3Url: string): string {
  try {
    const url = new URL(s3Url);
    return url.pathname.slice(1);
  } catch {
    return s3Url;
  }
}

function getContentType(fileName: string): string {
  const ext = fileName.toLowerCase().split('.').pop();
  const contentTypes: Record<string, string> = {
    jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml',
    mp4: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime', avi: 'video/x-msvideo',
    pdf: 'application/pdf', doc: 'application/msword', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    txt: 'text/plain', json: 'application/json', zip: 'application/zip',
  };
  return contentTypes[ext || ''] || 'application/octet-stream';
}

// ============================================
// ACCESS-CONTROLLED UPLOAD FUNCTIONS
// ============================================

/**
 * Upload PUBLIC file - accessible by anyone
 * Path: public/{type}/{filename}
 */
export async function uploadPublicFile(
  fileBuffer: Buffer,
  fileName: string,
  fileType: 'images' | 'documents' | 'videos' = 'images'
): Promise<string> {
  const key = `public/${fileType}/${Date.now()}-${fileName}`;
  return await uploadToS3(fileBuffer, key, { accessLevel: 'public' });
}

/**
 * Upload ADMIN-ONLY file - only admins can access via signed URLs
 * Path: admin/{type}/{filename}
 */
export async function uploadAdminFile(
  fileBuffer: Buffer,
  fileName: string,
  fileType: 'images' | 'documents' | 'videos' | 'reports' = 'documents'
): Promise<string> {
  const key = `admin/${fileType}/${Date.now()}-${fileName}`;
  return await uploadToS3(fileBuffer, key, { accessLevel: 'admin' });
}

/**
 * Upload COMMUNITY file - only community members can access via signed URLs
 * Path: community/{communityId}/{type}/{filename}
 */
export async function uploadCommunityFile(
  fileBuffer: Buffer,
  fileName: string,
  communityId: string,
  fileType: 'images' | 'documents' | 'videos' = 'images'
): Promise<string> {
  if (!communityId) throw new Error('Community ID is required for community uploads');
  const key = `community/${communityId}/${fileType}/${Date.now()}-${fileName}`;
  return await uploadToS3(fileBuffer, key, { accessLevel: 'community', communityId });
}

/**
 * Upload COMMUNITY VIDEO - non-shareable, only for community members
 * Path: community/{communityId}/videos/{filename}
 */
export async function uploadCommunityVideo(
  fileBuffer: Buffer,
  fileName: string,
  communityId: string
): Promise<string> {
  if (!communityId) throw new Error('Community ID is required for community video uploads');
  const key = `community/${communityId}/videos/${Date.now()}-${fileName}`;
  return await uploadToS3(fileBuffer, key, { 
    accessLevel: 'community', 
    communityId,
    metadata: {
      'shareable': 'false',
      'community-only': 'true',
    }
  });
}

/**
 * List all videos for a community
 */
export async function listCommunityVideos(communityId: string): Promise<{ key: string; size: number; lastModified: Date }[]> {
  const bucket = DEFAULT_BUCKET;
  const prefix = `community/${communityId}/videos/`;
  
  try {
    const response = await s3Client.send(new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: prefix,
    }));
    
    return (response.Contents || []).map(item => ({
      key: item.Key || '',
      size: item.Size || 0,
      lastModified: item.LastModified || new Date(),
    }));
  } catch (error) {
    console.error('❌ List community videos error:', error);
    return [];
  }
}

/**
 * Get signed URL for protected content (admin or community)
 * Validates access before generating URL
 */
export async function getProtectedUrl(
  key: string,
  accessLevel: 'admin' | 'community',
  expiresIn: number = 3600 // 1 hour default
): Promise<string> {
  const bucket = DEFAULT_BUCKET;
  
  // Validate the key matches the access level
  if (accessLevel === 'admin' && !key.startsWith('admin/')) {
    throw new Error('Invalid access: Key does not match admin access level');
  }
  if (accessLevel === 'community' && !key.startsWith('community/')) {
    throw new Error('Invalid access: Key does not match community access level');
  }
  
  return await generatePresignedUrl(key, { bucket, expiresIn });
}

/**
 * Extract community ID from S3 key
 */
export function extractCommunityIdFromKey(key: string): string | null {
  const match = key.match(/^community\/([^/]+)\//);
  return match ? match[1] : null;
}

/**
 * Check if a key is for public content
 */
export function isPublicKey(key: string): boolean {
  return key.startsWith('public/');
}

/**
 * Check if a key is for admin-only content
 */
export function isAdminKey(key: string): boolean {
  return key.startsWith('admin/');
}

/**
 * Check if a key is for community content
 */
export function isCommunityKey(key: string): boolean {
  return key.startsWith('community/');
}


