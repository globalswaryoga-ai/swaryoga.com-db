import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const cookieStore = cookies();
  const accessToken = cookieStore.get('canva_access_token')?.value;

  if (!accessToken) {
    return NextResponse.json({ error: 'Not authenticated with Canva', needsAuth: true }, { status: 200 });
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
      return NextResponse.json({ error: 'Failed to fetch brand templates', details: errorData }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
