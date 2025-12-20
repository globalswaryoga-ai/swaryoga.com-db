import { NextRequest, NextResponse } from 'next/server';
import { connectDB, SocialMediaAccount } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { encryptCredential, decryptCredential } from '@/lib/encryption';

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 401 });
    }

    // Connect to database
    await connectDB();

    // Fetch all connected social media accounts
    const accounts = await SocialMediaAccount.find({ isConnected: true })
      .select('-accessToken -refreshToken') // Don't return encrypted tokens to client
      .lean();

    return NextResponse.json({
      success: true,
      data: accounts,
    });
  } catch (error) {
    console.error('Error fetching social media accounts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch accounts' },
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

    const { platform, accountName, accountHandle, accountId, accountEmail, accessToken, refreshToken, metadata } = await request.json();

    // Allow accountId to be omitted by the setup UI; use handle as a stable identifier.
    const resolvedAccountId = (accountId || accountHandle || '').toString().trim();

    // Validate required fields
    if (!platform || !accountName || !accountHandle || !resolvedAccountId || !accessToken) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    await connectDB();

    // Check if account already exists
    const existingAccount = await SocialMediaAccount.findOne({
      platform,
      accountId: resolvedAccountId,
    });

    if (existingAccount) {
      return NextResponse.json(
        { error: 'Account already connected' },
        { status: 400 }
      );
    }

    // Encrypt sensitive tokens
    const encryptedAccessToken = encryptCredential(accessToken);
    const encryptedRefreshToken = refreshToken ? encryptCredential(refreshToken) : '';

    // Create new social media account
    const newAccount = new SocialMediaAccount({
      platform,
      accountName,
      accountHandle,
      accountId: resolvedAccountId,
      accountEmail,
      accessToken: encryptedAccessToken,
      refreshToken: encryptedRefreshToken,
      metadata: metadata || {},
      isConnected: true,
      connectedAt: new Date(),
    });

    await newAccount.save();

    return NextResponse.json(
      {
        success: true,
        message: 'Account connected successfully',
        data: {
          _id: newAccount._id,
          platform: newAccount.platform,
          accountName: newAccount.accountName,
          accountHandle: newAccount.accountHandle,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error connecting social media account:', error);
    return NextResponse.json(
      { error: 'Failed to connect account' },
      { status: 500 }
    );
  }
}
