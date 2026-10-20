import { NextRequest, NextResponse } from 'next/server';
import { handleCrmError, isSuperAdmin, getViewerUserId } from '@/lib/crm-handlers';
import { verifyToken } from '@/lib/auth';
import {
  listSadhanaSchedules,
  createSadhanaSchedule,
} from '@/lib/bunnySadhanaSchedulerRepository';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/crm/sadhana-scheduler
 * List all Sadhana schedules from Bunny Database
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace(/^Bearer\s+/i, '');
    const decoded = verifyToken(token);

    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const viewerUserId = getViewerUserId(decoded);
    const superAdmin = isSuperAdmin(decoded, request);

    const filter: any = {};
    if (!superAdmin) {
      filter.userId = viewerUserId;
    }

    const schedules = await listSadhanaSchedules(filter);
    return NextResponse.json({ success: true, data: schedules }, { status: 200 });
  } catch (error) {
    return handleCrmError(error, 'GET sadhana-scheduler');
  }
}

/**
 * POST /api/admin/crm/sadhana-scheduler
 * Create a new Sadhana schedule in Bunny Database
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace(/^Bearer\s+/i, '');
    const decoded = verifyToken(token);

    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    if (!body.name || !body.videoUrl || !body.schedule) {
      return NextResponse.json(
        { error: 'Missing required fields: name, videoUrl, schedule' },
        { status: 400 }
      );
    }

    const hasZoomLink = body.zoomLink && body.zoomLink.trim();
    const hasZoomCredentials =
      body.zoomId && body.zoomPassword && body.zoomId.trim() && body.zoomPassword.trim();

    if (!hasZoomLink && !hasZoomCredentials) {
      return NextResponse.json(
        { error: 'Either Zoom link or Zoom ID+password is required' },
        { status: 400 }
      );
    }

    const saved = await createSadhanaSchedule({
      name: body.name,
      botName: body.botName || 'Swar Sadhana',
      chatMessages: Array.isArray(body.chatMessages) ? body.chatMessages.slice(0, 4) : [],
      enableAiChatReplies: !!body.enableAiChatReplies,
      videoUrl: body.videoUrl,
      videoDuration: body.videoDuration || 40,
      botJoinMinutes: body.botJoinMinutes || 5,
      autoCloseMinutes: body.autoCloseMinutes || 40,
      enableBotAutomation: body.enableBotAutomation !== false,
      zoomLink: body.zoomLink || null,
      zoomId: body.zoomId || null,
      zoomPassword: body.zoomPassword || null,
      zoomMeetingId: body.zoomMeetingId || null,
      schedule: body.schedule,
      status: body.status || 'active',
      userId: getViewerUserId(decoded),
      tenantId: decoded.tenantId,
    });

    return NextResponse.json({ success: true, data: saved }, { status: 201 });
  } catch (error) {
    return handleCrmError(error, 'POST sadhana-scheduler');
  }
}
