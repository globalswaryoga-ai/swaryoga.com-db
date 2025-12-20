import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { SocialAccount, Post } from '@/lib/schemas/socialMediaSchemas';
import { verifyToken } from '@/lib/auth';
import mongoose from 'mongoose';

/**
 * DELETE /api/social/accounts/[id]
 * Disconnect a social media account
 * Prevents further posting but keeps historical data
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token || "");

    if (!decoded?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: 'Invalid account ID' }, { status: 400 });
    }

    // Check ownership
    const account = await SocialAccount.findById(params.id);
    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    if (account.user_id.toString() !== decoded.userId) {
      return NextResponse.json({ error: 'Not your account' }, { status: 403 });
    }

    // Mark as disconnected instead of deleting
    account.is_connected = false;
    account.connection_error = 'Account disconnected by user';
    await account.save();

    return NextResponse.json(
      { success: true, message: 'Account disconnected' },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('DELETE /api/social/accounts/[id] error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
