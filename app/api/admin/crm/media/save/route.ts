import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { getMediaFile } from '@/lib/schemas/enterpriseSchemas';
import { verifyToken } from '@/lib/auth';
import { apiError, apiSuccess } from '@/lib/api-error';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') || undefined;
    const decoded = verifyToken(authHeader);
    if (!decoded) {
      return apiError('UNAUTHORIZED');
    }

    await connectDB();
    const body = await req.json();
    const { originalName, fileName, s3Key, s3Bucket, contentType, size, category } = body;

    if (!originalName || !s3Key) {
      return apiError('INVALID_REQUEST', 'Missing required fields: originalName and s3Key');
    }

    const MediaFile = getMediaFile();
    const mediaFile = await MediaFile.create({
      originalName,
      fileName: fileName || originalName,
      s3Key,
      s3Bucket: s3Bucket || process.env.AWS_S3_BUCKET || 'swarygoal1hindi',
      contentType,
      size,
      category: category || 'social_media',
      uploadedBy: decoded.userId, // From verifyToken
    });

    return apiSuccess(mediaFile);

  } catch (error) {
    console.error('Error saving media file record:', error);
    return apiError('SERVER_ERROR', error instanceof Error ? error.message : 'Database error');
  }
}
