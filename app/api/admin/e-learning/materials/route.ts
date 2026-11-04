/**

 * Admin API for Course Materials (Bunny Database / LibSQL)
 * GET /api/admin/e-learning/materials - List materials
 * POST /api/admin/e-learning/materials - Upload/create material
 * PUT /api/admin/e-learning/materials - Update material
 * PATCH /api/admin/e-learning/materials - Update material order
 * DELETE /api/admin/e-learning/materials - Delete material
 */

import { NextRequest, NextResponse } from 'next/server';

import crypto from 'crypto';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';
import { bunnyExecute, isBunnyDatabaseConfigured } from '@/lib/bunnyDatabase';

export const dynamic = 'force-dynamic';

function checkSuperAdminAccess(decoded: any | null): boolean {
  if (!decoded) return false;
  return isSuperAdmin(decoded);
}

/**
 * GET - List materials for a course
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


    if (!isBunnyDatabaseConfigured()) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const res = await bunnyExecute({
      sql: `SELECT * FROM course_materials_sql 
            WHERE course_id = ? AND is_active = 1 
            ORDER BY display_order ASC, created_at DESC`,
      args: [courseId],
    });

    const materials = res.rows.map((r: any) => {
      let content = {};
      try {
        content = r.content_json ? JSON.parse(String(r.content_json)) : {};
      } catch {}
      return {
        _id: r.id,
        id: r.id,
        courseId: r.course_id,
        sectionId: r.section_id,
        title: r.title,
        fileUrl: r.file_url,
        fileType: r.file_type,
        fileSize: Number(r.file_size) || 0,
        order: Number(r.display_order) || 0,
        ragText: r.rag_text,
        isActive: Boolean(r.is_active),
        content,
      };
    });

    return NextResponse.json({
      success: true,
      materials,
    });
  } catch (error: any) {
    console.error('[Admin Materials GET Error]:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

/**
 * POST - Create material
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

    const { courseId, title, fileUrl, fileType, fileSize, sectionId, order, content, ragText } = body;

    if (!courseId || !title) {
      return NextResponse.json({ error: 'Course ID and title required' }, { status: 400 });
    }

    if (!isBunnyDatabaseConfigured()) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const materialId = `mat_${crypto.randomBytes(8).toString('hex')}`;
    const now = new Date().toISOString();

    let displayOrder = Number(order);
    if (!Number.isFinite(displayOrder)) {
      const lastRes = await bunnyExecute({
        sql: 'SELECT MAX(display_order) as max_order FROM course_materials_sql WHERE course_id = ?',
        args: [courseId],
      });
      displayOrder = (Number(lastRes.rows[0]?.max_order) || 0) + 1;
    }

    await bunnyExecute({
      sql: `INSERT INTO course_materials_sql 
            (id, course_id, section_id, title, file_url, file_type, file_size, display_order, is_active, content_json, created_at, updated_at, rag_text)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?)`,
      args: [
        materialId,
        courseId,
        sectionId || null,
        title,
        fileUrl || '',
        fileType || 'pdf',
        fileSize || 0,
        displayOrder,
        content ? JSON.stringify(content) : '{}',
        now,
        now,
        ragText || '',
      ],
    });

    return NextResponse.json({
      success: true,
      material: {
        _id: materialId,
        id: materialId,
        courseId,
        title,
        fileUrl,
        fileType,
        order: displayOrder,
        ragText,
      },
    });
  } catch (error: any) {
    console.error('[Admin Materials POST Error]:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

/**
 * PUT - Update material
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

    const { materialId, title, fileUrl, fileType, fileSize, sectionId, order, content, ragText } = body;

    if (!materialId) {
      return NextResponse.json({ error: 'Material ID required' }, { status: 400 });
    }


    if (!isBunnyDatabaseConfigured()) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const now = new Date().toISOString();
    await bunnyExecute({
      sql: `UPDATE course_materials_sql 
            SET title = COALESCE(?, title),
                file_url = COALESCE(?, file_url),
                file_type = COALESCE(?, file_type),
                file_size = COALESCE(?, file_size),
                section_id = COALESCE(?, section_id),
                display_order = COALESCE(?, display_order),
                content_json = COALESCE(?, content_json),
                rag_text = COALESCE(?, rag_text),
                updated_at = ?
            WHERE id = ?`,
      args: [
        title || null,
        fileUrl || null,
        fileType || null,
        fileSize !== undefined ? fileSize : null,
        sectionId !== undefined ? sectionId : null,
        order !== undefined ? order : null,
        content ? JSON.stringify(content) : null,
        ragText !== undefined ? ragText : null,
        now,
        materialId,
      ],
    });

    return NextResponse.json({
      success: true,
      material: { id: materialId, _id: materialId },
    });
  } catch (error: any) {
    console.error('[Admin Materials PUT Error]:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

/**

 * PATCH - Update material order only
 */
export async function PATCH(request: NextRequest) {
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
    const { materialId, order } = body;

    if (!materialId || order === undefined) {
      return NextResponse.json({ error: 'Material ID and order required' }, { status: 400 });
    }

    const now = new Date().toISOString();
    await bunnyExecute({
      sql: 'UPDATE course_materials_sql SET display_order = ?, updated_at = ? WHERE id = ?',
      args: [order, now, materialId],
    });

    return NextResponse.json({
      success: true,
      materialId,
      order,
    });
  } catch (error: any) {
    console.error('[Materials PATCH Error]:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

/**
 * DELETE - Delete material
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

    const materialId = request.nextUrl.searchParams.get('id');
    if (!materialId) {
      return NextResponse.json({ error: 'Material ID required' }, { status: 400 });
    }


    const now = new Date().toISOString();
    await bunnyExecute({
      sql: 'UPDATE course_materials_sql SET is_active = 0, updated_at = ? WHERE id = ?',
      args: [now, materialId],
    });

    return NextResponse.json({
      success: true,
      message: 'Material deleted',
    });
  } catch (error: any) {
    console.error('[Admin Materials DELETE Error]:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
