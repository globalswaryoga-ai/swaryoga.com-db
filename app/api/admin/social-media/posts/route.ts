import { NextRequest, NextResponse } from 'next/server';
import { connectDB, SocialMediaPost, SocialMediaAccount } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 401 });
    }

    await connectDB();

    // Fetch recent posts (published and scheduled)
    const posts = await SocialMediaPost.find({
      status: { $in: ['published', 'scheduled', 'draft', 'failed'] },
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return NextResponse.json({
      success: true,
      data: posts,
    });
  } catch (error) {
    console.error('Error fetching posts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch posts' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 401 });
    }

    const { content, platforms, status, scheduledFor, accountIds } = await request.json();

    // Validate required fields
    if (!content?.text || !platforms || platforms.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields: content.text and platforms' },
        { status: 400 }
      );
    }

    await connectDB();

    // Verify all accounts exist and are connected
    const accounts = await SocialMediaAccount.find({
      platform: { $in: platforms },
      isConnected: true,
    });

    if (accounts.length === 0) {
      return NextResponse.json(
        { error: 'No connected accounts found for selected platforms' },
        { status: 400 }
      );
    }

    // Create new post
    const newPost = new SocialMediaPost({
      content,
      platforms,
      accountIds: accountIds || accounts.map(a => a._id),
      status: status || (scheduledFor ? 'scheduled' : 'draft'),
      scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
      createdAt: new Date(),
    });

    await newPost.save();

    return NextResponse.json(
      {
        success: true,
        message: 'Post created successfully',
        data: newPost,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating post:', error);
    return NextResponse.json(
      { error: 'Failed to create post' },
      { status: 500 }
    );
  }
}
