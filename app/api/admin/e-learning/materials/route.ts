/**
 * Admin API for Course Materials (BunnyDB)
 * GET /api/admin/e-learning/materials - List materials
 * POST /api/admin/e-learning/materials - Upload material
 * PUT /api/admin/e-learning/materials - Update material
 * DELETE /api/admin/e-learning/materials - Delete material
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';
import {
  listMaterialsByCourse,
  saveMaterial,
  deleteMaterial,
} from '@/lib/bunnyCourseRepository';

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

    const materials = await listMaterialsByCourse(courseId, true);

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
    const { courseId, title, fileUrl, fileType, fileSize, order, sectionId } = body;

    if (!courseId || !title || !fileUrl) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const material = await saveMaterial({
      courseId,
      sectionId: sectionId || null,
      title,
      fileUrl,
      fileType: fileType || '',
      fileSize: Number(fileSize || 0),
      order: Number(order || 1),
      isActive: true,
      content: { en: { title } },
    });

    return NextResponse.json({
      success: true,
      material,
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
    const { materialId, courseId, title, fileUrl, fileType, fileSize, order } = body;

    if (!materialId) {
      return NextResponse.json({ error: 'Material ID required' }, { status: 400 });
    }

    const material = await saveMaterial({
      id: materialId,
      courseId: courseId || '',
      title: title || '',
      fileUrl: fileUrl || '',
      fileType: fileType || '',
      fileSize: Number(fileSize || 0),
      order: Number(order || 1),
      isActive: true,
    });

    return NextResponse.json({
      success: true,
      material,
    });
  } catch (error: any) {
    console.error('[Admin Materials PUT Error]:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
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

    await deleteMaterial(materialId);

    return NextResponse.json({
      success: true,
      message: 'Material deleted',
    });
  } catch (error: any) {
    console.error('[Admin Materials DELETE Error]:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
