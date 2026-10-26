import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { generateAIText, type AiHistoryTurn } from '@/lib/ai/generateWithFallback';
import { buildRagContext, pickLangVariant, languageName, type RagSource } from '@/lib/ragRetrieval';
import {
  getVideoById,
  getCourseById,
  getEnrollment,
  listMaterialsByCourse,
} from '@/lib/bunnyCourseRepository';
import { parseAvatarScript } from '@/lib/avatarEmotionParser';

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
    const userId = (decoded as any)?.id || (decoded as any)?._id || (decoded as any)?.userId || null;
    if (!userId) return false;

    const enrollment = await getEnrollment(String(userId), course.id);
    return !!enrollment;
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { videoId } = await params;
    const body = await request.json().catch(() => ({}));
    const question = String(body?.question || '').trim();
    const lang = String(body?.lang || 'en').toLowerCase();
    const history: AiHistoryTurn[] = Array.isArray(body?.history) ? body.history.slice(-6) : [];

    if (!question) {
      return NextResponse.json({ error: 'Question is required' }, { status: 400 });
    }

    const video = await getVideoById(videoId);
    if (!video || !video.isActive) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    const course = await getCourseById(video.courseId);
    if (!course || !course.isActive) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    const allowed = await canAccessVideo(request, video, course);
    if (!allowed) {
      return NextResponse.json({ error: 'Enrollment required' }, { status: 403 });
    }

    const description = String(video.description || video.content?.[lang]?.description || video.content?.en?.description || '').trim();

    const materials = await listMaterialsByCourse(course.id, true);

    const sources: RagSource[] = [];
    if (description) sources.push({ label: 'Video notes', text: description });

    for (const m of materials) {
      const text = pickLangVariant(m.content?.[lang]?.ragText, m.content?.ragText, lang);
      if (!text) continue;
      const title = String(m.content?.[lang]?.title || m.content?.en?.title || m.title || 'Study material');
      sources.push({ label: `E-book: ${title}`, text });
    }

    if (!sources.length) {
      sources.push({
        label: 'Swar Yoga Foundational Wisdom',
        text: `Swar Yoga is the sacred Vedic science of breath cycle awareness (Shiva Swarodaya). The breath cycles between Ida Nadi (Chandra/left nostril, cooling, calm, mental work) and Pingala Nadi (Surya/right nostril, heating, physical digestion, vitality) approximately every 60-90 minutes. When both nostrils flow equally, Sushumna is active, ideal for meditation and prayer. Lesson topic: ${video.title}. Always observe breath awareness before decisions, meals, and sadhana.`
      });
    }

    const { context, retrieved } = buildRagContext(question, sources);

    const courseTitle = String(course.content?.[lang]?.title || course.content?.en?.title || course.slug || 'Recorded course');
    const videoTitle = String(video.title || video.content?.[lang]?.title || video.content?.en?.title || 'Video');
    const replyLanguage = languageName(lang);
    const languageRule = replyLanguage
      ? `- ALWAYS reply in ${replyLanguage}, even when the source material is in a different language. If the user asks in Hindi or Marathi, reply in that language.`
      : `- Reply warmly in the same language the student asks in.`;

    const systemPrompt = `You are Mohan Sir's AI Avatar Guide for Swar Yoga. You speak with warm authority, practical Vedic wisdom, and deep compassion for the student.

Answer the student's question based on the course video, study notes, and Shiva Swarodaya breath principles below.

Course: ${courseTitle}
Video: ${videoTitle}

Context:
${context}

Rules for Mohan Sir's Avatar Response:
1. Speak in first person as Mohan Sir ("मैं", "आम्ही", "I").
2. Start with a warm greeting and emotion tag like [smile:80] or [namaste].
3. Give practical, crystal-clear explanation with [teaching] or [inspire] where appropriate.
4. Keep the answer concise (2-4 brief paragraphs), engaging, and encouraging.
5. End with an uplifting closing blessing like [blessing] or [namaste].
6. Use natural punctuation (। for Hindi/Marathi, ? for curiosity, ! for inspiration).
${languageRule}`;

    const rawReply = await generateAIText({
      systemPrompt,
      history,
      message: question,
      maxOutputTokens: 600,
      temperature: 0.35,
      providerOrder: ['OpenAI', 'Anthropic'],
    });

    const parsed = parseAvatarScript(rawReply);

    return NextResponse.json({
      success: true,
      reply: rawReply,
      cleanReply: parsed.fullCleanText,
      avatarEmotion: parsed.segments[0]?.primaryEmotion || 'friendly',
      emotionIntensity: parsed.segments[0]?.intensity || 80,
      segments: parsed.segments,
      language: lang,
    });
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
