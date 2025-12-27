import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const challenge = searchParams.get('hub.challenge');

  // Meta requires PLAIN TEXT response
  return new NextResponse(challenge ?? '', {
    status: 200,
    headers: {
      'Content-Type': 'text/plain',
    },
  });
}

export async function POST(req: Request) {
  const body = await req.json();
  console.log('META WEBHOOK EVENT:', body);

  return NextResponse.json({ status: 'ok' });
}
