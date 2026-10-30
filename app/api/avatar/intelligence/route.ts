import { NextRequest, NextResponse } from 'next/server';
import {
  getAllVideoIntelligence,
  getVideoIntelligenceById,
  saveVideoIntelligence,
  savePerformanceDna,
} from '@/lib/mohanAiClone/mohanAiCloneRepository';
import { analyzeMohanVideo, type IntelligenceSegment } from '@/lib/mohanAiClone/videoIntelligenceService';
import { applyTerminologyGuard } from '@/lib/mohanAiClone/swarYogaDictionary';
import { buildExportManifest } from '@/lib/mohanAiClone/exportManagerService';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (id) {
      const record = await getVideoIntelligenceById(id);
      if (!record) {
        return NextResponse.json({ success: false, error: 'Video intelligence record not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, data: record });
    }

    const records = await getAllVideoIntelligence();
    return NextResponse.json({ success: true, data: records });
  } catch (error) {
    console.error('Error fetching video intelligence:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch video intelligence' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    // ── ACTION 1: TRIGGER INTELLIGENT ANALYSIS ──
    if (action === 'analyze') {
      const { videoId, videoName, videoUrl, language } = body;
      const analysis = await analyzeMohanVideo(
        videoId || `vid_${Date.now()}`,
        videoName || 'Original Swar Yoga Discourse',
        videoUrl || 'https://iframe.mediadelivery.net/play/demo',
        language || 'hi',
      );

      // Save to Bunny Edge SQL
      const savedRecord = await saveVideoIntelligence({
        id: analysis.videoId,
        video_name: analysis.videoName,
        video_url: videoUrl || '',
        duration_seconds: analysis.durationSeconds,
        language: analysis.languageDetected,
        transcript_json: JSON.stringify(analysis.segments),
        analysis_status: 'ready',
        confidence_overall: analysis.overallConfidence,
      });

      // Automatically populate Performance DNA candidates
      for (const seg of analysis.segments) {
        await savePerformanceDna({
          source_video_id: analysis.videoId,
          phrase_text: seg.text,
          start_ms: seg.startMs,
          end_ms: seg.endMs,
          emotion: seg.emotion,
          facial_expression: seg.facialExpression,
          head_movement: seg.headMovement,
          hand_gesture: seg.handGesture,
          body_posture: seg.bodyPosture,
          speaking_speed: seg.speakingSpeedWpm / 120,
          voice_emphasis: seg.voiceEmphasisWords.join(', '),
          confidence_score: seg.emotionConfidence,
          is_approved: 0,
        });
      }

      return NextResponse.json({
        success: true,
        data: savedRecord,
        analysis,
        message: 'Video intelligence and DNA anchors extracted successfully',
      });
    }

    // ── ACTION 2: UPDATE / EDIT SEGMENTS (HUMAN-IN-THE-LOOP) ──
    if (action === 'update_segments') {
      const { id, segments } = body;
      const existing = await getVideoIntelligenceById(id);
      if (!existing) {
        return NextResponse.json({ success: false, error: 'Record not found' }, { status: 404 });
      }

      const updatedRecord = await saveVideoIntelligence({
        ...existing,
        transcript_json: JSON.stringify(segments),
        analysis_status: 'ready',
      });

      return NextResponse.json({
        success: true,
        data: updatedRecord,
        message: 'Transcript segments and expressions updated successfully',
      });
    }

    // ── ACTION 3: APPROVE & ASSIGN TO RAG HUB ──
    if (action === 'approve_rag') {
      const { id, ragCategory, approvedBy } = body;
      const existing = await getVideoIntelligenceById(id);
      if (!existing) {
        return NextResponse.json({ success: false, error: 'Record not found' }, { status: 404 });
      }

      const updatedRecord = await saveVideoIntelligence({
        ...existing,
        analysis_status: 'approved',
        rag_status: 'indexed',
        rag_category: ragCategory || 'WHY_SWAR_YOGA',
        approved_by: approvedBy || 'Admin Mohan',
      });

      return NextResponse.json({
        success: true,
        data: updatedRecord,
        message: `Transcript approved and indexed to RAG Hub [${ragCategory}]`,
      });
    }

    // ── ACTION 4: BUILD EXPORT BUNDLE MANIFEST ──
    if (action === 'generate_export_manifest') {
      const { projectName, targetLanguages, aspectRatios } = body;
      const manifest = buildExportManifest(
        projectName || 'Mohan_Discourse_01',
        targetLanguages || ['hi', 'en', 'mr', 'sa', 'ne'],
        aspectRatios || ['16:9', '9:16', '1:1'],
      );

      return NextResponse.json({
        success: true,
        data: manifest,
      });
    }

    // ── ACTION 5: TERMINOLOGY GUARD TEST ──
    if (action === 'check_terminology') {
      const { text, targetLanguage } = body;
      const sanitized = applyTerminologyGuard(text || '', targetLanguage || 'en');
      return NextResponse.json({
        success: true,
        original: text,
        guarded: sanitized,
      });
    }

    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('Error in video intelligence API:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

