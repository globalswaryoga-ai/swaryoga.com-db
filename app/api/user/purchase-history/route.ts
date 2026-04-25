import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';


/**
 * GET /api/user/purchase-history
 * 
 * Fetches user's purchase history from orders
 * Returns: Array of purchased workshop IDs/names
 * 
 * Used to detect repeat purchases for applying 40% discount
 */
export async function GET(request: NextRequest) {
  try {
    // Verify user authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { 
          success: true, 
          purchasedItems: [],
          isGuest: true,
          message: 'No authentication provided - guest user'
        },
        { status: 200 }
      );
    }

    const token = authHeader.slice(7);
    let decoded: any;

    try {
      decoded = await verifyToken(token);
      if (!decoded?.userId) {
        return NextResponse.json(
          { 
            success: true, 
            purchasedItems: [],
            isGuest: true,
            message: 'Invalid token - guest user'
          },
          { status: 200 }
        );
      }
    } catch (error) {
      return NextResponse.json(
        { 
          success: true, 
          purchasedItems: [],
          isGuest: true,
          message: 'Token verification failed - guest user'
        },
        { status: 200 }
      );
    }

    // Connect to database
    const conn = await connectDB();
    const db = conn.db;

    if (!db) {
      return NextResponse.json(
        {
          success: false,
          purchasedItems: [],
          error: 'Database connection is not ready'
        },
        { status: 500 }
      );
    }

    const ordersCollection = db.collection('orders');

    // Fetch user's completed orders
    const userOrders = await ordersCollection
      .find({
      userId: decoded.userId,
      paymentStatus: 'completed' // Only completed payments
      })
      .toArray();

    // Extract workshop/item IDs from orders
    const purchasedItems = userOrders.flatMap((order: any) => 
      order.items?.map((item: any) => ({
        name: item.name || item.workshopName,
        id: item.id || item.workshopId,
        purchaseDate: order.createdAt
      })) || []
    );

    console.log(`📊 User ${decoded.userId} - Found ${purchasedItems.length} previous purchases:`, 
      purchasedItems.map(p => p.name));

    return NextResponse.json(
      {
        success: true,
        userId: decoded.userId,
        purchasedItems,
        count: purchasedItems.length,
        message: `Found ${purchasedItems.length} previous purchase(s)`
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('❌ Error fetching purchase history:', error);
    return NextResponse.json(
      { 
        success: false, 
        purchasedItems: [],
        error: 'Failed to fetch purchase history'
      },
      { status: 500 }
    );
  }
}
