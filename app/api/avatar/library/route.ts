import { NextRequest, NextResponse } from 'next/server';
import { extractTokenFromRequest, verifyToken } from '@/lib/auth';
import { bunnyExecute } from '@/lib/bunnyDatabase';
import { initAvatarStudioDb } from '@/lib/avatarStudio/avatarStudioDb';
import { MOHAN_WORKSHOP_TWIN_SOURCES } from '@/lib/avatarStudio/mohanWorkshopTwinSources';

export const dynamic = 'force-dynamic';

function authorize(request: NextRequest): NextResponse | null {
  const token = extractTokenFromRequest(request);
  const decoded = verifyToken(token);

  // Accept any valid admin or CRM user token
  if (decoded && (decoded.isAdmin || decoded.role === 'admin' || decoded.role === 'superadmin' || decoded.userId || decoded.username)) {
    return null;
  }

  // Allow requests originating from the internal CRM domain or referer
  const host = request.headers.get('host') || '';
  const referer = request.headers.get('referer') || '';
  if (host.includes('crm.swaryoga.com') || referer.includes('/admin/crm/')) {
    return null;
  }

  return NextResponse.json({ success: false, error: 'Unauthorized: Admin access required.' }, { status: 401 });
}

export async function GET(request: NextRequest) {
  const authorizationError = authorize(request);
  if (authorizationError) return authorizationError;

  try {
    await initAvatarStudioDb();
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('q')?.toLowerCase() || '';

    const result = await bunnyExecute(
      `SELECT * FROM avatar_generation_outputs_sql ORDER BY created_at DESC LIMIT 100`
    );
    let allVideos = (result.rows || []) as any[];

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
  const authorizationError = authorize(request);
  if (authorizationError) return authorizationError;

  try {
    await initAvatarStudioDb();
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ success: false, error: 'Request body must be valid JSON.' }, { status: 400 });
    }
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ success: false, error: 'Request body must be a JSON object.' }, { status: 400 });
    }
    if (body.action === 'ensure_mohan_workshop_twin_sources') {
      const seedStatus = await bunnyExecute({
        sql: `SELECT seed_key FROM avatar_library_seed_state_sql WHERE seed_key = ? LIMIT 1`,
        args: ['mohan_workshop_twin_sources_v1'],
      });
      if (seedStatus.rows?.length) {
        return NextResponse.json({
          success: true,
          addedCount: 0,
          alreadyPresentCount: MOHAN_WORKSHOP_TWIN_SOURCES.length,
          total: MOHAN_WORKSHOP_TWIN_SOURCES.length,
          message: 'Workshop twin-look sources were already initialized. Removed entries will stay removed.',
        });
      }

      let addedCount = 0;
      let alreadyPresentCount = 0;
      const createdAt = new Date().toISOString();

      for (const source of MOHAN_WORKSHOP_TWIN_SOURCES) {
        const existing = await bunnyExecute({
          sql: `SELECT id FROM avatar_generation_outputs_sql WHERE id = ? OR video_url = ? LIMIT 1`,
          args: [source.id, source.videoUrl],
        });
        if (existing.rows?.length) {
          alreadyPresentCount += 1;
          continue;
        }

        const inserted = await bunnyExecute({
          sql: `INSERT INTO avatar_generation_outputs_sql (
            id, job_id, title, profession_id, profession_name, language,
            duration_seconds, resolution, video_url, thumbnail_url, ai_model,
            voice_type, is_module8_synced, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO NOTHING`,
          args: [
            source.id,
            source.id,
            `Mohan Sir Twin Look — ${source.lookLabel}`,
            'mohan_workshop_twin_source',
            source.lookLabel,
            'not_verified',
            0,
            'not_verified',
            source.videoUrl,
            null,
            'User-provided Bunny workshop source; AI generation not performed',
            'unverified',
            0,
            createdAt,
          ],
        });
        if (inserted.rowsAffected) {
          addedCount += 1;
        } else {
          alreadyPresentCount += 1;
        }
      }

      await bunnyExecute({
        sql: `INSERT INTO avatar_library_seed_state_sql (seed_key, completed_at)
              VALUES (?, ?)
              ON CONFLICT(seed_key) DO NOTHING`,
        args: ['mohan_workshop_twin_sources_v1', createdAt],
      });

      return NextResponse.json({
        success: true,
        addedCount,
        alreadyPresentCount,
        total: MOHAN_WORKSHOP_TWIN_SOURCES.length,
        message: 'Workshop twin-look source videos are in the library. They are source recordings, not generated AI twins.',
      });
    }

    const {
      title,
      video_url,
      thumbnail_url,
      ai_site_source = 'AI Import',
      profession_name = 'Imported media',
      language = 'hi',
      duration_seconds = 30,
    } = body;

    let parsedVideoUrl: URL;
    try {
      parsedVideoUrl = new URL(video_url);
    } catch {
      return NextResponse.json(
        { success: false, error: 'A valid HTTPS video URL is required.' },
        { status: 400 }
      );
    }
    if (
      parsedVideoUrl.protocol !== 'https:' ||
      typeof title !== 'string' ||
      !title.trim() ||
      title.trim().length > 200 ||
      (typeof profession_name === 'string' && profession_name.length > 120) ||
      !['hi', 'mr', 'en'].includes(language)
    ) {
      return NextResponse.json(
        { success: false, error: 'Provide a title (up to 200 characters), HTTPS video URL, and supported language.' },
        { status: 400 }
      );
    }

    const id = `import_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    let finalThumbnail: string | null = null;
    if (thumbnail_url) {
      try {
        const parsedThumbnail = new URL(thumbnail_url);
        if (parsedThumbnail.protocol !== 'https:') throw new Error('Thumbnail must use HTTPS.');
        finalThumbnail = parsedThumbnail.toString();
      } catch {
        return NextResponse.json({ success: false, error: 'Thumbnail URL must be a valid HTTPS URL.' }, { status: 400 });
      }
    }
    const sourceLabel = typeof ai_site_source === 'string' ? ai_site_source.trim().slice(0, 80) : 'unspecified';

    // Imported media is cataloged without claiming that it was generated by this engine.
    await bunnyExecute({
      sql: `INSERT INTO avatar_generation_outputs_sql 
            (id, job_id, title, profession_id, profession_name, language, duration_seconds, resolution, video_url, thumbnail_url, ai_model, voice_type, is_module8_synced, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        id,
        `import_${id}`,
        title.trim(),
        'custom_ai_import',
        typeof profession_name === 'string' ? profession_name.trim() : 'Imported media',
        language,
        Number.isFinite(Number(duration_seconds)) && Number(duration_seconds) > 0
          ? Math.min(Number(duration_seconds), 86400)
          : 0,
        'not_verified',
        parsedVideoUrl.toString(),
        finalThumbnail,
        `User-provided media; source ${sourceLabel || 'unspecified'}; generation unverified`,
        'unverified',
        0,
        new Date().toISOString(),
      ],
    });

    return NextResponse.json({
      success: true,
      message: 'Existing video metadata was added to the library. Generation and source rights are not verified.',
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
  const authorizationError = authorize(request);
  if (authorizationError) return authorizationError;

  try {
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ success: false, error: 'Request body must be valid JSON.' }, { status: 400 });
    }
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ success: false, error: 'Request body must be a JSON object.' }, { status: 400 });
    }
    const { id, title, profession_name, language } = body;

    if (typeof id !== 'string' || !id.trim()) {
      return NextResponse.json({ success: false, error: 'A valid output ID is required.' }, { status: 400 });
    }
    if (
      (title !== undefined && (typeof title !== 'string' || !title.trim() || title.length > 200)) ||
      (profession_name !== undefined && (typeof profession_name !== 'string' || profession_name.length > 120)) ||
      (language !== undefined && !['hi', 'mr', 'en'].includes(language))
    ) {
      return NextResponse.json({ success: false, error: 'Video metadata is invalid.' }, { status: 400 });
    }

    const exists = await bunnyExecute({
      sql: `SELECT id FROM avatar_generation_outputs_sql WHERE id = ? LIMIT 1`,
      args: [id],
    });
    if (!exists.rows?.length) {
      return NextResponse.json({ success: false, error: 'Stored video entry was not found.' }, { status: 404 });
    }

    await bunnyExecute({
      sql: `UPDATE avatar_generation_outputs_sql 
            SET title = COALESCE(?, title),
                profession_name = COALESCE(?, profession_name),
                language = COALESCE(?, language)
            WHERE id = ?`,
      args: [title?.trim() || null, profession_name?.trim() || null, language || null, id],
    });

    return NextResponse.json({ success: true, message: 'Video metadata updated successfully' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Failed to update video' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const authorizationError = authorize(request);
  if (authorizationError) return authorizationError;

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'A valid output ID is required.' }, { status: 400 });
    }

    const result = await bunnyExecute({
      sql: `DELETE FROM avatar_generation_outputs_sql WHERE id = ?`,
      args: [id],
    });
    if (!result.rowsAffected) {
      return NextResponse.json({ success: false, error: 'Stored video entry was not found.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Video removed from the stored-media library.' });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to delete' }, { status: 500 });
  }
}
