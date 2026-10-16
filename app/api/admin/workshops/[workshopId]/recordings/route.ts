/**
 * API to get Zoom recordings for a specific workshop
 * GET /api/admin/workshops/[workshopId]/recordings
 * Returns only gallery_view recordings (BunnyDB)
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import {
  getWorkshopCatalogItemByIdOrSlug,
  listWorkshopRecordings,
} from '@/lib/bunnyWorkshopScheduleRepository';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { workshopId: string } }
) {
  try {
    // Verify admin from cookie or authorization header
    const token =
      request.cookies.get('token')?.value ||
      request.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded || !decoded.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { workshopId } = params;

    // Find workshop in BunnyDB
    const workshop = await getWorkshopCatalogItemByIdOrSlug(workshopId);
    if (!workshop) {
      return NextResponse.json({ error: 'Workshop not found' }, { status: 404 });
    }

    const recordings = await listWorkshopRecordings(workshop.id || workshopId);

    return NextResponse.json({
      success: true,
      recordings,
      count: recordings.length,
    });
  } catch (error: any) {
    console.error('[Workshop Recordings Error]:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
