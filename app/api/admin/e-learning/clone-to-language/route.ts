/**
 * Automated 27-Language Course Clone Engine API
 * POST /api/admin/e-learning/clone-to-language
 * 
 * Clones a master Swar Yoga course into any of the 27 supported world languages:
 * 1. Duplicates course metadata with localized titles and descriptions.
 * 2. Assigns course to target language folder (folder_{lang}).
 * 3. Sets localized pricing (e.g. $59 USD for global, ₹3,600 INR for India).
 * 4. Replicates sections and video placeholders ready for Avatar Studio dubbing/rendering.
 */

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';
import {
  getCourseById,
  saveCourse,
  listSectionsByCourse,
  saveSection,
  listVideosByCourse,
  saveVideo,
} from '@/lib/bunnyCourseRepository';
import { ELEARNING_LANGUAGES } from '@/lib/elearningLanguages';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

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

    if (!isSuperAdmin(decoded)) {
      return NextResponse.json({ error: 'Super admin access required' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const { sourceCourseId, targetLanguage, usdPrice = 59, inrPrice } = body;

    if (!sourceCourseId || !targetLanguage) {
      return NextResponse.json(
        { error: 'sourceCourseId and targetLanguage are required' },
        { status: 400 }
      );
    }

    const langInfo = ELEARNING_LANGUAGES.find(
      (l) => l.code.toLowerCase() === targetLanguage.toLowerCase()
    );
    if (!langInfo) {
      return NextResponse.json(
        { error: `Language '${targetLanguage}' is not in the official 27-language roster.` },
        { status: 400 }
      );
    }

    // 1. Fetch Source Course
    const sourceCourse = await getCourseById(sourceCourseId);
    if (!sourceCourse) {
      return NextResponse.json({ error: 'Source course not found' }, { status: 404 });
    }

    // 2. Fetch Sections and Videos
    const [sections, videos] = await Promise.all([
      listSectionsByCourse(sourceCourse.id),
      listVideosByCourse(sourceCourse.id, true),
    ]);

    // 3. Construct Cloned Course Details
    const targetCode = langInfo.code;
    const clonedSlug = `${sourceCourse.slug}-${targetCode}`;
    const newCourseId = crypto.randomUUID().replace(/-/g, '').slice(0, 24);

    const sourceContent = sourceCourse.content || {};
    const defaultEn = sourceContent.en || {};
    const baseTitle = defaultEn.title || sourceCourse.slug || 'Swar Yoga Course';

    // Localized Title with Language Marker
    const localizedTitle = `${baseTitle} (${langInfo.name})`;
    const localizedDesc = defaultEn.description || `Swar Yoga recorded course in ${langInfo.name}.`;

    const pricing = {
      INR: { price: Number(inrPrice) || sourceCourse.pricing?.INR?.price || 3600 },
      USD: { price: Number(usdPrice) || sourceCourse.pricing?.USD?.price || 59 },
      NPR: { price: sourceCourse.pricing?.NPR?.price || 4999 },
    };

    const newContent = {
      ...sourceContent,
      [targetCode]: {
        title: localizedTitle,
        subtitle: defaultEn.subtitle || '',
        description: localizedDesc,
        whatYouWillLearn: defaultEn.whatYouWillLearn || [],
        requirements: defaultEn.requirements || [],
        targetAudience: defaultEn.targetAudience || [],
      },
    };

    // 4. Save Cloned Course to Bunny DB
    const savedClonedCourse = await saveCourse({
      id: newCourseId,
      slug: clonedSlug,
      folderId: `folder_${targetCode}`,
      videoLanguage: targetCode,
      category: sourceCourse.category || 'swar-yoga',
      level: sourceCourse.level || 'all',
      isFree: sourceCourse.isFree,
      isPublished: true,
      isActive: true,
      order: sourceCourse.order || 1,
      thumbnail: sourceCourse.thumbnail || '',
      totalDuration: sourceCourse.totalDuration || 0,
      pricing: pricing as any,
      content: newContent as any,
      accessSettings: sourceCourse.accessSettings || {},
      giftHours: sourceCourse.giftHours || { enabled: true, hours: 2 },
      data: {
        clonedFromCourseId: sourceCourse.id,
        targetLanguage: targetCode,
        languageName: langInfo.name,
        clonedAt: new Date().toISOString(),
      },
    });

    // 5. Clone Sections & Map IDs
    const sectionIdMap: Record<string, string> = {};
    for (const sec of sections) {
      const newSecId = crypto.randomUUID().replace(/-/g, '').slice(0, 24);
      sectionIdMap[sec.id] = newSecId;

      const secContent = sec.content || {};
      const secEn = secContent.en || {};

      await saveSection({
        id: newSecId,
        courseId: newCourseId,
        order: sec.order || 1,
        content: {
          ...secContent,
          [targetCode]: {
            title: `${secEn.title || 'Section'} (${langInfo.name})`,
            description: secEn.description || '',
          },
        },
      });
    }

    // 6. Clone Videos as Placeholders ready for Avatar Dubbing
    let clonedVideoCount = 0;
    for (const vid of videos) {
      const newVidId = crypto.randomUUID().replace(/-/g, '').slice(0, 24);
      const newSecId = vid.sectionId ? sectionIdMap[vid.sectionId] || null : null;

      const vidContent = vid.content || {};
      const vidEn = vidContent.en || {};

      await saveVideo({
        id: newVidId,
        courseId: newCourseId,
        sectionId: newSecId,
        title: `${vid.title} [${langInfo.code.toUpperCase()}]`,
        description: vid.description || '',
        bunnyVideoId: vid.bunnyVideoId || '', // Can be replaced by Avatar Studio rendered video
        videoUrl: vid.videoUrl || '',
        duration: vid.duration || 0,
        isFree: vid.isFree || false,
        accessType: vid.accessType || 'paid',
        order: vid.order || 1,
        isActive: vid.isActive !== false,
        content: {
          ...vidContent,
          [targetCode]: {
            title: `${vidEn.title || vid.title} (${langInfo.name})`,
            description: vidEn.description || vid.description || '',
            thumbnail: vid.thumbnail || '',
          },
        },
      });
      clonedVideoCount++;
    }

    return NextResponse.json({
      success: true,
      message: `Course successfully cloned into ${langInfo.name} (${targetCode})`,
      course: {
        id: savedClonedCourse.id,
        slug: savedClonedCourse.slug,
        language: targetCode,
        languageName: langInfo.name,
        folderId: `folder_${targetCode}`,
        pricing,
        sectionsCount: sections.length,
        videosCount: clonedVideoCount,
        viewUrl: `/e-learning/${savedClonedCourse.slug}?lang=${targetCode}`,
      },
    });
  } catch (error: any) {
    console.error('[Clone Course API Error]:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to clone course' },
      { status: 500 }
    );
  }
}
