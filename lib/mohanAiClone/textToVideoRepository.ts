import crypto from 'node:crypto';
import { bunnyExecute } from '@/lib/bunnyDatabase';

export interface TimelineScriptSegment {
  id: string;
  segmentIndex: number;
  sentenceText: string;
  translatedText?: string;
  targetLanguage?: string;
  startMs: number;
  endMs: number;
  speakingRateWpm: number;
  pauseAfterMs: number;
  voicePitchEmphasis: 'calm' | 'authoritative' | 'whisper' | 'devotional' | 'energetic';
  emotion: 'calm' | 'joyful' | 'serious' | 'contemplative' | 'compassionate' | 'neutral';
  handGesture: 'none' | 'chin_mudra' | 'pranam' | 'open_palm' | 'index_emphasis' | 'chest_touch';
  headMovement: 'still' | 'nod_agreement' | 'slight_tilt' | 'slow_scan';
  audioClipUrl?: string;
  isAudioApproved: boolean;
  isVideoApproved: boolean;
  needsRegeneration: boolean;
}

export interface GeneratedVideoProjectRecord {
  id: string;
  title: string;
  script_text: string;
  language: string;
  appearance_preset_id: string;
  voice_identity_id: string;
  camera_view: 'full' | 'waist' | 'face';
  aspect_ratio: '16:9' | '1:1' | '9:16';
  timeline_segments_json: string;
  total_duration_seconds: number;
  render_job_id?: string;
  final_video_url?: string;
  status: 'draft' | 'synthesizing_audio' | 'rendering_video' | 'completed' | 'failed';
  created_at: string;
  updated_at: string;
}

/**
 * Fetch all text-to-video production projects
 */
export async function getGeneratedVideoProjects(): Promise<GeneratedVideoProjectRecord[]> {
  const res = await bunnyExecute({
    sql: `SELECT * FROM mohan_generated_video_projects_sql ORDER BY updated_at DESC`,
  });
  return (res.rows || []) as unknown as GeneratedVideoProjectRecord[];
}

/**
 * Fetch single text-to-video project by ID
 */
export async function getGeneratedVideoProjectById(id: string): Promise<GeneratedVideoProjectRecord | null> {
  const res = await bunnyExecute({
    sql: `SELECT * FROM mohan_generated_video_projects_sql WHERE id = ? LIMIT 1`,
    args: [id],
  });
  if (!res.rows || res.rows.length === 0) return null;
  return res.rows[0] as unknown as GeneratedVideoProjectRecord;
}

/**
 * Create or update a text-to-video production project
 */
