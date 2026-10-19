import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { getViewerUserId } from '@/lib/crm-handlers';
import { canvaToken } from '@/lib/canvaConnection';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    let accessToken = cookieStore.get('canva_access_token')?.value || null;

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
            console.error('[Canva token load error in autofill]', err);
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
      return NextResponse.json({ error: 'Not authenticated with Canva' }, { status: 401 });
    }

    const body = await request.json();
    const { templateId, data } = body;

    if (!templateId || !data) {
      return NextResponse.json({ error: 'Missing templateId or data' }, { status: 400 });
    }

    // Call Canva Autofill API
    const response = await fetch('https://api.canva.com/rest/v1/autofills', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      },
      body: JSON.stringify({
        brand_template_id: templateId,
        title: `Receipt - ${data.Name?.text || 'Autofilled'}`,
        data: data
      })
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error('Canva Autofill Error:', responseData);
      return NextResponse.json({ error: responseData.message || 'Failed to autofill template' }, { status: response.status });
    }

    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Error generating canva autofill:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
