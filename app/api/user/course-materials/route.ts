/**
 * Course Materials API
 * GET /api/user/course-materials - Get all materials for user's courses
 * POST /api/user/course-materials - Create a new note
 * Connected to Bunny Database
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, TokenPayload } from '@/lib/auth';
import {
  listEnrollmentsByUser,
  getCourseById,
  listMaterialsByCourse,
} from '@/lib/bunnyCourseRepository';
import { bunnyExecute } from '@/lib/bunnyDatabase';

export const dynamic = 'force-dynamic';

async function initNotesSchema() {
  await bunnyExecute(`CREATE TABLE IF NOT EXISTS user_course_notes_sql (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    course_id TEXT,
    title TEXT,
    content TEXT,
    tags_json TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`);
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let decoded: TokenPayload | null;
    try {
      decoded = verifyToken(authHeader.split(' ')[1]);
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    if (!decoded) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const userId = decoded.id || decoded._id || decoded.userId;
    if (!userId) return NextResponse.json({ error: 'User ID required' }, { status: 400 });

    const enrollments = await listEnrollmentsByUser(String(userId));
    const activeEnrollments = enrollments.filter((e) => ['active', 'completed'].includes(e.status));

    const materials: any[] = [];

    for (const enrollment of activeEnrollments) {
      const course = await getCourseById(enrollment.courseId);
      if (!course) continue;

      const courseTitle = (course.content as any)?.en?.title || course.slug || 'Course';
      const courseMaterials = await listMaterialsByCourse(course.id, true);

      materials.push(
        ...courseMaterials.map((m) => ({
          id: m.id,
          courseId: course.id,
          courseTitle,
          title: m.title,
          description: '',
          type: m.fileType || 'resource',
          fileUrl: m.fileUrl,
          content: '',
          uploadedDate: m.createdAt,
          tags: [],
        }))
      );
    }

    // Get user notes from BunnyDB
    try {
      await initNotesSchema();
      const notesRes = await bunnyExecute({
        sql: 'SELECT * FROM user_course_notes_sql WHERE user_id = ? ORDER BY created_at DESC',
        args: [String(userId)],
      });
      materials.push(
        ...notesRes.rows.map((note: any) => ({
          id: String(note.id),
          courseId: note.course_id ? String(note.course_id) : undefined,
          courseTitle: 'My Notes',
          title: note.title || '',
          description: (note.content || '').substring(0, 100),
          type: 'note',
          content: note.content || '',
          uploadedDate: note.created_at,
          tags: note.tags_json ? JSON.parse(note.tags_json) : [],
        }))
      );
    } catch (e) {
      console.warn('Note fetch error:', e);
    }

    materials.sort((a, b) => new Date(b.uploadedDate).getTime() - new Date(a.uploadedDate).getTime());

    return NextResponse.json({
      success: true,
      data: materials,
    });
  } catch (error: any) {
    console.error('[Course Materials Error]:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let decoded: TokenPayload | null;
    try {
      decoded = verifyToken(authHeader.split(' ')[1]);
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    if (!decoded) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const userId = decoded.id || decoded._id || decoded.userId;
    const body = await request.json();
    const { title, content, courseId, tags = [] } = body;

    if (!title || !content) {
      return NextResponse.json({ error: 'Title and content required' }, { status: 400 });
    }

    await initNotesSchema();
    const noteId = 'note_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
    const nowIso = new Date().toISOString();

    await bunnyExecute({
      sql: `INSERT INTO user_course_notes_sql (id, user_id, course_id, title, content, tags_json, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [noteId, String(userId), courseId || null, title, content, JSON.stringify(tags), nowIso, nowIso],
    });

    return NextResponse.json({
      success: true,
      noteId,
    });
  } catch (error: any) {
    console.error('[Create Note Error]:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
