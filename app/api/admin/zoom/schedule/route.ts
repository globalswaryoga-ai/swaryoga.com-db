'use server';

import { NextRequest, NextResponse } from 'next/server';



export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  // Placeholder: respond with schedule info
  return NextResponse.json({ message: 'Zoom meeting scheduled', received: body }, { status: 200 });
}
