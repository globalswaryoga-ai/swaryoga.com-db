import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { generateAIText, type AiHistoryTurn } from '@/lib/ai/generateWithFallback';
import { buildRagContext, pickLangVariant, languageName, type RagSource } from '@/lib/ragRetrieval';
import {
  getRecordedCourse,
  getCourseVideo,
  getCourseMaterial,
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
    const lang = String(body?.lang || 'en').toLowerCase();
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

    // Pick the learner's language variant of each source, falling back to the
    // base (source-language) fields. Cross-language Q&A still works either way
    // — the model reads the source and answers in the learner's language.
    const transcript = pickLangVariant(video.transcriptI18n, video.transcript, lang);
    const summary = pickLangVariant(video.aiSummaryI18n, video.aiSummary, lang);
    const description = String(video.description || video.content?.[lang]?.description || video.content?.en?.description || '').trim();

    // E-book / study materials: those linked to this video plus course-wide ones.
    const CourseMaterial = getCourseMaterial();
    const materials: any[] = await CourseMaterial.find({
      courseId: course._id,
      isActive: true,
      type: { $ne: 'certificate' },
      $or: [{ videoId: video._id }, { videoId: { $exists: false } }, { videoId: null }],
    }).sort({ order: 1 }).limit(20).lean();

    const sources: RagSource[] = [];
    if (summary) sources.push({ label: 'Video summary', text: summary });
    if (transcript) sources.push({ label: 'Video transcript', text: transcript });
    if (!transcript && description) sources.push({ label: 'Video notes', text: description });

    for (const m of materials) {
      const text = pickLangVariant(m.ragTextI18n, m.ragText, lang);
      if (!text) continue;
      const title = String(m.content?.[lang]?.title || m.content?.en?.title || 'Study material');
      sources.push({ label: `E-book: ${title}`, text });
    }

    if (!sources.length) {
      return NextResponse.json({
        success: true,
        reply: 'No transcript, study notes, or e-book content is added for this video yet. Please ask the admin to add RAG content.',
      });
    }

    const { context, retrieved } = buildRagContext(question, sources);

    const courseTitle = String(course.content?.[lang]?.title || course.content?.en?.title || course.slug || 'Recorded course');
    const videoTitle = String(video.title || video.content?.[lang]?.title || video.content?.en?.title || 'Video');
    const replyLanguage = languageName(lang);
    const languageRule = replyLanguage
      ? `- ALWAYS reply in ${replyLanguage}, even when the source material below is in a different language. If the user clearly writes in another language, mirror the user's language instead.`
      : `- Reply in the same language the user writes in.`;

    const systemPrompt = `You are a helpful E-learning assistant for Swar Yoga. You answer questions about a course video and its study materials (e-books, notes).

Answer questions only using the context below. If the answer is not present in the context, say that the course content does not contain enough information${retrieved ? ' (only the most relevant excerpts are shown)' : ''}.

Course: ${courseTitle}
Video: ${videoTitle}

${context}

Rules:
- Keep answers clear and practical.
${languageRule}
- Do not invent facts outside the context.
- When the answer comes from an e-book, mention which e-book it is from.
- For study questions, give concise bullet points when useful.`;

    const reply = await generateAIText({
      systemPrompt,
      history,
      message: question,
      maxOutputTokens: 700,
      temperature: 0.3,
      providerOrder: ['OpenAI', 'Anthropic'],
    });

    return NextResponse.json({ success: true, reply, language: lang });
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
