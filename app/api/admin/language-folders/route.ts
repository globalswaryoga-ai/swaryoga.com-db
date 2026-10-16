import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';
import {
  listLanguageFolders,
  getLanguageFolder,
  saveLanguageFolder,
  deleteLanguageFolder,
} from '@/lib/bunnyCourseRepository';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(authHeader.split(' ')[1]);
    if (!decoded || !isSuperAdmin(decoded)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const id = request.nextUrl.searchParams.get('id');

    if (id) {
      const folder = await getLanguageFolder(id);
      if (!folder) {
        return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
      }
      return NextResponse.json({
        success: true,
        data: {
          ...folder,
          folderName: folder.name,
          language: folder.code,
          displayOrder: folder.order,
        },
      });
    } else {
      const folders = await listLanguageFolders(true);
      const mappedFolders = folders.map((f) => ({
        _id: f.id,
        id: f.id,
        code: f.code,
        name: f.name,
        flag: f.flag,
        thumbnail: f.thumbnail,
        isActive: f.isActive,
        order: f.order,
        folderName: f.name,
        language: f.code,
        displayOrder: f.order,
      }));

      return NextResponse.json({ success: true, folders: mappedFolders });
    }
  } catch (error: any) {
    console.error('[Admin Language Folders API Error]:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(authHeader.split(' ')[1]);
    if (!decoded || !isSuperAdmin(decoded)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { code, name, flag, thumbnail, order, isActive } = body;

    if (!code || !name) {
      return NextResponse.json({ error: 'Language code and name required' }, { status: 400 });
    }

    const folder = await saveLanguageFolder({
      code,
      name,
      flag,
      thumbnail,
      order: parseInt(order) || 1,
      isActive: isActive !== false,
    });

    return NextResponse.json({ success: true, data: folder }, { status: 201 });
  } catch (error: any) {
    console.error('[Admin Language Folders POST Error]:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(authHeader.split(' ')[1]);
    if (!decoded || !isSuperAdmin(decoded)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const id = request.nextUrl.searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'ID required' }, { status: 400 });
    }

    const body = await request.json();
    const { code, name, flag, thumbnail, order, isActive } = body;

    const folder = await saveLanguageFolder({
      id,
      code: code || '',
      name: name || '',
      flag: flag || '',
      thumbnail: thumbnail || flag || '',
      order: parseInt(order) || 1,
      isActive: isActive !== false,
    });

    return NextResponse.json({ success: true, data: folder });
  } catch (error: any) {
    console.error('[Admin Language Folders PUT Error]:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(authHeader.split(' ')[1]);
    if (!decoded || !isSuperAdmin(decoded)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const id = request.nextUrl.searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'ID required' }, { status: 400 });
    }

    const deleted = await deleteLanguageFolder(id);
    if (!deleted) {
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Folder deleted' });
  } catch (error: any) {
    console.error('[Admin Language Folders DELETE Error]:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
