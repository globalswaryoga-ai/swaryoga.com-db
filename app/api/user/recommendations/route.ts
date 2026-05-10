import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { verifyToken } from '@/lib/auth';

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

    // Mock recommendations based on user interests
    const recommendations = [
      {
        id: '1',
        title: 'Advanced Yoga Techniques',
        description: 'Master advanced asanas and breathing techniques',
        instructor: 'Expert Instructor',
        difficulty: 'Intermediate',
        matchScore: 92,
        reason: 'Based on your completed beginner courses',
      },
      {
        id: '2',
        title: 'Meditation & Mindfulness',
        description: 'Develop inner peace and mental clarity',
        instructor: 'Master Teacher',
        difficulty: 'Beginner',
        matchScore: 87,
        reason: 'Popular with students in your skill level',
      },
      {
        id: '3',
        title: 'Pranayama Mastery',
        description: 'Learn traditional breathing practices',
        instructor: 'Certified Coach',
        difficulty: 'Intermediate',
        matchScore: 84,
        reason: 'Complements your current learning path',
      },
    ];

    return NextResponse.json({
      success: true,
      data: recommendations,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
