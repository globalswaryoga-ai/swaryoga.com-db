import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { getViewerUserId } from '@/lib/crm-handlers';
import { canvaToken } from '@/lib/canvaConnection';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  let accessToken: string | null = null;

  // 1. Check cookies for direct access token
  const cookieStore = cookies();
  accessToken = cookieStore.get('canva_access_token')?.value || null;

  // 2. If no cookie token, resolve user and query Bunny DB canva_connections_sql
  if (!accessToken) {
    const authHeader = request.headers.get('authorization') || '';
    const rawToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : (cookieStore.get('adminToken')?.value || cookieStore.get('token')?.value);
    if (rawToken) {
      const decoded = verifyToken(rawToken);
      if (decoded) {
        const userId = getViewerUserId(decoded);
        try {
          accessToken = await canvaToken(userId);
        } catch (err) {
          console.error('[Canva token load error]', err);
        }
      }
    }
  }

  // 3. Fallback check for super-admin or shared connection
  if (!accessToken) {
    try {
      accessToken = await canvaToken('admin');
    } catch {}
  }

  if (!accessToken) {
    return NextResponse.json({ error: 'Not authenticated with Canva', needsAuth: true, items: [] }, { status: 200 });
  }

  try {
    const response = await fetch('https://api.canva.com/rest/v1/designs?ownership=any', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        cookieStore.delete('canva_access_token');
        return NextResponse.json({ error: 'Session expired. Reconnect Canva.', needsAuth: true, items: [] }, { status: 200 });
      }
      const errorData = await response.text();
      return NextResponse.json({ error: 'Failed to fetch designs from Canva', details: errorData, needsAuth: true, items: [] }, { status: 200 });
    }

    const data = await response.json();
    return NextResponse.json({ items: data.items || [], continuation: data.continuation || null });
  } catch (error) {
    console.error('Error fetching designs:', error);
    return NextResponse.json({ error: 'Internal server error', items: [] }, { status: 500 });
  }
}

