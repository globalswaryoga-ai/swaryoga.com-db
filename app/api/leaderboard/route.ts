/**
 * Leaderboard API
 * GET /api/leaderboard - Get leaderboard rankings
 */

import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { getCourseEnrollment } from '@/lib/schemas/recordedCourseSchemas';
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
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const userId = decoded.id || decoded._id || decoded.userId;
    const courseFilter = request.nextUrl.searchParams.get('course') || 'all';

    const CourseEnrollment = getCourseEnrollment();
    const db = mongoose.connection.db;

    // Aggregate leaderboard data
    const pipeline: any[] = [
      {
        $match: {
          status: { $in: ['active', 'completed'] },
        },
      },
    ];

    if (courseFilter !== 'all') {
      pipeline.push({
        $match: { courseId: new mongoose.Types.ObjectId(courseFilter) },
      });
    }

    pipeline.push(
      {
        $group: {
          _id: '$userId',
          totalWatchTime: { $sum: '$totalWatchTime' },
          coursesCompleted: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] },
          },
          totalPoints: { $sum: '$progress' },
          badges: { $push: '$badges' },
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user',
        },
      },
      {
        $unwind: { path: '$user', preserveNullAndEmptyArrays: true },
      },
      {
        $sort: { totalPoints: -1, totalWatchTime: -1 },
      },
      {
        $limit: 100,
      }
    );

    const results = await CourseEnrollment.aggregate(pipeline);

    const leaderboard = results.map((entry: any, idx: number) => ({
      rank: idx + 1,
      userId: entry._id?.toString() || '',
      studentName: entry.user?.name || 'Anonymous',
      totalWatchTime: entry.totalWatchTime || 0,
      coursesCompleted: entry.coursesCompleted || 0,
      totalPoints: Math.round(entry.totalPoints || 0),
      badges: entry.badges?.flat() || [],
      isCurrentUser: entry._id?.toString() === userId,
    }));

    return NextResponse.json({
      success: true,
      data: leaderboard,
    });

  } catch (error: any) {
    console.error('[Leaderboard Error]:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
