/**
 * Admin API for Recorded Courses Management
 * GET /api/admin/recorded-courses - List all courses (admin)
 * POST /api/admin/recorded-courses - Create new course
 * PUT /api/admin/recorded-courses - Update course
 * DELETE /api/admin/recorded-courses - Delete course
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';
import { bunnyExecute, isBunnyDatabaseConfigured } from '@/lib/bunnyDatabase';

export const dynamic = 'force-dynamic';

// Check superadmin access - E-Learning management is superadmin only
function checkSuperAdminAccess(decoded: any | null): boolean {
  if (!decoded) return false;
  return isSuperAdmin(decoded);
}

/**
 * GET - List all courses for admin
 */
export async function GET(request: NextRequest) {
  try {
    // Auth required
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
    
    const courseId = request.nextUrl.searchParams.get('id');

    if (isBunnyDatabaseConfigured()) {
      if (courseId) {
        const courseRes = await bunnyExecute({
          sql: 'SELECT * FROM recorded_courses_sql WHERE id = ? OR slug = ? LIMIT 1',
          args: [courseId, courseId],
        });

        if (!courseRes.rows.length) {
          return NextResponse.json({ error: 'Course not found' }, { status: 404 });
        }

        const rawCourse = courseRes.rows[0];
        let content = {};
        try { content = rawCourse.content_json ? JSON.parse(String(rawCourse.content_json)) : {}; } catch {}

        const course = {
          _id: rawCourse.id,
          id: rawCourse.id,
          slug: rawCourse.slug,
          isActive: Boolean(rawCourse.is_active),
          isPublished: Boolean(rawCourse.is_published),
          order: Number(rawCourse.display_order) || 0,
          content,
          thumbnail: rawCourse.thumbnail,
          totalDuration: Number(rawCourse.total_duration) || 0,
        };

        const [sectionsRes, videosRes, materialsRes] = await Promise.all([
          bunnyExecute({ sql: 'SELECT * FROM course_sections_sql WHERE course_id = ? ORDER BY display_order ASC', args: [course._id] }),
          bunnyExecute({ sql: 'SELECT * FROM course_videos_sql WHERE course_id = ? ORDER BY display_order ASC', args: [course._id] }),
          bunnyExecute({ sql: 'SELECT * FROM course_materials_sql WHERE course_id = ? ORDER BY display_order ASC', args: [course._id] }),
        ]);

        const sections = sectionsRes.rows.map((r) => {
          let c = {};
          try { c = r.content_json ? JSON.parse(String(r.content_json)) : {}; } catch {}
          return { _id: r.id, id: r.id, order: Number(r.display_order) || 0, content: c, title: (c as any)?.en?.title || r.id };
        });

        const videos = videosRes.rows.map((r) => {
          let c = {};
          try { c = r.content_json ? JSON.parse(String(r.content_json)) : {}; } catch {}
          return {
            _id: r.id,
            id: r.id,
            title: r.title,
            description: r.description,
            bunnyVideoId: r.bunny_video_id,
            videoUrl: r.video_url,
            duration: Number(r.duration) || 0,
            isFree: Boolean(r.is_free),
            order: Number(r.display_order) || 0,
            content: c,
            transcript: r.transcript,
            aiSummary: r.ai_summary,
            ragEnabled: Boolean(r.rag_enabled),
          };
        });

        return NextResponse.json({
          success: true,
          course,
          sections,
          videos,
          materials: materialsRes.rows,
          assignments: [],
          enrollmentCount: 0,
        });
      }

      // List all courses
      const coursesRes = await bunnyExecute('SELECT * FROM recorded_courses_sql ORDER BY display_order ASC, created_at DESC');
      const courses = coursesRes.rows.map((r) => {
        let content = {};
        try { content = r.content_json ? JSON.parse(String(r.content_json)) : {}; } catch {}
        return {
          _id: r.id,
          id: r.id,
          slug: r.slug,
          isActive: Boolean(r.is_active),
          isPublished: Boolean(r.is_published),
          order: Number(r.display_order) || 0,
          content,
          thumbnail: r.thumbnail,
          totalDuration: Number(r.total_duration) || 0,
        };
      });

      return NextResponse.json({
        success: true,
        courses,
      });
    }

    return NextResponse.json({ success: true, courses: [] });
  } catch (error: any) {
    console.error('[Admin Courses GET Error]:', error);
    return NextResponse.json({ error: error?.message || 'Server error' }, { status: 500 });
  }
}

/**
 * POST - Create new course
 */
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    // Auth required
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
    const RecordedCourse = getRecordedCourse();
    
    // Generate slug if not provided
    if (!body.slug && body.content?.en?.title) {
      body.slug = body.content.en.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
    }
    
    // Check slug uniqueness
    const existingCourse = await RecordedCourse.findOne({ slug: body.slug });
    if (existingCourse) {
      body.slug = `${body.slug}-${Date.now().toString(36)}`;
    }
    
    const course = await RecordedCourse.create({
      ...body,
      createdBy: decoded.id,
    });
    
    return NextResponse.json({
      success: true,
      course,
    });
    
  } catch (error: any) {
    console.error('[Admin Courses POST Error]:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

/**
 * PUT - Update course
 */
export async function PUT(request: NextRequest) {
  try {
    await connectDB();
    
    // Auth required
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
    const { courseId, ...updateData } = body;
    
    if (!courseId) {
      return NextResponse.json({ error: 'Course ID required' }, { status: 400 });
    }
    
    const RecordedCourse = getRecordedCourse();

    // Safe merge for accessSettings - convert to dot notation to avoid clobbering other settings
    if (updateData.accessSettings) {
      for (const [key, value] of Object.entries(updateData.accessSettings)) {
        updateData[`accessSettings.${key}`] = value;
      }
      delete updateData.accessSettings;
    }

    const course = await RecordedCourse.findByIdAndUpdate(
      courseId,
      { ...updateData, updatedBy: decoded.id },
      { new: true }
    );
    
    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }
    
    return NextResponse.json({
      success: true,
      course,
    });
    
  } catch (error: any) {
    console.error('[Admin Courses PUT Error]:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

/**
 * DELETE - Delete course (soft delete)
 */
export async function DELETE(request: NextRequest) {
  try {
    await connectDB();
    
    // Auth required
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
    
    const courseId = request.nextUrl.searchParams.get('id');
    if (!courseId) {
      return NextResponse.json({ error: 'Course ID required' }, { status: 400 });
    }
    
    const RecordedCourse = getRecordedCourse();
    
    // Soft delete
    const course = await RecordedCourse.findByIdAndUpdate(
      courseId,
      { isActive: false, deletedAt: new Date(), deletedBy: decoded.id },
      { new: true }
    );
    
    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }
    
    return NextResponse.json({
      success: true,
      message: 'Course deleted',
    });
    
  } catch (error: any) {
    console.error('[Admin Courses DELETE Error]:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
