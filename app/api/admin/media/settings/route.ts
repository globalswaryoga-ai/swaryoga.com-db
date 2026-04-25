import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';


/**
 * GET /api/admin/media/settings
 * Get S3 settings (masked for security)
 */
export async function GET(request: NextRequest) {
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

    // Return settings from environment (masked)
    const settings = {
      bucket: process.env.AWS_S3_BUCKET || 'swarygoal1hindi',
      region: process.env.AWS_REGION || 'us-east-1',
      accessKeyId: maskString(process.env.AWS_ACCESS_KEY_ID || ''),
      secretAccessKey: maskString(process.env.AWS_SECRET_ACCESS_KEY || ''),
      publicPrefix: 'public/',
      adminPrefix: 'admin/',
      communityPrefix: 'community/',
    };

    return NextResponse.json({ settings });
  } catch (error: any) {
    console.error('❌ Get S3 settings error:', error);
    return NextResponse.json({ error: 'Failed to get settings' }, { status: 500 });
  }
}

/**
 * PUT /api/admin/media/settings
 * Update S3 settings
 * Note: In production, this would update environment variables or a config store
 */
export async function PUT(request: NextRequest) {
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

    const { settings } = await request.json();

    // In a real implementation, you would:
    // 1. Store these in a database or config service
    // 2. Update environment variables on the server
    // 3. Use AWS Secrets Manager for credentials
    
    // For now, just validate the settings
    if (!settings.bucket || !settings.region) {
      return NextResponse.json({ error: 'Bucket and region are required' }, { status: 400 });
    }

    // Log the settings update (without secrets)
    console.log('📝 S3 Settings update requested:', {
      bucket: settings.bucket,
      region: settings.region,
      publicPrefix: settings.publicPrefix,
      adminPrefix: settings.adminPrefix,
      communityPrefix: settings.communityPrefix,
    });

    return NextResponse.json({ 
      success: true,
      message: 'Settings validated. Update your .env.local file with the new values.' 
    });
  } catch (error: any) {
    console.error('❌ Update S3 settings error:', error);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}

function maskString(str: string): string {
  if (!str || str.length < 8) return '••••••••';
  return str.substring(0, 4) + '••••••••' + str.substring(str.length - 4);
}
