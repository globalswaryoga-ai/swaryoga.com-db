
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, TokenPayload } from '@/lib/auth';
import { bunnyExecute, isBunnyDatabaseConfigured } from '@/lib/bunnyDatabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';


// Helper to get user-preferred language (supports all languages, falls back to EN for unsupported)
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


    // Auth check (optional - for enrollment status)
    let decoded: TokenPayload | null = null;
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      try {
        decoded = verifyToken(authHeader.split(' ')[1]);
      } catch {
        // Token invalid, continue as guest
      }
    }

    const userId = decoded?.id || decoded?._id || decoded?.userId;

    // ============================================
    // BUNNY DATABASE (LIB-SQL)
    // ============================================

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
      });
    }

    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  } catch (error: any) {
    console.error('[Recorded Courses API Error]:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
