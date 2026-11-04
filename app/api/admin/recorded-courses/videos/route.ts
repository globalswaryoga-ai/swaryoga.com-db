import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';
import { findBunnyVideoByTitle } from '@/lib/bunny-stream';

import { bunnyExecute, isBunnyDatabaseConfigured } from '@/lib/bunnyDatabase';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

function checkSuperAdminAccess(decoded: any | null): boolean {
  if (!decoded) return false;
  return isSuperAdmin(decoded);
}

/**
 * GET - List videos for a course
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let decoded: any;
    try {
      decoded = verifyToken(authHeader.split(' ')[1]);
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    if (!checkSuperAdminAccess(decoded)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const courseId = request.nextUrl.searchParams.get('courseId');
    if (!courseId) {
      return NextResponse.json({ error: 'Course ID required' }, { status: 400 });
    }


    if (isBunnyDatabaseConfigured()) {
      const res = await bunnyExecute({
        sql: 'SELECT * FROM course_videos_sql WHERE course_id = ? ORDER BY display_order ASC',
        args: [courseId],
      });

      const videos = res.rows.map((v: any) => {
        let contentObj: any = {};
        try { contentObj = v.content_json ? JSON.parse(String(v.content_json)) : {}; } catch {}

        return {
          _id: v.id,
          id: v.id,
          title: v.title,
          description: v.description,
          bunnyVideoId: v.bunny_video_id,
          duration: Number(v.duration) || 0,
          hoursGap: 0,
          order: Number(v.display_order) || 0,
          isFree: Boolean(v.is_free),
          isActive: Boolean(v.is_active),
          thumbnail: contentObj.thumbnail || '',
          transcript: v.transcript || contentObj.transcript || '',
          aiSummary: v.ai_summary || contentObj.aiSummary || '',
          ragEnabled: v.rag_enabled !== undefined ? Boolean(v.rag_enabled) : Boolean(contentObj.ragEnabled),
          transcriptI18n: contentObj.transcriptI18n,
          aiSummaryI18n: contentObj.aiSummaryI18n,
          content: contentObj,
        };
      });

      return NextResponse.json({
        success: true,
        videos,
      });
    }

    await connectDB();
    const CourseVideo = getCourseVideo();
    const videos = await CourseVideo.find({ courseId, isActive: true }).sort({ order: 1 }).lean();

    return NextResponse.json({
      success: true,
      videos: videos.map((v: any) => ({
        _id: v._id?.toString() || v._id,
        title: v.title,
        description: v.description,
        bunnyVideoId: v.bunnyVideoId,
        duration: v.duration,
        hoursGap: 0,
        order: v.order,
        isFree: v.isFree,
        isActive: v.isActive,
        thumbnail: (() => {
          const rawThumb = (v.content as any)?.thumbnail || (v.content as any)?.en?.thumbnail || (v as any).thumbnail || '';
          if (rawThumb) {
            return (rawThumb.includes('vz-') || rawThumb.includes('video.bunnycdn'))
              ? `/api/recorded-courses/thumbnail?url=${encodeURIComponent(rawThumb)}`
              : rawThumb;
          }
          return v.bunnyVideoId ? `/api/recorded-courses/thumbnail?vid=${v.bunnyVideoId}` : '';
        })(),
        transcript: '',
        aiSummary: '',
        ragEnabled: false,
      })),
    });
  } catch (error: any) {
    console.error('[Admin Videos GET Error]:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

/**
 * POST - Create new video
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let decoded: any;
    try {
      decoded = verifyToken(authHeader.split(' ')[1]);
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    if (!checkSuperAdminAccess(decoded)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { courseId, title, description, bunnyVideoId, bunnyLibraryId, videoUrl, duration = 0, isFree = false, thumbnail } = body;

    if (!courseId || !title || (!bunnyVideoId && !videoUrl)) {
      return NextResponse.json(
        { error: 'Missing required fields: courseId, title, and either bunnyVideoId or videoUrl' },
        { status: 400 }
      );
    }

    const course = await getCourseById(courseId);
    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    const existingVideos = await listVideosByCourse(courseId, true);

    const existingByTitle = existingVideos.find(
      (v) => v.title.trim().toLowerCase() === title.trim().toLowerCase()
    );
    if (existingByTitle) {
      return NextResponse.json(
        {
          error: 'A video with this title already exists in this course. Use a different title or delete the existing one.',
          existingId: existingByTitle.id,
          existingTitle: existingByTitle.title,
        },
        { status: 409 }
      );
    }

    if (bunnyVideoId) {
      const existingByBunnyId = existingVideos.find((v) => v.bunnyVideoId === bunnyVideoId);
      if (existingByBunnyId) {
        return NextResponse.json(
          { error: 'This video already exists in this course', existingId: existingByBunnyId.id },
          { status: 409 }
        );
      }
    }

    const nextOrder = existingVideos.length + 1;

    let finalThumbnail = thumbnail || '';
    if (!finalThumbnail && bunnyVideoId) {
      try {
        const apiKey = process.env.BUNNY_API_KEY;
        const libId = bunnyLibraryId || process.env.BUNNY_STREAM_LIBRARY_ID || '606386';
        if (apiKey) {
          const bRes = await fetch(`https://video.bunnycdn.com/library/${libId}/videos/${bunnyVideoId}`, {
            headers: { AccessKey: apiKey },
          });
          if (bRes.ok) {
            const bData = await bRes.json();
            finalThumbnail = bData.thumbnailUrl || (bData.thumbnailFileName ? `https://vz-d0769ece-079.b-cdn.net/${bunnyVideoId}/${bData.thumbnailFileName}` : '');
          }
        }
      } catch (e) {
        // ignore auto-thumb lookup failure
      }
    }

    const video = await saveVideo({
      courseId,
      title,
      description: description || '',
      bunnyVideoId: bunnyVideoId || '',
      videoUrl: videoUrl || '',
      duration: parseInt(duration) || 0,
      isFree: isFree === true,
      isActive: true,
      order: nextOrder,
      content: {
        thumbnail: finalThumbnail || undefined,
        bunnyLibraryId: bunnyLibraryId || undefined,
        en: { title, description: description || '', thumbnail: finalThumbnail || undefined },
      },
    });

    return NextResponse.json({
      success: true,
      video: {
        _id: video.id,
        id: video.id,
        title: video.title,
        bunnyVideoId: video.bunnyVideoId,
        videoUrl: video.videoUrl,
        duration: video.duration,
        isFree: video.isFree,
        thumbnail: finalThumbnail || undefined,
      },
    });
  } catch (error: any) {
    console.error('[Admin Videos POST Error]:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

/**
 * PUT - Update video
 */
