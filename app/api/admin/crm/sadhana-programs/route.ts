import { NextRequest, NextResponse } from 'next/server';
import { handleCrmError, isSuperAdmin, getViewerUserId } from '@/lib/crm-handlers';
import { listPrograms, insertProgram, getProgram } from '@/lib/bunnySadhanaRepository';
import { verifyToken, extractTokenFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

function slugify(s: string): string {
  const base = String(s || '')
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return base || `program-${Date.now().toString(36)}`;
}

export async function GET(request: NextRequest) {
  try {
    const token = extractTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded || (!decoded.isAdmin && !decoded.userId && !decoded.username)) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    // All authenticated admins have access to platform sadhana programs from Bunny Database
    const programs = await listPrograms();
    
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
    const token = extractTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded || (!decoded.isAdmin && !decoded.userId && !decoded.username)) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
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
