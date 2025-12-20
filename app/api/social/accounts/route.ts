import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { SocialAccount } from '@/lib/schemas/socialMediaSchemas';
import { verifyToken } from '@/lib/auth';

/**
 * POST /api/social/connect
 * Connect a social media platform account with OAuth token
 * Handles: Facebook, Instagram, YouTube, LinkedIn, Twitter, WhatsApp
 */
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token || "");

    if (!decoded?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { platform, account_name, account_handle, access_token, refresh_token } =
      await request.json();

    // Validate required fields
    const required = ['platform', 'account_name', 'account_handle', 'access_token'];
    const missing = required.filter((field) => !eval(field));
    if (missing.length > 0) {
      return NextResponse.json(
        { error: `Missing: ${missing.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate platform
    const validPlatforms = [
      'facebook',
      'instagram',
      'youtube',
      'linkedin',
      'twitter',
      'whatsapp',
      'community',
    ];
    if (!validPlatforms.includes(platform)) {
      return NextResponse.json(
        { error: `Invalid platform. Must be: ${validPlatforms.join(', ')}` },
        { status: 400 }
      );
    }

    // Check if already connected
    const existing = await SocialAccount.findOne({
      user_id: decoded.userId,
      platform,
    });

    if (existing) {
      // Update existing connection
      existing.access_token = access_token;
      existing.refresh_token = refresh_token || existing.refresh_token;
      existing.is_connected = true;
      existing.connection_error = undefined;
      existing.last_verified = new Date();
      await existing.save();

      return NextResponse.json(
        {
          success: true,
          data: existing,
          message: 'Account updated successfully',
        },
        { status: 200 }
      );
    }

    // Create new connection
    const socialAccount = await SocialAccount.create({
      user_id: decoded.userId,
      platform,
      account_name,
      account_handle,
      access_token,
      refresh_token,
      is_connected: true,
    });

    return NextResponse.json(
      {
        success: true,
        data: socialAccount,
        message: `${platform} account connected successfully`,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('POST /api/social/connect error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * GET /api/social/accounts
 * List all connected social accounts for current user
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token || "");

    if (!decoded?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const accounts = await SocialAccount.find({
      user_id: decoded.userId,
    })
      .select('-access_token -refresh_token') // Don't expose tokens
      .sort({ connected_at: -1 })
      .lean();

    return NextResponse.json(
      {
        success: true,
        data: accounts,
        total: accounts.length,
      },
      { status: 200, headers: { 'Cache-Control': 'private, max-age=300' } }
    );
  } catch (error: any) {
    console.error('GET /api/social/accounts error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
