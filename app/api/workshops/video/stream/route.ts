import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { bunnyExecute } from '@/lib/bunnyDatabase';
import { initWorkshopBatchesSchema } from '@/lib/bunnyWorkshopScheduleRepository';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

const s3 = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const BUCKET_NAME = 'swarygoal1hindi';
const MAX_DEVICES = 3;
const SIGNED_URL_EXPIRY = 3600; // 1 hour

function generateDeviceFingerprint(req: NextRequest): string {
  const userAgent = req.headers.get('user-agent') || '';
  const acceptLanguage = req.headers.get('accept-language') || '';
  const acceptEncoding = req.headers.get('accept-encoding') || '';
  
  return crypto
    .createHash('sha256')
    .update(`${userAgent}|${acceptLanguage}|${acceptEncoding}`)
    .digest('hex')
    .substring(0, 32);
}

function parseDeviceName(userAgent: string): string {
  if (userAgent.includes('iPhone')) return 'iPhone';
  if (userAgent.includes('iPad')) return 'iPad';
  if (userAgent.includes('Android')) {
    const match = userAgent.match(/Android.*?;\s*([^)]+)/);
    return match ? match[1].split(' Build')[0] : 'Android Device';
  }
  if (userAgent.includes('Windows')) return 'Windows PC';
  if (userAgent.includes('Macintosh')) return 'Mac';
  if (userAgent.includes('Linux')) return 'Linux PC';
  return 'Unknown Device';
}

/**
 * POST /api/workshops/video/stream
 * Get a signed URL for video streaming with device tracking (BunnyDB)
 */
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') || undefined;
    const decoded = verifyToken(authHeader);
    
    await initWorkshopBatchesSchema();

    const body = await req.json();
    const { videoId, clientFingerprint } = body;

    if (!videoId) {
      return NextResponse.json({ error: 'Video ID is required' }, { status: 400 });
    }

    const videoRes = await bunnyExecute({
      sql: 'SELECT * FROM workshop_videos_sql WHERE id = ? AND is_active = 1 LIMIT 1',
      args: [videoId],
    });

    if (!videoRes.rows[0]) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    const video = videoRes.rows[0];

    // Handle free videos - no auth required
    if (video.access_type === 'free') {
      const signedUrl = await getSignedUrl(
        s3,
        new GetObjectCommand({
          Bucket: BUCKET_NAME,
          Key: String(video.s3_key || ''),
        }),
        { expiresIn: SIGNED_URL_EXPIRY }
      );

      return NextResponse.json({
        success: true,
        url: signedUrl,
        expiresIn: SIGNED_URL_EXPIRY,
        video: {
          title: video.title,
          description: video.description,
          duration: Number(video.duration || 0),
        },
      });
    }

    // For non-free videos, require authentication
    const userId = decoded?.id || decoded?._id || decoded?.userId;
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const deviceFingerprint = clientFingerprint || generateDeviceFingerprint(req);
    const userAgent = req.headers.get('user-agent') || 'Unknown';

    let hasAccess = false;
    if (decoded?.isAdmin) {
      hasAccess = true;
    } else {
      // Check batch enrollment
      const batchRes = await bunnyExecute({
        sql: 'SELECT enrolled_users_json FROM workshop_batches_sql WHERE (id = ? OR workshop_id = ?) AND is_active = 1',
        args: [video.batch_id || '', video.workshop_id],
      });
      for (const row of batchRes.rows) {
        try {
          const list = JSON.parse(String(row.enrolled_users_json || '[]'));
          if (list.includes(String(userId))) {
            hasAccess = true;
            break;
          }
        } catch {}
      }
    }

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'You do not have access to this video. Please enroll in the workshop.' },
        { status: 403 }
      );
    }

    // Device limit check
    const devRes = await bunnyExecute({
      sql: 'SELECT * FROM course_devices_sql WHERE user_id = ? AND is_active = 1 ORDER BY last_active_at DESC',
      args: [String(userId)],
    }).catch(() => ({ rows: [] }));

    let currentDevice = devRes.rows.find((d: any) => d.device_fingerprint === deviceFingerprint);
    const deviceId = currentDevice ? String(currentDevice.id) : 'dev_' + Date.now();

    if (!currentDevice) {
      if (devRes.rows.length >= MAX_DEVICES) {
        const oldest = devRes.rows[devRes.rows.length - 1];
        await bunnyExecute({
          sql: 'UPDATE course_devices_sql SET is_active = 0 WHERE id = ?',
          args: [oldest.id],
        }).catch(() => {});
      }

      await bunnyExecute({
        sql: `INSERT OR REPLACE INTO course_devices_sql (
          id, user_id, device_fingerprint, device_name, is_active, last_active_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, 1, ?, ?, ?)`,
        args: [
          deviceId,
          String(userId),
          deviceFingerprint,
          parseDeviceName(userAgent),
          new Date().toISOString(),
          new Date().toISOString(),
          new Date().toISOString(),
        ],
      }).catch(() => {});
    }

    // Generate signed URL
    const signedUrl = await getSignedUrl(
      s3,
      new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: String(video.s3_key || ''),
      }),
      { expiresIn: SIGNED_URL_EXPIRY }
    );

    return NextResponse.json({
      success: true,
      url: signedUrl,
      expiresIn: SIGNED_URL_EXPIRY,
      video: {
        title: video.title,
        description: video.description,
        duration: Number(video.duration || 0),
        dayNumber: Number(video.day_number || 1),
      },
      deviceInfo: {
        deviceId,
        deviceName: currentDevice ? currentDevice.device_name : parseDeviceName(userAgent),
        activeDevices: Math.min(devRes.rows.length + 1, MAX_DEVICES),
        maxDevices: MAX_DEVICES,
      },
    });
  } catch (error: any) {
    console.error('[Video Stream Error]:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
