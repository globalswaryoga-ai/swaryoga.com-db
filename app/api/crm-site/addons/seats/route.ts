import { NextRequest, NextResponse } from 'next/server';
import { cashfreeCreateOrder } from '@/lib/payments/cashfree';
import { resolveCrmSiteTenantAccess } from '@/lib/crm-site/tenantAccess';

export const dynamic = 'force-dynamic';


/**
 * GET /api/crm-site/addons/seats
 * Get current seat addon status
 * 
 * POST /api/crm-site/addons/seats
 * Purchase additional user seats
 */

// Pricing per additional seat (monthly)
const SEAT_PRICING = {
  monthly: 300,    // ₹300/seat/month
  quarterly: 810,  // ₹810/seat/quarter (10% discount)
  annual: 3000,    // ₹3000/seat/year (17% discount)
};

const GST_RATE = 0.18;

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const access = await resolveCrmSiteTenantAccess(request, {
      requestedTenantSlug: url.searchParams.get('tenant'),
    });
    if (access instanceof NextResponse) {
      return access;
    }

    const { crmDb, tenant, tenantSlug } = access;

    if (!tenantSlug) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 400 });
    }
    
    // Get current extra seats
    const extraSeats = tenant?.addons?.extraSeats || 0;
    const extraSeatsExpiry = tenant?.addons?.extraSeatsExpiry;
    
    // Base plan limits
    const planLimits: Record<string, number> = {
      free: 1,
      basic: 2,
      starter: 3,
      growth: 10,
      professional: 999,
    };
    
    const basePlanSeats = planLimits[tenant?.plan || 'free'] || 1;
    const totalSeats = basePlanSeats + extraSeats;

    // Get current team count
    const teamCount = await crmDb.collection('tenant_team').countDocuments({ tenantSlug });
    const inviteCount = await crmDb.collection('tenant_invites').countDocuments({
      tenantSlug,
      status: 'pending',
    });
    const currentUsage = teamCount + inviteCount;

    return NextResponse.json({
      plan: tenant?.plan || 'free',
      basePlanSeats,
      extraSeats,
      extraSeatsExpiry,
      totalSeats,
      currentUsage,
      availableSeats: totalSeats - currentUsage,
      pricing: SEAT_PRICING,
      gstRate: GST_RATE,
    });
  } catch (err: any) {
    console.error('Seats GET error:', err);
    return NextResponse.json({ error: err.message || 'Failed to fetch seat info' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const access = await resolveCrmSiteTenantAccess(request, {
      requestedTenantSlug: body?.tenantSlug,
    });
    if (access instanceof NextResponse) {
      return access;
    }

    const { crmDb, tenant, tenantSlug } = access;
    const { seats, billing = 'monthly', email, name, phone, includeGST = false } = body;

    if (!seats || seats < 1) {
      return NextResponse.json({ error: 'seats (≥1) required' }, { status: 400 });
    }

    if (seats > 50) {
      return NextResponse.json({ error: 'Maximum 50 seats per purchase. Contact support for more.' }, { status: 400 });
    }

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    // Calculate pricing
    const pricePerSeat = SEAT_PRICING[billing as keyof typeof SEAT_PRICING] || SEAT_PRICING.monthly;
    const subtotal = seats * pricePerSeat;
    const gst = includeGST ? Math.ceil(subtotal * GST_RATE) : 0;
    const total = subtotal + gst;

    // Create order ID
    const orderId = `SEAT-${tenantSlug}-${seats}-${Date.now()}`.replace(/[^a-zA-Z0-9-_]/g, '');

    // Billing period label
    const billingLabel = billing === 'annual' ? 'Annual' : billing === 'quarterly' ? 'Quarterly' : 'Monthly';

    // Create Cashfree order
    const cashfreeOrder = await cashfreeCreateOrder({
      order_id: orderId,
      order_amount: total,
      order_currency: 'INR',
      customer_details: {
        customer_id: (email || tenant.ownerEmail).trim().toLowerCase().replace(/[^a-z0-9]/g, '_'),
        customer_name: (name || tenant.name || 'Customer').trim(),
        customer_email: (email || tenant.ownerEmail).trim().toLowerCase(),
        customer_phone: phone?.trim() || '9999999999',
      },
      order_note: `${seats} Extra User Seat${seats > 1 ? 's' : ''} (${billingLabel}) — ₹${total}${includeGST ? ' inc. GST' : ''}`,
      order_meta: {
        return_url: `${new URL(request.url).origin}/api/crm-site/addons/seats/return?order_id={order_id}`,
        notify_url: `${new URL(request.url).origin}/api/crm-site/addons/seats/webhook`,
      },
    });

    if (!cashfreeOrder.payment_session_id) {
      console.error('Cashfree order error:', cashfreeOrder);
      return NextResponse.json({ error: 'Payment gateway error' }, { status: 502 });
    }

    // Store order record
    await crmDb.collection('seat_addon_orders').insertOne({
      orderId,
      tenantSlug,
      seats,
      billing,
      pricePerSeat,
      subtotal,
      gst,
      total,
      email: email || tenant.ownerEmail,
      name: name || tenant.name,
      cfOrderId: cashfreeOrder.cf_order_id,
      paymentSessionId: cashfreeOrder.payment_session_id,
      status: 'pending',
      createdAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      orderId,
      paymentSessionId: cashfreeOrder.payment_session_id,
      seats,
      billing: billingLabel,
      subtotal,
      gst,
      total,
    });
  } catch (err: any) {
    console.error('Seats POST error:', err);
    return NextResponse.json({ error: err.message || 'Failed to create seat order' }, { status: 500 });
  }
}
