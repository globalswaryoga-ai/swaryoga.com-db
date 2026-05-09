/**
 * Public Language Folders API
 * GET /api/language-folders - List active folders (public, no auth required)
 */

import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const conn = await connectDB();
    const db = conn.db;

    // Ensure we're using the correct database
    if (!db.collection) {
      throw new Error('Database connection failed');
    }

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
  } catch (error) {
    console.error('[Language Folders Public API Error]:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
