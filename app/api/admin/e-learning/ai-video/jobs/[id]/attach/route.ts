import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';
import { getAiVideoJobById, updateAiVideoJob } from '@/lib/bunnyAiVideoJobRepository';
import {
  getCourseById,
  saveVideo,
  listVideosByCourse,
} from '@/lib/bunnyCourseRepository';

export const dynamic = 'force-dynamic';

const LANGUAGE_LABELS: Record<string, string> = { hi: 'Hindi', en: 'English', mr: 'Marathi' };

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin) return unauthorized();
    if (!isSuperAdmin(decoded)) {
      return NextResponse.json({ error: 'Forbidden: Superadmin access required' }, { status: 403 });
    }

    const resolved = await params;
    const { id } = resolved;

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

    const course = await getCourseById(courseId);
    if (!course) return NextResponse.json({ error: 'Course not found' }, { status: 404 });

    const existingVideos = await listVideosByCourse(courseId, true);
    const label = LANGUAGE_LABELS[language] || language;
    const title = `${job.topicTitle} (${label})`;
    const nextOrder = existingVideos.length + 1;

    const videoDoc = await saveVideo({
      courseId,
      sectionId: sectionId || null,
      title,
      bunnyVideoId: render.bunnyVideoId,
      isActive: true,
      order: nextOrder,
      content: {
        en: { title: language === 'en' ? job.topicTitle : title },
        ...(language !== 'en' ? { [language]: { title: job.topicTitle } } : {}),
      },
    });

    newRenders[renderIndex] = { ...render, courseVideoId: videoDoc.id };
    await updateAiVideoJob(id, { renders: newRenders });

    return NextResponse.json({
      success: true,
      video: videoDoc,
      job: { id, renders: newRenders },
    });
  } catch (err: any) {
    console.error('[AI Video Attach Error]:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
