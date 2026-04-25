import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import jwt from 'jsonwebtoken';

export const dynamic = 'force-dynamic';

/**
 * GET /api/crm-site/billing-history
 *
 * Returns payment history for the authenticated tenant
 */
export async function GET(request: NextRequest) {
  try {
    // Verify auth token
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const jwtSecret = process.env.JWT_SECRET || process.env.ADMIN_JWT_SECRET || 'swar-yoga-default-secret';
    
    let decoded: any;
    try {
      decoded = jwt.verify(token, jwtSecret);
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const tenantSlug = decoded.tenantSlug;
    const email = decoded.email;

    if (!tenantSlug && !email) {
      return NextResponse.json({ error: 'No tenant found' }, { status: 400 });
    }

    await connectDB();
    const mongoose = (await import('mongoose')).default;
    const crmDb = mongoose.connection.useDb(process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm');

    // Get payments for this tenant
    const filter: any = {};
    if (tenantSlug) {
      filter.tenantSlug = tenantSlug;
    } else if (email) {
      filter.email = email.toLowerCase();
    }

    const payments = await crmDb.collection('crm_billing_orders')
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray();

    return NextResponse.json({
      success: true,
      payments: payments.map((p: any) => ({
        _id: p._id.toString(),
        orderId: p.orderId,
        plan: p.plan,
        billing: p.billing,
        amount: p.amount,
        planAmount: p.planAmount,
        storageCost: p.storageCost,
        gst: p.gst,
        storageGB: p.storageGB,
        paymentMethod: p.paymentMethod,
        cfStatus: p.cfStatus || p.status,
        createdAt: p.createdAt,
      })),
    });
  } catch (err: any) {
    console.error('Billing History API Error:', err);
    return NextResponse.json({ error: 'Failed to fetch billing history' }, { status: 500 });
  }
}
