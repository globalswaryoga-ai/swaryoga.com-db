/**
 * Recorded Courses API
 * GET /api/recorded-courses - List all published courses
 * GET /api/recorded-courses?slug=xxx - Get specific course details
 */

import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { verifyToken, TokenPayload } from '@/lib/auth';
import {

export const dynamic = 'force-dynamic';
  getRecordedCourse,
  getCourseVideo,
  getCourseSection,
  getCourseMaterial,
  getCourseEnrollment,
  getCourseReview,
} from '@/lib/schemas/recordedCourseSchemas';


// Helper to get user-preferred language
function getPreferredLanguage(request: NextRequest): 'en' | 'hi' | 'ne' {
  const langParam = request.nextUrl.searchParams.get('lang');
  if (langParam && ['en', 'hi', 'ne'].includes(langParam)) {
    return langParam as 'en' | 'hi' | 'ne';
  }
  // Check Accept-Language header
  const acceptLang = request.headers.get('accept-language') || '';
  if (acceptLang.includes('hi')) return 'hi';
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
      
      if (decoded?.id) {
        enrollment = await CourseEnrollment.findOne({
          userId: decoded.id,
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
        videoUrl: (v.accessType === 'free' || v.accessType === 'preview' || canAccessPaidContent) ? v.videoUrl : undefined,
        bunnyVideoId: (v.accessType === 'free' || v.accessType === 'preview' || canAccessPaidContent) ? v.bunnyVideoId : undefined,
        canWatch: v.accessType === 'free' || v.accessType === 'preview' || canAccessPaidContent,
        isLocked: v.accessType === 'paid' && !canAccessPaidContent,
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
    const courses = await RecordedCourse.find({
      isActive: true,
      isPublished: true,
    }).sort({ order: 1, createdAt: -1 }).lean();
    
    // Get user enrollments
    let userEnrollments: any[] = [];
    if (decoded?.id) {
      userEnrollments = await CourseEnrollment.find({
        userId: decoded.id,
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
        category: course.category,
        totalDuration: course.totalDuration,
        totalVideos: course.totalVideos,
        pricing: course.pricing,
        isFree: course.isFree,
        giftHours: course.giftHours,
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
