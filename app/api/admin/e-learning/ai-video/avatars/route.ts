import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';
import { listAiAvatars, createAiAvatar, deleteAiAvatar } from '@/lib/bunnyAvatarRepository';

export const dynamic = 'force-dynamic';

function checkAdmin(decoded: any): boolean {
  if (!decoded) return false;
  return Boolean(decoded.isAdmin || isSuperAdmin(decoded));
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace(/^Bearer\s+/i, '');
    const decoded = verifyToken(token);
    if (!checkAdmin(decoded)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || undefined;

    const avatars = await listAiAvatars(type);
    return NextResponse.json({ success: true, data: avatars });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to list avatars' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace(/^Bearer\s+/i, '');
    const decoded = verifyToken(token);
    if (!checkAdmin(decoded)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { name, avatarType, mediaUrl, thumbnailUrl, language, notes } = body;

    if (!name?.trim() || !avatarType || !mediaUrl?.trim()) {
      return NextResponse.json({ error: 'Name, avatarType, and mediaUrl are required' }, { status: 400 });
    }

    const created = await createAiAvatar({
      name: name.trim(),
      avatarType,
      mediaUrl: mediaUrl.trim(),
      thumbnailUrl: thumbnailUrl?.trim(),
      language: language || 'hi',
      notes: notes?.trim(),
      createdBy: decoded?.username || decoded?.userId || 'admin',
    });

    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to create avatar preset' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace(/^Bearer\s+/i, '');
    const decoded = verifyToken(token);
    if (!checkAdmin(decoded)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Avatar ID is required' }, { status: 400 });
    }

    const deleted = await deleteAiAvatar(id);
    return NextResponse.json({ success: deleted });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to delete avatar' }, { status: 500 });
  }
}
