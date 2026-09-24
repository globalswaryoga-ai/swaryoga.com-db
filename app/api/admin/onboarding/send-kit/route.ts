'use server';

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  // Placeholder – implement actual kit sending logic
  return NextResponse.json({ message: 'Send kit placeholder', received: body }, { status: 200 });
}
