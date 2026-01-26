import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import connectDB from '@/lib/db';
import { getWorkshopVideo, getVideoAccessLog, getUserDevice, getBatch } from '@/lib/schemas/workshopSchemas';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import mongoose from 'mongoose';
import crypto from 'crypto';

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

/**
 * Generate a device fingerprint from request headers
 */
function generateDeviceFingerprint(req: NextRequest): string {
  const userAgent = req.headers.get('user-agent') || '';
  const acceptLanguage = req.headers.get('accept-language') || '';
  const acceptEncoding = req.headers.get('accept-encoding') || '';
  
  // Create a hash of the device characteristics
  const fingerprint = crypto
    .createHash('sha256')
    .update(`${userAgent}|${acceptLanguage}|${acceptEncoding}`)
    .digest('hex')
    .substring(0, 32);
  
  return fingerprint;
}

/**
 * POST /api/workshops/video/stream
 * Get a signed URL for video streaming with device tracking
 */
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') || undefined;
    const decoded = verifyToken(authHeader);
    
    await connectDB();
    const WorkshopVideo = getWorkshopVideo();
    const VideoAccessLog = getVideoAccessLog();
    const UserDevice = getUserDevice();
    const Batch = getBatch();

    const body = await req.json();
    const { videoId, clientFingerprint } = body;

    if (!videoId) {
      return NextResponse.json({ error: 'Video ID is required' }, { status: 400 });
    }

    const video = await WorkshopVideo.findById(videoId);
    if (!video || !video.isActive) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    // Handle free videos - no auth required
    if (video.accessType === 'free') {
      const signedUrl = await getSignedUrl(
        s3,
        new GetObjectCommand({
          Bucket: BUCKET_NAME,
          Key: video.s3Key,
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
          duration: video.duration,
        },
      });
    }

    // For non-free videos, require authentication
    if (!decoded || !decoded.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const userId = new mongoose.Types.ObjectId(decoded.id);
    const deviceFingerprint = clientFingerprint || generateDeviceFingerprint(req);
    const userAgent = req.headers.get('user-agent') || 'Unknown';

    // Check if user has access based on access type
    let hasAccess = false;

    if (video.accessType === 'enrolled') {
      // Check if user is enrolled in the workshop batch
      if (video.batchId) {
        const batch = await Batch.findOne({
          _id: video.batchId,
          enrolledUsers: userId,
          isActive: true,
        });
        hasAccess = !!batch;
      } else {
        // If no batch specified, check all active batches for this workshop
        const batch = await Batch.findOne({
          workshopId: video.workshopId,
          enrolledUsers: userId,
          isActive: true,
        });
        hasAccess = !!batch;
      }
    } else if (video.accessType === 'purchased') {
      // For purchased videos, would need to check purchase records
      // For now, check if enrolled in any batch of this workshop
      const batch = await Batch.findOne({
        workshopId: video.workshopId,
        enrolledUsers: userId,
      });
      hasAccess = !!batch;
    }

    // Admin always has access
    if (decoded.isAdmin) {
      hasAccess = true;
    }

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'You do not have access to this video. Please enroll in the workshop.' },
        { status: 403 }
      );
    }

    // Device limit check (3 devices per user)
    const existingDevices = await UserDevice.find({
      userId,
      isActive: true,
    }).sort({ lastUsedAt: -1 });

    let currentDevice = existingDevices.find(d => d.fingerprint === deviceFingerprint);

    if (!currentDevice) {
      // New device
      if (existingDevices.length >= MAX_DEVICES) {
        // Remove oldest device to make room
        const oldestDevice = existingDevices[existingDevices.length - 1];
        await UserDevice.findByIdAndUpdate(oldestDevice._id, { isActive: false });
        console.log(`[Video Access] Removed oldest device for user ${userId}`);
      }

      // Add new device
      currentDevice = await UserDevice.create({
        userId,
        fingerprint: deviceFingerprint,
        userAgent,
        deviceName: parseDeviceName(userAgent),
        isActive: true,
        lastUsedAt: new Date(),
      });
      console.log(`[Video Access] New device registered for user ${userId}`);
    } else {
      // Update last used time
      await UserDevice.findByIdAndUpdate(currentDevice._id, { lastUsedAt: new Date() });
    }

    // Log the access
    await VideoAccessLog.create({
      videoId: video._id,
      userId,
      deviceId: currentDevice._id,
      watchDuration: 0,
      ipAddress: req.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown',
      userAgent,
    });

    // Generate signed URL
    const signedUrl = await getSignedUrl(
      s3,
      new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: video.s3Key,
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
        duration: video.duration,
        dayNumber: video.dayNumber,
      },
      deviceInfo: {
        deviceId: currentDevice._id,
        deviceName: currentDevice.deviceName,
        activeDevices: Math.min(existingDevices.length + 1, MAX_DEVICES),
        maxDevices: MAX_DEVICES,
      },
    });
  } catch (error: any) {
    console.error('[Video Stream Error]:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * Parse device name from user agent
 */
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
