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

    const order = (await Order.findById(id).lean()) as any;
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Prepare receipt data
    const receiptData = {
      orderId: String(order._id),
      userName: `${order.shippingAddress?.firstName || ''} ${order.shippingAddress?.lastName || ''}`.trim(),
      userEmail: order.shippingAddress?.email || '',
      userPhone: order.shippingAddress?.phone || '',
      userCity: order.shippingAddress?.city || '',
      items: Array.isArray(order.items)
        ? order.items.map((item: any) => ({
            name: String(item.name || ''),
            price: Number(item.price || 0),
            quantity: Number(item.quantity || 0),
            currency: String(item.currency || order.currency || 'INR'),
          }))
        : [],
      subtotal: Number(order.total || 0) / 1.033, // Remove 3.3% to get subtotal
      platformFee: (Number(order.total || 0) / 1.033) * 0.033,
      total: Number(order.total || 0),
      currency: String(order.currency || 'INR'),
      paymentMethod: String(order.paymentMethod || 'payu'),
      transactionId: String(order.transactionId || ''),
      orderDate: order.createdAt ? new Date(order.createdAt).toISOString() : new Date().toISOString(),
      paymentStatus: String(order.paymentStatus || order.status || 'pending'),
    };

    return NextResponse.json({
      success: true,
      data: receiptData,
    });
  } catch (error) {
    console.error('Error fetching receipt data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch receipt data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
