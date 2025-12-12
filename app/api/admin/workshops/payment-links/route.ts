// GET all payment links or GET by workshop ID
import { NextRequest, NextResponse } from 'next/server';
import { getPaymentLinks } from '@/lib/workshopDatabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const workshopId = searchParams.get('workshopId');
    const origin = new URL(request.url).origin;

    const { data, error } = await getPaymentLinks(workshopId || undefined, origin);

    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }

    return NextResponse.json({ data });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
