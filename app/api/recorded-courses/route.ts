/**
 * Recorded Courses API
 * GET /api/recorded-courses - List all published courses
 * GET /api/recorded-courses?slug=xxx - Get specific course details
 */

import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { verifyToken, TokenPayload } from '@/lib/auth';
import {
  getRecordedCourse,
  getCourseVideo,
  getCourseSection,
  getCourseMaterial,
  getCourseEnrollment,
  getCourseReview,
} from '@/lib/schemas/recordedCourseSchemas';

export const dynamic = 'force-dynamic';


// Helper to get user-preferred language (supports all languages, falls back to EN for unsupported)
function getPreferredLanguage(request: NextRequest): string {
  const langParam = request.nextUrl.searchParams.get('lang');
  if (langParam) {
    // Accept any language code - unsupported languages will fall back to English in getLocalizedContent
    return langParam.toLowerCase();
  }
  // Check Accept-Language header
  const acceptLang = request.headers.get('accept-language') || '';
  if (acceptLang.includes('hi')) return 'hi';
  if (acceptLang.includes('mr')) return 'mr';
  if (acceptLang.includes('ne')) return 'ne';
  return 'en';
}

// Helper to get content in preferred language with fallback to English
function getLocalizedContent(content: any, lang: string) {
  if (!content) return {};
  const localContent = content[lang] || content.en || {};
  const enContent = content.en || {};
  
  // Merge: use local if available, fallback to English
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
    await connectDB();
    
    const slug = request.nextUrl.searchParams.get('slug');
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
    
    const RecordedCourse = getRecordedCourse();
    const CourseVideo = getCourseVideo();
    const CourseSection = getCourseSection();
    const CourseMaterial = getCourseMaterial();
    const CourseEnrollment = getCourseEnrollment();
    const CourseReview = getCourseReview();
    
    // ============================================
    // GET SPECIFIC COURSE
    // ============================================
    if (slug) {
      const course = await RecordedCourse.findOne({ 
        slug, 
        isActive: true, 
        isPublished: true 
      }).lean();
      
      if (!course) {
        return NextResponse.json({ error: 'Course not found' }, { status: 404 });
      }
      
      // Get sections
      const sections = await CourseSection.find({
        courseId: course._id,
        isActive: true,
      }).sort({ order: 1 }).lean();
      
      // Get videos
      const videos = await CourseVideo.find({
        courseId: course._id,
        isActive: true,
      }).sort({ order: 1 }).lean();
      
      // Get materials (non-certificate)
      const materials = await CourseMaterial.find({
        courseId: course._id,
        isActive: true,
        type: { $ne: 'certificate' },
      }).sort({ order: 1 }).lean();
      
      // Get reviews
      const reviews = await CourseReview.find({
        courseId: course._id,
        isApproved: true,
        isPublic: true,
      }).sort({ createdAt: -1 }).limit(10).lean();
      
      // Check enrollment status
      let enrollment = null;
      let canAccessPaidContent = false;
      const userId = decoded?.id || decoded?._id || decoded?.userId;
      
      if (userId) {
        enrollment = await CourseEnrollment.findOne({
          userId,
          courseId: course._id,
          status: { $in: ['active', 'completed'] },
        }).lean();
        
        canAccessPaidContent = !!enrollment;
      }
      
      // Calculate gift hours availability
      const giftHoursAvailable = course.giftHours?.enabled && !enrollment;
      
      // Localize content
      const localizedCourse = {
        ...course,
        videoLanguage: course.videoLanguage,
        ...getLocalizedContent(course.content, lang),
        content: undefined, // Remove raw content object
      };
      
      const localizedSections = sections.map((s: any) => ({
        ...s,
        ...getLocalizedContent(s.content, lang),
        content: undefined,
      }));
      
      const localizedVideos = videos.map((v: any) => ({
        ...v,
        ...getLocalizedContent(v.content, lang),
        content: undefined,
        // Don't expose video URL for paid content if not enrolled
        videoUrl: (v.isFree === true || canAccessPaidContent) ? v.videoUrl : undefined,
        bunnyVideoId: (v.isFree === true || canAccessPaidContent) ? v.bunnyVideoId : undefined,
        canWatch: v.isFree === true || canAccessPaidContent,
        isLocked: !v.isFree && !canAccessPaidContent,
      }));
      
      const localizedMaterials = materials.map((m: any) => ({
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
        reviews,
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
    const query: any = {
      isActive: true,
      isPublished: true,
    };

    // Filter by folder if provided
    if (folderId) {
      query.folderId = folderId;
    }

    const courses = await RecordedCourse.find(query).sort({ order: 1, createdAt: -1 }).lean();
    
    // Get user enrollments
    let userEnrollments: any[] = [];
    const userId = decoded?.id || decoded?._id || decoded?.userId;
    if (userId) {
      userEnrollments = await CourseEnrollment.find({
        userId,
        status: { $in: ['active', 'completed'] },
      }).lean();
    }
    
    const enrolledCourseIds = new Set(userEnrollments.map((e: any) => e.courseId.toString()));
    
    // Localize and enrich courses
    const localizedCourses = courses.map((course: any) => {
      const isEnrolled = enrolledCourseIds.has(course._id.toString());
      const enrollment = userEnrollments.find((e: any) => e.courseId.toString() === course._id.toString());

      return {
        _id: course._id,
        slug: course.slug,
        thumbnail: course.thumbnail,
        previewVideoUrl: course.previewVideoUrl,
        level: course.level,
        videoLanguage: course.videoLanguage,
        category: course.category,
        totalDuration: course.totalDuration,
        totalVideos: course.totalVideos,
        pricing: course.pricing,
        discount: course.discount,
        promoCode: course.promoCode,
        isFree: course.isFree,
        giftHours: course.giftHours,
        defaultStudents: course.defaultStudents,
        enrolledCount: course.enrolledCount,
        averageRating: course.averageRating,
        reviewCount: course.reviewCount,
        // Localized content
        ...getLocalizedContent(course.content, lang),
        // Enrollment status
        isEnrolled,
        progress: enrollment?.progress || 0,
      };
    });
    
    return NextResponse.json({
      success: true,
      courses: localizedCourses,
      isLoggedIn: !!decoded,
      language: lang,
    });
    
  } catch (error: any) {
    console.error('[Recorded Courses API Error]:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
