import { NextRequest, NextResponse } from 'next/server';
import { connectDB, SocialMediaPost } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    // Fetch published posts only
    const posts = await SocialMediaPost.find({ status: 'published' })
      .sort({ publishedAt: -1 })
      .limit(100)
      .lean();

    return NextResponse.json({
      success: true,
      data: posts,
    });
  } catch (error) {
    console.error('Error fetching social media posts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch posts' },
      { status: 500 }
    );
  }
}
