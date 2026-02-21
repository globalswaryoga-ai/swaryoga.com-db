import { NextRequest, NextResponse } from 'next/server';
import { connectDB, User } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET - Fetch admin users
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded || !decoded.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    await connectDB();
    
    // Fetch all admin users from main database
    const adminUsers = await User.find({ isAdmin: true })
      .select(['userId', 'name', 'email', 'role', '_id'])
      .sort({ name: 1 })
      .lean();
    
    // Map to safe response format
    const users = adminUsers.map((user: any) => ({
      _id: String(user._id),
      userId: user.userId || String(user._id),
      name: user.name || user.email || user.userId || 'Unknown',
      email: user.email || '',
      role: user.role || 'admin',
    }));

    return NextResponse.json({ 
      success: true, 
      users,
      total: users.length,
    });
  } catch (error: any) {
    console.error('[Admin Users GET] Error:', error);
    return NextResponse.json({ 
      error: error.message || 'Failed to fetch admin users' 
    }, { status: 500 });
  }
}
