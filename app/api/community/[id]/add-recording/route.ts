import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import {
  initCommunitySchema,
  getCommunity,
  saveCommunityVideo,
} from '@/lib/bunnyCommunityRepository';
import { bunnyExecute } from '@/lib/bunnyDatabase';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);

    if (!decoded?.isAdmin) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      title,
      description,
      youtubeVideoId,
      videoUrl,
      thumbnailUrl,
      youtubeEmail = 'swarsakshi9@gmail.com',
    } = body;

    if (!title || !youtubeVideoId || !videoUrl) {
      return NextResponse.json(
        { error: 'Missing required fields: title, youtubeVideoId, videoUrl' },
        { status: 400 }
      );
    }

    await initCommunitySchema();

    // Resolve community by id or slug
    const community = await getCommunity(params.id);
    if (!community) {
      return NextResponse.json(
        { error: 'Community not found' },
        { status: 404 }
      );
    }

    const communitySlug = community.slug || community.id;

    // Check duplicate
    const existingRes = await bunnyExecute({
      sql: `SELECT * FROM community_videos_sql 
            WHERE community_id = ? AND json_extract(raw_doc_json, '$.youtubeVideoId') = ? 
            LIMIT 1`,
      args: [communitySlug, youtubeVideoId],
    });

    if (existingRes.rows.length > 0) {
      return NextResponse.json({
        success: true,
        data: existingRes.rows[0],
        message: `ℹ️ This video is already added to ${community.name}.`,
      });
    }

    const thumb = thumbnailUrl || `https://img.youtube.com/vi/${youtubeVideoId}/maxresdefault.jpg`;
    const video = await saveCommunityVideo({
      communityId: communitySlug,
      title,
      description: description || '',
      s3Key: `youtube:${youtubeVideoId}`,
      thumbnailUrl: thumb,
      uploadedBy: String(decoded.userId || 'admin'),
      isShareable: false,
    });

    // Update rawDoc with youtubeVideoId and videoSource
    await bunnyExecute({
      sql: `UPDATE community_videos_sql 
            SET raw_doc_json = json_set(raw_doc_json, '$.youtubeVideoId', ?, '$.videoSource', 'youtube') 
            WHERE id = ?`,
      args: [youtubeVideoId, video.id],
    });

    return NextResponse.json({
      success: true,
      data: video,
      message: `✅ YouTube video added to ${community.name}. Community members can now watch via ${youtubeEmail}'s YouTube account.`,
      details: {
        video: title,
        owner: youtubeEmail,
        community: community.name,
        communityId: communitySlug,
        verified: true,
      },
    });
  } catch (error: any) {
    console.error('[Add Recording]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
