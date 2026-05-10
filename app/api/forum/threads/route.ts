import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const decoded = verifyToken(authHeader.split(' ')[1]);
    if (!decoded) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    try {
      const db = mongoose.connection.db;
      const threadsCollection = db?.collection('forum_threads');
      const threads = await threadsCollection
        ?.find({})
        .sort({ lastReplyAt: -1 })
        .limit(50)
        .toArray();

      return NextResponse.json({
        success: true,
        data: threads?.map((t: any) => ({
          id: t._id?.toString(),
          courseId: t.courseId?.toString(),
          courseTitle: t.courseTitle || 'General',
          title: t.title,
          description: t.description,
          author: t.author,
          authorId: t.userId?.toString(),
          createdAt: t.createdAt,
          replies: t.replies || 0,
          views: t.views || 0,
          isAnswered: t.isAnswered || false,
          tags: t.tags || [],
          lastReplyAt: t.lastReplyAt || t.createdAt,
        })) || [],
      });
    } catch (e) {
      return NextResponse.json({ success: true, data: [] });
    }
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
