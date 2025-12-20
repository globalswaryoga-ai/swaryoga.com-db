import { NextRequest, NextResponse } from 'next/server';
import { connectDB, SocialMediaAccount } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import mongoose from 'mongoose';

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

    const { id } = params;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid account ID' }, { status: 400 });
    }

    // Mark account as disconnected instead of deleting
    const result = await SocialMediaAccount.findByIdAndUpdate(
      id,
      {
        isConnected: false,
        disconnectedAt: new Date(),
      },
      { new: true }
    );

    if (!result) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
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
