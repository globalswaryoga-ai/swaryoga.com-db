import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';

export const dynamic = 'force-dynamic';


const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

/**
 * GET /api/admin/media/stats
 * Get storage statistics for each access level
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

    const bucket = process.env.AWS_S3_BUCKET || 'swarygoal1hindi';

    // Get stats for each prefix
    const [publicStats, adminStats, communityStats] = await Promise.all([
      getStorageStats(bucket, 'public/'),
      getStorageStats(bucket, 'admin/'),
      getStorageStats(bucket, 'community/'),
    ]);

    const stats = {
      public: publicStats,
      admin: adminStats,
      community: communityStats,
      total: {
        count: publicStats.count + adminStats.count + communityStats.count,
        size: formatBytes(publicStats.bytes + adminStats.bytes + communityStats.bytes),
      },
    };

    return NextResponse.json({ stats });
  } catch (error: any) {
    console.error('❌ Get storage stats error:', error);
    return NextResponse.json({ 
      stats: {
        public: { count: 0, size: '0 B' },
        admin: { count: 0, size: '0 B' },
        community: { count: 0, size: '0 B' },
        total: { count: 0, size: '0 B' },
      }
    });
  }
}

async function getStorageStats(bucket: string, prefix: string): Promise<{ count: number; size: string; bytes: number }> {
  try {
    let count = 0;
    let bytes = 0;
    let continuationToken: string | undefined;

    do {
      const response = await s3Client.send(new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      }));

      if (response.Contents) {
        count += response.Contents.length;
        bytes += response.Contents.reduce((sum, obj) => sum + (obj.Size || 0), 0);
      }

      continuationToken = response.NextContinuationToken;
    } while (continuationToken);

    return { count, size: formatBytes(bytes), bytes };
  } catch (error) {
    console.error(`Error getting stats for prefix ${prefix}:`, error);
    return { count: 0, size: '0 B', bytes: 0 };
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
