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

export const dynamic = 'force-dynamic';

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

export async function GET(request: NextRequest) {
  try {
    const slug = request.nextUrl.searchParams.get('slug');
    const lang = getPreferredLanguage(request);

    let decoded: TokenPayload | null = null;
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      try {
        decoded = verifyToken(authHeader.split(' ')[1]);
      } catch {
        // Token invalid, continue as guest
      }
    }

    const userId = (decoded as any)?.id || (decoded as any)?._id || (decoded as any)?.userId;

    // ============================================
    // GET SPECIFIC COURSE
    // ============================================
    if (slug) {
      const course = await getCourseBySlug(slug);

      if (!course || !course.isActive || !course.isPublished) {
        return NextResponse.json({ error: 'Course not found' }, { status: 404 });
      }

      const [sections, videos, materials, assignments] = await Promise.all([
        listSectionsByCourse(course.id),
        listVideosByCourse(course.id, true),
        listMaterialsByCourse(course.id, true),
        listAssignmentsByCourse(course.id, true),
      ]);

      if (request.nextUrl.searchParams.get('debug') === '1') {
        const rawRes = await bunnyExecute({
          sql: 'SELECT id, title, display_order, is_active, is_free FROM course_videos_sql WHERE course_id = ?',
          args: [course.id],
        });
        return NextResponse.json({
          debug: true,
          courseId: course.id,
          rawRowsCount: rawRes.rows.length,
          rawRows: rawRes.rows,
          videosLength: videos.length,
          videos,
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
          }
        }
      }

      const giftHoursAvailable = Boolean(course.giftHours?.enabled && !enrollment);

      const localizedCourse = {
        ...course,
        totalVideos: videos.length,
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
        const thumbnail =
          (v as any).thumbnail ||
          (localized as any).thumbnail ||
          (v.content as any)?.thumbnail ||
          (v.bunnyVideoId ? `/api/recorded-courses/thumbnail?vid=${v.bunnyVideoId}` : undefined) ||
          course.thumbnail ||
          '';

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
      });

      return NextResponse.json({
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
      });
    }

    // ============================================
    // LIST ALL COURSES
    // ============================================
    const folderId = request.nextUrl.searchParams.get('folderId');
    const courses = await listCourses({
      folderId: folderId || undefined,
      isPublished: true,
      isActive: true,
    });

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
  }
}
