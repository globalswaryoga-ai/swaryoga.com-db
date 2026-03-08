/**
 * Cashfree Payment Webhook for Recorded Courses
 * POST /api/recorded-courses/payment/webhook
 */

import { NextRequest, NextResponse } from 'next/server';
import connectDB, { getUser } from '@/lib/db';
import { getCourseEnrollment, getRecordedCourse } from '@/lib/schemas/recordedCourseSchemas';
import { notifyPaymentConfirmation } from '@/lib/notifications';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

// Verify Cashfree signature
function verifyCashfreeSignature(
  signature: string,
  timestamp: string,
  rawBody: string
): boolean {
  const secretKey = process.env.CASHFREE_CLIENT_SECRET || process.env.CASHFREE_SECRET_KEY;
  if (!secretKey) {
    console.error('CASHFREE_CLIENT_SECRET not configured');
    return false;
  }
  
  const signatureData = timestamp + rawBody;
  const expectedSignature = crypto
    .createHmac('sha256', secretKey)
    .update(signatureData)
    .digest('base64');
  
  return signature === expectedSignature;
}

// Generate receipt number
function generateReceiptNumber(): string {
  const prefix = 'RCPT';
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}-${date}-${random}`;
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const rawBody = await request.text();
    const signature = request.headers.get('x-webhook-signature') || '';
    const timestamp = request.headers.get('x-webhook-timestamp') || '';
    
    // For production, verify signature
    if (process.env.NODE_ENV === 'production') {
      if (!verifyCashfreeSignature(signature, timestamp, rawBody)) {
        console.error('Invalid Cashfree webhook signature');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    }
    
    const payload = JSON.parse(rawBody);
    const { data, type } = payload;
    
    console.log('[Cashfree Webhook] Received:', type, data?.order?.order_id);
    
    if (type !== 'PAYMENT_SUCCESS_WEBHOOK') {
      // Acknowledge but don't process non-success events
      return NextResponse.json({ success: true, message: 'Event acknowledged' });
    }
    
    const order = data?.order;
    const payment = data?.payment;
    
    if (!order?.order_id) {
      return NextResponse.json({ error: 'Missing order ID' }, { status: 400 });
    }
    
    const CourseEnrollment = getCourseEnrollment();
    const RecordedCourse = getRecordedCourse();
    
    // Find pending enrollment by payment ID (order ID stored in paymentId field)
    const enrollment = await CourseEnrollment.findOne({
      paymentId: order.order_id,
      status: 'expired', // 'expired' is used for pending payments
    });
    
    if (!enrollment) {
      console.error('[Cashfree Webhook] No pending enrollment found for order:', order.order_id);
      // Still acknowledge - might be duplicate webhook
      return NextResponse.json({ success: true, message: 'No pending enrollment' });
    }
    
    // Get course for reference
    const course = await RecordedCourse.findById(enrollment.courseId);
    
    // Update enrollment to active
    const updatedEnrollment = await CourseEnrollment.findByIdAndUpdate(
      enrollment._id,
      {
        status: 'active',
        // Store transaction ID in paymentId
        paymentId: payment?.cf_payment_id || payment?.payment_id || order.order_id,
      },
      { new: true }
    );
    
    // Increment course enrolled count
    if (course) {
      await RecordedCourse.findByIdAndUpdate(course._id, {
        $inc: { enrolledCount: 1 },
      });
    }
    
    // Send payment confirmation email
    try {
      const User = getUser();
      const user = await User.findById(enrollment.userId);
      if (user && user.email) {
        await notifyPaymentConfirmation(
          { 
            name: user.name || 'Student', 
            email: user.email,
            phone: user.phone,
          },
          {
            orderId: order.order_id,
            amount: enrollment.amountPaid || order.order_amount || 0,
            currency: enrollment.currency || 'INR',
            workshopName: course?.content?.en?.title || 'E-Learning Course',
            paymentMethod: 'Cashfree',
            transactionId: payment?.cf_payment_id || payment?.payment_id,
          }
        );
        console.log('[Cashfree Webhook] Payment confirmation email sent to:', user.email);
      }
    } catch (emailErr) {
      // Don't fail the webhook if email fails
      console.error('[Cashfree Webhook] Email notification error:', emailErr);
    }
    
    console.log('[Cashfree Webhook] Enrollment activated:', updatedEnrollment?._id);
    
    return NextResponse.json({
      success: true,
      message: 'Payment processed',
      enrollmentId: updatedEnrollment?._id,
    });
    
  } catch (error: any) {
    console.error('[Cashfree Webhook Error]:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
