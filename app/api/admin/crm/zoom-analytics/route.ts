/**
 * Zoom Meeting Analytics API
 * GET /api/admin/crm/zoom-analytics?meetingId=123456789
 * Returns full participant analytics, grades, session history.
 */
import { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { apiError, apiSuccess } from '@/lib/api-error';
import { getFullMeetingAnalytics } from '@/lib/zoom-analytics';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    // Auth check
    const token = req.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin) {
      return apiError('UNAUTHORIZED');
    }

    const meetingId = req.nextUrl.searchParams.get('meetingId');
    if (!meetingId) {
      return apiError('VALIDATION_ERROR', 'meetingId query parameter is required');
    }

    // Validate Zoom credentials exist
    if (!process.env.ZOOM_ACCOUNT_ID || !process.env.ZOOM_CLIENT_ID || !process.env.ZOOM_CLIENT_SECRET) {
      return apiError('SERVER_ERROR', 'Zoom API credentials not configured');
    }

    const analytics = await getFullMeetingAnalytics(meetingId.trim());

    // Add diagnostic warning if 0 participants
    if (analytics.totalUniqueParticipants === 0) {
      console.warn(`[Zoom Analytics] Meeting ${meetingId} returned 0 participants across ${analytics.totalSessions} sessions`);
      return apiSuccess({
        ...analytics,
        _warning: analytics.totalSessions > 0
          ? 'Meeting sessions found but no participant data available. Zoom Reports API can take up to 2 hours after a meeting ends to have participant data.'
          : 'No meeting instances or participant data found. This meeting may not have occurred yet or the Reports API has not processed it.',
      });
    }

    return apiSuccess(analytics);
  } catch (err: any) {
    console.error('[Zoom Analytics] Error:', err.message);
    return apiError('SERVER_ERROR', err.message || 'Failed to fetch Zoom analytics');
  }
}
