import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { bunnyExecute } from '@/lib/bunnyDatabase';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId') || 'mohan_master_clone_proj_v1';

    const res = await bunnyExecute({
      sql: `SELECT * FROM mohan_voice_identity_sql WHERE training_project_id = ? ORDER BY created_at DESC`,
      args: [projectId],
    });

    return NextResponse.json({ success: true, voices: res.rows || [] });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      training_project_id = 'mohan_master_clone_proj_v1',
      provider = 'elevenlabs',
      provider_voice_id = 'mohan_clone_v1',
      voice_name = 'Mohan Master Voice',
      fundamental_pitch_hz = 118.5,
      speaking_rate_wpm = 130,
      supported_languages = ['hi', 'mr', 'en'],
      terminology_pronunciation_overrides = {
        'स्वर योग': 'Swar Yoga',
        'प्राणायाम': 'Pranayama',
        'ईड़ा': 'Ida',
        'पिंगला': 'Pingala',
        'सुषुम्ना': 'Sushumna',
      },
      sample_audio_keys = [],
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

