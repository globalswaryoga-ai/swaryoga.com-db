import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { bunnyExecute } from '@/lib/bunnyDatabase';
import { MOHAN_VOCAL_DNA_MODELS } from '@/lib/mohanAiClone/avatarDna50Catalog';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    let voicesRes;
    if (projectId) {
      voicesRes = await bunnyExecute({
        sql: `SELECT * FROM mohan_voice_identity_sql WHERE training_project_id = ? ORDER BY created_at DESC`,
        args: [projectId],
      });
    } else {
      voicesRes = await bunnyExecute({
        sql: `SELECT * FROM mohan_voice_identity_sql ORDER BY created_at DESC`,
        args: [],
      });
    }

    // Also fetch full vocal DNA models
    let vocalDnaRows: any[] = [];
    try {
      const vocalRes = await bunnyExecute(`
        SELECT id, language, tone_name, pitch_hz, cadence_words_per_minute,
               characteristic, sample_phrase, audio_sample_url, created_at
        FROM mohan_avatar_vocal_dna_sql
        ORDER BY created_at ASC
      `);
      vocalDnaRows = vocalRes.rows || [];
    } catch {}

    const voices = (voicesRes.rows && voicesRes.rows.length > 0)
      ? voicesRes.rows
      : MOHAN_VOCAL_DNA_MODELS;

    const vocalDna = (vocalDnaRows.length > 0)
      ? vocalDnaRows
      : MOHAN_VOCAL_DNA_MODELS;

    return NextResponse.json({
      success: true,
      voices,
      vocalDna,
      catalog: MOHAN_VOCAL_DNA_MODELS,
      activeVoiceSampleUrl: 'https://swaryogacrm.b-cdn.net/zoom-videos/2026-10-13-H1P12YTMTRy5J0baEAa-bQ---audio.mp3',
    });
  } catch (error: any) {
    console.error('Error fetching voice identity:', error);
    return NextResponse.json({
      success: true,
      voices: MOHAN_VOCAL_DNA_MODELS,
      vocalDna: MOHAN_VOCAL_DNA_MODELS,
      catalog: MOHAN_VOCAL_DNA_MODELS,
      activeVoiceSampleUrl: 'https://swaryogacrm.b-cdn.net/zoom-videos/2026-10-13-H1P12YTMTRy5J0baEAa-bQ---audio.mp3',
      source: 'catalog_fallback',
    });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      training_project_id = 'mohan_master_clone_proj_v1',
      provider = 'edge_tts_inhouse',
      provider_voice_id = 'hi-IN-MadhurNeural',
      voice_name = 'Mohan Master Voice',
      fundamental_pitch_hz = 125,
      speaking_rate_wpm = 115,
      supported_languages = ['hi', 'mr', 'en', 'sa'],
      terminology_pronunciation_overrides = {
        'स्वर योग': 'Swar Yoga',
        'प्राणायाम': 'Pranayama',
        'ईड़ा': 'Ida',
        'पिंगला': 'Pingala',
        'सुषुम्ना': 'Sushumna',
      },
      sample_audio_keys = ['https://swaryogacrm.b-cdn.net/zoom-videos/2026-10-13-H1P12YTMTRy5J0baEAa-bQ---audio.mp3'],
    } = body;

    const id = body.id || `voice_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const now = new Date().toISOString();

    await bunnyExecute({
      sql: `INSERT INTO mohan_voice_identity_sql
            (id, training_project_id, provider, provider_voice_id, voice_name,
             fundamental_pitch_hz, speaking_rate_wpm, supported_languages_json,
             terminology_pronunciation_overrides_json, sample_audio_keys_json, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              provider = excluded.provider,
              provider_voice_id = excluded.provider_voice_id,
              voice_name = excluded.voice_name,
              fundamental_pitch_hz = excluded.fundamental_pitch_hz,
              speaking_rate_wpm = excluded.speaking_rate_wpm,
              supported_languages_json = excluded.supported_languages_json,
              terminology_pronunciation_overrides_json = excluded.terminology_pronunciation_overrides_json,
              sample_audio_keys_json = excluded.sample_audio_keys_json`,
      args: [
        id,
        training_project_id,
        provider,
        provider_voice_id,
        voice_name,
        Number(fundamental_pitch_hz),
        Number(speaking_rate_wpm),
        JSON.stringify(supported_languages),
        JSON.stringify(terminology_pronunciation_overrides),
        JSON.stringify(sample_audio_keys),
        now,
      ],
    });

    const res = await bunnyExecute({
      sql: `SELECT * FROM mohan_voice_identity_sql WHERE id = ? LIMIT 1`,
      args: [id],
    });

    return NextResponse.json({ success: true, voice: res.rows[0] });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message }, { status: 500 });
  }
}
