import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('canva_access_token')?.value;

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
