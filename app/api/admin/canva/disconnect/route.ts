import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST() {
  const cookieStore = await cookies();
  
  cookieStore.delete('canva_access_token');
  cookieStore.delete('canva_refresh_token');
  
  return NextResponse.json({ success: true });
}
