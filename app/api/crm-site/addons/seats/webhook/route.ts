import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';

/**
 * POST /api/crm-site/addons/seats/webhook
 * Cashfree webhook for seat addon payments
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('Seat addon webhook:', JSON.stringify(body, null, 2));

    const { data, type } = body;
    if (type !== 'PAYMENT_SUCCESS_WEBHOOK' && data?.payment?.payment_status !== 'SUCCESS') {
      return NextResponse.json({ status: 'ignored' });
    }

    const orderId = data?.order?.order_id;
    if (!orderId) {
      return NextResponse.json({ error: 'No order_id' }, { status: 400 });
    }

    await connectDB();
    const mongoose = (await import('mongoose')).default;
    const crmDb = mongoose.connection.useDb(process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm');

    // Find the order
    const order = await crmDb.collection('seat_addon_orders').findOne({ orderId });
    if (!order) {
      console.log('Order not found:', orderId);
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (order.status === 'completed') {
      return NextResponse.json({ status: 'already_processed' });
    }

    // Calculate expiry date
    const now = new Date();
    let expiryDate: Date;
    switch (order.billing) {
      case 'annual':
        expiryDate = new Date(now.setFullYear(now.getFullYear() + 1));
        break;
      case 'quarterly':
        expiryDate = new Date(now.setMonth(now.getMonth() + 3));
        break;
      default:
        expiryDate = new Date(now.setMonth(now.getMonth() + 1));
    }

    // Get current tenant addons
    const tenant = await crmDb.collection('crm_tenants').findOne({ slug: order.tenantSlug });
    const existingSeats = tenant?.addons?.extraSeats || 0;
    const existingExpiry = tenant?.addons?.extraSeatsExpiry;

    // If existing seats haven't expired, extend the expiry and add seats
    let newSeats = order.seats;
    let newExpiry = expiryDate;
    
    if (existingExpiry && new Date(existingExpiry) > new Date()) {
      // Extend from existing expiry date
      newSeats = existingSeats + order.seats;
      const baseDate = new Date(existingExpiry);
      switch (order.billing) {
        case 'annual':
          newExpiry = new Date(baseDate.setFullYear(baseDate.getFullYear() + 1));
          break;
        case 'quarterly':
          newExpiry = new Date(baseDate.setMonth(baseDate.getMonth() + 3));
          break;
        default:
          newExpiry = new Date(baseDate.setMonth(baseDate.getMonth() + 1));
      }
    }

    // Update tenant with extra seats
    await crmDb.collection('crm_tenants').updateOne(
      { slug: order.tenantSlug },
      {
        $set: {
          'addons.extraSeats': newSeats,
          'addons.extraSeatsExpiry': newExpiry,
          'addons.lastSeatPurchase': new Date(),
        },
        $push: {
          'addons.seatHistory': {
            seats: order.seats,
            billing: order.billing,
            amount: order.total,
            orderId: order.orderId,
            purchasedAt: new Date(),
            expiresAt: newExpiry,
          } as any,
        },
      }
    );

    // Update order status
    await crmDb.collection('seat_addon_orders').updateOne(
      { orderId },
      {
        $set: {
          status: 'completed',
          paymentId: data?.payment?.cf_payment_id,
          paymentMethod: data?.payment?.payment_group,
          completedAt: new Date(),
        },
      }
    );

    console.log(`Seat addon applied: ${order.seats} seats for ${order.tenantSlug}, expires ${newExpiry}`);

    return NextResponse.json({ status: 'success', seats: newSeats, expiresAt: newExpiry });
  } catch (err: any) {
    console.error('Seat webhook error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
