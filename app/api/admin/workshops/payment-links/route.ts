import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const workshopId = searchParams.get('workshopId');
    const origin = new URL(request.url).origin;

    const authHeader = request.headers.get('authorization') || '';
    const url = new URL('/api/admin/workshops/payment-links/env', origin);

    const response = await fetch(url.toString(), {
      headers: authHeader ? { Authorization: authHeader } : undefined,
      cache: 'no-store',
    });

    const json = await response.json().catch(() => null);
    if (!response.ok) {
      return NextResponse.json({ error: json?.error || 'Failed to load payment links' }, { status: response.status });
    }

    let links = (json?.data || []) as any[];
    if (workshopId) {
      links = links.filter((l) => String(l.workshop_id) === String(workshopId));
    }

    return NextResponse.json({ data: links });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
