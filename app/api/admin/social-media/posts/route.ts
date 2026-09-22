import { NextRequest, NextResponse } from 'next/server';
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

    let posts: any[] = [];
    try {
      const { bunnyExecute } = await import('@/lib/bunnyDatabase');
      const res = await bunnyExecute({
        sql: "SELECT document_id as id, document_json FROM mongo_documents WHERE collection_name = 'socialmediaposts'"
      });
      for (const row of res.rows) {
        try {
          const parsed = JSON.parse(String(row.document_json || '{}'));
          if (['published', 'scheduled', 'draft', 'failed'].includes(parsed.status)) {
            if (!parsed._id) parsed._id = String(row.id);
            posts.push(parsed);
          }
        } catch {}
      }
      posts.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      posts = posts.slice(0, 50);
    } catch (dbErr: any) {
      console.warn('[social-media/posts] Bunny DB unavailable, returning empty list:', dbErr.message);
    }

    return NextResponse.json({ success: true, data: posts });
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

    const { bunnyExecute } = await import('@/lib/bunnyDatabase');

    // Verify all accounts exist and are connected
    const accountsRes = await bunnyExecute({
      sql: "SELECT document_id as id, document_json FROM mongo_documents WHERE collection_name = 'socialmediaaccounts'"
    });
    const connectedAccounts = [];
    for (const row of accountsRes.rows) {
      try {
        const parsed = JSON.parse(String(row.document_json || '{}'));
        if (parsed.isConnected && platforms.includes(parsed.platform)) {
          if (!parsed._id) parsed._id = String(row.id);
          connectedAccounts.push(parsed);
        }
      } catch {}
    }

    if (connectedAccounts.length === 0) {
      return NextResponse.json(
        { error: 'No connected accounts found for selected platforms' },
        { status: 400 }
      );
    }

    const crypto = await import('crypto');
    const newId = crypto.randomUUID();

    // Create new post
    const newPost = {
      _id: newId,
      content,
      platforms,
      postType: ['feed', 'story', 'reel'].includes(postType) ? postType : 'feed',
      accountIds: accountIds || connectedAccounts.map(a => a._id),
      status: status || (scheduledFor ? 'scheduled' : 'draft'),
      scheduledFor: scheduledFor ? new Date(scheduledFor).toISOString() : null,
      createdAt: new Date().toISOString(),
    };

    await bunnyExecute({
      sql: "INSERT INTO mongo_documents (document_id, collection_name, document_json, created_at, updated_at) VALUES (?, 'socialmediaposts', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
      args: [newId, JSON.stringify(newPost)]
    });

    // Mirror into MediaPost so it shows on frontend /media (draft/scheduled for now).
    await upsertMediaPostFromSocialPost({
      socialPost: newPost as any,
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
