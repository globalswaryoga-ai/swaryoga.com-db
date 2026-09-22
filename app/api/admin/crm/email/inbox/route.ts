import { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { apiError, apiSuccess } from '@/lib/api-error';
import {
  fetchEmails,
  fetchEmailByUid,
  markEmailRead,
  deleteEmail,
  listFolders,
  isImapConfigured,
  getImapUser,
} from '@/lib/imapClient';

export const dynamic = 'force-dynamic';


/**
 * GET /api/admin/crm/email/inbox
 * Fetch emails from Gmail inbox via IMAP
 *
 * Query params:
 *  - folder (default: INBOX)
 *  - limit (default: 25)
 *  - page (default: 0)
 *  - search (optional text search)
 *  - unreadOnly (optional 'true'/'false')
 *  - uid (optional - fetch single email by UID)
 *  - action=folders (list available folders)
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin && !decoded?.userId) return apiError('UNAUTHORIZED');

    if (!isImapConfigured()) {
      return apiSuccess({
        configured: false,
        message: 'IMAP not configured. Set GMAIL_IMAP_USER and GMAIL_IMAP_PASS in environment variables.',
        setupSteps: [
          'Add GMAIL_IMAP_HOST=imap.hostinger.com (or your provider) to .env.local',
          'Add GMAIL_IMAP_PORT=993 to .env.local',
          'Add GMAIL_IMAP_USER=your@email.com to .env.local',
          'Add GMAIL_IMAP_PASS=<your-password> to .env.local',
        ],
      });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    // List folders
    if (action === 'folders') {
      const folders = await listFolders();
      return apiSuccess({ folders });
    }

    // Single email by UID
    const uidParam = searchParams.get('uid');
    if (uidParam) {
      const uid = parseInt(uidParam);
      const folder = searchParams.get('folder') || 'INBOX';
      const email = await fetchEmailByUid(uid, folder);
      if (!email) return apiError('NOT_FOUND', 404, 'Email not found');
      return apiSuccess({ email });
    }

    // List emails
    const folder = searchParams.get('folder') || 'INBOX';
    const limit = Math.min(parseInt(searchParams.get('limit') || '25'), 50);
    const page = parseInt(searchParams.get('page') || '0');
    const search = searchParams.get('search') || undefined;
    const unreadOnly = searchParams.get('unreadOnly') === 'true';

    const result = await fetchEmails({ folder, limit, page, search, unreadOnly });

    return apiSuccess({
      configured: true,
      account: getImapUser(),
      ...result,
      page,
      limit,
      totalPages: Math.ceil(result.total / limit),
    });
  } catch (error: any) {
    console.error('[inbox] GET error:', error);

    if (error.message?.includes('AUTHENTICATIONFAILED') || error.message?.includes('Invalid credentials')) {
      return apiSuccess({
        configured: false,
        message: 'Gmail authentication failed. Check your App Password.',
        error: 'AUTHENTICATION_FAILED',
      });
    }

    return apiError('SERVER_ERROR', 500, error.message || 'Failed to fetch inbox');
  }
}

/**
 * POST /api/admin/crm/email/inbox
 * Actions: mark read/unread, delete, bulkDelete
 *
 * Body:
 *  - action: 'markRead' | 'markUnread' | 'delete' | 'bulkDelete'
 *  - uid?: number
 *  - uids?: number[]
 *  - folder?: string (default: INBOX)
 */
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin && !decoded?.userId) return apiError('UNAUTHORIZED');

    if (!isImapConfigured()) {
      return apiError('BAD_REQUEST', 400, 'IMAP not configured');
    }

    const body = await request.json();
    const { action, uid, uids, folder = 'INBOX' } = body;

    if (!action) {
      return apiError('VALIDATION_ERROR', 400, 'Missing action');
    }

    switch (action) {
      case 'markRead':
        if (!uid) return apiError('VALIDATION_ERROR', 400, 'Missing uid');
        await markEmailRead(uid, true, folder);
        return apiSuccess({ message: 'Email marked as read' });

      case 'markUnread':
        if (!uid) return apiError('VALIDATION_ERROR', 400, 'Missing uid');
        await markEmailRead(uid, false, folder);
        return apiSuccess({ message: 'Email marked as unread' });

      case 'delete':
        if (!uid) return apiError('VALIDATION_ERROR', 400, 'Missing uid');
        await deleteEmail(uid, folder);
        return apiSuccess({ message: 'Email deleted' });

      case 'bulkDelete':
        if (!uids || !Array.isArray(uids)) return apiError('VALIDATION_ERROR', 400, 'Missing uids array');
        for (const id of uids) {
          await deleteEmail(id, folder);
        }
        return apiSuccess({ message: `${uids.length} emails deleted` });

      default:
        return apiError('VALIDATION_ERROR', 400, `Unknown action: ${action}`);
    }
  } catch (error: any) {
    console.error('[inbox] POST error:', error);
    return apiError('SERVER_ERROR', 500, error.message || 'Failed to perform action');
  }
}
