import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { generateAIText, type AiHistoryTurn } from '@/lib/ai/generateWithFallback';
import { buildRagContext, pickLangVariant, languageName, type RagSource } from '@/lib/ragRetrieval';

import { bunnyExecute } from '@/lib/bunnyDatabase';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ videoId: string }>;
}

async function canAccessVideo(request: NextRequest, video: any) {
  if (video.is_free === 1 || video.isFree === true) return true;

  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return false;

  try {
    const decoded = verifyToken(authHeader.split(' ')[1]);
    const userId = (decoded as any)?.id || (decoded as any)?._id || (decoded as any)?.userId || null;
    if (!userId) return false;


    // Check enrollment in Bunny Database
    const res = await bunnyExecute({
      sql: `SELECT id FROM course_enrollments_sql 
            WHERE (user_id = ? OR email = ?) AND course_id = ? AND status IN ('active', 'completed') LIMIT 1`,
      args: [userId, decoded?.email || '', video.course_id],
    });

    return res.rows.length > 0;
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


    // 1. Fetch video from Bunny Database
    const videoRes = await bunnyExecute({
      sql: 'SELECT * FROM course_videos_sql WHERE id = ? LIMIT 1',
      args: [videoId],
    });

    if (!videoRes.rows.length) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    const video = videoRes.rows[0];
    if (video.is_active === 0) {
      return NextResponse.json({ error: 'Video is inactive' }, { status: 404 });
    }

    // 2. Fetch course from Bunny Database
    const courseRes = await bunnyExecute({
      sql: 'SELECT * FROM recorded_courses_sql WHERE id = ? LIMIT 1',
      args: [video.course_id],
    });

    if (!courseRes.rows.length) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    const course = courseRes.rows[0];

    const allowed = await canAccessVideo(request, video);
    if (!allowed) {
      return NextResponse.json({ error: 'Enrollment required' }, { status: 403 });
    }


    // Parse content_json
    let contentObj: any = {};
    try {
      contentObj = video.content_json ? JSON.parse(String(video.content_json)) : {};
    } catch {
      contentObj = {};
    }

    let courseContent: any = {};
    try {
      courseContent = course.content_json ? JSON.parse(String(course.content_json)) : {};
    } catch {
      courseContent = {};
    }

    // 3. Extract RAG sources
    const rawTranscript = String(video.transcript || contentObj.transcript || '').trim();
    const rawAiSummary = String(video.ai_summary || contentObj.aiSummary || '').trim();
    const transcriptI18n = contentObj.transcriptI18n || {};
    const aiSummaryI18n = contentObj.aiSummaryI18n || {};

    const transcript = pickLangVariant(transcriptI18n, rawTranscript, lang);
    const summary = pickLangVariant(aiSummaryI18n, rawAiSummary, lang);
    const description = String(
      contentObj[lang]?.description || contentObj.en?.description || video.description || ''
    ).trim();

    // 4. Fetch materials linked to course / video from Bunny Database
    const materialsRes = await bunnyExecute({
      sql: `SELECT * FROM course_materials_sql 
            WHERE course_id = ? AND is_active = 1 
            ORDER BY display_order ASC LIMIT 20`,
      args: [course.id],
    });

    const sources: RagSource[] = [];
    if (description) sources.push({ label: 'Video notes', text: description });


    for (const m of materialsRes.rows) {
      let mContent: any = {};
      try {
        mContent = m.content_json ? JSON.parse(String(m.content_json)) : {};
      } catch {
        mContent = {};
      }

      const ragText = String(m.rag_text || mContent.ragText || '').trim();
      const text = pickLangVariant(mContent.ragTextI18n, ragText, lang);
      if (!text) continue;

      const title = String(mContent[lang]?.title || mContent.en?.title || m.title || 'Study material');
      sources.push({ label: `E-book / Notes: ${title}`, text });
    }

    if (!sources.length) {
      return NextResponse.json({
        success: true,
        reply: 'No transcript, study notes, or e-book content is added for this video yet. Please ask the admin to generate or attach RAG transcript content.',
      });
    }

    const { context, retrieved } = buildRagContext(question, sources);

    const courseTitle = String(courseContent[lang]?.title || courseContent.en?.title || course.slug || 'Course');
    const videoTitle = String(contentObj[lang]?.title || contentObj.en?.title || video.title || 'Video');
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


Rules:
- Keep answers clear, accurate, and practical.
${languageRule}
- Do not invent facts outside the context.
- When the answer comes from an e-book or notes, mention which material it is from.
- For study questions, give concise bullet points when useful.`;

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
    const message = error instanceof Error ? error.message : 'Failed to answer question';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
