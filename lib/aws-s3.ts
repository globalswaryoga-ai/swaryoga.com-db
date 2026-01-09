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

// Initialize S3 client with your AWS credentials
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

export interface S3UploadOptions {
  bucket?: string;
  acl?: 'public-read' | 'private';
  metadata?: Record<string, string>;
}

export interface S3PresignedUrlOptions {
  bucket?: string;
  expiresIn?: number; // seconds, default 3600 (1 hour)
}

const DEFAULT_BUCKET = process.env.AWS_S3_BUCKET || 'swaryoga-media';

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
  const contentType = getContentType(fileName);

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: fileName,
    Body: fileBuffer,
    ContentType: contentType,
    ACL: options.acl || 'public-read',
    Metadata: options.metadata || {
      'uploaded-at': new Date().toISOString(),
    },
  });

  try {
    await s3Client.send(command);
    const s3Url = `https://${bucket}.s3.amazonaws.com/${fileName}`;
    console.log(`✅ Uploaded to S3: ${s3Url}`);
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
    throw new Error(`Failed to generate pre-signed URL for: ${fileName}`);
  }
}

/**
 * Delete file from S3
 * @param fileName - S3 key/filename
 * @param bucket - S3 bucket name
 */
export async function deleteFromS3(fileName: string, bucket?: string): Promise<void> {
  const s3Bucket = bucket || DEFAULT_BUCKET;

  const command = new DeleteObjectCommand({
    Bucket: s3Bucket,
    Key: fileName,
  });

  try {
    await s3Client.send(command);
    console.log(`✅ Deleted from S3: ${fileName}`);
  } catch (error) {
    console.error('❌ S3 Delete Error:', error);
    throw new Error(`Failed to delete file from S3: ${fileName}`);
  }
}

/**
 * Get file metadata from S3
 * @param fileName - S3 key/filename
 * @param bucket - S3 bucket name
 */
export async function getS3ObjectMetadata(
  fileName: string,
  bucket?: string
): Promise<Record<string, any>> {
  const s3Bucket = bucket || DEFAULT_BUCKET;

  const command = new HeadObjectCommand({
    Bucket: s3Bucket,
    Key: fileName,
  });

  try {
    const metadata = await s3Client.send(command);
    return metadata;
  } catch (error) {
    console.error('❌ S3 Metadata Error:', error);
    throw new Error(`Failed to get metadata for: ${fileName}`);
  }
}

/**
 * List files in S3 folder/prefix
 * @param prefix - S3 prefix/folder path
 * @param bucket - S3 bucket name
 */
export async function listS3Objects(
  prefix: string,
  bucket?: string
): Promise<any[]> {
  const s3Bucket = bucket || DEFAULT_BUCKET;

  const command = new ListObjectsV2Command({
    Bucket: s3Bucket,
    Prefix: prefix,
  });

  try {
    const result = await s3Client.send(command);
    return result.Contents || [];
  } catch (error) {
    console.error('❌ S3 List Error:', error);
    throw new Error(`Failed to list S3 objects with prefix: ${prefix}`);
  }
}

/**
 * Upload stream to S3 (for large files, videos, etc.)
 * @param stream - Readable stream or Buffer
 * @param fileName - S3 key/filename
 * @param options - Upload options
 */
export async function uploadStreamToS3(
  stream: Readable | Buffer,
  fileName: string,
  options: S3UploadOptions = {}
): Promise<string> {
  const bucket = options.bucket || DEFAULT_BUCKET;
  const contentType = getContentType(fileName);

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: fileName,
    Body: stream,
    ContentType: contentType,
    ACL: options.acl || 'public-read',
    Metadata: options.metadata || {
      'uploaded-at': new Date().toISOString(),
    },
  });

  try {
    await s3Client.send(command);
    const s3Url = `https://${bucket}.s3.amazonaws.com/${fileName}`;
    console.log(`✅ Stream uploaded to S3: ${s3Url}`);
    return s3Url;
  } catch (error) {
    console.error('❌ S3 Stream Upload Error:', error);
    throw new Error(`Failed to upload stream to S3: ${fileName}`);
  }
}

/**
 * Helper function to determine content type based on file extension
 */
function getContentType(fileName: string): string {
  const ext = fileName.toLowerCase().split('.').pop();
  const contentTypes: Record<string, string> = {
    // Images
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    svg: 'image/svg+xml',
    
    // Videos
    mp4: 'video/mp4',
    webm: 'video/webm',
    mov: 'video/quicktime',
    avi: 'video/x-msvideo',
    mkv: 'video/x-matroska',
    m3u8: 'application/vnd.apple.mpegurl',
    
    // Documents
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ppt: 'application/vnd.ms-powerpoint',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    
    // Others
    txt: 'text/plain',
    json: 'application/json',
    zip: 'application/zip',
  };
  
  return contentTypes[ext || ''] || 'application/octet-stream';
}

/**
 * Build S3 path for organized storage
 * @param category - File category (e.g., 'recorded-workshops', 'media-posts')
 * @param subcategory - Subcategory (e.g., workshop slug, language)
 * @param fileName - Actual file name
 */
