'use server';

import { NextRequest, NextResponse } from 'next/server';



export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  // Placeholder: acknowledge welcome message request
  return NextResponse.json({ message: 'Welcome message sent', received: body }, { status: 200 });
}
