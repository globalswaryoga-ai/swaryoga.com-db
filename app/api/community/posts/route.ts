import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { CommunityPost } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const category = (searchParams.get('category') || 'all').trim();
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = parseInt(searchParams.get('skip') || '0');

    let query: any = {};

    // Filter by category if provided and not 'all'
    if (category !== 'all') {
      query.category = category;
    }

    // Fetch posts with pagination
    const posts = await CommunityPost.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .lean();

    // Get total count for pagination
    const total = await CommunityPost.countDocuments(query);

    return NextResponse.json({
      success: true,
      data: {
        posts,
        total,
        limit,
        skip,
        hasMore: skip + limit < total,
      },
    });
  } catch (error) {
    console.error('Error fetching community posts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch posts' },
      { status: 500 }
    );
  }
}
