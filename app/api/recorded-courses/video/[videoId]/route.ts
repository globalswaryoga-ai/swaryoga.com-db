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
  let videoId = '';
  try {
    await connectDB();

    const resolved = await params;
    videoId = resolved.videoId;

    // Auth optional (required for paid videos, optional for free)
    let decoded: any = null;
    let userId: string | null = null;
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      try {
        decoded = verifyToken(authHeader.split(' ')[1]);
        userId = decoded?.id || decoded?._id || decoded?.userId || null;
      } catch (err) {
        // Invalid token, continue as guest
      }
    }
    
    const CourseVideo = getCourseVideo();
    const RecordedCourse = getRecordedCourse();
    const CourseEnrollment = getCourseEnrollment();
    const VideoWatchLog = getVideoWatchLog();
    const CourseDevice = getCourseDevice();
    
    try {
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

      if (!isFreeAccess && userId) {
        // Only check enrollment for paid videos if user is logged in
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
      } else if (!isFreeAccess && !userId) {
        // Paid video without enrollment
        return NextResponse.json({
          error: 'Enrollment required',
          requiresEnrollment: true,
        }, { status: 403 });
      }

      // Get video streaming URL
      let streamingData: any = {};

      if (video.videoUrl) {
        streamingData = { directUrl: video.videoUrl };
      } else if (video.bunnyVideoId) {
        const libraryId = process.env.BUNNY_STREAM_LIBRARY_ID || process.env.BUNNY_LIBRARY_ID || '';
        if (!libraryId) {
          console.warn('[Video API] BUNNY_STREAM_LIBRARY_ID not configured');
          return NextResponse.json({
            error: 'Video streaming not configured'
          }, { status: 500 });
        }
        // Use Bunny mediadelivery player (iframe) to avoid CORS issues
        // This is the same approach Sadhana uses
        const playerUrl = `https://player.mediadelivery.net/play/${libraryId}/${video.bunnyVideoId}`;
        streamingData = {
          playerUrl,
          bunnyVideoId: video.bunnyVideoId,
          bunnyLibraryId: libraryId,
        };
      }

      // Create watch log entry (only if user is authenticated)
      let watchLogId: any = null;
      if (userId) {
        try {
          const watchLog = await VideoWatchLog.create({
            userId: userId,
            courseId: course._id,
            videoId: video._id,
            startTime: new Date(),
            ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown',
            userAgent: request.headers.get('user-agent') || 'unknown',
          });
          watchLogId = watchLog._id;
        } catch (logErr) {
          console.warn('[Video API] Failed to create watch log:', logErr);
          // Don't fail the request if watch log creation fails
        }
      }

      return NextResponse.json({
        success: true,
        video: {
          _id: video._id,
          title: video.content?.en?.title || '',
          description: video.description || video.content?.en?.description || '',
          duration: video.duration,
          order: video.order,
          sectionId: video.sectionId,
          ragEnabled: video.ragEnabled === true,
          hasRagContent: !!(video.transcript || video.aiSummary || video.description || video.content?.en?.description),
        },
        streaming: streamingData,
        watchLogId: watchLogId,
        courseSettings: {
          allowDownload: course.accessSettings?.allowDownload || false,
          allowScreenRecording: course.accessSettings?.allowScreenRecording || false,
        },
      });
    } catch (innerError: any) {
      console.error('[Video Streaming Inner Error]:', {
        message: innerError?.message,
        stack: innerError?.stack,
        videoId,
      });
      throw innerError;
    }
    
  } catch (error: any) {
    console.error('[Video Streaming Error]:', {
      message: error?.message,
      stack: error?.stack,
      videoId,
    });
    return NextResponse.json({
      error: 'Server error',
      details: error?.message || 'Unknown error'
    }, { status: 500 });
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
