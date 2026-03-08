import { connectDB, Signin } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    // Verify admin token with proper verification
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.slice('Bearer '.length);
    const decoded = verifyToken(token);
    
    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 401 });
    }

    // Only superadmins can see signin data (main website users)
    if (!isSuperAdmin(decoded)) {
      return NextResponse.json(
        { error: 'Access denied: Superadmin access required for signin data' },
        { status: 403 }
      );
    }

    await connectDB();
    
    // Fetch signin data from database
    const signins = await Signin.find().sort({ createdAt: -1 });

    return NextResponse.json(signins, { status: 200 });
  } catch (error) {
    console.error('Error fetching signin data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch signin data' },
      { status: 500 }
    );
  }
}
