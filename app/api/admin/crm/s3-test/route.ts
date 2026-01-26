/**
 * GET /api/admin/crm/s3-test
 * Test S3 connectivity and configuration
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { S3Client, HeadBucketCommand } from '@aws-sdk/client-s3';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // 1. Verify admin access
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);

    if (!decoded?.isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized: Admin access required' },
        { status: 403 }
      );
    }

    // 2. Check environment variables
    const config = {
      hasAccessKey: !!process.env.AWS_ACCESS_KEY_ID,
      accessKeyPrefix: process.env.AWS_ACCESS_KEY_ID?.substring(0, 8) || 'MISSING',
      hasSecretKey: !!process.env.AWS_SECRET_ACCESS_KEY,
      secretKeyLength: process.env.AWS_SECRET_ACCESS_KEY?.length || 0,
      bucket: process.env.AWS_S3_BUCKET || 'NOT SET',
      region: process.env.AWS_REGION || 'us-east-1',
    };

    // 3. Test S3 connection
    let s3Status = 'NOT TESTED';
    let s3Error = null;

    if (config.hasAccessKey && config.hasSecretKey) {
      try {
        const s3Client = new S3Client({
          region: config.region,
          credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
          },
        });

        await s3Client.send(new HeadBucketCommand({ Bucket: config.bucket }));
        s3Status = 'CONNECTED';
      } catch (err: any) {
        s3Status = 'FAILED';
        s3Error = {
          message: err.message,
          code: err.name || err.code,
          statusCode: err.$metadata?.httpStatusCode,
        };
      }
    } else {
      s3Status = 'MISSING CREDENTIALS';
    }

    return NextResponse.json({
      success: true,
      config,
      s3Status,
      s3Error,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('S3 test error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Test failed' },
      { status: 500 }
    );
  }
}
