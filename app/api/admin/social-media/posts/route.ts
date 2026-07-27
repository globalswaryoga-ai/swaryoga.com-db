import { NextRequest, NextResponse } from 'next/server';
import { connectDB, SocialMediaPost, SocialMediaAccount } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';
import { upsertMediaPostFromSocialPost } from '@/lib/socialToMediaPost';

export const dynamic = 'force-dynamic';


export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 401 });
    }
    // Social media posts are main website data - superadmin only
    if (!isSuperAdmin(decoded)) {
      return NextResponse.json({ error: 'Forbidden: Superadmin access required' }, { status: 403 });
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
    // Social media posts are main website data - superadmin only
    if (!isSuperAdmin(decoded)) {
      return NextResponse.json({ error: 'Forbidden: Superadmin access required' }, { status: 403 });
    }

    const { content, platforms, status, scheduledFor, accountIds, postType } = await request.json();

    // Validate required fields. Stories/Reels don't need caption text — an
    // image or video is enough — so require either text or media, not text alone.
    const hasMedia = Boolean(content?.images?.length) || Boolean(content?.videos?.length);
    if ((!content?.text?.trim() && !hasMedia) || !platforms || platforms.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields: content.text or media, and platforms' },
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
      postType: ['feed', 'story', 'reel'].includes(postType) ? postType : 'feed',
      accountIds: accountIds || accounts.map(a => a._id),
      status: status || (scheduledFor ? 'scheduled' : 'draft'),
      scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
      createdAt: new Date(),
    });

    await newPost.save();

    // Mirror into MediaPost so it shows on frontend /media (draft/scheduled for now).
    await upsertMediaPostFromSocialPost({
      socialPost: newPost.toObject(),
      status: (newPost.status === 'scheduled' ? 'scheduled' : 'draft') as any,
      author: decoded.username || decoded.userId || 'Admin',
    });

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
