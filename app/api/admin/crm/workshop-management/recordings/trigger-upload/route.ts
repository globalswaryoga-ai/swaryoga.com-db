import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { exec } from 'child_process';
import path from 'path';

export const dynamic = 'force-dynamic';

function isAdmin(request: NextRequest) {
  const raw = request.headers.get('authorization') || request.cookies.get('token')?.value || '';
  const decoded = verifyToken(raw.startsWith('Bearer ') ? raw.slice(7) : raw);
  return Boolean(decoded?.isAdmin || decoded?.userId || decoded?.username);
}

export async function POST(request: NextRequest) {
  try {
    if (!isAdmin(request)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const zoomMeetingId = String(body.zoomMeetingId || '').replace(/\D+/g, '');
    const cohortId = body.cohortId;

    if (!zoomMeetingId && !cohortId) {
      return NextResponse.json({ error: 'zoomMeetingId or cohortId is required' }, { status: 400 });
    }

    // Path to the zoom-recording-uploader.mjs script
    const scriptPath = path.join(process.cwd(), 'scripts', 'zoom-recording-uploader.mjs');

    // Run the uploader asynchronously with meeting filter
    const envVars = {
      ...process.env,
      ZOOM_MEETING_ID: zoomMeetingId,
      DELETE_AFTER_UPLOAD: 'off', // Keep Zoom recording safe
    };

    return new Promise<NextResponse>((resolve) => {
      const cmd = `node "${scriptPath}"`;
      console.log(`[Trigger Upload] Executing: ${cmd} for meeting ${zoomMeetingId || 'all'}`);

      exec(cmd, { env: envVars, timeout: 600000 }, (error, stdout, stderr) => {
        const fullLog = `${stdout}\n${stderr}`;
        console.log(`[Trigger Upload] Result:`, fullLog.slice(-500));

        if (fullLog.includes('invalid_grant') || fullLog.includes('YouTube account not connected')) {
          resolve(
            NextResponse.json({
              success: false,
              needReauth: true,
              error: 'YouTube authentication failed (Token expired or revoked). Please click "Reconnect YouTube".',
              logs: fullLog
            }, { status: 400 })
          );
          return;
        }

        if (error && !fullLog.includes('uploader done')) {
          resolve(
            NextResponse.json({
              success: false,
              error: error.message || 'Uploader script failed',
              logs: fullLog
            }, { status: 500 })
          );
          return;
        }

        resolve(
          NextResponse.json({
            success: true,
            message: 'Zoom recording uploader finished successfully!',
            logs: fullLog
          })
        );
      });
    });
  } catch (error: any) {
    console.error('[Trigger Upload] Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to trigger upload' }, { status: 500 });
  }
}
