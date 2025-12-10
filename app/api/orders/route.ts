import { NextRequest, NextResponse } from 'next/server';
import { connectDB, Order } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    await connectDB();
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

    // Create order
    const order = new Order({
      userId,
      items,
      total,
      shippingAddress,
      status: 'pending',
    });

    await order.save();

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
    await connectDB();
    const userId = request.nextUrl.searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const orders = await Order.find({ userId });

    return NextResponse.json({ orders }, { status: 200 });
  } catch (error) {
    console.error('Fetch orders error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}
