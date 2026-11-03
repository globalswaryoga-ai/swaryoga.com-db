<<<<<<< HEAD
/**
 * Recorded Courses API (BunnyDB)
 * GET /api/recorded-courses - List all published courses
 * GET /api/recorded-courses?slug=xxx - Get specific course details
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, TokenPayload } from '@/lib/auth';
import {
  listCourses,
  getCourseBySlug,
  listSectionsByCourse,
  listVideosByCourse,
  listMaterialsByCourse,
  listAssignmentsByCourse,
  getEnrollment,
  listEnrollmentsByUser,
  countVideosByCourse,
} from '@/lib/bunnyCourseRepository';
import { getOrdersByUser } from '@/lib/bunnyWebsiteRepository';
import { bunnyExecute } from '@/lib/bunnyDatabase';
=======
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, TokenPayload } from '@/lib/auth';
import { bunnyExecute, isBunnyDatabaseConfigured } from '@/lib/bunnyDatabase';
>>>>>>> 9f221716 (feat(rag-video): migrate to Bunny DB, replace HeyGen with Replicate & OpenAI, add MP4 Whisper transcription)

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

<<<<<<< HEAD
=======
// Helper to get user-preferred language (supports all languages, falls back to EN for unsupported)
>>>>>>> 9f221716 (feat(rag-video): migrate to Bunny DB, replace HeyGen with Replicate & OpenAI, add MP4 Whisper transcription)
function getPreferredLanguage(request: NextRequest): string {
  const langParam = request.nextUrl.searchParams.get('lang');
  if (langParam) {
    return langParam.toLowerCase();
  }
  const acceptLang = request.headers.get('accept-language') || '';
  if (acceptLang.includes('hi')) return 'hi';
  if (acceptLang.includes('mr')) return 'mr';
  if (acceptLang.includes('ne')) return 'ne';
  return 'en';
}

function getLocalizedContent(content: any, lang: string) {
  if (!content) return {};
  const localContent = content[lang] || content.en || {};
  const enContent = content.en || {};

  return {
    title: localContent.title || enContent.title || '',
    subtitle: localContent.subtitle || enContent.subtitle || '',
    description: localContent.description || enContent.description || '',
    whatYouWillLearn: localContent.whatYouWillLearn?.length ? localContent.whatYouWillLearn : enContent.whatYouWillLearn,
    requirements: localContent.requirements?.length ? localContent.requirements : enContent.requirements,
    targetAudience: localContent.targetAudience?.length ? localContent.targetAudience : enContent.targetAudience,
  };
}

// In-memory cache for course structures (30s TTL)
const courseStructureCache = new Map<string, {
  course: any;
  sections: any[];
  videos: any[];
  materials: any[];
  assignments: any[];
  expiresAt: number;
}>();

export async function GET(request: NextRequest) {
  try {
    const slug = request.nextUrl.searchParams.get('slug');
    const folderId = request.nextUrl.searchParams.get('folderId');
    const lang = getPreferredLanguage(request);

<<<<<<< HEAD
=======
    // Auth check (optional - for enrollment status)
>>>>>>> 9f221716 (feat(rag-video): migrate to Bunny DB, replace HeyGen with Replicate & OpenAI, add MP4 Whisper transcription)
    let decoded: TokenPayload | null = null;
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      try {
        decoded = verifyToken(authHeader.split(' ')[1]);
      } catch {
        // Token invalid, continue as guest
      }
    }
<<<<<<< HEAD

    const userId = (decoded as any)?.id || (decoded as any)?._id || (decoded as any)?.userId;
=======
    const userId = decoded?.id || decoded?._id || decoded?.userId;
>>>>>>> 9f221716 (feat(rag-video): migrate to Bunny DB, replace HeyGen with Replicate & OpenAI, add MP4 Whisper transcription)

    // ============================================
    // BUNNY DATABASE (LIB-SQL)
    // ============================================
<<<<<<< HEAD
    if (slug) {
      const now = Date.now();
      const cached = courseStructureCache.get(slug);

      let course: any;
      let sections: any[];
      let videos: any[];
      let materials: any[];
      let assignments: any[];

      if (cached && cached.expiresAt > now) {
        course = cached.course;
        sections = cached.sections;
        videos = cached.videos;
        materials = cached.materials;
        assignments = cached.assignments;
      } else {
        course = await getCourseBySlug(slug);

        if (!course || !course.isActive || !course.isPublished) {
          return NextResponse.json({ error: 'Course not found' }, { status: 404 });
        }

        [sections, videos, materials, assignments] = await Promise.all([
          listSectionsByCourse(course.id),
          listVideosByCourse(course.id, true),
          listMaterialsByCourse(course.id, true),
          listAssignmentsByCourse(course.id, true),
        ]);

        courseStructureCache.set(slug, {
          course,
          sections,
          videos,
          materials,
          assignments,
          expiresAt: now + 30000,
        });
      }

      let enrollment: any = null;
      let canAccessPaidContent = course.isFree;

      if (userId) {
        enrollment = await getEnrollment(String(userId), course.id);
        if (enrollment) {
          canAccessPaidContent = true;
        } else {
          // Check completed orders for user in BunnyDB
          try {
            const userOrders = await getOrdersByUser(String(userId));
            const paid = userOrders.find(
              (o) => String(o.courseId) === course.id && o.paymentStatus === 'completed'
            );
            if (paid) {
              canAccessPaidContent = true;
            }
          } catch {
            // ignore
=======
    if (isBunnyDatabaseConfigured()) {
      if (slug) {
        const courseRes = await bunnyExecute({
          sql: 'SELECT * FROM recorded_courses_sql WHERE slug = ? OR id = ? LIMIT 1',
          args: [slug, slug],
        });

        if (!courseRes.rows.length) {
          return NextResponse.json({ error: 'Course not found' }, { status: 404 });
        }

        const rawCourse = courseRes.rows[0];
        let dataObj: any = {};
        try {
          dataObj = rawCourse.data_json ? JSON.parse(String(rawCourse.data_json)) : {};
        } catch {}
        let contentObj: any = {};
        try {
          contentObj = rawCourse.content_json ? JSON.parse(String(rawCourse.content_json)) : {};
        } catch {}
        let pricingObj: any = {};
        try {
          pricingObj = rawCourse.pricing_json ? JSON.parse(String(rawCourse.pricing_json)) : {};
        } catch {}
        let giftHoursObj: any = {};
        try {
          giftHoursObj = rawCourse.gift_hours_json ? JSON.parse(String(rawCourse.gift_hours_json)) : {};
        } catch {}

        const courseId = rawCourse.id;

        const [sectionsRes, videosRes, materialsRes] = await Promise.all([
          bunnyExecute({
            sql: 'SELECT * FROM course_sections_sql WHERE course_id = ? AND is_active = 1 ORDER BY display_order ASC',
            args: [courseId],
          }),
          bunnyExecute({
            sql: 'SELECT * FROM course_videos_sql WHERE course_id = ? AND is_active = 1 ORDER BY display_order ASC',
            args: [courseId],
          }),
          bunnyExecute({
            sql: 'SELECT * FROM course_materials_sql WHERE course_id = ? AND is_active = 1 ORDER BY display_order ASC',
            args: [courseId],
          }),
        ]);

        // Check user enrollment
        let enrollment: any = null;
        let canAccessPaidContent = Boolean(rawCourse.is_free);

        if (userId) {
          const enrollRes = await bunnyExecute({
            sql: `SELECT * FROM course_enrollments_sql 
                  WHERE user_id = ? AND course_id = ? AND status IN ('active', 'completed') LIMIT 1`,
            args: [userId, courseId],
          });
          if (enrollRes.rows.length) {
            enrollment = enrollRes.rows[0];
            canAccessPaidContent = true;
>>>>>>> 9f221716 (feat(rag-video): migrate to Bunny DB, replace HeyGen with Replicate & OpenAI, add MP4 Whisper transcription)
          }
        }

        const giftHoursAvailable = giftHoursObj?.enabled && !enrollment;

        const localizedCourse = {
          _id: courseId,
          id: courseId,
          slug: rawCourse.slug,
          thumbnail: rawCourse.thumbnail,
          level: rawCourse.level,
          category: rawCourse.category,
          totalDuration: Number(rawCourse.total_duration) || 0,
          pricing: pricingObj,
          isFree: Boolean(rawCourse.is_free),
          giftHours: giftHoursObj,
          videoLanguage: rawCourse.video_language,
          ...dataObj,
          ...getLocalizedContent(contentObj, lang),
          content: undefined,
        };

        const localizedSections = sectionsRes.rows.map((s: any) => {
          let c: any = {};
          try {
            c = s.content_json ? JSON.parse(String(s.content_json)) : {};
          } catch {}
          return {
            _id: s.id,
            id: s.id,
            order: Number(s.display_order) || 0,
            ...getLocalizedContent(c, lang),
            content: undefined,
          };
        });

        const localizedVideos = videosRes.rows.map((v: any) => {
          let c: any = {};
          try {
            c = v.content_json ? JSON.parse(String(v.content_json)) : {};
          } catch {}
          const isFreeVideo = Boolean(v.is_free);
          const canWatch = isFreeVideo || canAccessPaidContent;

          return {
            _id: v.id,
            id: v.id,
            title: v.title,
            description: v.description,
            duration: Number(v.duration) || 0,
            order: Number(v.display_order) || 0,
            isFree: isFreeVideo,
            transcript: v.transcript,
            aiSummary: v.ai_summary,
            ragEnabled: Boolean(v.rag_enabled),
            videoUrl: canWatch ? v.video_url : undefined,
            bunnyVideoId: canWatch ? v.bunny_video_id : undefined,
            canWatch,
            isLocked: !canWatch,
            ...getLocalizedContent(c, lang),
            content: undefined,
          };
        });

        const localizedMaterials = materialsRes.rows.map((m: any) => {
          let c: any = {};
          try {
            c = m.content_json ? JSON.parse(String(m.content_json)) : {};
          } catch {}
          return {
            _id: m.id,
            id: m.id,
            title: m.title,
            order: Number(m.display_order) || 0,
            fileType: m.file_type,
            fileSize: m.file_size,
            fileUrl: canAccessPaidContent ? m.file_url : undefined,
            ragText: m.rag_text,
            ...getLocalizedContent(c, lang),
            content: undefined,
          };
        });

        return NextResponse.json({
          success: true,
          course: localizedCourse,
          sections: localizedSections,
          videos: localizedVideos,
          materials: localizedMaterials,
          reviews: [],
          enrollment,
          canAccessPaidContent,
          giftHoursAvailable,
          isLoggedIn: !!decoded,
          language: lang,
        });
      }

<<<<<<< HEAD
      const giftHoursAvailable = Boolean(course.giftHours?.enabled && !enrollment);

      const localizedCourse = {
        ...course,
        totalVideos:
          course.totalVideos !== undefined && course.totalVideos > 0
            ? course.totalVideos
            : (course.data?.totalVideos !== undefined && course.data.totalVideos > 0
                ? course.data.totalVideos
                : videos.length),
        ...getLocalizedContent(course.content, lang),
        content: undefined,
      };

      const localizedSections = sections.map((s) => ({
        ...s,
        ...getLocalizedContent(s.content, lang),
        content: undefined,
      }));

      const disabledVideoIds = Array.isArray(enrollment?.data?.disabledVideoIds)
        ? enrollment.data.disabledVideoIds
        : Array.isArray((enrollment as any)?.disabledVideoIds)
        ? (enrollment as any).disabledVideoIds
        : [];
      const videoGiftTimes = enrollment?.data?.videoGiftTimes || (enrollment as any)?.videoGiftTimes || {};

      const localizedVideos = videos.map((v) => {
        const isDisabledByAdmin = disabledVideoIds.includes(v.id);
        const isFree = Boolean(v.isFree || course.isFree);
        const hasAccess = (isFree || canAccessPaidContent) && !isDisabledByAdmin;
        const localized = getLocalizedContent(v.content, lang);
        const rawThumbnail =
          (v as any).thumbnail ||
          (localized as any).thumbnail ||
          (v.content as any)?.thumbnail ||
          '';

        let thumbnail = '';
        if (rawThumbnail && (rawThumbnail.includes('vz-') || rawThumbnail.includes('video.bunnycdn'))) {
          thumbnail = `/api/recorded-courses/thumbnail?url=${encodeURIComponent(rawThumbnail)}&fallback=${encodeURIComponent(course.thumbnail || '')}`;
        } else if (rawThumbnail) {
          thumbnail = rawThumbnail;
        } else if (v.bunnyVideoId) {
          thumbnail = `/api/recorded-courses/thumbnail?vid=${v.bunnyVideoId}&fallback=${encodeURIComponent(course.thumbnail || '')}`;
        } else {
          thumbnail = course.thumbnail || '';
        }

        return {
          ...v,
          title: localized.title || v.title || '',
          description: (localized.description && localized.description.trim()) ? localized.description : (v.description || ''),
          thumbnail,
          content: undefined,
          isFree,
          videoUrl: hasAccess ? v.videoUrl : undefined,
          bunnyVideoId: hasAccess ? v.bunnyVideoId : undefined,
          canWatch: hasAccess,
          isLocked: !hasAccess,
          disabledByAdmin: isDisabledByAdmin,
          giftMinutes: Number(videoGiftTimes[v.id] || 0),
        };
      });

      const localizedMaterials = materials.map((m) => ({
        ...m,
        ...getLocalizedContent(m.content, lang),
        content: undefined,
        fileUrl: canAccessPaidContent ? m.fileUrl : undefined,
      }));

      const localizedAssignments = assignments.map((a) => {
        const c = a.content || {};
        return {
          ...a,
          ...getLocalizedContent(c, lang),
          subType: (a as any).subType || c.subType || 'assignment',
          taskType: c.taskType || ((a as any).subType === 'task' ? 'todo_checklist' : undefined),
          checklist: c.checklist || [],
          countdownHours: c.countdownHours ?? null,
          reminderType: c.reminderType || null,
          reminderNote: c.reminderNote || '',
          isRecurring: Boolean(c.isRecurring),
          questions: c.questions || [],
          level: c.level || 'Level 1: Beginner',
          passingPoints: c.passingPoints || 60,
          totalPoints: c.totalPoints || 100,
          description: c.description || c.en?.description || '',
          instructions: c.instructions || c.en?.instructions || '',
          content: undefined,
        };
=======
      // LIST ALL COURSES (BUNNY DB)
      let listSql = 'SELECT * FROM recorded_courses_sql WHERE is_active = 1 ORDER BY display_order ASC, created_at DESC';
      let listArgs: any[] = [];
      if (folderId) {
        listSql = 'SELECT * FROM recorded_courses_sql WHERE is_active = 1 AND folder_id = ? ORDER BY display_order ASC, created_at DESC';
        listArgs = [folderId];
      }

      const coursesRes = await bunnyExecute({ sql: listSql, args: listArgs });

      // Fetch user enrollments from Bunny DB
      let enrolledCourseIds = new Set<string>();
      let enrollmentsMap: Record<string, any> = {};
      if (userId) {
        const userEnrollRes = await bunnyExecute({
          sql: `SELECT * FROM course_enrollments_sql WHERE user_id = ? AND status IN ('active', 'completed')`,
          args: [userId],
        });
        for (const e of userEnrollRes.rows) {
          enrolledCourseIds.add(String(e.course_id));
          enrollmentsMap[String(e.course_id)] = e;
        }
      }

      const localizedCourses = coursesRes.rows.map((rawCourse: any) => {
        const courseId = String(rawCourse.id);
        const isEnrolled = enrolledCourseIds.has(courseId);
        const enrollment = enrollmentsMap[courseId];

        let dataObj: any = {};
        try {
          dataObj = rawCourse.data_json ? JSON.parse(String(rawCourse.data_json)) : {};
        } catch {}
        let contentObj: any = {};
        try {
          contentObj = rawCourse.content_json ? JSON.parse(String(rawCourse.content_json)) : {};
        } catch {}
        let pricingObj: any = {};
        try {
          pricingObj = rawCourse.pricing_json ? JSON.parse(String(rawCourse.pricing_json)) : {};
        } catch {}
        let giftHoursObj: any = {};
        try {
          giftHoursObj = rawCourse.gift_hours_json ? JSON.parse(String(rawCourse.gift_hours_json)) : {};
        } catch {}

        return {
          _id: courseId,
          id: courseId,
          slug: rawCourse.slug,
          thumbnail: rawCourse.thumbnail,
          level: rawCourse.level,
          category: rawCourse.category,
          totalDuration: Number(rawCourse.total_duration) || 0,
          pricing: pricingObj,
          isFree: Boolean(rawCourse.is_free),
          giftHours: giftHoursObj,
          videoLanguage: rawCourse.video_language,
          ...dataObj,
          ...getLocalizedContent(contentObj, lang),
          isEnrolled,
          progress: Number(enrollment?.progress_percent) || 0,
        };
      });

      return NextResponse.json({
        success: true,
        courses: localizedCourses,
        isLoggedIn: !!decoded,
        language: lang,
>>>>>>> 9f221716 (feat(rag-video): migrate to Bunny DB, replace HeyGen with Replicate & OpenAI, add MP4 Whisper transcription)
      });

      return NextResponse.json(
        {
          success: true,
          course: localizedCourse,
          sections: localizedSections,
          videos: localizedVideos,
          materials: localizedMaterials,
          assignments: localizedAssignments,
          reviews: [],
          enrollment,
          canAccessPaidContent,
          giftHoursAvailable,
          isLoggedIn: !!decoded,
          language: lang,
        },
        {
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
            Pragma: 'no-cache',
            Expires: '0',
          },
        }
      );
    }
<<<<<<< HEAD

    // ============================================
    // LIST ALL COURSES (30s in-memory cache)
    // ============================================
    const folderId = request.nextUrl.searchParams.get('folderId');
    const cacheKey = `courses_list_${folderId || 'all'}`;
    const now = Date.now();
    const cachedList = (globalThis as any).__coursesListCache?.get(cacheKey);

    let courses: any[];
    if (cachedList && cachedList.expiresAt > now) {
      courses = cachedList.courses;
    } else {
      courses = await listCourses({
        folderId: folderId || undefined,
        isPublished: true,
        isActive: true,
      });
      if (!(globalThis as any).__coursesListCache) {
        (globalThis as any).__coursesListCache = new Map();
      }
      (globalThis as any).__coursesListCache.set(cacheKey, {
        courses,
        expiresAt: now + 30000,
      });
    }

    let userEnrollments: any[] = [];
    if (userId) {
      try {
        userEnrollments = await listEnrollmentsByUser(String(userId));
      } catch {
        // ignore
      }
    }

    const enrolledCourseIds = new Set(
      userEnrollments
        .filter((e) => e.status === 'active' || e.status === 'completed')
        .map((e) => String(e.courseId))
    );

    const coursesWithStats = await Promise.all(
      courses.map(async (c) => {
        const videoCount = await countVideosByCourse(c.id);
        const localized = getLocalizedContent(c.content, lang);

        return {
          ...c,
          title: localized.title || c.data?.title || c.slug,
          subtitle: localized.subtitle || c.data?.subtitle || '',
          description: localized.description || c.data?.description || '',
          content: undefined,
          videoCount,
          totalVideos:
            c.totalVideos !== undefined && c.totalVideos > 0
              ? c.totalVideos
              : (c.data?.totalVideos !== undefined && c.data.totalVideos > 0
                  ? c.data.totalVideos
                  : videoCount),
          isEnrolled: enrolledCourseIds.has(c.id),
        };
      })
    );

    return NextResponse.json({
      success: true,
      courses: coursesWithStats,
      isLoggedIn: !!decoded,
    });
  } catch (err) {
    console.error('[GET /api/recorded-courses] Error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
=======

    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  } catch (error: any) {
    console.error('[Recorded Courses API Error]:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
>>>>>>> 9f221716 (feat(rag-video): migrate to Bunny DB, replace HeyGen with Replicate & OpenAI, add MP4 Whisper transcription)
  }
}
