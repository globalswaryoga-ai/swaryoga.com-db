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
    // Removed ACL because some buckets disable ACLs
    Metadata: options.metadata || {
      'uploaded-at': new Date().toISOString(),
    },
  });

  try {
    await s3Client.send(command);
    const region = process.env.AWS_REGION || 'ap-south-1';
    const s3Url = `https://${bucket}.s3.${region}.amazonaws.com/${fileName}`;
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

export async function uploadTemplateFileToS3(options: any) {
    return await uploadToS3(options.file, options.fileName);
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


