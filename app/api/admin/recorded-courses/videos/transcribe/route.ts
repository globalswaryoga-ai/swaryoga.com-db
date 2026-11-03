import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';
import { bunnyExecute } from '@/lib/bunnyDatabase';
import {
  transcribeAudio,
  correctTranscript,
  condenseAndTranslate,
  ExtractedAudio,
} from '@/lib/aiVideo/transcribeAndCondense';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin) return unauthorized();
    if (!isSuperAdmin(decoded)) {
      return NextResponse.json({ error: 'Forbidden: Superadmin access required' }, { status: 403 });
    }

    const contentType = request.headers.get('content-type') || '';
    let videoId = '';
    let sourceLanguage = 'hi';
    let targetLanguages = ['hi', 'en', 'mr'];
    let audioBuffer: Buffer | null = null;
    let mimeType = 'audio/mpeg';

    const rawBody = !contentType.includes('multipart/form-data') ? await request.json().catch(() => ({})) : {};
    let passedBunnyId = '';
    let passedVideoUrl = '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      videoId = String(formData.get('videoId') || '').trim();
      sourceLanguage = String(formData.get('sourceLanguage') || 'hi').trim();
      passedBunnyId = String(formData.get('bunnyVideoId') || '').trim();
      passedVideoUrl = String(formData.get('videoUrl') || '').trim();
      const rawLangs = String(formData.get('targetLanguages') || 'hi,en,mr');
      targetLanguages = rawLangs.split(',').map((l) => l.trim()).filter(Boolean);

      const file = (formData.get('file') || formData.get('audioFile')) as File | null;
      if (file) {
        audioBuffer = Buffer.from(await file.arrayBuffer());
        mimeType = file.type || 'audio/mpeg';
      }
    } else {
      videoId = String(rawBody.videoId || '').trim();
      sourceLanguage = String(rawBody.sourceLanguage || 'hi').trim();
      passedBunnyId = String(rawBody.bunnyVideoId || '').trim();
      passedVideoUrl = String(rawBody.videoUrl || '').trim();
      if (Array.isArray(rawBody.targetLanguages)) {
        targetLanguages = rawBody.targetLanguages;
      }
      const directAudioUrl = String(rawBody.audioUrl || rawBody.videoUrl || '').trim();
      if (directAudioUrl) {
        try {
          const res = await fetch(directAudioUrl);
          if (res.ok) {
            audioBuffer = Buffer.from(await res.arrayBuffer());
            mimeType = res.headers.get('content-type') || 'audio/mpeg';
          }
        } catch {}
      }
    }

    // 1. Fetch video from Bunny Database if videoId was supplied
    let video: any = null;
    if (videoId) {
      const videoRes = await bunnyExecute({
        sql: 'SELECT * FROM course_videos_sql WHERE id = ? LIMIT 1',
        args: [videoId],
      });
      if (videoRes.rows.length) {
        video = videoRes.rows[0];
      }
    }

    // If audioBuffer wasn't provided, attempt to download from Bunny video or video_url
    if (!audioBuffer) {
      const bunnyId = String(video?.bunny_video_id || passedBunnyId || '').trim();
      const videoUrl = String(video?.video_url || passedVideoUrl || '').trim();
      const libraryId = process.env.BUNNY_STREAM_LIBRARY_ID || '638748';
      const cdnKey = process.env.BUNNY_STREAM_CDN_KEY || '';

      const candidateUrls: string[] = [];

      if (videoUrl && videoUrl.startsWith('http')) {
        candidateUrls.push(videoUrl);
      } else if (bunnyId) {
        // Try multiple Bunny Stream resolutions (240p/360p download 10x faster with identical audio)
        const resolutions = ['play_240p.mp4', 'play_360p.mp4', 'play_720p.mp4', 'play.mp4'];
        for (const res of resolutions) {
          const path = `/${bunnyId}/${res}`;
          if (cdnKey) {
            const crypto = await import('crypto');
            const expiry = Math.floor(Date.now() / 1000) + 3600;
            const token = crypto
              .createHash('sha256')
              .update(cdnKey + path + expiry)
              .digest('base64')
              .replace(/\+/g, '-')
              .replace(/\//g, '_')
              .replace(/=/g, '');
            candidateUrls.push(`https://vz-${libraryId}.b-cdn.net${path}?token=${token}&expires=${expiry}`);
          }
          candidateUrls.push(`https://vz-${libraryId}.b-cdn.net${path}`);
          candidateUrls.push(`https://vz-d0769ece-079.b-cdn.net${path}`);
        }
      }

      for (const downloadUrl of candidateUrls) {
        try {
          const res = await fetch(downloadUrl, { method: 'GET' });
          if (res.ok) {
            audioBuffer = Buffer.from(await res.arrayBuffer());
            mimeType = res.headers.get('content-type') || 'video/mp4';
            break;
          }
        } catch (fetchErr) {
          console.warn('Could not fetch candidate video media from:', downloadUrl, fetchErr);
        }
      }
    }

    if (!audioBuffer) {
      return NextResponse.json(
        {
          error:
            'No audio/video file provided or downloadable for this video. If Bunny Stream CDN is token-protected, please upload the MP4/audio file directly via the upload button in the video edit modal.',
        },
        { status: 400 }
      );
    }

    // 2. Transcribe using OpenAI Whisper
    const rawTranscript = await transcribeAudio({
      buffer: audioBuffer,
      mimeType,
    } as ExtractedAudio);

    // 3. Correct transcript
    const corrected = await correctTranscript(rawTranscript, sourceLanguage);

    // 4. Generate multi-language translations
    const transcriptI18n: Record<string, string> = {
      [sourceLanguage]: corrected,
    };
    const videoTitle = String(video?.title || passedVideoUrl || 'Video content');
    const aiSummaryI18n: Record<string, string> = {
      [sourceLanguage]: videoTitle,
    };

    for (const lang of targetLanguages) {
      if (lang === sourceLanguage) continue;
      try {
        const translated = await condenseAndTranslate(corrected, sourceLanguage, lang, videoTitle);
        transcriptI18n[lang] = translated;
        aiSummaryI18n[lang] = `${videoTitle} (${lang})`;
      } catch (transErr) {
        console.warn(`Translation to ${lang} failed:`, transErr);
      }
    }

    // 5. Update content_json and columns in Bunny Database if video exists in DB
    if (videoId && video) {
      let contentObj: any = {};
      try {
        contentObj = video.content_json ? JSON.parse(String(video.content_json)) : {};
      } catch {
        contentObj = {};
      }

      contentObj.transcript = corrected;
      contentObj.aiSummary = videoTitle;
      contentObj.transcriptI18n = transcriptI18n;
      contentObj.aiSummaryI18n = aiSummaryI18n;
      contentObj.ragEnabled = true;

      const now = new Date().toISOString();
      await bunnyExecute({
        sql: `UPDATE course_videos_sql 
              SET transcript = ?, ai_summary = ?, rag_enabled = 1, content_json = ?, updated_at = ?
              WHERE id = ?`,
        args: [corrected, videoTitle, JSON.stringify(contentObj), now, videoId],
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Video successfully transcribed and converted to text for RAG in all target languages.',
      data: {
        videoId,
        transcript: corrected,
        targetLanguages: Object.keys(transcriptI18n),
      },
    });
  } catch (err: any) {
    const message = err instanceof Error ? err.message : 'Transcription failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

