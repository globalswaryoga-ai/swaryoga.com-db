import { NextRequest, NextResponse } from 'next/server';
import { generatePresignedUrl } from '@/lib/aws-s3';

export const dynamic = 'force-dynamic';

/**
 * GET /api/s3/signed-url?key=path/to/file.jpg&bucket=optional-bucket
 * Returns a signed URL for accessing private S3 objects
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');
    const bucket = searchParams.get('bucket') || 'swarygoal1hindi';

    if (!key) {
      return NextResponse.json({ error: 'Missing key parameter' }, { status: 400 });
    }

    // Generate signed URL with 1 hour expiry
    const signedUrl = await generatePresignedUrl(key, { 
      bucket, 
      expiresIn: 3600 
    });

    return NextResponse.json({ url: signedUrl });
  } catch (error: any) {
    console.error('❌ Signed URL generation failed:', error);
    return NextResponse.json(
      { error: 'Failed to generate signed URL' },
      { status: 500 }
    );
  }
}