export async function saveGeneratedVideoProject(
  p: Partial<GeneratedVideoProjectRecord>
): Promise<GeneratedVideoProjectRecord> {
  const now = new Date().toISOString();
  const id = p.id || `vproj_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;

  await bunnyExecute({
    sql: `INSERT INTO mohan_generated_video_projects_sql
          (id, title, script_text, language, appearance_preset_id, voice_identity_id, camera_view,
           aspect_ratio, timeline_segments_json, total_duration_seconds, render_job_id, final_video_url,
           status, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            title = excluded.title,
            script_text = excluded.script_text,
            language = excluded.language,
            appearance_preset_id = excluded.appearance_preset_id,
            voice_identity_id = excluded.voice_identity_id,
            camera_view = excluded.camera_view,
            aspect_ratio = excluded.aspect_ratio,
            timeline_segments_json = excluded.timeline_segments_json,
            total_duration_seconds = excluded.total_duration_seconds,
            render_job_id = excluded.render_job_id,
            final_video_url = excluded.final_video_url,
            status = excluded.status,
            updated_at = excluded.updated_at`,
    args: [
      id,
      p.title || 'Untitled Mohan AI Talk',
      p.script_text || '',
      p.language || 'hi',
      p.appearance_preset_id || 'preset_vedic_guru_authentic',
      p.voice_identity_id || 'mohan_master_voice_v1',
      p.camera_view || 'waist',
      p.aspect_ratio || '16:9',
      p.timeline_segments_json || '[]',
      p.total_duration_seconds || 0,
      p.render_job_id || null,
      p.final_video_url || null,
      p.status || 'draft',
      p.created_at || now,
      now,
    ],
  });

  return (await getGeneratedVideoProjectById(id))!;
}

/**
 * Split raw script text into individual sentences with default pauses and timestamps
 */
export function segmentScriptIntoTimeline(scriptText: string, language = 'hi'): TimelineScriptSegment[] {
  // Regex splits on full stops, question marks, exclamation marks, or Devanagari danda (|)
  const rawSentences = scriptText
    .split(/([.!?।\n]+)/)
    .map((s) => s.trim())
    .filter((s) => s.length > 2 && !/^[.!?।\n]+$/.test(s));

  let currentStartMs = 0;
  const segments: TimelineScriptSegment[] = [];

  rawSentences.forEach((sentence, index) => {
    const wordCount = sentence.split(/\s+/).filter(Boolean).length;
    // Average 130 words per minute -> 461ms per word
    const durationMs = Math.max(1800, Math.round((wordCount / 130) * 60 * 1000));
    const pauseAfterMs = 450;
    const endMs = currentStartMs + durationMs;

    // Detect gestures based on keywords
    let suggestedGesture: TimelineScriptSegment['handGesture'] = 'none';
    const lower = sentence.toLowerCase();
    if (lower.includes('namaste') || lower.includes('pranam') || lower.includes('स्वागत')) {
      suggestedGesture = 'pranam';
    } else if (lower.includes('dhyan') || lower.includes('meditation') || lower.includes('breath') || lower.includes('swar')) {
      suggestedGesture = 'chin_mudra';
    } else if (lower.includes('heart') || lower.includes('atma') || lower.includes('soul') || lower.includes('me')) {
      suggestedGesture = 'chest_touch';
    } else if (lower.includes('remember') || lower.includes('important') || lower.includes('rule')) {
      suggestedGesture = 'index_emphasis';
    } else {
      suggestedGesture = index % 2 === 0 ? 'open_palm' : 'none';
    }

    segments.push({
      id: `seg_${index + 1}_${crypto.randomBytes(2).toString('hex')}`,
      segmentIndex: index + 1,
      sentenceText: sentence,
      targetLanguage: language,
      startMs: currentStartMs,
      endMs,
      speakingRateWpm: 130,
      pauseAfterMs,
      voicePitchEmphasis: 'calm',
      emotion: 'calm',
      handGesture: suggestedGesture,
      headMovement: index % 3 === 0 ? 'nod_agreement' : 'still',
      isAudioApproved: false,
      isVideoApproved: false,
      needsRegeneration: false,
    });

    currentStartMs = endMs + pauseAfterMs;
  });

  return segments;
}

/**
 * Format milliseconds into SRT timestamp format: 00:00:00,000
 */
function msToSrtTime(ms: number): string {
  const date = new Date(ms);
  const hours = Math.floor(ms / 3600000).toString().padStart(2, '0');
  const minutes = date.getUTCMinutes().toString().padStart(2, '0');
  const seconds = date.getUTCSeconds().toString().padStart(2, '0');
  const millis = date.getUTCMilliseconds().toString().padStart(3, '0');
  return `${hours}:${minutes}:${seconds},${millis}`;
}

/**
 * Generate standard SRT Subtitles from Timeline Segments
 */
export function generateSrtSubtitles(segments: TimelineScriptSegment[]): string {
  return segments
    .map((seg, idx) => {
      const start = msToSrtTime(seg.startMs);
      const end = msToSrtTime(seg.endMs);
      const text = seg.translatedText || seg.sentenceText;
      return `${idx + 1}\n${start} --> ${end}\n${text}\n`;
    })
    .join('\n');
}

/**
 * Generate standard WebVTT Subtitles from Timeline Segments
 */
export function generateVttSubtitles(segments: TimelineScriptSegment[]): string {
  const body = segments
    .map((seg, idx) => {
      const start = msToSrtTime(seg.startMs).replace(',', '.');
      const end = msToSrtTime(seg.endMs).replace(',', '.');
      const text = seg.translatedText || seg.sentenceText;
      return `${idx + 1}\n${start} --> ${end}\n${text}\n`;
    })
    .join('\n');
  return `WEBVTT\n\n${body}`;
}

