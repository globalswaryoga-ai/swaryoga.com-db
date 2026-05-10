import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';

const languageFolderSchema = new mongoose.Schema({
  language: String,
  folderName: String,
  thumbnail: String,
  displayOrder: Number,
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

function getLanguageFolderModel() {
  return mongoose.models.LanguageFolder || mongoose.model('LanguageFolder', languageFolderSchema);
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();

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
      const LanguageFolder = getLanguageFolderModel();
      const folder = await LanguageFolder.findById(id);
      if (!folder) {
        return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, data: folder });
    } else {
      const LanguageFolder = getLanguageFolderModel();
      const folders = await LanguageFolder.find({ isActive: true }).sort({ displayOrder: 1 });
      return NextResponse.json({ success: true, folders });
    }
  } catch (error: any) {
    console.error('[Language Folders API Error]:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();

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

    const LanguageFolder = getLanguageFolderModel();
    const folder = await LanguageFolder.create({
      language: code,
      folderName: name,
      thumbnail: thumbnail || flag || '',
      displayOrder: parseInt(order) || 0,
      isActive: isActive !== false,
    });

    return NextResponse.json({ success: true, data: folder }, { status: 201 });
  } catch (error: any) {
    console.error('[Language Folders POST Error]:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    await connectDB();

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

    const LanguageFolder = getLanguageFolderModel();
    const folder = await LanguageFolder.findByIdAndUpdate(
      id,
      {
        language: code,
        folderName: name,
        thumbnail: thumbnail || flag,
        displayOrder: parseInt(order) || 0,
        isActive: isActive !== false,
        updatedAt: new Date(),
      },
      { new: true }
    );

    if (!folder) {
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: folder });
  } catch (error: any) {
    console.error('[Language Folders PUT Error]:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await connectDB();

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

    const LanguageFolder = getLanguageFolderModel();
    const folder = await LanguageFolder.findByIdAndUpdate(id, { isActive: false }, { new: true });

    if (!folder) {
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Folder deleted' });
  } catch (error: any) {
    console.error('[Language Folders DELETE Error]:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
