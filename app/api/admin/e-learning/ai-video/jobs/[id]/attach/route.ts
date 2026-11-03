import { NextRequest, NextResponse } from 'next/server';
<<<<<<< HEAD
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';
import { getAiVideoJobById, updateAiVideoJob } from '@/lib/bunnyAiVideoJobRepository';
import {
  getCourseById,
  saveVideo,
  listVideosByCourse,
} from '@/lib/bunnyCourseRepository';
=======
import crypto from 'crypto';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';
import { getAiVideoJobById, updateAiVideoJob } from '@/lib/aiVideo/bunnyAiVideoRepository';
import { bunnyExecute } from '@/lib/bunnyDatabase';
import { LANGUAGE_NAMES } from '@/lib/aiVideo/transcribeAndCondense';
>>>>>>> 9f221716 (feat(rag-video): migrate to Bunny DB, replace HeyGen with Replicate & OpenAI, add MP4 Whisper transcription)

export const dynamic = 'force-dynamic';

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

<<<<<<< HEAD
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
=======
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
>>>>>>> 9f221716 (feat(rag-video): migrate to Bunny DB, replace HeyGen with Replicate & OpenAI, add MP4 Whisper transcription)
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin) return unauthorized();
    if (!isSuperAdmin(decoded)) {
      return NextResponse.json({ error: 'Forbidden: Superadmin access required' }, { status: 403 });
    }

<<<<<<< HEAD
    const resolved = await params;
    const { id } = resolved;

=======
    const { id } = params;
>>>>>>> 9f221716 (feat(rag-video): migrate to Bunny DB, replace HeyGen with Replicate & OpenAI, add MP4 Whisper transcription)
    const body = await request.json().catch(() => ({} as any));
    const language = String(body?.language || '').trim();
    const courseId = String(body?.courseId || '').trim();
    const sectionId = String(body?.sectionId || '').trim();

    if (!language || !courseId) {
      return NextResponse.json({ error: 'language and courseId are required' }, { status: 400 });
    }

    const job = await getAiVideoJobById(id);
    if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });

<<<<<<< HEAD
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
=======
    const render = (job.renders || []).find((r) => r.language === language);
    if (!render || (render.status !== 'completed' && !render.bunnyVideoId)) {
      return NextResponse.json({ error: `No completed render for language "${language}"` }, { status: 400 });
    }

    // Verify course exists in Bunny Database
    const courseRes = await bunnyExecute({
      sql: 'SELECT id, slug, content_json FROM recorded_courses_sql WHERE id = ? OR slug = ? LIMIT 1',
      args: [courseId, courseId],
    });
    if (!courseRes.rows.length) {
      return NextResponse.json({ error: 'Course not found in Bunny Database' }, { status: 404 });
    }
    const realCourseId = String(courseRes.rows[0].id);

    // Get max display_order
    const maxOrderRes = await bunnyExecute({
      sql: 'SELECT MAX(display_order) as max_order FROM course_videos_sql WHERE course_id = ?',
      args: [realCourseId],
    });
    const nextOrder = (Number(maxOrderRes.rows[0]?.max_order) || 0) + 1;

    const langLabel = LANGUAGE_NAMES[language] || language;
    const title = `${job.topicTitle} (${langLabel})`;

    // Get the script text for this language
    const script = (job.scripts || []).find((s) => s.language === language);
    const scriptText = script?.text || job.correctedTranscript || job.transcript || '';

    const contentObj: any = {
      en: { title: language === 'en' ? job.topicTitle : title, description: job.topicTitle },
      [language]: { title: job.topicTitle, description: job.topicTitle },
      transcript: scriptText,
      aiSummary: job.topicTitle,
      transcriptI18n: { [language]: scriptText },
      aiSummaryI18n: { [language]: job.topicTitle },
      ragEnabled: true,
    };

    const newVideoId = crypto.randomUUID();
    const now = new Date().toISOString();

    // Insert into course_videos_sql in Bunny Database
    await bunnyExecute({
      sql: `INSERT INTO course_videos_sql (
        id, course_id, section_id, title, description,
        bunny_video_id, video_url, duration, is_free, access_type,
        display_order, is_active, content_json, transcript, ai_summary, rag_enabled,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        newVideoId,
        realCourseId,
        sectionId || null,
        title,
        job.topicTitle,
        render.bunnyVideoId || null,
        render.videoUrl || null,
        0,
        0,
        'paid',
        nextOrder,
        1,
        JSON.stringify(contentObj),
        scriptText,
        job.topicTitle,
        1,
        now,
        now,
      ],
    });

    // Update render entry in ai_video_jobs_sql
    const updatedRenders = [...(job.renders || [])];
    const matchRender = updatedRenders.find((r) => r.language === language);
    if (matchRender) {
      matchRender.courseVideoId = newVideoId;
    }
    await updateAiVideoJob(id, { renders: updatedRenders });

    return NextResponse.json({ success: true, data: { courseVideoId: newVideoId } }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to attach video to course';
    return NextResponse.json({ error: message }, { status: 500 });
>>>>>>> 9f221716 (feat(rag-video): migrate to Bunny DB, replace HeyGen with Replicate & OpenAI, add MP4 Whisper transcription)
  }
}
