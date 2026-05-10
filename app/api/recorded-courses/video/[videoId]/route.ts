/**
 * Course Video Streaming API
 * GET /api/recorded-courses/video/[videoId] - Get video streaming URL
 * POST /api/recorded-courses/video/[videoId]/progress - Update watch progress
 */

import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import {
  getRecordedCourse,
  getCourseVideo,
  getCourseEnrollment,
  getVideoWatchLog,
  getCourseDevice,
} from '@/lib/schemas/recordedCourseSchemas';

export const dynamic = 'force-dynamic';


interface RouteParams {
  params: Promise<{ videoId: string }>;
}

/**
 * GET - Get video streaming data
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await connectDB();
    
    const { videoId } = await params;
    
    // Auth required
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const decoded = verifyToken(authHeader.split(' ')[1]);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    
    const userId = decoded.id || decoded._id || decoded.userId;
    
    const CourseVideo = getCourseVideo();
    const RecordedCourse = getRecordedCourse();
    const CourseEnrollment = getCourseEnrollment();
    const VideoWatchLog = getVideoWatchLog();
    const CourseDevice = getCourseDevice();
    
    // Get video
    const video = await CourseVideo.findById(videoId);
    if (!video || !video.isActive) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }
    
    // Get course
    const course = await RecordedCourse.findById(video.courseId);
    if (!course || !course.isActive) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }
    
    // Check if video is free (isFree flag takes precedence)
    const isFreeAccess = video.isFree === true;

    if (!isFreeAccess) {
      // Check enrollment
      const enrollment = await CourseEnrollment.findOne({
        userId: userId,
        courseId: course._id,
        status: { $in: ['active', 'completed'] },
      });
      
      if (!enrollment) {
        return NextResponse.json({ 
          error: 'Not enrolled in this course',
          requiresEnrollment: true,
        }, { status: 403 });
      }
      
      // Check if using gift hours and they're exhausted
      if (enrollment.giftHoursRemaining !== undefined && enrollment.giftHoursRemaining <= 0 && enrollment.purchaseType === 'gift') {
        return NextResponse.json({ 
          error: 'Gift hours exhausted',
          giftHoursExhausted: true,
          requiresPayment: true,
          usedHours: enrollment.giftHoursUsed,
          totalHours: enrollment.giftHoursUsed + enrollment.giftHoursRemaining,
        }, { status: 403 });
      }
      
      // Check access expiration
      if (enrollment.expiresAt && new Date(enrollment.expiresAt) < new Date()) {
        return NextResponse.json({ 
          error: 'Course access expired',
          accessExpired: true,
        }, { status: 403 });
      }
      
      // Check device limits
      if (course.accessSettings?.maxDevices) {
        const userAgent = request.headers.get('user-agent') || 'unknown';
        const fingerprint = request.nextUrl.searchParams.get('deviceId') || 
          Buffer.from(userAgent).toString('base64').slice(0, 32);
        
        // Check existing devices
        const existingDevices = await CourseDevice.find({
          userId: userId,
          courseId: course._id,
          isActive: true,
        }).sort({ lastUsedAt: -1 });
        
        const currentDevice = existingDevices.find((d: any) => d.fingerprint === fingerprint);
        
        if (!currentDevice && existingDevices.length >= course.accessSettings.maxDevices) {
          return NextResponse.json({ 
            error: 'Device limit reached',
            maxDevices: course.accessSettings.maxDevices,
            currentDevices: existingDevices.length,
          }, { status: 403 });
        }
        
        // Register or update device
        if (!currentDevice) {
          await CourseDevice.create({
            userId: userId,
            courseId: course._id,
            fingerprint,
            deviceName: parseDeviceName(userAgent),
            deviceInfo: userAgent,
            ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown',
            lastUsedAt: new Date(),
            registeredAt: new Date(),
          });
        } else {
          await CourseDevice.findByIdAndUpdate(currentDevice._id, {
            lastUsedAt: new Date(),
          });
        }
      }
    }
    
    // Get video streaming URL
    let streamingData: any = {};

    if (video.videoUrl) {
      streamingData = { directUrl: video.videoUrl };
    } else if (video.bunnyVideoId) {
      const libraryId = process.env.BUNNY_STREAM_LIBRARY_ID || process.env.BUNNY_LIBRARY_ID || '';
      // Generate HLS URL for Bunny Stream
      const hlsUrl = `https://vz-${libraryId}.b-cdn.net/${video.bunnyVideoId}/playlist.m3u8`;
      streamingData = {
        hlsUrl,
        bunnyVideoId: video.bunnyVideoId,
        bunnyLibraryId: libraryId,
      };
    }
    
    // Create watch log entry
    const watchLog = await VideoWatchLog.create({
      userId: userId,
      courseId: course._id,
      videoId: video._id,
      startTime: new Date(),
      ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
    });
    
    return NextResponse.json({
      success: true,
      video: {
        _id: video._id,
        title: video.content?.en?.title || '',
        duration: video.duration,
        order: video.order,
        sectionId: video.sectionId,
      },
      streaming: streamingData,
      watchLogId: watchLog._id,
      courseSettings: {
        allowDownload: course.accessSettings?.allowDownload || false,
        allowScreenRecording: course.accessSettings?.allowScreenRecording || false,
      },
    });
    
  } catch (error: any) {
    console.error('[Video Streaming Error]:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

/**
 * POST - Update video watch progress
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    await connectDB();
    
    const { videoId } = await params;
    
    // Auth required
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const decoded = verifyToken(authHeader.split(' ')[1]);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    
    const userId = decoded.id || decoded._id || decoded.userId;
    
    const body = await request.json();
    const { 
      watchedSeconds, 
      completed = false,
      watchLogId,
    } = body;
    
    const CourseVideo = getCourseVideo();
    const RecordedCourse = getRecordedCourse();
    const CourseEnrollment = getCourseEnrollment();
    const VideoWatchLog = getVideoWatchLog();
    
    // Get video
    const video = await CourseVideo.findById(videoId);
    if (!video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }
    
    // Get enrollment
    const enrollment = await CourseEnrollment.findOne({
      userId: userId,
      courseId: video.courseId,
      status: { $in: ['active', 'completed'] },
    });
    
    if (!enrollment) {
      return NextResponse.json({ error: 'Not enrolled' }, { status: 403 });
    }
    
    // Update watch log
    if (watchLogId) {
      await VideoWatchLog.findByIdAndUpdate(watchLogId, {
        endTime: new Date(),
        watchedSeconds: watchedSeconds || 0,
        completedWatch: completed,
      });
    }
    
    // Update gift hours usage if using gift access
    if (enrollment.purchaseType === 'gift' && enrollment.giftHoursRemaining > 0 && watchedSeconds > 0) {
      const addedHours = watchedSeconds / 3600;
      await CourseEnrollment.findByIdAndUpdate(enrollment._id, {
        $inc: { 
          giftHoursUsed: addedHours,
          giftHoursRemaining: -addedHours,
          totalWatchTime: watchedSeconds,
        },
      });
    } else {
      // Just update total watch time
      await CourseEnrollment.findByIdAndUpdate(enrollment._id, {
        $inc: { totalWatchTime: watchedSeconds || 0 },
      });
    }
    
    // Mark video as watched if completed
    const videoIdStr = video._id.toString();
    const isAlreadyWatched = enrollment.videosWatched?.some(
      (v: any) => v.toString() === videoIdStr
    );
    
    if (completed && !isAlreadyWatched) {
      await CourseEnrollment.findByIdAndUpdate(enrollment._id, {
        $addToSet: { videosWatched: video._id },
        lastWatchedVideoId: video._id,
        lastWatchedAt: new Date(),
      });
      
      // Recalculate progress
      const course = await RecordedCourse.findById(video.courseId);
      const totalVideos = course?.totalVideos || 1;
      
      const updatedEnrollment = await CourseEnrollment.findById(enrollment._id);
      const watchedCount = updatedEnrollment?.videosWatched?.length || 0;
      const progress = Math.round((watchedCount / totalVideos) * 100);
      
      await CourseEnrollment.findByIdAndUpdate(enrollment._id, {
        progress,
        status: progress >= 100 ? 'completed' : 'active',
      });
    } else {
      // Just update last watched
      await CourseEnrollment.findByIdAndUpdate(enrollment._id, {
        lastWatchedVideoId: video._id,
        lastWatchedAt: new Date(),
      });
    }
    
    // Get updated enrollment
    const updatedEnrollment = await CourseEnrollment.findById(enrollment._id);
    
    return NextResponse.json({
      success: true,
      progress: updatedEnrollment?.progress || 0,
      videosWatched: updatedEnrollment?.videosWatched?.length || 0,
      giftHoursRemaining: updatedEnrollment?.giftHoursRemaining,
    });
    
  } catch (error: any) {
    console.error('[Video Progress Error]:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// Helper to parse device name from user agent
function parseDeviceName(userAgent: string): string {
  if (userAgent.includes('iPhone')) return 'iPhone';
  if (userAgent.includes('iPad')) return 'iPad';
  if (userAgent.includes('Android')) return 'Android Device';
  if (userAgent.includes('Windows')) return 'Windows PC';
  if (userAgent.includes('Mac')) return 'Mac';
  if (userAgent.includes('Linux')) return 'Linux PC';
  return 'Unknown Device';
}
