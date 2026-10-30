import { NextRequest, NextResponse } from 'next/server';
import {
  getAllPerformanceDna,
  savePerformanceDna,
  approvePerformanceDna,
} from '@/lib/mohanAiClone/mohanAiCloneRepository';
import { YOGA_MOTION_CATALOG } from '@/lib/mohanAiClone/yogaMotionCatalog';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const approvedOnly = searchParams.get('approved') === '1';
    const type = searchParams.get('type');

    if (type === 'yoga_catalog') {
      return NextResponse.json({ success: true, data: YOGA_MOTION_CATALOG });
    }

    const dnaRecords = await getAllPerformanceDna(approvedOnly);
    return NextResponse.json({ success: true, data: dnaRecords });
  } catch (error) {
    console.error('Error fetching performance DNA:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch performance DNA' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'save') {
      const record = await savePerformanceDna(body.dna);
      return NextResponse.json({ success: true, data: record });
    }

    if (action === 'approve') {
      const { id, isApproved } = body;
      await approvePerformanceDna(id, isApproved !== false);
      return NextResponse.json({ success: true, message: 'Performance DNA approval updated' });
    }

    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('Error updating performance DNA:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

