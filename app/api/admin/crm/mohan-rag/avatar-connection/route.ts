import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';
import { getMohanRagAvatarConfig, saveMohanRagAvatarConfig } from '@/lib/mohanRag/avatarConfig';

export const dynamic = 'force-dynamic';

function authorized(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || '';
    const decoded = verifyToken(token);
    return decoded && isSuperAdmin(decoded, request) ? decoded : null;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: 'Super admin access required' }, { status: 403 });
  try {
    const config = await getMohanRagAvatarConfig();
    const hasApiKey = Boolean(process.env.REPLICATE_API_TOKEN);
    const connected = Boolean(config?.authorized && config.avatarId && config.voiceId && config.supportedLanguages.length && hasApiKey);
    return NextResponse.json({
      success: true,
      connected,
      status: connected ? 'ready' : 'setup_required',
      config,
      hasApiKey,
      message: connected ? 'Clone is ready.' : 'Run avatar training from the studio after uploading vault videos, and confirm REPLICATE_API_TOKEN is set on the server.',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to read active clone';
    return NextResponse.json({ error: message }, { status: 503 });
  }
}

export async function PUT(request: NextRequest) {
  const admin = authorized(request);
  if (!admin) return NextResponse.json({ error: 'Super admin access required' }, { status: 403 });
  try {
    const body = await request.json();
    const avatarId = String(body?.avatarId || '').trim();
    const voiceId = String(body?.voiceId || '').trim();
    const avatarType = body?.avatarType === 'avatar' ? 'avatar' : 'talking_photo';
    const avatarLabel = String(body?.avatarLabel || 'Mohan Sir clone').trim().slice(0, 120);
    const supportedLanguages = (Array.isArray(body?.supportedLanguages)
      ? Array.from(new Set(body.supportedLanguages.map(String).filter((language: string) => ['hi', 'mr', 'en'].includes(language))))
      : []) as string[];
    if (!avatarId || !voiceId) return NextResponse.json({ error: 'Authorized avatar ID and cloned voice ID are required.' }, { status: 400 });
    if (avatarId.length > 200 || voiceId.length > 200) return NextResponse.json({ error: 'Avatar or voice ID is too long.' }, { status: 400 });
    if (!supportedLanguages.length) return NextResponse.json({ error: 'Select at least one language verified for this cloned voice.' }, { status: 400 });
    if (body?.authorized !== true) return NextResponse.json({ error: 'Confirm that these are your authorized avatar and voice assets.' }, { status: 400 });
    const updatedBy = String((admin as any).userId || (admin as any).username || 'admin');
    const config = await saveMohanRagAvatarConfig({ avatarId, voiceId, avatarType, avatarLabel, supportedLanguages, authorized: true, updatedBy });
    return NextResponse.json({ success: true, config, hasApiKey: Boolean(process.env.HEYGEN_API_KEY) });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not save avatar connection';
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
