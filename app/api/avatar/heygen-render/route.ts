import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function disabledResponse() {
  return NextResponse.json(
    {
      success: false,
      error: 'External avatar-provider rendering is disabled for this in-house platform. Use the consent-gated /api/avatar/inhouse/video queue.',
    },
    { status: 410 }
  );
}

export async function GET() {
  return disabledResponse();
}

export async function POST() {
  return disabledResponse();
}
