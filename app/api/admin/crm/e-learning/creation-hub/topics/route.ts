import { NextRequest, NextResponse } from 'next/server';
import { bunnyExecute } from '@/lib/bunnyDatabase';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';

export const dynamic = 'force-dynamic';

async function ensureTable() {
  await bunnyExecute(`
    CREATE TABLE IF NOT EXISTS mohan_creation_hub_topics_sql (
      id TEXT PRIMARY KEY,
      level TEXT NOT NULL DEFAULT 'L-1',
      day TEXT NOT NULL DEFAULT 'Day 1',
      title TEXT NOT NULL,
      source_language TEXT NOT NULL DEFAULT 'hi',
      duration_minutes INTEGER NOT NULL DEFAULT 45,
      source_video_url TEXT,
      transcript TEXT NOT NULL,
      blueprint_sov_plain TEXT,
      blueprint_sov_hummer TEXT,
      blueprint_svo_plain TEXT,
      blueprint_svo_hummer TEXT,
      key_points_json TEXT,
      admin_notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);
}

function requireAdmin(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || '';
    const decoded = verifyToken(token);
    return decoded && isSuperAdmin(decoded, request) ? decoded : null;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    await ensureTable();
    const url = new URL(request.url);
    const lang = url.searchParams.get('language');

    let whereClause = '';
    const args: any[] = [];
    if (lang && lang !== 'all') {
      whereClause = 'WHERE source_language = ?';
      args.push(lang);
    }

    const res = await bunnyExecute({
      sql: `SELECT * FROM mohan_creation_hub_topics_sql ${whereClause} ORDER BY updated_at DESC, created_at DESC`,
      args,
    });

    const topics = (res.rows || []).map((r: any) => ({
      id: String(r.id),
      level: String(r.level || 'L-1'),
      day: String(r.day || 'Day 1'),
      title: String(r.title || ''),
      sourceLanguage: String(r.source_language || 'hi'),
      durationMinutes: Number(r.duration_minutes || 45),
      sourceVideoUrl: r.source_video_url ? String(r.source_video_url) : undefined,
      transcript: String(r.transcript || ''),
      blueprintSovPlain: r.blueprint_sov_plain ? String(r.blueprint_sov_plain) : undefined,
      blueprintSovHummer: r.blueprint_sov_hummer ? String(r.blueprint_sov_hummer) : undefined,
      blueprintSvoPlain: r.blueprint_svo_plain ? String(r.blueprint_svo_plain) : undefined,
      blueprintSvoHummer: r.blueprint_svo_hummer ? String(r.blueprint_svo_hummer) : undefined,
      keyPoints: r.key_points_json ? JSON.parse(r.key_points_json) : [],
      adminNotes: r.admin_notes ? String(r.admin_notes) : '',
      createdAt: String(r.created_at || ''),
      updatedAt: String(r.updated_at || ''),
    }));

    return NextResponse.json({ success: true, topics });
  } catch (err: any) {
    console.error('Error in GET creation-hub topics:', err);
    return NextResponse.json({ error: err.message || 'Failed to fetch topics' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureTable();
    const body = await request.json();
    const id = body.id || `master-${Date.now()}`;
    const level = body.level || 'L-1';
    const day = body.day || 'Day 1';
    const title = (body.title || '').trim();
    const sourceLanguage = body.sourceLanguage || 'hi';
    const durationMinutes = Number(body.durationMinutes || 45);
    const sourceVideoUrl = body.sourceVideoUrl ? String(body.sourceVideoUrl).trim() : null;
    const transcript = (body.transcript || '').trim();
    const blueprintSovPlain = body.blueprintSovPlain || null;
    const blueprintSovHummer = body.blueprintSovHummer || null;
    const blueprintSvoPlain = body.blueprintSvoPlain || null;
    const blueprintSvoHummer = body.blueprintSvoHummer || null;
    const keyPoints = Array.isArray(body.keyPoints) ? JSON.stringify(body.keyPoints) : JSON.stringify([]);
    const adminNotes = body.adminNotes ? String(body.adminNotes).trim() : null;
    const now = new Date().toISOString();

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    await bunnyExecute({
      sql: `INSERT OR REPLACE INTO mohan_creation_hub_topics_sql (
              id, level, day, title, source_language, duration_minutes,
              source_video_url, transcript, blueprint_sov_plain, blueprint_sov_hummer,
              blueprint_svo_plain, blueprint_svo_hummer, key_points_json,
              admin_notes, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE((SELECT created_at FROM mohan_creation_hub_topics_sql WHERE id = ?), ?), ?)`,
      args: [
        id, level, day, title, sourceLanguage, durationMinutes,
        sourceVideoUrl, transcript, blueprintSovPlain, blueprintSovHummer,
        blueprintSvoPlain, blueprintSvoHummer, keyPoints,
        adminNotes, id, now, now
      ],
    });

    return NextResponse.json({
      success: true,
      message: `Topic "${title}" saved to Creation Hub Factory Review!`,
      topic: {
        id, level, day, title, sourceLanguage, durationMinutes,
        sourceVideoUrl, transcript, blueprintSovPlain, blueprintSovHummer,
        blueprintSvoPlain, blueprintSvoHummer,
        keyPoints: JSON.parse(keyPoints),
        adminNotes,
        updatedAt: now,
      }
    });
  } catch (err: any) {
    console.error('Error in POST creation-hub topics:', err);
    return NextResponse.json({ error: err.message || 'Failed to save topic' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await ensureTable();
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Topic ID is required' }, { status: 400 });
    }

    await bunnyExecute({
      sql: 'DELETE FROM mohan_creation_hub_topics_sql WHERE id = ?',
      args: [id],
    });

    return NextResponse.json({ success: true, message: `Topic ${id} removed.` });
  } catch (err: any) {
    console.error('Error in DELETE creation-hub topic:', err);
    return NextResponse.json({ error: err.message || 'Failed to delete topic' }, { status: 500 });
  }
}

