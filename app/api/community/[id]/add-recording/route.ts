import { NextRequest, NextResponse } from 'next/server';
import { connectDB, getCommunity, getCommunityVideo } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';

/**
 * POST /api/community/[id]/add-recording
 * Admin adds a YouTube private video to a community.
 *
 * [id] may be the community ObjectId (sent by the admin UI) or the slug
 * (e.g. 'global'). The video is stored in CommunityVideo with the SLUG as
 * communityId — that is the convention used by communityvideos /
 * communitymembers and by the member-facing /api/community/recordings list
 * and /api/community/videos/embed player.
 *
 * The admin workflow:
 * 1. Upload to YouTube as PRIVATE (from swarsakshi9@gmail.com account)
 * 2. In YouTube Studio, Share → invite swarsakshi9@gmail.com as viewer
 * 3. Copy the video URL
 * 4. Paste here
 *
 * YouTube enforces: only invited emails can watch. No download, forward, or share.
 * Admin earns YouTube ad revenue. No CDN fees.
 *
 * Body: {
 *   title, description?, youtubeVideoId, videoUrl,
 *   youtubeEmail?  (defaults to swarsakshi9@gmail.com — must be verified),
 * }
 */
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

    await connectDB();

    // CHECK EMAIL VERIFICATION
    const youtubeEmailVerificationSchema = new mongoose.Schema({
      email: { type: String, required: true, unique: true },
      isVerified: { type: Boolean, default: false },
    });

    const YoutubeEmailVerification =
      mongoose.models.YoutubeEmailVerification ||
      mongoose.model('YoutubeEmailVerification', youtubeEmailVerificationSchema);

    const emailRecord = await YoutubeEmailVerification.findOne({
      email: String(youtubeEmail).toLowerCase(),
    });

    if (!emailRecord?.isVerified) {
      return NextResponse.json(
        {
          error: `❌ Email not verified: ${youtubeEmail}`,
          message: 'Please verify the YouTube email before adding videos',
          action: 'verify-email',
          verifyUrl: '/admin/community/verify-youtube-email',
        },
        { status: 403 }
      );
    }

    // Resolve community by ObjectId (what the admin UI sends) or slug
    const Community = getCommunity();
    let community: any = null;
    if (mongoose.Types.ObjectId.isValid(params.id)) {
      community = await Community.findById(params.id).lean();
    }
    if (!community) {
      community = await Community.findOne({ id: params.id }).lean();
    }

    if (!community) {
      return NextResponse.json(
        { error: 'Community not found' },
        { status: 404 }
      );
    }

    // communityvideos/communitymembers use the slug, not the ObjectId
    const communitySlug: string = community.id || String(community._id);

    const CommunityVideo = getCommunityVideo();

    // Don't create duplicates if the admin retries the same video
    const existing: any = await CommunityVideo.findOne({
      communityId: communitySlug,
      youtubeVideoId,
    }).lean();

    if (existing) {
      return NextResponse.json({
        success: true,
        data: existing,
        message: `ℹ️ This video is already added to ${community.name}.`,
      });
    }

    const video = await CommunityVideo.create({
      communityId: communitySlug,
      title,
      description: description || '',
      videoSource: 'youtube',
      youtubeVideoId,
      youtubeUnlisted: false,
      thumbnailUrl: thumbnailUrl || `https://img.youtube.com/vi/${youtubeVideoId}/maxresdefault.jpg`,
      uploadedBy: decoded.userId || 'admin',
      isShareable: false,
      isCommon: true,
      source: 'youtube_recording',
      recordingType: 'other',
      tags: ['recording'],
      createdAt: new Date(),
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
