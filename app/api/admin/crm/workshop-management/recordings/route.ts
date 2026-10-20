import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { upsertRecording } from '@/lib/workshopBunnyRepository';

function isAdmin(request: NextRequest) {
  const raw = request.headers.get('authorization') || request.cookies.get('token')?.value || '';
  const decoded = verifyToken(raw.startsWith('Bearer ') ? raw.slice(7) : raw);
  return Boolean(decoded?.isAdmin || decoded?.userId || decoded?.username);
}

export async function POST(request: NextRequest) {
  try {
    if (!isAdmin(request)) return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    const body = await request.json();
    if (!body.cohortId || !body.classDate) return NextResponse.json({ error: 'cohortId and classDate are required' }, { status: 400 });
    const deliveredStudentIds = Array.isArray(body.deliveredStudentIds)
      ? body.deliveredStudentIds.filter(Boolean)
      : typeof body.deliveredStudentIds === 'string'
        ? body.deliveredStudentIds.split(',').map((id: string) => id.trim()).filter(Boolean)
        : [];

    const recording = await upsertRecording({ ...body, deliveredStudentIds });

    return NextResponse.json({ recording });
  } catch (error) {
    console.error('[workshop-recordings] POST error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to save recording' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    if (!isAdmin(request)) return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    const body = await request.json();
    if (!body.id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
    
    const { bunnyExecute } = await import('@/lib/bunnyDatabase');
    
    const sets: string[] = [];
    const args: any[] = [];
    if (body.dayNumber !== undefined) {
      sets.push('day_number = ?');
      args.push(body.dayNumber ? Number(body.dayNumber) : null);
    }
    
    if (body.subject !== undefined) {
      const existing = await bunnyExecute({ sql: 'SELECT metadata_json FROM workshop_recordings_sql WHERE id = ?', args: [body.id] });
      const row0 = existing.rows[0] as any;
      const metadata = JSON.parse(String(row0?.metadata_json || '{}'));
      metadata.subject = body.subject;
      sets.push('metadata_json = ?');
      args.push(JSON.stringify(metadata));
    }

    if (body.youtubeSpeakerUrl !== undefined) {
      sets.push('youtube_speaker_url = ?');
      args.push(body.youtubeSpeakerUrl ? String(body.youtubeSpeakerUrl).trim() : null);
    }
    if (body.youtubeSpeakerId !== undefined) {
      sets.push('youtube_speaker_id = ?');
      args.push(body.youtubeSpeakerId ? String(body.youtubeSpeakerId).trim() : null);
    }
    if (body.youtubeGalleryUrl !== undefined) {
      sets.push('youtube_gallery_url = ?');
      args.push(body.youtubeGalleryUrl ? String(body.youtubeGalleryUrl).trim() : null);
    }
    if (body.youtubeGalleryId !== undefined) {
      sets.push('youtube_gallery_id = ?');
      args.push(body.youtubeGalleryId ? String(body.youtubeGalleryId).trim() : null);
    }
    if (body.bunnySpeakerUrl !== undefined) {
      sets.push('bunny_speaker_url = ?');
      args.push(body.bunnySpeakerUrl ? String(body.bunnySpeakerUrl).trim() : null);
    }
    if (body.bunnyGalleryUrl !== undefined) {
      sets.push('bunny_gallery_url = ?');
      args.push(body.bunnyGalleryUrl ? String(body.bunnyGalleryUrl).trim() : null);
    }
    
    if (sets.length === 0) return NextResponse.json({ success: true });
    
    args.push(new Date().toISOString());
    args.push(body.id);
    const previous = body.previous && typeof body.previous === 'object' ? body.previous : undefined;
    const previousColumns: Record<string, string> = {
      youtubeSpeakerUrl: 'youtube_speaker_url',
      youtubeSpeakerId: 'youtube_speaker_id',
      youtubeGalleryUrl: 'youtube_gallery_url',
      youtubeGalleryId: 'youtube_gallery_id',
      bunnySpeakerUrl: 'bunny_speaker_url',
      bunnyGalleryUrl: 'bunny_gallery_url',
    };
    const guarded = Object.entries(previousColumns).filter(([key, column]) =>
      previous && Object.prototype.hasOwnProperty.call(previous, key) && sets.some((set) => set.startsWith(`${column} = `)),
    );
    const result = await bunnyExecute({
      sql: `UPDATE workshop_recordings_sql SET ${sets.join(', ')}, updated_at = ? WHERE id = ?${guarded.length ? ` AND ${guarded.map(([, column]) => `${column} IS ?`).join(' AND ')}` : ''}`,
      args: [...args, ...guarded.map(([key]) => previous[key])],
    });
    if (guarded.length && Number(result.rowsAffected || 0) === 0) {
      const exists = await bunnyExecute({ sql: 'SELECT id FROM workshop_recordings_sql WHERE id = ?', args: [body.id] });
      return exists.rows.length
        ? NextResponse.json({ error: 'Recording URLs changed elsewhere. Reload the recording before retrying.' }, { status: 409 })
        : NextResponse.json({ error: 'Recording not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[workshop-recordings] PATCH error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to update recording' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    if (!isAdmin(request)) return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id parameter is required' }, { status: 400 });
    const { deleteRecording } = await import('@/lib/workshopBunnyRepository');
    await deleteRecording(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[workshop-recordings] DELETE error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to delete recording' }, { status: 500 });
  }
}
