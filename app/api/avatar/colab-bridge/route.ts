import { NextRequest, NextResponse } from 'next/server';
import { bunnyExecute } from '@/lib/bunnyDatabase';

export const dynamic = 'force-dynamic';

/**
 * Colab Free GPU Webhook Bridge
 * Receives completion events from Google Colab GPU notebook when a video is synthesized.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const {
      secret,
      roleId = 'university_professor',
      videoUrl,
      language = 'hi',
      durationSeconds = 30,
      jobId,
    } = body;

    // Security check: verify webhook secret
    const allowedSecrets = [
      process.env.WHATSAPP_BRIDGE_SECRET,
      'swar-colab-twin-2026',
      'swar-colab-bridge-gpu',
    ].filter(Boolean);

    if (!allowedSecrets.includes(secret)) {
      return NextResponse.json({ error: 'Unauthorized Colab Webhook' }, { status: 401 });
    }

    if (!videoUrl || !videoUrl.startsWith('http')) {
      return NextResponse.json({ error: 'Valid videoUrl is required' }, { status: 400 });
    }

    const now = new Date().toISOString();

    // 1. Update or Insert into swar_neural_video_jobs_sql
    if (jobId) {
      await bunnyExecute({
        sql: `UPDATE swar_neural_video_jobs_sql SET status = 'completed', video_url = ?, duration_seconds = ?, updated_at = ? WHERE id = ?`,
        args: [videoUrl, durationSeconds, now, jobId],
      });
    }

    // 2. Persist to avatar_digital_twins_sql
    await bunnyExecute({
      sql: `CREATE TABLE IF NOT EXISTS avatar_digital_twins_sql (
        role_id TEXT PRIMARY KEY,
        name_hi TEXT,
        video_url TEXT,
        language TEXT,
        duration_seconds REAL,
        source_gpu TEXT DEFAULT 'google_colab_t4',
        updated_at TEXT
      )`,
    });

    await bunnyExecute({
      sql: `INSERT OR REPLACE INTO avatar_digital_twins_sql (role_id, name_hi, video_url, language, duration_seconds, source_gpu, updated_at)
            VALUES (?, ?, ?, ?, ?, 'google_colab_t4', ?)`,
      args: [roleId, `Digital Twin: ${roleId}`, videoUrl, language, durationSeconds, now],
    });

    // 3. Register as an active ready avatar in Studio Hub (Module 3 & Module 8)
    const videoAvatarId = `v_avatar_colab_${roleId}`;
    const finalAvatarId = `final_avatar_colab_${roleId}`;
    const avatarName = `Mohan Sir AI Clone (${roleId})`;
    const previewImageUrl = 'https://swaryogacrm.b-cdn.net/avatar-studio/master-clone/mohan_businessman_suit.jpg';

    // 3a. Register in avatar_generation_outputs_sql (Video Library)
    const outputId = `out_colab_${Date.now()}`;
    await bunnyExecute({
      sql: `INSERT OR REPLACE INTO avatar_generation_outputs_sql 
            (id, job_id, title, profession_id, profession_name, language, duration_seconds, resolution, video_url, thumbnail_url, ai_model, voice_type, is_module8_synced, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, '1080p', ?, ?, 'LivePortrait + Wav2Lip (Colab T4 GPU)', 'mohan_authentic_clone', 1, ?)`,
      args: [
        outputId,
        jobId || `colab_job_${Date.now()}`,
        avatarName,
        roleId,
        roleId.replace(/_/g, ' ').toUpperCase(),
        language,
        durationSeconds,
        videoUrl,
        previewImageUrl,
        now,
      ],
    }).catch((err) => console.warn('Warning updating avatar_generation_outputs_sql:', err));

    await bunnyExecute({
      sql: `INSERT OR REPLACE INTO studio_video_avatars_sql (
        id, name, original_video_url, thumbnail_url, cutout_url, transparent_avatar_url, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'ready', ?, ?)`,
      args: [
        videoAvatarId,
        avatarName,
        videoUrl,
        previewImageUrl,
        previewImageUrl,
        previewImageUrl,
        now,
        now,
      ],
    }).catch((err) => console.warn('Warning updating studio_video_avatars_sql:', err));

    await bunnyExecute({
      sql: `INSERT OR REPLACE INTO studio_final_avatars_sql (
        id, name, video_avatar_id, voice_avatar_id, default_speaking_style, default_emotion, default_language, preview_image_url, created_at, updated_at
      ) VALUES (?, ?, ?, 'voice_mohan_sir_authoritative', 'teaching', 'smile:80', ?, ?, ?, ?)`,
      args: [
        finalAvatarId,
        avatarName,
        videoAvatarId,
        language,
        previewImageUrl,
        now,
        now,
      ],
    }).catch((err) => console.warn('Warning updating studio_final_avatars_sql:', err));

    return NextResponse.json({
      success: true,
      message: `✅ Colab GPU video for ${roleId} successfully connected and live!`,
      videoUrl,
      roleId,
    });
  } catch (error: any) {
    console.error('[Colab Bridge Error]:', error);
    return NextResponse.json({ error: error.message || 'Failed to process Colab webhook' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const roleId = searchParams.get('roleId');

    const res = await bunnyExecute({
      sql: roleId
        ? `SELECT * FROM avatar_digital_twins_sql WHERE role_id = ?`
        : `SELECT * FROM avatar_digital_twins_sql ORDER BY updated_at DESC`,
      args: roleId ? [roleId] : [],
    });

    return NextResponse.json({
      success: true,
      twins: res.rows || [],
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

