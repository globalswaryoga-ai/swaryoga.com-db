import { NextRequest, NextResponse } from 'next/server';
import { connectDB, SocialMediaAccount } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import mongoose from 'mongoose';
import { buildSocialMediaScopeFilter, resolveSocialMediaScope } from '@/lib/socialMediaScope';

export const dynamic = 'force-dynamic';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify authentication
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 401 });
    }

    await connectDB();
    const scope = await resolveSocialMediaScope(decoded);

    const { id } = params;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid account ID' }, { status: 400 });
    }

    // Mark account as disconnected instead of deleting
    const existing = await SocialMediaAccount.findOne({
      _id: id,
      ...buildSocialMediaScopeFilter(scope),
    });

    if (!existing) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    const result = await SocialMediaAccount.findByIdAndUpdate(
      existing._id,
      {
        isConnected: false,
        disconnectedAt: new Date(),
      },
      { new: true }
    );

    if (!result) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    if (result.platform === 'facebook') {
      await SocialMediaAccount.updateMany(
        {
          ...buildSocialMediaScopeFilter(scope),
          platform: 'instagram',
          accountId: { $ne: null },
          'metadata.autoConnectedVia': 'facebook',
          'metadata.linkedPageId': result.accountId,
          isConnected: true,
        },
        {
          $set: {
            isConnected: false,
            disconnectedAt: new Date(),
            updatedAt: new Date(),
          },
        }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Account disconnected successfully',
    });
  } catch (error) {
    console.error('Error disconnecting account:', error);
    return NextResponse.json(
      { error: 'Failed to disconnect account' },
      { status: 500 }
    );
  }
}
