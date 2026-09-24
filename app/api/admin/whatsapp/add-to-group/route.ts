'use server';

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  // Placeholder implementation – replace with actual add-to-group logic
  return NextResponse.json({ message: 'WhatsApp add-to-group placeholder', received: body }, { status: 200 });
}
