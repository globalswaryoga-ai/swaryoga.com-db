import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';
import { getVisitorAnalytics } from '@/lib/bunnyVisitorRepository';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let decoded: any;
    try {
      decoded = verifyToken(authHeader.split(' ')[1]);
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    if (!isSuperAdmin(decoded)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const analytics = await getVisitorAnalytics();

    return NextResponse.json({
      success: true,
      ...analytics,
    });
  } catch (error: any) {
    console.error('[Admin Visitors GET Error]:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
