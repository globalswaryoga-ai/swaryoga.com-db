import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { getViewerUserId } from '@/lib/crm-handlers';
import { canvaToken } from '@/lib/canvaConnection';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  let accessToken: string | null = null;

  const cookieStore = cookies();
  accessToken = cookieStore.get('canva_access_token')?.value || null;

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
          console.error('[Canva token load error in brand-templates]', err);
        }
      }
    }
  }

  if (!accessToken) {
    try {
      accessToken = await canvaToken('admin');
    } catch {}
  }

  if (!accessToken) {
    return NextResponse.json({ error: 'Not authenticated with Canva', needsAuth: true, items: [] }, { status: 200 });
  }

  try {
    const response = await fetch('https://api.canva.com/rest/v1/brand-templates', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'
      },
    });

    if (!response.ok) {
      const errorData = await response.text();
      return NextResponse.json({ error: 'Failed to fetch brand templates', details: errorData, items: [] }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json({ items: data.items || [] });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error', items: [] }, { status: 500 });
  }
}

