import { NextRequest, NextResponse } from 'next/server';
import { handleCrmError, isSuperAdmin, getViewerUserId } from '@/lib/crm-handlers';
import { listPrograms, insertProgram, getProgram } from '@/lib/bunnySadhanaRepository';
import { verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

function slugify(s: string): string {
  return String(s)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const filter = isSuperAdmin(decoded) ? {} : { createdByUserId: getViewerUserId(decoded) };
    const programs = await listPrograms(filter);
    
    return NextResponse.json({
      success: true,
      programs,
    });
  } catch (error) {
    return handleCrmError(error, 'GET sadhana-programs');
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const body = await request.json();
    const {
      name, description, timeSlots, timezone, videoDuration, countdownMinutes,
      days, repeatFrequency, startDate, botName, botJoinMinutes, enableBotAutomation,
      videoCalendar, playerMode, playerUrl, zoomLink, zoomId, zoomPassword
    } = body;

    if (!name || !timeSlots || timeSlots.length === 0) {
      return NextResponse.json({ error: 'name and timeSlots required' }, { status: 400 });
    }

    let slug = slugify(name);
    let slugCheck = await getProgram(slug);
    let suffix = 1;
    while (slugCheck) {
      slug = `${slugify(name)}-${suffix++}`;
      slugCheck = await getProgram(slug);
    }

    const doc = {
      slug,
      name: String(name).slice(0, 100),
      description: description ? String(description).slice(0, 500) : '',
      timeSlots: Array.isArray(timeSlots) ? timeSlots.slice(0, 4) : [timeSlots],
      timezone: timezone || 'Asia/Kolkata',
      videoDuration: parseInt(videoDuration) || 40,
      countdownMinutes: parseInt(countdownMinutes) || 3,
      days: Array.isArray(days) ? days.sort((a, b) => a - b) : [0, 1, 2, 3, 4, 5, 6],
      repeatFrequency: repeatFrequency || 'daily',
      startDate: startDate || null,
      botName: botName || '🤖 Swar Yoga Bot',
      botJoinMinutes: parseInt(botJoinMinutes) || 5,
      enableBotAutomation: enableBotAutomation !== false,
      videoCalendar: videoCalendar || {},
      playerMode: playerMode || 'player',
      playerUrl: playerUrl || '',
      zoomLink: zoomLink || '',
      zoomId: zoomId || '',
      zoomPassword: zoomPassword || '',
      active: true,
      createdByUserId: getViewerUserId(decoded),
    };

    const result = await insertProgram(doc);
    return NextResponse.json({
      success: true,
      program: result,
    });
  } catch (error) {
    return handleCrmError(error, 'POST sadhana-programs');
  }
}
