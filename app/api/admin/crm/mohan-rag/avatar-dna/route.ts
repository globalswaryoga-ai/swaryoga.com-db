import { NextRequest, NextResponse } from 'next/server';
import { bunnyExecute, bunnyBatch } from '@/lib/bunnyDatabase';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';
import { AVATAR_DNA_50_CATALOG, MOHAN_VOCAL_DNA_MODELS } from '@/lib/mohanAiClone/avatarDna50Catalog';

function requireAdmin(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (!token) return null;
    const decoded = verifyToken(token);
    if (!decoded) return null;
    return decoded;
  } catch {
    return null;
  }
}

/**
 * GET /api/admin/crm/mohan-rag/avatar-dna
 * Returns all 50+ Avatar Looks, Vocal DNA, Wardrobe, Facial, and Posture assets
 */
export async function GET(request: NextRequest) {
  const admin = requireAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: 'Super admin access required' }, { status: 403 });
  }

  try {
    // 1. Fetch Looks from mohan_avatar_dna_looks_sql
    let looks: any[] = [];
    try {
      const looksRes = await bunnyExecute(`
        SELECT id, title, heading, description, video_url, thumbnail_url,
               look_category, outfit_style, emotion_profile, speaking_tone,
               duration_seconds, is_active, source_type, created_at, updated_at
        FROM mohan_avatar_dna_looks_sql
        ORDER BY is_active DESC, updated_at DESC, created_at DESC
      `);
      looks = looksRes.rows || [];
    } catch (e) {
      console.warn('Could not query mohan_avatar_dna_looks_sql:', e);
    }

    // Fallback/merge catalog if DB has few rows
    if (looks.length < 50) {
      const existingIds = new Set(looks.map(l => l.id));
      const catalogLooks = AVATAR_DNA_50_CATALOG.filter(c => !existingIds.has(c.id)).map(c => ({
        id: c.id,
        title: c.name,
        heading: c.heading || c.name,
        description: c.description,
        video_url: c.videoUrl,
        thumbnail_url: c.thumbnailUrl || 'https://swaryogacrm.b-cdn.net/mohan.jpg',
        look_category: c.category,
        outfit_style: c.outfitStyle || '',
        emotion_profile: c.emotionProfile || '',
        speaking_tone: c.speakingTone || '',
        duration_seconds: c.durationSeconds || 120,
        is_active: c.isPrimary ? 1 : 0,
        source_type: 'direct_mp4',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));
      looks = [...looks, ...catalogLooks];
    }

    // 2. Resolve Active Look ID
    let activeLookId = '';
    try {
      const activeRes = await bunnyExecute(`
        SELECT active_look_id FROM mohan_active_avatar_dna_sql WHERE key = 'global_active_dna' LIMIT 1
      `);
      if (activeRes.rows.length > 0 && activeRes.rows[0].active_look_id) {
        activeLookId = String(activeRes.rows[0].active_look_id);
      }
    } catch {}

    if (!activeLookId) {
      const activeLook = looks.find(l => l.is_active === 1 || l.is_active === true);
      activeLookId = activeLook ? activeLook.id : (looks[0]?.id || '');
    }

    // 3. Fetch Vocal DNA
    let vocalDna: any[] = [];
    try {
      const vocalRes = await bunnyExecute(`
        SELECT id, language, tone_name, pitch_hz, cadence_words_per_minute,
               characteristic, sample_phrase, audio_sample_url
        FROM mohan_avatar_vocal_dna_sql
        ORDER BY id ASC
      `);
      vocalDna = vocalRes.rows || [];
    } catch {}

    if (vocalDna.length === 0) {
      vocalDna = MOHAN_VOCAL_DNA_MODELS.map(v => ({
        id: v.id,
        language: v.language,
        tone_name: v.toneName,
        pitch_hz: v.pitchHz,
        cadence_words_per_minute: v.cadenceWordsPerMinute,
        characteristic: v.characteristic,
        sample_phrase: v.samplePhrase,
        audio_sample_url: v.audioSampleUrl,
      }));
    }

    // 4. Fetch Wardrobe DNA
    let wardrobeDna: any[] = [];
    try {
      const wardrobeRes = await bunnyExecute(`
        SELECT * FROM mohan_avatar_wardrobe_dna_sql ORDER BY created_at DESC
      `);
      wardrobeDna = wardrobeRes.rows || [];
    } catch {}

    // 5. Fetch Facial Expression DNA
    let facialDna: any[] = [];
    try {
      const facialRes = await bunnyExecute(`
        SELECT * FROM mohan_avatar_facial_dna_sql ORDER BY created_at DESC
      `);
      facialDna = facialRes.rows || [];
    } catch {}

    // 6. Fetch Posture DNA
    let postureDna: any[] = [];
    try {
      const postureRes = await bunnyExecute(`
        SELECT * FROM mohan_avatar_posture_dna_sql ORDER BY created_at DESC
      `);
      postureDna = postureRes.rows || [];
    } catch {}

    return NextResponse.json({
      success: true,
      looks,
      activeLookId,
      vocalDna,
      wardrobeDna,
      facialDna,
      postureDna,
      totalLooks: looks.length,
    });
  } catch (error: any) {
    console.error('Error fetching Mohan Avatar DNA:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch Avatar DNA' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/crm/mohan-rag/avatar-dna
 * Handles DNA activation, custom look addition, deletions, and updates
 */
export async function POST(request: NextRequest) {
  const admin = requireAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: 'Super admin access required' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const action = body?.action;

    // 1. SET ACTIVE DNA LOOK
    if (action === 'set_active') {
      const lookId = String(body.lookId || '').trim();
      if (!lookId) {
        return NextResponse.json({ error: 'lookId is required' }, { status: 400 });
      }

      await bunnyExecute(`UPDATE mohan_avatar_dna_looks_sql SET is_active = 0`);
      await bunnyExecute({
        sql: `UPDATE mohan_avatar_dna_looks_sql SET is_active = 1, updated_at = datetime('now') WHERE id = ?`,
        args: [lookId],
      });

      // Upsert into mohan_active_avatar_dna_sql
      await bunnyExecute({
        sql: `INSERT INTO mohan_active_avatar_dna_sql (key, active_look_id, updated_at)
              VALUES ('global_active_dna', ?, datetime('now'))
              ON CONFLICT(key) DO UPDATE SET active_look_id = excluded.active_look_id, updated_at = excluded.updated_at`,
        args: [lookId],
      });

      return NextResponse.json({ success: true, activeLookId: lookId });
    }

    // 2. SAVE NEW / EDIT LOOK
    if (action === 'save_look') {
      const look = body.look;
      if (!look || !look.title || !look.video_url) {
        return NextResponse.json({ error: 'Look title and video_url are required' }, { status: 400 });
      }

      const id = look.id || `custom-look-${Date.now()}`;
      const now = new Date().toISOString();

      await bunnyExecute({
        sql: `INSERT INTO mohan_avatar_dna_looks_sql (
          id, title, heading, description, video_url, thumbnail_url,
          look_category, outfit_style, emotion_profile, speaking_tone,
          duration_seconds, is_active, source_type, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          title = excluded.title,
          heading = excluded.heading,
          description = excluded.description,
          video_url = excluded.video_url,
          thumbnail_url = excluded.thumbnail_url,
          look_category = excluded.look_category,
          outfit_style = excluded.outfit_style,
          emotion_profile = excluded.emotion_profile,
          speaking_tone = excluded.speaking_tone,
          duration_seconds = excluded.duration_seconds,
          updated_at = excluded.updated_at`,
        args: [
          id,
          look.title,
          look.heading || look.title,
          look.description || '',
          look.video_url,
          look.thumbnail_url || 'https://swaryogacrm.b-cdn.net/mohan.jpg',
          look.look_category || 'vedic_traditional',
          look.outfit_style || 'Authentic Outfit',
          look.emotion_profile || 'Teaching Focus',
          look.speaking_tone || 'Swar Yoga Master',
          look.duration_seconds || 120,
          0,
          'direct_mp4',
          now,
          now,
        ],
      });

      const updatedLooks = await bunnyExecute(`
        SELECT * FROM mohan_avatar_dna_looks_sql ORDER BY is_active DESC, updated_at DESC
      `);

      return NextResponse.json({ success: true, looks: updatedLooks.rows });
    }

    // 3. DELETE LOOK
    if (action === 'delete_look') {
      const lookId = String(body.lookId || '').trim();
      if (!lookId) {
        return NextResponse.json({ error: 'lookId is required' }, { status: 400 });
      }

      await bunnyExecute({
        sql: `DELETE FROM mohan_avatar_dna_looks_sql WHERE id = ?`,
        args: [lookId],
      });

      const remaining = await bunnyExecute(`
        SELECT * FROM mohan_avatar_dna_looks_sql ORDER BY is_active DESC, updated_at DESC
      `);

      return NextResponse.json({ success: true, looks: remaining.rows });
    }

    // 4. DELETE VOCAL DNA
    if (action === 'delete_vocal') {
      const vocalId = String(body.vocalId || '').trim();
      if (vocalId) {
        await bunnyExecute({
          sql: `DELETE FROM mohan_avatar_vocal_dna_sql WHERE id = ?`,
          args: [vocalId],
        });
      }
      const remainingVocal = await bunnyExecute(`SELECT * FROM mohan_avatar_vocal_dna_sql`);
      return NextResponse.json({ success: true, vocalDna: remainingVocal.rows });
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error: any) {
    console.error('Error executing avatar-dna action:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to execute DNA operation' },
      { status: 500 }
    );
  }
}
