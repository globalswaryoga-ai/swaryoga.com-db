/**
 * @fileoverview Workshop Schedule Management API (BunnyDB)
 * @author Swar Yoga Team
 * @copyright 2025 Global Swar Yoga AI - All Rights Reserved
 * @protected This code is protected under intellectual property laws
 */

import { NextRequest, NextResponse } from 'next/server';
import { listWorkshopSchedules } from '@/lib/bunnyWorkshopScheduleRepository';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const workshopSlug = (searchParams.get('workshopSlug') || searchParams.get('workshopId') || '').trim();
    const mode = (searchParams.get('mode') || '').trim().toLowerCase();
    const language = (searchParams.get('language') || '').trim();

    const schedules = await listWorkshopSchedules({
      workshopSlug: workshopSlug || undefined,
      mode: mode || undefined,
      language: language || undefined,
      status: 'published',
    });

    return NextResponse.json({ success: true, data: schedules });
  } catch (err) {
    console.error('[GET /api/workshops/schedules] Error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
