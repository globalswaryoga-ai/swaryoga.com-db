/**
 * User Badges API
 * GET /api/user/badges - Get user's badges
 */

import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';

const AVAILABLE_BADGES = [
  {
    id: 'first-course',
    name: 'Course Pioneer',
    description: 'Complete your first course',
    icon: '🚀',
    points: 10,
    requirement: { type: 'courses_completed', value: 1 },
  },
  {
    id: 'five-courses',
    name: 'Learning Machine',
    description: 'Complete 5 courses',
    icon: '⚙️',
    points: 25,
    requirement: { type: 'courses_completed', value: 5 },
  },
  {
    id: 'streak-7',
    name: 'Week Warrior',
    description: 'Learn for 7 consecutive days',
    icon: '🔥',
    points: 15,
    requirement: { type: 'consecutive_days', value: 7 },
  },
  {
    id: 'hundred-hours',
    name: 'Century Scholar',
    description: 'Watch 100 hours of content',
    icon: '⏱️',
    points: 30,
    requirement: { type: 'watch_time', value: 360000 },
  },
  {
    id: 'perfect-quiz',
    name: 'Quiz Master',
    description: 'Score 100% on a quiz',
    icon: '💯',
    points: 20,
    requirement: { type: 'perfect_score', value: 100 },
  },
  {
    id: 'all-videos',
    name: 'Completionist',
    description: 'Watch all videos in a course',
    icon: '✨',
    points: 25,
    requirement: { type: 'course_progress', value: 100 },
  },
  {
    id: 'early-bird',
    name: 'Early Bird',
    description: 'Complete an assignment before deadline',
    icon: '🌅',
    points: 10,
    requirement: { type: 'early_submission', value: 1 },
  },
  {
    id: 'social-butterfly',
    name: 'Social Butterfly',
    description: 'Help others in the forum',
    icon: '🦋',
    points: 15,
    requirement: { type: 'forum_posts', value: 5 },
  },
];

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

    try {
      const db = mongoose.connection.db;
      if (!db) throw new Error('Database not available');

      const badgesCollection = db.collection('user_badges');
      const userBadges = await badgesCollection.find({ userId: new mongoose.Types.ObjectId(userId) }).toArray();

      const earnedBadgeIds = new Set(userBadges.map((b: any) => b.badgeId));

      const badges = AVAILABLE_BADGES.map((badge) => ({
        ...badge,
        earned: earnedBadgeIds.has(badge.id),
        earnedDate: userBadges.find((b: any) => b.badgeId === badge.id)?.earnedAt,
      }));

      return NextResponse.json({
        success: true,
        data: badges,
      });
    } catch (e) {
      // Return default badges if collection doesn't exist
      return NextResponse.json({
        success: true,
        data: AVAILABLE_BADGES.map((badge) => ({
          ...badge,
          earned: false,
        })),
      });
    }

  } catch (error: any) {
    console.error('[User Badges Error]:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
