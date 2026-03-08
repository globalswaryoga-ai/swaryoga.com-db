import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

function jsonResponse(data: any, status = 200) {
  return NextResponse.json(data, { status, headers: corsHeaders });
}

/**
 * POST /api/crm-site/setup-payment
 * 
 * Initiates the ₹30 setup payment for CRM activation
 */
export async function POST(request: NextRequest) {
  try {
    // Verify auth
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    const decoded = verifyToken(token);

    if (!decoded) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    const { email, name, phone } = body;
    const userEmail = email || decoded.email || '';
    const userName = name || decoded.name || decoded.userId || 'User';
    const userPhone = phone || '';

    await connectDB();

    const mongoose = (await import('mongoose')).default;
    const crmDb = mongoose.connection.useDb(process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm');

    // Check if user already paid setup fee
    const existingPayment = await crmDb.collection('setup_payments').findOne({
      userId: decoded.userId || decoded.email,
      status: 'completed',
    });

    if (existingPayment) {
      return jsonResponse({ 
        success: true, 
        alreadyPaid: true,
        message: 'Setup fee already paid' 
      });
    }

    // Generate unique order ID
    const orderId = `SETUP_${Date.now()}_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    // Create payment record
    await crmDb.collection('setup_payments').insertOne({
      orderId,
      userId: decoded.userId || decoded.email,
      email: userEmail,
      name: userName,
      phone: userPhone,
      amount: 30,
      currency: 'INR',
      status: 'pending',
      createdAt: new Date(),
    });

    // Initiate Cashfree payment
    const cashfreeAppId = process.env.CASHFREE_APP_ID;
    const cashfreeSecretKey = process.env.CASHFREE_SECRET_KEY;
    const isProduction = process.env.NODE_ENV === 'production';
    const cashfreeBaseUrl = isProduction 
      ? 'https://api.cashfree.com/pg' 
      : 'https://sandbox.cashfree.com/pg';

    if (!cashfreeAppId || !cashfreeSecretKey) {
      // Fallback: Mark as paid for testing (remove in production)
      if (process.env.NODE_ENV !== 'production') {
        await crmDb.collection('setup_payments').updateOne(
          { orderId },
          { $set: { status: 'completed', paidAt: new Date() } }
        );
        
        // Update user's setup status
        await crmDb.collection('admin_users').updateOne(
          { $or: [{ userId: decoded.userId }, { email: decoded.email }] },
          { $set: { setupComplete: true, setupPaidAt: new Date() } }
        );

        return jsonResponse({
          success: true,
          testMode: true,
          message: 'Setup completed (test mode - no payment required)',
        });
      }

      return jsonResponse({ error: 'Payment gateway not configured' }, 500);
    }

    // Create Cashfree order
    const returnUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://crm.swaryoga.com'}/admin/crm?setup=complete`;
    
    const orderPayload = {
      order_id: orderId,
      order_amount: 30,
      order_currency: 'INR',
      customer_details: {
        customer_id: (decoded.userId || decoded.email || '').substring(0, 50),
        customer_email: userEmail,
        customer_phone: userPhone || '9999999999',
        customer_name: userName,
      },
      order_meta: {
        return_url: `${returnUrl}&order_id={order_id}`,
        notify_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://crm.swaryoga.com'}/api/crm-site/setup-payment/webhook`,
      },
      order_note: 'CRM Setup Fee',
    };

    const cfResponse = await fetch(`${cashfreeBaseUrl}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-version': '2023-08-01',
        'x-client-id': cashfreeAppId,
        'x-client-secret': cashfreeSecretKey,
      },
      body: JSON.stringify(orderPayload),
    });

    const cfData = await cfResponse.json();

    if (!cfResponse.ok) {
      console.error('Cashfree order creation failed:', cfData);
      return jsonResponse({ 
        error: 'Payment initiation failed', 
        details: cfData.message 
      }, 500);
    }

    // Update payment record with Cashfree details
    await crmDb.collection('setup_payments').updateOne(
      { orderId },
      { 
        $set: { 
          cfOrderId: cfData.cf_order_id,
          paymentSessionId: cfData.payment_session_id,
        } 
      }
    );

    return jsonResponse({
      success: true,
      orderId,
      sessionId: cfData.payment_session_id,
      paymentLink: cfData.payment_link,
    });

  } catch (error: any) {
    console.error('Setup payment error:', error);
    return jsonResponse({ error: error.message || 'Internal server error' }, 500);
  }
}

/**
 * GET /api/crm-site/setup-payment
 * 
 * Check if user has paid setup fee
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    const decoded = verifyToken(token);

    if (!decoded) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    await connectDB();

    const mongoose = (await import('mongoose')).default;
    const crmDb = mongoose.connection.useDb(process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm');

    // Check setup status
    const user = await crmDb.collection('admin_users').findOne({
      $or: [{ userId: decoded.userId }, { email: decoded.email }],
    });

    const payment = await crmDb.collection('setup_payments').findOne({
      userId: decoded.userId || decoded.email,
      status: 'completed',
    });

    return jsonResponse({
      setupComplete: user?.setupComplete || false,
      setupPaidAt: user?.setupPaidAt || payment?.paidAt || null,
      hasPaid: !!payment,
    });

  } catch (error: any) {
    console.error('Setup status check error:', error);
    return jsonResponse({ error: error.message || 'Internal server error' }, 500);
  }
}
