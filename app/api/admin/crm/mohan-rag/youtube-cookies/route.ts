import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';
import { resolveYouTubeCookiesPath, saveYouTubeCookies, removeYouTubeCookies } from '@/lib/mohanRag/youtubeCookiesHelper';

export const dynamic = 'force-dynamic';

function requireAdmin(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || '';
    const decoded = verifyToken(token);
    return decoded && isSuperAdmin(decoded, request) ? decoded : null;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const admin = requireAdmin(request);
  if (!admin) return NextResponse.json({ error: 'Super admin access required' }, { status: 403 });

  const cookiesPath = await resolveYouTubeCookiesPath();
  return NextResponse.json({
    success: true,
    hasCookies: Boolean(cookiesPath),
    cookiesPath: cookiesPath || null,
  });
}

export async function POST(request: NextRequest) {
  const admin = requireAdmin(request);
  if (!admin) return NextResponse.json({ error: 'Super admin access required' }, { status: 403 });

  try {
    const body = await request.json();
    const cookies = String(body?.cookies || '').trim();

    if (!cookies || cookies.length < 50) {
      return NextResponse.json({ error: 'Please provide valid Netscape-format cookies.txt content.' }, { status: 400 });
    }

    const savedPath = await saveYouTubeCookies(cookies);
    return NextResponse.json({
      success: true,
      message: 'YouTube authorized session cookies successfully saved and activated on server!',
      savedPath,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to save cookies';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const admin = requireAdmin(request);
  if (!admin) return NextResponse.json({ error: 'Super admin access required' }, { status: 403 });

  await removeYouTubeCookies();
  return NextResponse.json({
    success: true,
    message: 'YouTube cookies file removed. Worker will operate in public mode.',
  });
}
