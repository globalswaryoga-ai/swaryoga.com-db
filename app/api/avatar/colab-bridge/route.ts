import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const retiredResponse = () =>
  NextResponse.json(
    {
      success: false,
      error: 'The legacy Colab bridge is retired. Use the authenticated in-house render queue; neural inference is not yet available.',
    },
    { status: 410 }
  );

export async function GET(_request: NextRequest) {
  return retiredResponse();
}

export async function POST(_request: NextRequest) {
  return retiredResponse();
}
