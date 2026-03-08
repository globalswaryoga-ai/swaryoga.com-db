import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';

/**
 * GET /api/crm-site/addons/seats/return
 * Return URL after Cashfree payment
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const orderId = url.searchParams.get('order_id');

  if (!orderId) {
    return NextResponse.redirect(new URL('/admin/crm/team?status=error&message=No order ID', request.url));
  }

  try {
    await connectDB();
    const mongoose = (await import('mongoose')).default;
    const crmDb = mongoose.connection.useDb(process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm');

    const order = await crmDb.collection('seat_addon_orders').findOne({ orderId });
    
    if (!order) {
      return NextResponse.redirect(new URL('/admin/crm/team?status=error&message=Order not found', request.url));
    }

    // Check payment status with Cashfree
    const cashfreeApiBase = process.env.CASHFREE_ENV === 'production'
      ? 'https://api.cashfree.com/pg'
      : 'https://sandbox.cashfree.com/pg';

    const statusResponse = await fetch(`${cashfreeApiBase}/orders/${orderId}`, {
      headers: {
        'x-api-version': '2022-09-01',
        'x-client-id': process.env.CASHFREE_APP_ID || '',
        'x-client-secret': process.env.CASHFREE_SECRET_KEY || '',
      },
    });

    const statusData = await statusResponse.json();
    
    if (statusData.order_status === 'PAID') {
      // Verify if webhook processed it
      if (order.status !== 'completed') {
        // Process manually if webhook didn't catch it
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

        const tenant = await crmDb.collection('crm_tenants').findOne({ slug: order.tenantSlug });
        const existingSeats = tenant?.addons?.extraSeats || 0;
        const existingExpiry = tenant?.addons?.extraSeatsExpiry;

        let newSeats = order.seats;
        let newExpiry = expiryDate;
        
        if (existingExpiry && new Date(existingExpiry) > new Date()) {
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

        await crmDb.collection('seat_addon_orders').updateOne(
          { orderId },
          {
            $set: {
              status: 'completed',
              completedAt: new Date(),
            },
          }
        );
      }

      return NextResponse.redirect(
        new URL(`/admin/crm/team?status=success&seats=${order.seats}&message=Successfully added ${order.seats} seat(s)`, request.url)
      );
    } else if (statusData.order_status === 'ACTIVE') {
      return NextResponse.redirect(
        new URL('/admin/crm/team?status=pending&message=Payment is still processing', request.url)
      );
    } else {
      return NextResponse.redirect(
        new URL('/admin/crm/team?status=error&message=Payment failed or cancelled', request.url)
      );
    }
  } catch (err: any) {
    console.error('Seat return error:', err);
    return NextResponse.redirect(
      new URL('/admin/crm/team?status=error&message=Something went wrong', request.url)
    );
  }
}
