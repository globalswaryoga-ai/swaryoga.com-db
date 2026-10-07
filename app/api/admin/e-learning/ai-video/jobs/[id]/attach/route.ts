import { NextRequest, NextResponse } from 'next/server';
import connectDB, { getCourseVideo, getRecordedCourse } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';
import { getAiVideoJobById, updateAiVideoJob } from '@/lib/bunnyAiVideoJobRepository';

export const dynamic = 'force-dynamic';

const LANGUAGE_LABELS: Record<string, string> = { hi: 'Hindi', en: 'English', mr: 'Marathi' };

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

// Creates a CourseVideo for one completed language render, the same way
// app/admin/crm/e-learning/[courseId]/videos/page.tsx does it today via
// POST /api/admin/recorded-courses/videos — reusing that model directly
// instead of round-tripping through HTTP.
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin) return unauthorized();
    if (!isSuperAdmin(decoded)) {
      return NextResponse.json({ error: 'Forbidden: Superadmin access required' }, { status: 403 });
    }

    const { id } = params;

    const body = await request.json().catch(() => ({} as any));
    const language = String(body?.language || '').trim();
    const courseId = String(body?.courseId || '').trim();
    const sectionId = String(body?.sectionId || '').trim();

    if (!language || !courseId) {
      return NextResponse.json({ error: 'language and courseId are required' }, { status: 400 });
    }

    const job = await getAiVideoJobById(id);
    if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });

    const newRenders = [...(job.renders || [])];
    const renderIndex = newRenders.findIndex((r: any) => r.language === language);
    const render = renderIndex >= 0 ? newRenders[renderIndex] : undefined;

    if (!render || render.status !== 'completed' || !render.bunnyVideoId) {
      return NextResponse.json({ error: `No completed render for language "${language}"` }, { status: 400 });
    }

    await connectDB();

    const RecordedCourse = getRecordedCourse();
    const course = await (RecordedCourse as any).findById(courseId);
    if (!course) return NextResponse.json({ error: 'Course not found' }, { status: 404 });

    const CourseVideo = getCourseVideo();
    const label = LANGUAGE_LABELS[language] || language;
    const title = `${job.topicTitle} (${label})`;

    const lastVideo = await (CourseVideo as any).findOne({ courseId }).sort({ order: -1 });
    const nextOrder = (lastVideo?.order || 0) + 1;

    const videoDoc = await (CourseVideo as any).create({
      courseId,
      sectionId: sectionId || undefined,
      title,
      bunnyVideoId: render.bunnyVideoId,
      isActive: true,
      order: nextOrder,
      createdBy: decoded.email || decoded.userId || 'admin',
      content: {
        en: { title: language === 'en' ? job.topicTitle : title },
        ...(language !== 'en' ? { [language]: { title: job.topicTitle } } : {}),
      },
    });

    await (RecordedCourse as any).findByIdAndUpdate(courseId, { $inc: { totalVideos: 1 } });

    newRenders[renderIndex] = { ...render, courseVideoId: videoDoc._id.toString() };
    await updateAiVideoJob(id, { renders: newRenders });

    return NextResponse.json({ success: true, data: { courseVideoId: videoDoc._id } }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to attach video to course';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
