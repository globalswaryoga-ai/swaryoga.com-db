import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { bunnyExecute } from '@/lib/bunnyDatabase';
import { initWorkshopBatchesSchema } from '@/lib/bunnyWorkshopScheduleRepository';
import { getUserById } from '@/lib/repositories/userRepository';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/workshops/batches/enrollments
 * Get enrollments for a batch (BunnyDB)
 */
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') || undefined;
    const decoded = verifyToken(authHeader);
    if (!decoded || !decoded.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    await initWorkshopBatchesSchema();

    const { searchParams } = new URL(req.url);
    const batchId = searchParams.get('batchId');

    if (!batchId) {
      return NextResponse.json({ error: 'Batch ID is required' }, { status: 400 });
    }

    const res = await bunnyExecute({
      sql: 'SELECT * FROM workshop_batches_sql WHERE id = ? LIMIT 1',
      args: [batchId],
    });

    if (!res.rows[0]) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
    }

    const batch = res.rows[0];
    let userIds: string[] = [];
    try {
      userIds = JSON.parse(String(batch.enrolled_users_json || '[]'));
    } catch {}

    const enrolledUsers = await Promise.all(
      userIds.map(async (uId) => {
        const u = await getUserById(uId);
        return {
          _id: uId,
          id: uId,
          name: u?.name || 'Student',
          email: u?.email || '',
          phone: u?.phone || '',
        };
      })
    );

    return NextResponse.json({
      success: true,
      batch: {
        id: String(batch.id),
        name: batch.name,
        batchNumber: Number(batch.batch_number),
      },
      enrollments: enrolledUsers,
      totalEnrolled: enrolledUsers.length,
    });
  } catch (error: any) {
    console.error('[Get Enrollments Error]:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/admin/workshops/batches/enrollments
 * Add user(s) to a batch (BunnyDB)
 */
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') || undefined;
    const decoded = verifyToken(authHeader);
    if (!decoded || !decoded.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    await initWorkshopBatchesSchema();

    const body = await req.json();
    const { batchId, userIds } = body;

    if (!batchId || !userIds || !Array.isArray(userIds)) {
      return NextResponse.json(
        { error: 'Batch ID and user IDs array are required' },
        { status: 400 }
      );
    }

    const res = await bunnyExecute({
      sql: 'SELECT * FROM workshop_batches_sql WHERE id = ? LIMIT 1',
      args: [batchId],
    });

    if (!res.rows[0]) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
    }

    let existingUserIds: string[] = [];
    try {
      existingUserIds = JSON.parse(String(res.rows[0].enrolled_users_json || '[]'));
    } catch {}

    const newUserIds = userIds.map(String).filter((id: string) => !existingUserIds.includes(id));
    const combined = [...existingUserIds, ...newUserIds];

    await bunnyExecute({
      sql: 'UPDATE workshop_batches_sql SET enrolled_users_json = ?, updated_at = ? WHERE id = ?',
      args: [JSON.stringify(combined), new Date().toISOString(), batchId],
    });

    return NextResponse.json({
      success: true,
      message: `${newUserIds.length} user(s) enrolled`,
      addedCount: newUserIds.length,
      skippedCount: userIds.length - newUserIds.length,
    });
  } catch (error: any) {
    console.error('[Add Enrollments Error]:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/workshops/batches/enrollments
 * Remove user(s) from a batch (BunnyDB)
 */
export async function DELETE(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') || undefined;
    const decoded = verifyToken(authHeader);
    if (!decoded || !decoded.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    await initWorkshopBatchesSchema();

    const { searchParams } = new URL(req.url);
    const batchId = searchParams.get('batchId');
    const userId = searchParams.get('userId');

    if (!batchId || !userId) {
      return NextResponse.json({ error: 'Batch ID and user ID are required' }, { status: 400 });
    }

    const res = await bunnyExecute({
      sql: 'SELECT * FROM workshop_batches_sql WHERE id = ? LIMIT 1',
      args: [batchId],
    });

    if (!res.rows[0]) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
    }

    let existingUserIds: string[] = [];
    try {
      existingUserIds = JSON.parse(String(res.rows[0].enrolled_users_json || '[]'));
    } catch {}

    const filtered = existingUserIds.filter((id) => id !== String(userId));

    await bunnyExecute({
      sql: 'UPDATE workshop_batches_sql SET enrolled_users_json = ?, updated_at = ? WHERE id = ?',
      args: [JSON.stringify(filtered), new Date().toISOString(), batchId],
    });

    return NextResponse.json({ success: true, message: 'User removed from batch' });
  } catch (error: any) {
    console.error('[Remove Enrollment Error]:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
