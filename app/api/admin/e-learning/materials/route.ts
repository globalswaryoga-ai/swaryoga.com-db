/**
 * Admin API for Course Materials
 * GET /api/admin/e-learning/materials - List materials
 * POST /api/admin/e-learning/materials - Upload material
 * PUT /api/admin/e-learning/materials - Update material
 * DELETE /api/admin/e-learning/materials - Delete material
 */

import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';
import { getCourseMaterial, getRecordedCourse } from '@/lib/schemas/recordedCourseSchemas';

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
    await connectDB();

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

    const CourseMaterial = getCourseMaterial();
    const materials = await CourseMaterial.find({ courseId, isActive: true })
      .sort({ order: 1 })
      .lean();

    return NextResponse.json({
      success: true,
      materials,
    });

  } catch (error: any) {
    console.error('[Materials GET Error]:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

/**
 * POST - Upload/Create material
 */
export async function POST(request: NextRequest) {
  try {
    await connectDB();

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
    const { courseId, ...materialData } = body;

    if (!courseId) {
      return NextResponse.json({ error: 'Course ID required' }, { status: 400 });
    }

    const RecordedCourse = getRecordedCourse();
    const CourseMaterial = getCourseMaterial();

    // Verify course exists
    const course = await RecordedCourse.findById(courseId);
    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    // Get next order
    const lastMaterial = await CourseMaterial.findOne({ courseId }).sort({ order: -1 });
    const nextOrder = (lastMaterial?.order || 0) + 1;

    const material = await CourseMaterial.create({
      ...materialData,
      courseId,
      order: materialData.order || nextOrder,
      isActive: true,
      createdBy: decoded.id,
    });

    return NextResponse.json({
      success: true,
      material,
    });

  } catch (error: any) {
    console.error('[Materials POST Error]:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

/**
 * PUT - Update material
 */
export async function PUT(request: NextRequest) {
  try {
    await connectDB();

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
    const { materialId, ...updateData } = body;

    if (!materialId) {
      return NextResponse.json({ error: 'Material ID required' }, { status: 400 });
    }

    const CourseMaterial = getCourseMaterial();

    const material = await CourseMaterial.findByIdAndUpdate(
      materialId,
      { ...updateData, updatedBy: decoded.id },
      { new: true }
    );

    if (!material) {
      return NextResponse.json({ error: 'Material not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      material,
    });

  } catch (error: any) {
    console.error('[Materials PUT Error]:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

/**
 * DELETE - Delete material (soft delete)
 */
export async function DELETE(request: NextRequest) {
  try {
    await connectDB();

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

    const CourseMaterial = getCourseMaterial();

    const material = await CourseMaterial.findByIdAndUpdate(
      materialId,
      { isActive: false, deletedAt: new Date(), deletedBy: decoded.id },
      { new: true }
    );

    if (!material) {
      return NextResponse.json({ error: 'Material not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Material deleted',
    });

  } catch (error: any) {
    console.error('[Materials DELETE Error]:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
