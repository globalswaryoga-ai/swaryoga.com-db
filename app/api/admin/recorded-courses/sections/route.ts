/**
 * Admin API for Course Sections Management (BunnyDB)
 * GET /api/admin/recorded-courses/sections - List sections for a course
 * POST /api/admin/recorded-courses/sections - Create new section
 * PUT /api/admin/recorded-courses/sections - Update section
 * DELETE /api/admin/recorded-courses/sections - Delete section
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';
import {
  listSectionsByCourse,
  saveSection,
  deleteSection,
} from '@/lib/bunnyCourseRepository';

export const dynamic = 'force-dynamic';

function checkSuperAdminAccess(decoded: any | null): boolean {
  if (!decoded) return false;
  return isSuperAdmin(decoded);
}

/**
 * GET - List sections for a course
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let decoded: any;
    try {
      decoded = verifyToken(authHeader.split(' ')[1]);
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    if (!checkSuperAdminAccess(decoded)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const courseId = request.nextUrl.searchParams.get('courseId');
    if (!courseId) {
      return NextResponse.json({ error: 'Course ID required' }, { status: 400 });
    }

    const sections = await listSectionsByCourse(courseId);

    return NextResponse.json({
      success: true,
      sections,
    });
  } catch (error: any) {
    console.error('[Admin Sections GET Error]:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

/**
 * POST - Create new section
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let decoded: any;
    try {
      decoded = verifyToken(authHeader.split(' ')[1]);
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    if (!checkSuperAdminAccess(decoded)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { courseId, order, content } = body;

    if (!courseId) {
      return NextResponse.json({ error: 'Course ID required' }, { status: 400 });
    }

    const section = await saveSection({
      courseId,
      order: order !== undefined && order !== null ? Number(order) : 1,
      content: content || {},
    });

    return NextResponse.json({
      success: true,
      section,
    });
  } catch (error: any) {
    console.error('[Admin Sections POST Error]:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

/**
 * PUT - Update section
 */
export async function PUT(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let decoded: any;
    try {
      decoded = verifyToken(authHeader.split(' ')[1]);
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    if (!checkSuperAdminAccess(decoded)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const sectionId = body.sectionId || body.id;
    const { courseId, order, content } = body;

    if (!sectionId) {
      return NextResponse.json({ error: 'Section ID required' }, { status: 400 });
    }

    const section = await saveSection({
      id: sectionId,
      courseId: courseId || '',
      order: order !== undefined ? Number(order) : 1,
      content: content || {},
    });

    return NextResponse.json({
      success: true,
      section,
    });
  } catch (error: any) {
    console.error('[Admin Sections PUT Error]:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

/**
 * DELETE - Delete section
 */
export async function DELETE(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let decoded: any;
    try {
      decoded = verifyToken(authHeader.split(' ')[1]);
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    if (!checkSuperAdminAccess(decoded)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const sectionId = request.nextUrl.searchParams.get('id');
    if (!sectionId) {
      return NextResponse.json({ error: 'Section ID required' }, { status: 400 });
    }

    await deleteSection(sectionId);

    return NextResponse.json({
      success: true,
      message: 'Section deleted successfully',
    });
  } catch (error: any) {
    console.error('[Admin Sections DELETE Error]:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

/**
 * PATCH - Reorder section
 */
export async function PATCH(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(authHeader.split(' ')[1]);
    if (!checkSuperAdminAccess(decoded)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const sectionId = body.sectionId || body.id;
    const { order } = body;

    if (!sectionId || order === undefined) {
      return NextResponse.json({ error: 'Section ID and order required' }, { status: 400 });
    }

    const { bunnyExecute } = await import('@/lib/bunnyDatabase');
    await bunnyExecute({
      sql: 'UPDATE course_sections_sql SET display_order = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      args: [Number(order), String(sectionId)],
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[Admin Sections PATCH Error]:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

