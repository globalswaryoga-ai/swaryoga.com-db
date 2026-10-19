import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';
import { bunnyExecute } from '@/lib/bunnyDatabase';
import { initBunnyCoreSchema } from '@/lib/bunnyCoreSchema';
import { connectDB, Signin } from '@/lib/db';

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

    // 1. First, attempt to query from Bunny Database
    try {
      await initBunnyCoreSchema();
      const result = await bunnyExecute({
        sql: 'SELECT id, email, userId, ipAddress, userAgent, createdAt FROM user_signins ORDER BY createdAt DESC LIMIT 500',
        args: [],
      });

      if (result.rows && result.rows.length > 0) {
        const signins = result.rows.map((row: any) => ({
          _id: String(row.id || row.userId || row.email),
          email: String(row.email || ''),
          userId: row.userId ? String(row.userId) : undefined,
          ipAddress: row.ipAddress ? String(row.ipAddress) : undefined,
          userAgent: row.userAgent ? String(row.userAgent) : undefined,
          createdAt: String(row.createdAt || new Date().toISOString()),
          loginTime: String(row.createdAt || new Date().toISOString()),
        }));
        return NextResponse.json(signins, { status: 200 });
      }
    } catch (bunnyErr) {
      console.warn('Bunny DB signin query skipped or empty, trying fallback:', bunnyErr);
    }

    // 2. Fallback to MongoDB if Bunny has not yet populated historical signins
    try {
      await connectDB();
      const mongoSignins = await Signin.find().sort({ createdAt: -1 }).limit(500).lean();
      return NextResponse.json(mongoSignins, { status: 200 });
    } catch (mongoErr) {
      console.error('Mongo fallback also failed:', mongoErr);
      return NextResponse.json([], { status: 200 });
    }
  } catch (error) {
    console.error('Error fetching signin data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch signin data' },
      { status: 500 }
    );
  }
}
