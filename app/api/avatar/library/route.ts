import { NextRequest, NextResponse } from 'next/server';
import { bunnyExecute } from '@/lib/bunnyDatabase';
import { initAvatarStudioDb } from '@/lib/avatarStudio/avatarStudioDb';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    await initAvatarStudioDb();
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('q')?.toLowerCase() || '';

    // 1. Fetch generated outputs
    const genRes = await bunnyExecute(
      `SELECT * FROM avatar_generation_outputs_sql ORDER BY created_at DESC LIMIT 100`
    );
    const genRows = (genRes.rows || []) as any[];

    // 2. Fetch all 39+ DNA video avatars from studio_video_avatars_sql
    const dnaRes = await bunnyExecute(
      `SELECT * FROM studio_video_avatars_sql ORDER BY created_at DESC LIMIT 100`
    ).catch(() => ({ rows: [] }));
    const dnaRows = (dnaRes.rows || []) as any[];

    // 3. Fetch all raw DNA looks from mohan_avatar_dna_looks_sql
    const looksRes = await bunnyExecute(
      `SELECT * FROM mohan_avatar_dna_looks_sql LIMIT 100`
    ).catch(() => ({ rows: [] }));
    const looksRows = (looksRes.rows || []) as any[];

    // Map DNA rows to library format if not already in genRows
    const seenUrls = new Set(genRows.map((r) => r.video_url));
    const seenIds = new Set(genRows.map((r) => r.id));

    const mappedDnaRows = dnaRows
      .filter((d) => !seenIds.has(d.id) && !seenUrls.has(d.original_video_url))
      .map((d) => {
        seenIds.add(d.id);
        if (d.original_video_url) seenUrls.add(d.original_video_url);
        const title = d.name || 'Mohan Sir DNA Master Avatar';
        const isMarathi = title.toLowerCase().includes('marathi');
        return {
          id: d.id,
          job_id: `dna_${d.id}`,
          title: title,
          profession_id: 'swar_yoga_master',
          profession_name: 'Swar Yoga Master',
          language: isMarathi ? 'mr' : 'hi',
          duration_seconds: 180,
          resolution: '1080p',
          video_url: d.original_video_url,
          thumbnail_url: d.thumbnail_url || 'https://swaryogacrm.b-cdn.net/avatar-studio/master-clone/mohan_face_frontal_1080p.jpg',
          ai_model: 'Mohan Sir DNA 39 Master Video (LivePortrait + Wav2Lip)',
          voice_type: 'mohan_authentic_clone',
          is_module8_synced: 1,
          created_at: d.created_at || new Date().toISOString(),
        };
      });

    const mappedLooksRows = looksRows
      .filter((l) => !seenIds.has(l.id) && !seenUrls.has(l.video_url))
      .map((l, idx) => {
        seenIds.add(l.id);
        if (l.video_url) seenUrls.add(l.video_url);
        const title = l.title || `Mohan Sir DNA Master Class ${idx + 1}`;
        const isMarathi = title.toLowerCase().includes('marathi');
        return {
          id: l.id,
          job_id: `look_${l.id}`,
          title: title,
          profession_id: 'spiritual_teacher',
          profession_name: 'Spiritual Guru & Acharya',
          language: isMarathi ? 'mr' : 'hi',
          duration_seconds: 154,
          resolution: '1080p',
          video_url: l.video_url,
          thumbnail_url: l.thumbnail_url || 'https://swaryogacrm.b-cdn.net/avatar-studio/master-clone/mohan_face_frontal_1080p.jpg',
          ai_model: 'Official DNA Master Class (Bunny Library 606386)',
          voice_type: 'mohan_authentic_clone',
          is_module8_synced: 1,
          created_at: new Date(Date.now() - (idx + 1) * 3600000).toISOString(),
        };
      });

    let allVideos = [...genRows, ...mappedDnaRows, ...mappedLooksRows];

    // Seed default if empty
    if (allVideos.length === 0) {
      const initialSeed = [
        {
          id: 'out_prof_whiteboard_01',
          job_id: 'job_seed_01',
          title: 'Mohan Sir – University Professor (Academic Presentation)',
          profession_id: 'university_professor',
          profession_name: 'University Professor',
          language: 'hi',
          duration_seconds: 180,
          resolution: '1080p',
          video_url: 'https://swaryogacrm.b-cdn.net/avatar-studio/videos/083ce51f3ddaa878e1e10dfce9d5ee66e5d74c21badb5b7c3cb8be0832dca84c.mp4',
          thumbnail_url: 'https://swaryogacrm.b-cdn.net/avatar-studio/master-clone/mohan_face_frontal_1080p.jpg',
          ai_model: 'LivePortrait + Wav2Lip (1080p GFPGAN)',
          voice_type: 'mohan_authentic_clone',
          is_module8_synced: 1,
          created_at: new Date().toISOString(),
        },
      ];
      allVideos = initialSeed;
    }

    if (search) {
      allVideos = allVideos.filter(
        (r) =>
          (r.title && r.title.toLowerCase().includes(search)) ||
          (r.profession_name && r.profession_name.toLowerCase().includes(search)) ||
          (r.language && r.language.toLowerCase().includes(search))
      );
    }

    return NextResponse.json({
      success: true,
      count: allVideos.length,
      data: allVideos,
    });
  } catch (error: any) {
    console.error('Error fetching avatar library:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Database error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await initAvatarStudioDb();
    const body = await request.json().catch(() => ({}));
    const {
      title,
      video_url,
      thumbnail_url,
      ai_site_source = 'AI Import',
      profession_name = 'Custom AI Avatar',
      language = 'hi',
      duration_seconds = 30,
    } = body;

    if (!video_url || !title) {
      return NextResponse.json(
        { error: 'शीर्षक (Title) और वीडियो यूआरएल (Video URL) अनिवार्य हैं।' },
        { status: 400 }
      );
    }

    const id = `import_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const finalThumbnail =
      thumbnail_url || 'https://swaryogacrm.b-cdn.net/avatar-studio/master-clone/mohan_face_frontal_1080p.jpg';

    // Insert into avatar_generation_outputs_sql
    await bunnyExecute({
      sql: `INSERT INTO avatar_generation_outputs_sql 
            (id, job_id, title, profession_id, profession_name, language, duration_seconds, resolution, video_url, thumbnail_url, ai_model, voice_type, is_module8_synced, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        id,
        `job_${id}`,
        title,
        'custom_ai_import',
        profession_name,
        language,
        Number(duration_seconds) || 30,
        '1080p',
        video_url,
        finalThumbnail,
        `Imported from ${ai_site_source}`,
        'mohan_authentic_clone',
        1,
        new Date().toISOString(),
      ],
    });

    // Also register in studio_video_avatars_sql so Module 8 sees it immediately
    await bunnyExecute({
      sql: `INSERT OR REPLACE INTO studio_video_avatars_sql (
              id, name, original_video_url, thumbnail_url, cutout_url, transparent_avatar_url,
              language_capabilities_json, status, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        id,
        title,
        video_url,
        finalThumbnail,
        finalThumbnail,
        video_url,
        JSON.stringify([language]),
        'ready',
        new Date().toISOString(),
        new Date().toISOString(),
      ],
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      message: 'AI वीडियो सफलतापूर्वक इम्पोर्ट हो गया और लाइब्रेरी में जुड़ गया!',
      id,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'वीडियो इम्पोर्ट करने में त्रुटि' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { id, title, profession_name, language } = body;

    if (!id) {
      return NextResponse.json({ error: 'Missing output ID' }, { status: 400 });
    }

    await bunnyExecute({
      sql: `UPDATE avatar_generation_outputs_sql 
            SET title = COALESCE(?, title),
                profession_name = COALESCE(?, profession_name),
                language = COALESCE(?, language)
            WHERE id = ?`,
      args: [title || null, profession_name || null, language || null, id],
    });

    // Also update studio_video_avatars_sql name if title changed
    if (title) {
      await bunnyExecute({
        sql: `UPDATE studio_video_avatars_sql SET name = ? WHERE id = ?`,
        args: [title, id],
      }).catch(() => {});
    }

    return NextResponse.json({ success: true, message: 'Video metadata updated successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to update video' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing output ID' }, { status: 400 });
    }

    await bunnyExecute({
      sql: `DELETE FROM avatar_generation_outputs_sql WHERE id = ?`,
      args: [id],
    });

    await bunnyExecute({
      sql: `DELETE FROM studio_video_avatars_sql WHERE id = ?`,
      args: [id],
    }).catch(() => {});

    return NextResponse.json({ success: true, message: 'Video removed from library and Module 8' });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to delete' }, { status: 500 });
  }
}

