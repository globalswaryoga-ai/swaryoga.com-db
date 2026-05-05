import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';

/**
 * POST /api/community/[id]/add-recording
 * Admin adds a YouTube private recording to a community
 * REQUIRES: Email verification (swarsakshi9999@gmail.com must be verified)
 *
 * Body: {
 *   title: "Recording Title",
 *   description: "Description",
 *   videoSource: "youtube",
 *   youtubeVideoId: "ABC123...",
 *   videoUrl: "https://www.youtube.com/watch?v=ABC123...",
 *   youtubeEmail: "swarsakshi9999@gmail.com", // YouTube account email
 *   isPublic: false,
 *   recordingType: "private_youtube"
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
      videoSource,
      youtubeVideoId,
      videoUrl,
      youtubeEmail = 'swarsakshi9999@gmail.com',
      isPublic = false,
      recordingType = 'private_youtube',
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
      email: youtubeEmail.toLowerCase(),
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

    // Get or create Recording model
    const recordingSchema = new mongoose.Schema({
      title: String,
      description: String,
      thumbnailUrl: String,
      videoUrl: String,
      videoSource: String,
      youtubeVideoId: String,
      bunnyLibraryId: String,
      bunnyVideoId: String,
      duration: Number,
      recordingType: String,
      zoomMeetingId: String,
      recordedAt: Date,
      createdAt: { type: Date, default: Date.now },
      communityId: String,
      communityName: String,
      isPublic: Boolean,
      views: { type: Number, default: 0 },
      likes: [String],
      comments: [
        {
          userId: String,
          userName: String,
          text: String,
          createdAt: { type: Date, default: Date.now },
        },
      ],
      uploadedBy: String, // Admin who added it
    });

    const Recording = mongoose.models.Recording || mongoose.model('Recording', recordingSchema);

    // Check if community exists
    const Community = mongoose.models.Community || mongoose.model('Community', new mongoose.Schema({}));
    const community = await Community.findById(params.id).lean();

    if (!community) {
      return NextResponse.json(
        { error: 'Community not found' },
        { status: 404 }
      );
    }

    // Create recording with verified email
    const recording = await Recording.create({
      title,
      description: description || '',
      videoSource: videoSource || 'youtube',
      youtubeVideoId,
      videoUrl,
      youtubeEmail, // Store verified email
      recordingType,
      communityId: params.id,
      communityName: community.name || '',
      isPublic,
      uploadedBy: decoded.userId || 'admin',
      thumbnailUrl: `https://img.youtube.com/vi/${youtubeVideoId}/maxresdefault.jpg`,
      createdAt: new Date(),
      verifiedAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      data: recording,
      message: `✅ YouTube private video added to ${community.name}`,
      details: {
        video: title,
        owner: youtubeEmail,
        community: community.name,
        verified: true,
      },
    });
  } catch (error: any) {
    console.error('[Add Recording]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
