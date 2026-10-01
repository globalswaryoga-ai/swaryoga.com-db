import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const cookieStore = cookies();
  const accessToken = cookieStore.get('canva_access_token')?.value;

  if (!accessToken) {
    return NextResponse.json({ error: 'Not authenticated with Canva' }, { status: 401 });
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
        // Token expired, clear it
        cookieStore.delete('canva_access_token');
      }
      const errorData = await response.text();
      console.error('Failed to fetch Canva designs:', errorData);
      return NextResponse.json({ error: 'Failed to fetch designs from Canva', details: errorData }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching designs:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
