import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const configuredSecret = process.env.CRON_SECRET;
  const authorization = req.headers.get('authorization');
  const querySecret = req.nextUrl.searchParams.get('secret');
  if (!configuredSecret || (authorization !== `Bearer ${configuredSecret}` && querySecret !== configuredSecret)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json({
    error: 'This legacy processor has been retired. Use /api/cron/qr-broadcast-processor-v2.',
  }, { status: 410 });
}
