import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { Types } from 'mongoose';

const mongoose = await import('mongoose');

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);

    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 401 });
    }

    const isSuperAdmin =
      decoded?.userId === 'admin' ||
      (Array.isArray(decoded?.permissions) && decoded.permissions.includes('all'));
    if (!isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = params;

    // Validate MongoDB ID
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid admin user ID' }, { status: 400 });
    }

    await connectDB();

    // Get User model
    const User = mongoose.default.models.User || mongoose.default.model('User', new mongoose.Schema({}));

    // Delete admin user
    const result = await User.deleteOne({ _id: new Types.ObjectId(id), isAdmin: true });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Admin user not found' }, { status: 404 });
    }

    return NextResponse.json(
      { success: true, message: 'Admin user deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting admin user:', error);
    return NextResponse.json(
      { error: 'Failed to delete admin user' },
      { status: 500 }
    );
  }
}
