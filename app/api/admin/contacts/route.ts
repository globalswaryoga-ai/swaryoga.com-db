import { verifyToken } from '@/lib/auth';
import { bunnyExecute, cleanMongoJson } from '@/lib/bunnyDatabase';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    // Verify admin token
    const authHeader = req.headers.get('authorization') || '';
    const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : '';

    // Allow legacy admin-panel token only if explicitly configured
    if (!bearer) {
      const expectedAdminPanelToken = (process.env.ADMIN_PANEL_TOKEN || '').trim();
      if (!expectedAdminPanelToken || authHeader !== expectedAdminPanelToken) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const decoded = bearer ? verifyToken(bearer) : null;
    if (bearer && !decoded?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Permission gate: email module
    if (bearer) {
      const perms = Array.isArray(decoded?.permissions) ? decoded?.permissions : [];
      const isSuperAdmin = decoded?.userId === 'admin' || perms.includes('all');
      const canEmail = isSuperAdmin || perms.includes('email');
      if (!canEmail) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    // Fetch contact messages from BunnyDB
    const rows = await bunnyExecute(
      `SELECT document_json FROM mongo_documents WHERE collection_name='contacts' ORDER BY created_at DESC`
    ).catch(() => ({ rows: [] }));

    const mappedContacts = rows.rows.map((r: any) => {
      const contact = cleanMongoJson(JSON.parse(String(r.document_json)));
      return {
        _id: contact._id || contact.id,
        name: contact.name || 'Anonymous',
        email: contact.email || '',
        phone: contact.phone || '',
        subject: contact.subject || '',
        message: contact.message || '',
        status: contact.status || 'new',
        isRead: contact.isRead ?? false,
        createdAt: contact.createdAt || new Date().toISOString(),
        source: 'contact',
      };
    });

    return NextResponse.json(mappedContacts, { status: 200 });
  } catch (error) {
    console.error('Error fetching contact data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch contact data' },
      { status: 500 }
    );
  }
}
