import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST() {
  return NextResponse.json(
    {
      success: false,
      error: 'This legacy local-file TTS endpoint is retired. Use the authenticated Bunny-backed in-house audio preview API.',
    },
    { status: 410 }
  );
}
