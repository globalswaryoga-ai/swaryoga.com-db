import { NextRequest, NextResponse } from 'next/server';
import { parseAvatarScript } from '@/lib/avatarEmotionParser';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const script = String(body.script || '').trim();

    if (!script) {
      return NextResponse.json({ error: 'Script text is required' }, { status: 400 });
    }

    const parsed = parseAvatarScript(script);

    return NextResponse.json({
      success: true,
      data: parsed,
    });
  } catch (error: any) {
    console.error('Avatar script parse error:', error);
    return NextResponse.json({ error: error.message || 'Failed to parse script' }, { status: 500 });
  }
}