export function buildS3Path(
  category: string,
  subcategory?: string,
  fileName?: string
): string {
  const parts = ['swaryoga', category];
  if (subcategory) parts.push(subcategory);
  if (fileName) parts.push(fileName);
  return parts.join('/');
}

/**
 * Extract S3 key from full S3 URL
 */
export function extractS3Key(s3Url: string): string {
  const url = new URL(s3Url);
  return url.pathname.slice(1); // Remove leading slash
}

/**
 * Validate if a string is valid S3 URL
 */
export function isValidS3Url(url: string): boolean {
  try {
    const s3Url = new URL(url);
    return s3Url.hostname.includes('amazonaws.com');
  } catch {
    return false;
  }
}

// ============================================================================
// TEMPLATE-SPECIFIC FILE UPLOAD FUNCTIONS
// ============================================================================

// File size limits (in bytes)
const MAX_IMAGE_SIZE = parseInt(process.env.MAX_IMAGE_SIZE || '26214400'); // 25MB
const MAX_DOCUMENT_SIZE = parseInt(process.env.MAX_DOCUMENT_SIZE || '52428800'); // 50MB
const MAX_VIDEO_SIZE = parseInt(process.env.MAX_VIDEO_SIZE || '209715200'); // 200MB (limit for template upload)

// Allowed MIME types
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/mpeg', 'video/quicktime', 'video/webm'];
const ALLOWED_DOCUMENT_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/zip',
  'application/x-zip-compressed',
];

interface TemplateFileUploadOptions {
  file: Buffer;
  fileName: string;
  mimeType: string;
  fileType: 'image' | 'document' | 'video';
  templateId: string;
}

interface TemplateFileUploadResult {
  success: boolean;
  url?: string;
  fileName?: string;
  mimeType?: string;
  sizeBytes?: number;
  error?: string;
}

/**
 * Validate template file before upload
 */
export function validateTemplateFile(
  file: Buffer,
  mimeType: string,
  fileType: 'image' | 'document' | 'video'
): { valid: boolean; error?: string } {
  // Check file size
  let maxSize = MAX_DOCUMENT_SIZE;
  if (fileType === 'image') maxSize = MAX_IMAGE_SIZE;
  else if (fileType === 'video') maxSize = MAX_VIDEO_SIZE;

  if (file.length > maxSize) {
    const sizeLimitMB = maxSize / (1024 * 1024);
    return {
      valid: false,
      error: `File size exceeds ${sizeLimitMB}MB limit for ${fileType}s`,
    };
  }

  // Check MIME type
  let allowedTypes = ALLOWED_DOCUMENT_TYPES;
  if (fileType === 'image') allowedTypes = ALLOWED_IMAGE_TYPES;
  else if (fileType === 'video') allowedTypes = ALLOWED_VIDEO_TYPES;

  if (!allowedTypes.includes(mimeType)) {
    return {
      valid: false,
      error: `Invalid MIME type: ${mimeType}. Allowed types: ${allowedTypes.join(', ')}`,
    };
  }

  return { valid: true };
}

/**
 * Generate unique S3 key for template file
 */
export function generateTemplateS3Key(
  templateId: string,
  fileName: string,
  fileType: 'image' | 'document' | 'video'
): string {
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  const cleanFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
  return `templates/${templateId}/${fileType}/${timestamp}_${randomSuffix}_${cleanFileName}`;
}

/**
 * Upload template file to S3
 */
export async function uploadTemplateFileToS3(
  options: TemplateFileUploadOptions
): Promise<TemplateFileUploadResult> {
  try {
    const { file, fileName, mimeType, fileType, templateId } = options;

    // Validate file
    const validation = validateTemplateFile(file, mimeType, fileType);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error,
      };
    }

    // Generate S3 key
    const s3Key = generateTemplateS3Key(templateId, fileName, fileType);

    // Upload to S3
    const s3Url = await uploadToS3(file, s3Key, {
      acl: 'public-read',
      metadata: {
        'template-id': templateId,
        'file-type': fileType,
        'original-name': fileName,
        'uploaded-at': new Date().toISOString(),
      },
    });

    return {
      success: true,
      url: s3Url,
      fileName: fileName,
      mimeType: mimeType,
      sizeBytes: file.length,
    };
  } catch (error) {
    console.error('Error uploading template file to S3:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Delete template file from S3 using URL
 */
export async function deleteTemplateFileFromS3(s3Url: string): Promise<boolean> {
  try {
    const s3Key = extractS3Key(s3Url);
    await deleteFromS3(s3Key);
    return true;
  } catch (error) {
    console.error('Error deleting template file from S3:', error);
    return false;
  }
}

/**
 * Delete multiple template files from S3
 */
export async function deleteTemplateFilesFromS3(s3Urls: string[]): Promise<boolean> {
  try {
    const deletePromises = s3Urls.map((url) => deleteTemplateFileFromS3(url));
    await Promise.all(deletePromises);
    return true;
  } catch (error) {
    console.error('Error deleting template files from S3:', error);
    return false;
  }
}

