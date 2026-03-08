import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { getPendingPayment, getLead } from '@/lib/schemas/enterpriseSchemas';
import { normalizePhone } from '@/lib/whatsapp';

/**
 * POST /api/pending-payments
 * Create a new pending payment for Nepal/QR code payments
 */
export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json();
    const { name, phone, email, productType, productId, productName, scheduleId, scheduleDetails, amount, currency, paymentMethod } = body;

    // Validation
    if (!name || !phone || !productType || !productId || !productName || !amount) {
      return NextResponse.json(
        { error: 'Missing required fields: name, phone, productType, productId, productName, amount' },
        { status: 400 }
      );
    }

    const normalizedPhone = normalizePhone(phone);

    const PendingPayment = getPendingPayment();
    const Lead = getLead();

    // Check if there's already a pending payment for same user + product
    const existing = await PendingPayment.findOne({
      phone: normalizedPhone,
      productId,
      status: 'pending',
    });

    if (existing) {
      return NextResponse.json({
        success: true,
        message: 'Payment request already exists',
        paymentId: existing._id,
        isExisting: true,
      });
    }

    // Create or find lead
    let lead = await Lead.findOne({ phoneNumber: normalizedPhone });
    if (!lead) {
      lead = await Lead.create({
        name,
        phoneNumber: normalizedPhone,
        email: email || '',
        source: 'nepal-payment',
        status: 'new_lead',
        labels: ['nepal-payment'],
      });
    }

    // Create pending payment
    const pendingPayment = await PendingPayment.create({
      name,
      phone: normalizedPhone,
      email: email || '',
      productType,
      productId,
      productName,
      scheduleId: scheduleId || '',
      scheduleDetails: scheduleDetails || '',
      amount,
      currency: currency || 'NPR',
      paymentMethod: paymentMethod || 'esewa',
      status: 'pending',
      linkedLeadId: lead._id,
      userAgent: req.headers.get('user-agent') || '',
      ipAddress: req.headers.get('x-forwarded-for')?.split(',')[0] || req.headers.get('x-real-ip') || '',
    });

    return NextResponse.json({
      success: true,
      message: 'Payment request created successfully',
      paymentId: pendingPayment._id,
      isExisting: false,
    });
  } catch (error: any) {
    console.error('[POST /api/pending-payments] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create payment request' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/pending-payments?phone=xxx
 * Check if user has pending payment for a product
 */
export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const phone = searchParams.get('phone');
    const productId = searchParams.get('productId');

    if (!phone) {
      return NextResponse.json({ error: 'Phone required' }, { status: 400 });
    }

    const normalizedPhone = normalizePhone(phone);
    const PendingPayment = getPendingPayment();

    const query: any = { phone: normalizedPhone, status: 'pending' };
    if (productId) {
      query.productId = productId;
    }

    const pendingPayments = await PendingPayment.find(query).sort({ createdAt: -1 }).limit(10);

    return NextResponse.json({
      success: true,
      payments: pendingPayments,
    });
  } catch (error: any) {
    console.error('[GET /api/pending-payments] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch pending payments' },
      { status: 500 }
    );
  }
}
