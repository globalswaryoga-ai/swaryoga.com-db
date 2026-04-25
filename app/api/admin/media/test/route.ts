import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { S3Client, HeadBucketCommand } from '@aws-sdk/client-s3';

export const dynamic = 'force-dynamic';


/**
 * POST /api/admin/media/test
 * Test S3 connection
 */
export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    
    const token = authHeader.slice(7);
    const decoded = await verifyToken(token);
    if (!decoded || !decoded.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const bucket = process.env.AWS_S3_BUCKET || 'swarygoal1hindi';
    const region = process.env.AWS_REGION || 'us-east-1';
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

    if (!accessKeyId || !secretAccessKey) {
      return NextResponse.json({ 
        success: false,
        message: 'AWS credentials not configured. Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY in .env.local' 
      }, { status: 400 });
    }

    const s3Client = new S3Client({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });

    // Test connection by checking if bucket exists
    await s3Client.send(new HeadBucketCommand({ Bucket: bucket }));

    return NextResponse.json({ 
      success: true,
      message: `✅ Successfully connected to S3 bucket: ${bucket} (${region})` 
    });
  } catch (error: any) {
    console.error('❌ S3 connection test error:', error);
    
    let message = 'Connection failed: ';
    if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
      message += 'Bucket not found';
    } else if (error.name === 'AccessDenied' || error.$metadata?.httpStatusCode === 403) {
      message += 'Access denied - check your AWS credentials and bucket permissions';
    } else {
      message += error.message;
    }

    return NextResponse.json({ 
      success: false,
      message 
    }, { status: 400 });
  }
}
