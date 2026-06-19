import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { generateAIText, type AiHistoryTurn } from '@/lib/ai/generateWithFallback';
import {
  getRecordedCourse,
  getCourseVideo,
  getCourseEnrollment,
} from '@/lib/schemas/recordedCourseSchemas';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ videoId: string }>;
}

function isAiQuotaError(error: any): boolean {
  const message = String(error?.message || error || '').toLowerCase();
  return message.includes('quota') || message.includes('rate limit') || message.includes('429') || message.includes('free-tier');
}

async function canAccessVideo(request: NextRequest, video: any, course: any) {
  if (video.isFree === true) return true;

  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return false;

  try {
    const decoded = verifyToken(authHeader.split(' ')[1]);
    const userId = decoded?.id || decoded?._id || decoded?.userId || null;
    if (!userId) return false;

    const CourseEnrollment = getCourseEnrollment();
    const enrollment = await CourseEnrollment.findOne({
      userId,
      courseId: course._id,
      status: { $in: ['active', 'completed'] },
    }).lean();

    return !!enrollment;
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    await connectDB();

    const { videoId } = await params;
    const body = await request.json().catch(() => ({}));
    const question = String(body?.question || '').trim();
    const history: AiHistoryTurn[] = Array.isArray(body?.history) ? body.history.slice(-6) : [];

    if (!question) {
      return NextResponse.json({ error: 'Question is required' }, { status: 400 });
    }

    const CourseVideo = getCourseVideo();
    const RecordedCourse = getRecordedCourse();
    const video = await CourseVideo.findById(videoId).lean() as any;

    if (!video || !video.isActive) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    const course = await RecordedCourse.findById(video.courseId).lean() as any;
    if (!course || !course.isActive) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    const allowed = await canAccessVideo(request, video, course);
    if (!allowed) {
      return NextResponse.json({ error: 'Enrollment required' }, { status: 403 });
    }

    const transcript = String(video.transcript || '').trim();
    const summary = String(video.aiSummary || '').trim();
    const description = String(video.description || video.content?.en?.description || '').trim();

    if (!transcript && !summary && !description) {
      return NextResponse.json({
        success: true,
        reply: 'No transcript or study notes are added for this video yet. Please ask the admin to add video RAG content.',
      });
    }

    const courseTitle = String(course.content?.en?.title || course.slug || 'Recorded course');
    const videoTitle = String(video.title || video.content?.en?.title || 'Video');
    const systemPrompt = `You are a helpful E-learning video assistant for Swar Yoga.

Answer questions only using the video context below. If the answer is not present in the context, say that the video notes do not contain enough information.

Course: ${courseTitle}
Video: ${videoTitle}

Video summary:
${summary || 'Not provided.'}

Video transcript / notes:
${transcript || description}

Rules:
- Keep answers clear and practical.
- If the user asks in Hindi, reply in Hindi. Otherwise reply in the user's language.
- Do not invent facts outside the video context.
- For study questions, give concise bullet points when useful.`;

    const reply = await generateAIText({
      systemPrompt,
      history,
      message: question,
      maxOutputTokens: 700,
      temperature: 0.3,
      providerOrder: ['OpenAI', 'Anthropic'],
    });

    return NextResponse.json({ success: true, reply });
  } catch (error: any) {
    console.error('[E-learning Video RAG Error]', error);
    if (isAiQuotaError(error)) {
      return NextResponse.json(
        { error: 'The video assistant is temporarily busy. Please wait a minute and try again.' },
        { status: 429 }
      );
    }
    return NextResponse.json({ error: error?.message || 'Video assistant failed' }, { status: 500 });
  }
}
