import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const jobId = url.searchParams.get('jobId');

    if (!jobId) {
      return NextResponse.json({ error: 'Missing jobId' }, { status: 400 });
    }

    const cookieStore = await cookies();
    const accessToken = cookieStore.get('canva_access_token')?.value;

    if (!accessToken) {
      return NextResponse.json({ error: 'Not authenticated with Canva' }, { status: 401 });
    }

    // Call Canva Autofill Job API
    const response = await fetch(`https://api.canva.com/rest/v1/autofills/${jobId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      }
    });

    const responseData = await response.json();

    if (!response.ok) {
      return NextResponse.json({ error: responseData.message || 'Failed to check job status' }, { status: response.status });
    }

    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Error fetching canva job status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
