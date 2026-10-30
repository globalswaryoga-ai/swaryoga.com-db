import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/investment/[investmentId]/generate-certificate
 * Retired: this endpoint read from MongoDB. Certificates will be generated
 * from Bunny records in the investor portal.
 */
export async function GET() {
  return NextResponse.json(
    { error: 'Certificate download is not available on this route yet. Please contact Swar Yoga.' },
    { status: 410 }
  );
}
