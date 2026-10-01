import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('canva_access_token')?.value;

  if (!accessToken) {
    return NextResponse.json({ error: 'Not authenticated with Canva' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const templateId = searchParams.get('templateId');

  if (!templateId) {
    return NextResponse.json({ error: 'Missing templateId' }, { status: 400 });
  }

  try {
    // Get the template's dataset (autofill fields)
    const response = await fetch(`https://api.canva.com/rest/v1/brand-templates/${templateId}/dataset`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'
      },
    });

    const data = await response.json();
    
    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch dataset', details: data, status: response.status }, { status: 200 });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: 'Internal server error', message: error.message }, { status: 500 });
  }
}
