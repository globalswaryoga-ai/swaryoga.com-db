import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function retiredResponse() {
  return NextResponse.json(
    {
      success: false,
      error: 'This legacy endpoint is disabled because it returned source videos as generated renders. Use the consent-gated in-house render queue at /api/avatar/inhouse/video.',
    },
    { status: 410 }
  );
}

export async function GET() {
  return retiredResponse();
}

export async function POST() {
  return retiredResponse();
}
