import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';

import { getBunnyAdminDashboard } from '@/lib/bunnyDashboardRepository';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Get token from headers
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '') || '';

    if (!token) {
      return NextResponse.json({ error: 'No authorization token provided' }, { status: 401 });
    }

    // Verify authentication
    const decoded = verifyToken(token);
    
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    if (!decoded.isAdmin) {
      console.warn('Dashboard access denied - not an admin. Token payload:', {
        userId: decoded.userId,
        isAdmin: decoded.isAdmin,
        permissions: decoded.permissions,
      });
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Super admin gate: dashboard is for the main admin only.
    const isSuperAdmin = decoded.userId === 'admin' || decoded.userId === 'admincrm' || (Array.isArray(decoded.permissions) && decoded.permissions.includes('all'));
    if (!isSuperAdmin) {
      return NextResponse.json({ error: 'Super admin access required' }, { status: 403 });
    }

    const dashboard = await getBunnyAdminDashboard();

    return NextResponse.json({
      success: true,
      data: {
        ...dashboard,
      },
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch dashboard data',
        success: false,
        data: {
          totalUsers: 0,
          totalSignins: 0,
          totalMessages: 0,
          totalOrders: 0,
          pendingOrders: 0,
          completedOrders: 0,
          totalAmountUSD: 0,
          currencyBreakdown: { INR: 0, USD: 0, NPR: 0 },
          orders: [],
        }
      },
      { status: 500 }
    );
  }
}
