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
  getEnrollment,
  listEnrollmentsByUser,
  countVideosByCourse,
} from '@/lib/bunnyCourseRepository';
import { getOrdersByUser } from '@/lib/bunnyWebsiteRepository';

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

      const [sections, videos, materials] = await Promise.all([
        listSectionsByCourse(course.id),
        listVideosByCourse(course.id, true),
        listMaterialsByCourse(course.id, true),
      ]);

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
        ...getLocalizedContent(course.content, lang),
        content: undefined,
      };

      const localizedSections = sections.map((s) => ({
        ...s,
        ...getLocalizedContent(s.content, lang),
        content: undefined,
      }));

      const localizedVideos = videos.map((v) => ({
        ...v,
        ...getLocalizedContent(v.content, lang),
        content: undefined,
        videoUrl: (v.isFree || canAccessPaidContent) ? v.videoUrl : undefined,
        bunnyVideoId: (v.isFree || canAccessPaidContent) ? v.bunnyVideoId : undefined,
        canWatch: v.isFree || canAccessPaidContent,
        isLocked: !v.isFree && !canAccessPaidContent,
      }));

      const localizedMaterials = materials.map((m) => ({
        ...m,
        ...getLocalizedContent(m.content, lang),
        content: undefined,
        fileUrl: canAccessPaidContent ? m.fileUrl : undefined,
      }));

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
