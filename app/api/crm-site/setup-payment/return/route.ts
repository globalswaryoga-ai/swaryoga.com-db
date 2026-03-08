import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';

/**
 * GET /api/crm-site/setup-payment/return
 * 
 * Cashfree redirects here after setup/storage payment
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const orderId = url.searchParams.get('order_id');

  const baseUrl = process.env.CRM_BASE_URL || 'https://crm.swaryoga.com';

  if (!orderId) {
    return NextResponse.redirect(new URL('/admin/crm?setup=error&msg=missing_order', baseUrl));
  }

  try {
    await connectDB();

    const mongoose = (await import('mongoose')).default;
    const crmDb = mongoose.connection.useDb(process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm');

    // Find payment record
    const paymentRecord = await crmDb.collection('setup_payments').findOne({ orderId });

    if (!paymentRecord) {
      return NextResponse.redirect(new URL('/admin/crm?setup=error&msg=not_found', baseUrl));
    }

    // Check payment status with Cashfree
    const cashfreeApiBase = process.env.CASHFREE_ENV === 'production'
      ? 'https://api.cashfree.com/pg'
      : 'https://sandbox.cashfree.com/pg';

    const clientId = process.env.CASHFREE_CLIENT_ID || process.env.CASHFREE_APP_ID;
    const clientSecret = process.env.CASHFREE_CLIENT_SECRET || process.env.CASHFREE_SECRET_KEY;

    if (clientId && clientSecret) {
      const statusResponse = await fetch(`${cashfreeApiBase}/orders/${orderId}`, {
        method: 'GET',
        headers: {
          'x-api-version': '2023-08-01',
          'x-client-id': clientId,
          'x-client-secret': clientSecret,
        },
      });

      if (statusResponse.ok) {
        const cfOrder = await statusResponse.json();
        const orderStatus = cfOrder.order_status;

        if (orderStatus === 'PAID') {
          // Update payment as completed
          await crmDb.collection('setup_payments').updateOne(
            { orderId },
            { 
              $set: { 
                status: 'completed',
                paidAt: new Date(),
                cfOrderData: cfOrder,
              } 
            }
          );

          // Update user's setup status
          await crmDb.collection('admin_users').updateOne(
            { $or: [{ userId: paymentRecord.userId }, { email: paymentRecord.email }] },
            { 
              $set: { 
                setupComplete: true,
                setupPaidAt: new Date(),
                planId: paymentRecord.planId || 'starter',
                planName: paymentRecord.planName || 'Starter',
                storageLimitMB: paymentRecord.storageMB || 500,
                storageUsedMB: 0,
              } 
            }
          );

          return NextResponse.redirect(new URL('/admin/crm?setup=complete', baseUrl));
        } else if (orderStatus === 'ACTIVE') {
          // Payment pending
          return NextResponse.redirect(new URL('/admin/crm?setup=pending', baseUrl));
        } else {
          // Payment failed
          return NextResponse.redirect(new URL(`/admin/crm?setup=failed&status=${orderStatus}`, baseUrl));
        }
      }
    }

    // If we can't verify with Cashfree, check local status
    if (paymentRecord.status === 'completed') {
      return NextResponse.redirect(new URL('/admin/crm?setup=complete', baseUrl));
    }

    return NextResponse.redirect(new URL('/admin/crm?setup=pending', baseUrl));

  } catch (error: any) {
    console.error('Setup payment return error:', error);
    return NextResponse.redirect(new URL('/admin/crm?setup=error&msg=server_error', baseUrl));
  }
}
