import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';
import { connectDB, User, Order, Signin, Message } from '@/lib/db';

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
    const isSuperAdmin = decoded.userId === 'admin' || (Array.isArray(decoded.permissions) && decoded.permissions.includes('all'));
    if (!isSuperAdmin) {
      return NextResponse.json({ error: 'Super admin access required' }, { status: 403 });
    }

    await connectDB();

    // Get all statistics
    const [totalUsers, totalSignins, totalMessages] = await Promise.all([
      User.countDocuments(),
      Signin.countDocuments(),
      Message.countDocuments(),
    ]);

    // Get order and payment statistics
    const completedOrders = await Order.find({ paymentStatus: 'completed' });
    const totalOrders = await Order.countDocuments();
    const pendingOrders = await Order.countDocuments({ paymentStatus: { $ne: 'completed' } });
    
    // Calculate revenue by currency
    let totalAmountUSD = 0;
    const currencyBreakdown = {
      INR: 0,
      USD: 0,
      NPR: 0,
    };

    completedOrders.forEach((order: any) => {
      // Use 'total' as the amount, default currency to 'INR' if not present
      const amount = order.total || 0;
      const currency = order.currency || 'INR';

      if (!currencyBreakdown[currency as keyof typeof currencyBreakdown]) {
        currencyBreakdown[currency as keyof typeof currencyBreakdown] = 0;
      }

      currencyBreakdown[currency as keyof typeof currencyBreakdown] += amount;

      // Convert to USD for total (approximate)
      if (currency === 'INR') {
        totalAmountUSD += amount / 86;
      } else if (currency === 'USD') {
        totalAmountUSD += amount;
      } else if (currency === 'NPR') {
        totalAmountUSD += amount / (86 * 1.6);
      }
    });

    const totalAmountUSDRounded = Math.round(totalAmountUSD * 100) / 100;

    return NextResponse.json({
      success: true,
      data: {
        totalUsers,
        totalSignins,
        totalMessages,
        totalOrders,
        pendingOrders,
        completedOrders: completedOrders.length,
        totalAmountUSD: totalAmountUSDRounded,
        currencyBreakdown: {
          INR: Math.round(currencyBreakdown.INR * 100) / 100,
          USD: Math.round(currencyBreakdown.USD * 100) / 100,
          NPR: Math.round(currencyBreakdown.NPR * 100) / 100,
        },
        orders: completedOrders.map((order: any) => ({
          id: order._id,
          amount: order.total, // Use 'total' as the amount
          currency: order.currency || 'INR',
          status: order.paymentStatus,
          transactionId: order.transactionId,
          createdAt: order.createdAt,
        })),
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
