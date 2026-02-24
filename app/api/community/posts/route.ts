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
    const communityId = searchParams.get('communityId')?.trim();
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = parseInt(searchParams.get('skip') || '0');
    const publicOnly = searchParams.get('public') === 'true'; // Only fetch isPublic posts

    let query: any = {
      status: 'published' // Only show published posts to public
    };

    // If requesting only public posts (for non-members)
    if (publicOnly) {
      query.isPublic = true;
    }

    // Filter by category if provided and not 'all'
    if (category !== 'all') {
      query.category = category;
    }

    // Filter by community if provided (check both communityId and metadata.targetCommunityIds)
    if (communityId) {
      query.$or = [
        { communityId },
        { 'metadata.targetCommunityIds': communityId }
      ];
    }

    // Fetch posts with pagination
    const posts = await CommunityPost.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .lean();

    // Get total count for pagination
    const total = await CommunityPost.countDocuments(query);

    return NextResponse.json(
      {
        posts,
        total,
        limit,
        skip,
        hasMore: skip + limit < total,
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Error fetching community posts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch posts' },
      { status: 500 }
    );
  }
}
