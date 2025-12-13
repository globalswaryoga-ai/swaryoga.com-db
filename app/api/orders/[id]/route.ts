import { NextRequest, NextResponse } from 'next/server';
import { connectDB, Order } from '@/lib/db';

function isLikelyObjectId(id: string) {
  return /^[a-f0-9]{24}$/i.test(id);
}

export async function GET(_request: NextRequest, context: { params: { id: string } }) {
  try {
    const id = context.params.id;
    if (!id || !isLikelyObjectId(id)) {
      return NextResponse.json({ error: 'Invalid order id' }, { status: 400 });
    }

    await connectDB();

    const raw = await Order.findById(id).lean();
    const order = (Array.isArray(raw) ? raw[0] : raw) as any;
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Privacy-by-default: do not expose full shipping address/phone over a public endpoint.
    const safe = {
      _id: String(order._id),
      items: Array.isArray(order.items)
        ? order.items.map((item: any) => ({
            productId: String(item.productId || ''),
            name: String(item.name || ''),
            price: Number(item.price || 0),
            quantity: Number(item.quantity || 0),
          }))
        : [],
      total: Number(order.total || 0),
      status: String(order.status || ''),
      paymentStatus: String(order.paymentStatus || ''),
      paymentMethod: String(order.paymentMethod || ''),
      transactionId: String(order.transactionId || ''),
      failureReason: String(order.failureReason || ''),
      createdAt: order.createdAt ? new Date(order.createdAt).toISOString() : undefined,
      updatedAt: order.updatedAt ? new Date(order.updatedAt).toISOString() : undefined,
    };

    return NextResponse.json({ success: true, order: safe });
  } catch (error) {
    console.error('Error fetching order:', error);
    return NextResponse.json({ error: 'Failed to fetch order' }, { status: 500 });
  }
}
