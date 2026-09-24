import { NextRequest, NextResponse } from 'next/server';
import { saveOrder, getOrdersByUser } from '@/lib/bunnyWebsiteRepository';
import { verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      userId,
      items,
      total,
      shippingAddress,
    } = body;

    // Validate input
    if (!userId || !items || !total || !shippingAddress) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create order using BunnyDB
    const order = await saveOrder({
      userId,
      items,
      total,
      shippingAddress,
      status: 'pending',
    });

    return NextResponse.json(
      { message: 'Order created successfully', order },
      { status: 201 }
    );
  } catch (error) {
    console.error('Order creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create order' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Verify token
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token || "");
    
    if (!decoded || !decoded.userId) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    // Fetch orders using BunnyDB
    const orders = await getOrdersByUser(decoded.userId);

    return NextResponse.json(orders, { status: 200 });
  } catch (error) {
    console.error('Fetch orders error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}
