/**
 * Language Folders API
 * Manage language folder cards for E-Learning frontend
 * GET /api/admin/language-folders - List all folders (admin)
 * GET /api/language-folders - List active folders (public)
 * POST /api/admin/language-folders - Create folder (admin)
 * PUT /api/admin/language-folders/:id - Update folder (admin)
 * DELETE /api/admin/language-folders/:id - Delete folder (admin)
 */

import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { verifyToken, TokenPayload } from '@/lib/auth';
import { ObjectId } from 'mongodb';

export async function GET(request: NextRequest) {
  try {
    const conn = await connectDB();
    const db = conn.db;

    const url = new URL(request.url);
    const isPublic = !url.pathname.includes('/admin/');

    if (isPublic) {
      // Public endpoint - return only active folders
      const folders = await db.collection('language_folders')
        .find({ isActive: true })
        .sort({ order: 1 })
        .toArray();

      return NextResponse.json({
        success: true,
        folders: folders.map(f => ({
          _id: f._id.toString(),
          code: f.code,
          name: f.name,
          flag: f.flag,
          thumbnail: f.thumbnail,
          order: f.order,
        })),
      });
    }

    // Admin endpoint - check auth
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let decoded: TokenPayload | null = null;
    try {
      decoded = verifyToken(authHeader.split(' ')[1]);
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Check superadmin
    const isSuperAdmin = decoded.role === 'superadmin' || decoded.permissions?.includes('all');
    if (!isSuperAdmin) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // List all folders
    const folders = await db.collection('language_folders')
      .find({})
      .sort({ order: 1 })
      .toArray();

    return NextResponse.json({
      success: true,
      folders: folders.map(f => ({
        _id: f._id.toString(),
        code: f.code,
        name: f.name,
        flag: f.flag,
        thumbnail: f.thumbnail,
        isActive: f.isActive,
        order: f.order,
        createdAt: f.createdAt,
        updatedAt: f.updatedAt,
      })),
    });
  } catch (error) {
    console.error('[Language Folders API Error]:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let decoded: TokenPayload | null = null;
    try {
      decoded = verifyToken(authHeader.split(' ')[1]);
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const isSuperAdmin = decoded.role === 'superadmin' || decoded.permissions?.includes('all');
    if (!isSuperAdmin) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const body = await request.json();
    const { code, name, flag, thumbnail, isActive = true, order = 0 } = body;

    if (!code || !name || !flag) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const conn = await connectDB();
    const db = conn.db;

    const result = await db.collection('language_folders').insertOne({
      code,
      name,
      flag,
      thumbnail,
      isActive,
      order,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      _id: result.insertedId.toString(),
      message: 'Language folder created',
    });
  } catch (error) {
    console.error('[Language Folders API Error]:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const conn = await connectDB();
    const db = conn.db;

    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let decoded: TokenPayload | null = null;
    try {
      decoded = verifyToken(authHeader.split(' ')[1]);
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const isSuperAdmin = decoded.role === 'superadmin' || decoded.permissions?.includes('all');
    if (!isSuperAdmin) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    }

    const body = await request.json();
    const { name, thumbnail, isActive, order } = body;

    const updateData: any = { updatedAt: new Date() };
    if (name) updateData.name = name;
    if (thumbnail !== undefined) updateData.thumbnail = thumbnail;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (order !== undefined) updateData.order = order;

    const result = await db.collection('language_folders').updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'Language folder not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Language folder updated',
    });
  } catch (error) {
    console.error('[Language Folders API Error]:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const conn = await connectDB();
    const db = conn.db;

    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let decoded: TokenPayload | null = null;
    try {
      decoded = verifyToken(authHeader.split(' ')[1]);
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const isSuperAdmin = decoded.role === 'superadmin' || decoded.permissions?.includes('all');
    if (!isSuperAdmin) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    }

    const result = await db.collection('language_folders').deleteOne(
      { _id: new ObjectId(id) }
    );

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Language folder not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Language folder deleted',
    });
  } catch (error) {
    console.error('[Language Folders API Error]:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