export async function PUT(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let decoded: any;
    try {
      decoded = verifyToken(authHeader.split(' ')[1]);
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    if (!checkSuperAdminAccess(decoded)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { videoId, title, description, bunnyVideoId, bunnyLibraryId, videoUrl, duration, isFree, order, thumbnail } = body;

    if (!videoId) {
      return NextResponse.json({ error: 'Video ID required' }, { status: 400 });
    }


    if (isBunnyDatabaseConfigured()) {
      const existing = await bunnyExecute({
        sql: 'SELECT * FROM course_videos_sql WHERE id = ? LIMIT 1',
        args: [videoId],
      });

      if (existing.rows.length) {
        const row = existing.rows[0];
        let contentObj: any = {};
        try { contentObj = row.content_json ? JSON.parse(String(row.content_json)) : {}; } catch {}

        if (transcript !== undefined) contentObj.transcript = transcript;
        if (aiSummary !== undefined) contentObj.aiSummary = aiSummary;
        if (transcriptI18n !== undefined) contentObj.transcriptI18n = transcriptI18n;
        if (aiSummaryI18n !== undefined) contentObj.aiSummaryI18n = aiSummaryI18n;
        if (ragEnabled !== undefined) contentObj.ragEnabled = ragEnabled;
        if (title) {
          contentObj.en = contentObj.en || {};
          contentObj.en.title = title;
        }
        if (description !== undefined) {
          contentObj.en = contentObj.en || {};
          contentObj.en.description = description;
        }

        const now = new Date().toISOString();
        await bunnyExecute({
          sql: `UPDATE course_videos_sql 
                SET title = COALESCE(?, title),
                    description = COALESCE(?, description),
                    duration = COALESCE(?, duration),
                    is_free = COALESCE(?, is_free),
                    transcript = ?,
                    ai_summary = ?,
                    rag_enabled = ?,
                    content_json = ?,
                    updated_at = ?
                WHERE id = ?`,
          args: [
            title || null,
            description !== undefined ? description : null,
            duration !== undefined ? Number(duration) : null,
            isFree !== undefined ? (isFree ? 1 : 0) : null,
            transcript !== undefined ? String(transcript) : (row.transcript || null),
            aiSummary !== undefined ? String(aiSummary) : (row.ai_summary || null),
            ragEnabled !== undefined ? (ragEnabled ? 1 : 0) : (row.rag_enabled !== undefined ? row.rag_enabled : 1),
            JSON.stringify(contentObj),
            now,
            videoId,
          ],
        });

        return NextResponse.json({
          success: true,
          video: {
            _id: videoId,
            title: title || row.title,
            description: description !== undefined ? description : row.description,
            duration: duration !== undefined ? duration : row.duration,
            isFree: isFree !== undefined ? isFree : Boolean(row.is_free),
          },
        });
      }
    }

    const CourseVideo = getCourseVideo();

    const updateData: any = { updatedBy: decoded.email || decoded.userId };
    if (title) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (duration !== undefined) updateData.duration = parseInt(duration) || 0;
    if (hoursGap !== undefined) updateData.hoursGap = parseInt(hoursGap) || 0;
    if (isFree !== undefined) updateData.isFree = isFree === true;
    if (thumbnail !== undefined) updateData.thumbnail = thumbnail;
    if (transcript !== undefined) updateData.transcript = String(transcript || '');
    if (aiSummary !== undefined) updateData.aiSummary = String(aiSummary || '');
    if (transcriptI18n !== undefined && (transcriptI18n === null || typeof transcriptI18n === 'object')) updateData.transcriptI18n = transcriptI18n || undefined;
    if (aiSummaryI18n !== undefined && (aiSummaryI18n === null || typeof aiSummaryI18n === 'object')) updateData.aiSummaryI18n = aiSummaryI18n || undefined;
    if (ragEnabled !== undefined) updateData.ragEnabled = ragEnabled === true;

    const video = await CourseVideo.findByIdAndUpdate(videoId, updateData, { new: true });

    if (!video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    const finalThumb = thumbnail !== undefined
      ? thumbnail
      : ((existing.content as any)?.thumbnail || (existing.content as any)?.en?.thumbnail || existing.thumbnail || '');

    const resolvedLibId = bunnyLibraryId !== undefined
      ? bunnyLibraryId
      : ((existing.content as any)?.bunnyLibraryId || undefined);

    const updated = await saveVideo({
      id: videoId,
      courseId: existing.courseId,
      sectionId: existing.sectionId,
      title: title || existing.title,
      description: description !== undefined ? description : existing.description,
      bunnyVideoId: bunnyVideoId !== undefined ? bunnyVideoId : existing.bunnyVideoId,
      videoUrl: videoUrl !== undefined ? videoUrl : existing.videoUrl,
      duration: duration !== undefined ? parseInt(duration) || 0 : existing.duration,
      isFree: isFree !== undefined ? isFree === true : existing.isFree,
      accessType: existing.accessType,
      order: order !== undefined ? Number(order) : existing.order,
      isActive: existing.isActive,
      content: {
        ...existing.content,
        thumbnail: finalThumb || undefined,
        bunnyLibraryId: resolvedLibId,
        en: {
          ...(existing.content?.en || {}),
          title: title || existing.title,
          description: description !== undefined ? description : existing.description,
          thumbnail: finalThumb || undefined,
        },
      },
    });

    return NextResponse.json({
      success: true,
      video: {
        _id: updated.id,
        id: updated.id,
        title: updated.title,
        description: updated.description,
        bunnyVideoId: updated.bunnyVideoId,
        videoUrl: updated.videoUrl,
        duration: updated.duration,
        isFree: updated.isFree,
        thumbnail: finalThumb || undefined,
      },
    });
  } catch (error: any) {
    console.error('[Admin Videos PUT Error]:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

/**
 * PATCH - Update video order only
 */
export async function PATCH(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let decoded: any;
    try {
      decoded = verifyToken(authHeader.split(' ')[1]);
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    if (!checkSuperAdminAccess(decoded)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { videoId, order } = body;

    if (!videoId || order === undefined) {
      return NextResponse.json({ error: 'Video ID and order required' }, { status: 400 });
    }

    const existing = await getVideoById(videoId);
    if (!existing) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    const updated = await saveVideo({
      ...existing,
      order: Number(order),
    });

    return NextResponse.json({
      success: true,
      videoId: updated.id,
      order: updated.order,
    });
  } catch (error: any) {
    console.error('[Admin Videos PATCH Error]:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

/**
 * DELETE - Delete video
 */
export async function DELETE(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let decoded: any;
    try {
      decoded = verifyToken(authHeader.split(' ')[1]);
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    if (!checkSuperAdminAccess(decoded)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const videoId = request.nextUrl.searchParams.get('id');
    if (!videoId) {
      return NextResponse.json({ error: 'Video ID required' }, { status: 400 });
    }


    if (isBunnyDatabaseConfigured()) {
      const existing = await bunnyExecute({
        sql: 'SELECT * FROM course_videos_sql WHERE id = ? LIMIT 1',
        args: [videoId],
      });

      if (existing.rows.length) {
        const row = existing.rows[0];
        let contentObj: any = {};
        try { contentObj = row.content_json ? JSON.parse(String(row.content_json)) : {}; } catch {}

        if (transcript !== undefined) contentObj.transcript = transcript;
        if (aiSummary !== undefined) contentObj.aiSummary = aiSummary;
        if (transcriptI18n !== undefined) contentObj.transcriptI18n = transcriptI18n;
        if (aiSummaryI18n !== undefined) contentObj.aiSummaryI18n = aiSummaryI18n;
        if (ragEnabled !== undefined) contentObj.ragEnabled = ragEnabled;
        if (title) {
          contentObj.en = contentObj.en || {};
          contentObj.en.title = title;
        }
        if (description !== undefined) {
          contentObj.en = contentObj.en || {};
          contentObj.en.description = description;
        }

        const now = new Date().toISOString();
        await bunnyExecute({
          sql: `UPDATE course_videos_sql 
                SET title = COALESCE(?, title),
                    description = COALESCE(?, description),
                    duration = COALESCE(?, duration),
                    is_free = COALESCE(?, is_free),
                    transcript = ?,
                    ai_summary = ?,
                    rag_enabled = ?,
                    content_json = ?,
                    updated_at = ?
                WHERE id = ?`,
          args: [
            title || null,
            description !== undefined ? description : null,
            duration !== undefined ? Number(duration) : null,
            isFree !== undefined ? (isFree ? 1 : 0) : null,
            transcript !== undefined ? String(transcript) : (row.transcript || null),
            aiSummary !== undefined ? String(aiSummary) : (row.ai_summary || null),
            ragEnabled !== undefined ? (ragEnabled ? 1 : 0) : (row.rag_enabled !== undefined ? row.rag_enabled : 1),
            JSON.stringify(contentObj),
            now,
            videoId,
          ],
        });

        return NextResponse.json({
          success: true,
          video: {
            _id: videoId,
            title: title || row.title,
            description: description !== undefined ? description : row.description,
            duration: duration !== undefined ? duration : row.duration,
            isFree: isFree !== undefined ? isFree : Boolean(row.is_free),
          },
        });
      }
    }

    const CourseVideo = getCourseVideo();
    const RecordedCourse = getRecordedCourse();

    const video = await CourseVideo.findByIdAndUpdate(
      videoId,
      { isActive: false, deletedAt: new Date(), deletedBy: decoded.email || decoded.userId },
      { new: true }
    );

    if (!video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Video deleted',
    });
  } catch (error: any) {
    console.error('[Admin Videos DELETE Error]:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
