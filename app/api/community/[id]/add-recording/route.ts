import { NextRequest, NextResponse } from 'next/server';
import { connectDB, getCommunity, getCommunityVideo, SocialMediaAccount } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { decryptCredential } from '@/lib/encryption';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';

/**
 * POST /api/community/[id]/add-recording
 * Admin adds a YouTube recording to a community.
 *
 * [id] may be the community ObjectId (sent by the admin UI) or the slug
 * (e.g. 'global'). The video is stored in CommunityVideo with the SLUG as
 * communityId — that is the convention used by communityvideos /
 * communitymembers and by the member-facing /api/community/recordings list
 * and /api/community/videos/embed player.
 *
 * YouTube privacy: members can only watch Unlisted (or Public) videos.
 * Private videos show "Video unavailable" for everyone except accounts the
 * owner invited — no app code can bypass that. So after saving we check the
 * video's privacy via the connected YouTube account and auto-switch
 * Private → Unlisted when possible.
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

    // Check/fix the video's YouTube privacy (best-effort)
    const privacy = await ensureVideoWatchable(youtubeVideoId);

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
        message: `ℹ️ This video is already added to ${community.name}. ${privacy.message}`,
        privacy,
      });
    }

    const video = await CommunityVideo.create({
      communityId: communitySlug,
      title,
      description: description || '',
      videoSource: 'youtube',
      youtubeVideoId,
      youtubeUnlisted: true,
      thumbnailUrl: thumbnailUrl || `https://img.youtube.com/vi/${youtubeVideoId}/maxresdefault.jpg`,
      uploadedBy: decoded.userId || 'admin',
      isShareable: false,
      isCommon: true, // visible to all community members (no batch restriction)
      source: 'youtube_recording',
      recordingType: 'other',
      tags: ['recording'],
      createdAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      data: video,
      message: `✅ YouTube video added to ${community.name}. ${privacy.message}`,
      privacy,
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

/**
 * Check the video's privacy on the connected YouTube channel and
 * auto-switch Private → Unlisted (members can't watch Private videos).
 * Never throws — the recording is saved regardless; this only shapes the
 * warning/info message returned to the admin.
 */
async function ensureVideoWatchable(
  youtubeVideoId: string
): Promise<{ status: string; changed: boolean; message: string }> {
  try {
    const account: any = await SocialMediaAccount.findOne({ platform: 'youtube' }).lean();
    if (!account?.refreshToken) {
      return {
        status: 'unknown',
        changed: false,
        message: '⚠️ Could not verify YouTube privacy (no connected YouTube account). Make sure the video is set to UNLISTED in YouTube Studio, otherwise members will see "Video unavailable".',
      };
    }

    const refreshToken = decryptCredential(String(account.refreshToken));
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      return {
        status: 'unknown',
        changed: false,
        message: '⚠️ Could not verify YouTube privacy (OAuth not configured). Make sure the video is set to UNLISTED in YouTube Studio.',
      };
    }

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });
    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || !tokenData.access_token) {
      throw new Error(tokenData.error_description || tokenData.error || 'token refresh failed');
    }
    const accessToken = tokenData.access_token;

    const listRes = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=status&id=${encodeURIComponent(youtubeVideoId)}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const listData = await listRes.json();
    const item = listData?.items?.[0];

    if (!item) {
      return {
        status: 'not_found',
        changed: false,
        message: '⚠️ This video was not found on the connected YouTube channel (Swar Yoga and Naturopathy), so its privacy could not be verified. If it is PRIVATE, members will see "Video unavailable" — set it to UNLISTED in YouTube Studio.',
      };
    }

    const privacyStatus = item.status?.privacyStatus;

    if (privacyStatus === 'private') {
      // videos.update with part=status resets unspecified status fields,
      // so send back the full status object with only privacyStatus changed
      const updatedStatus = { ...item.status, privacyStatus: 'unlisted' };
      const updateRes = await fetch(
        'https://www.googleapis.com/youtube/v3/videos?part=status',
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ id: youtubeVideoId, status: updatedStatus }),
        }
      );
      if (updateRes.ok) {
        return {
          status: 'unlisted',
          changed: true,
          message: '🔄 The video was PRIVATE — it has been automatically switched to UNLISTED so community members can watch it. (Unlisted videos stay hidden from your channel and from YouTube search; only the community player shows them.)',
        };
      }
      const errData = await updateRes.json().catch(() => ({}));
      console.error('[Add Recording] videos.update failed:', errData);
      return {
        status: 'private',
        changed: false,
        message: '⚠️ The video is PRIVATE and could not be switched automatically. Members will see "Video unavailable" until you change it to UNLISTED in YouTube Studio.',
      };
    }

    if (privacyStatus === 'unlisted' || privacyStatus === 'public') {
      return {
        status: privacyStatus,
        changed: false,
        message: `✅ Video privacy is ${privacyStatus.toUpperCase()} — members can watch it.`,
      };
    }

    return {
      status: String(privacyStatus || 'unknown'),
      changed: false,
      message: '⚠️ Could not determine the video privacy. If members see "Video unavailable", set it to UNLISTED in YouTube Studio.',
    };
  } catch (err: any) {
    console.error('[Add Recording] privacy check failed:', err?.message || err);
    return {
      status: 'unknown',
      changed: false,
      message: '⚠️ YouTube privacy check failed. Make sure the video is set to UNLISTED in YouTube Studio, otherwise members will see "Video unavailable".',
    };
  }
}
