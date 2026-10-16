/**
 * Cashfree Payment Webhook for Recorded Courses
 * POST /api/recorded-courses/payment/webhook
 * Connected to Bunny Database
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  findEnrollmentByPaymentId,
  updateEnrollmentStatus,
  incrementCourseEnrolledCount,
  getCourseById,
} from '@/lib/bunnyCourseRepository';
import { getUserById } from '@/lib/repositories/userRepository';
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

export async function POST(request: NextRequest) {
  try {
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
    
    // Find pending enrollment by order ID or payment ID
    const enrollment = await findEnrollmentByPaymentId(order.order_id);
    
    if (!enrollment) {
      console.error('[Cashfree Webhook] No pending enrollment found for order:', order.order_id);
      return NextResponse.json({ success: true, message: 'No pending enrollment' });
    }
    
    // Get course for reference
    const course = await getCourseById(enrollment.courseId);
    
    // Update enrollment to active
    const transactionId = payment?.cf_payment_id || payment?.payment_id || order.order_id;
    const updatedEnrollment = await updateEnrollmentStatus(enrollment.id, 'active', {
      paymentId: transactionId,
      cfPaymentId: payment?.cf_payment_id,
      paymentStatus: 'SUCCESS',
      paidAt: new Date().toISOString(),
    });
    
    // Increment course enrolled count
    if (course) {
      await incrementCourseEnrolledCount(course.id, 1).catch((e) =>
        console.error('[Cashfree Webhook] Error updating course count:', e)
      );
    }
    
    // Send payment confirmation email
    try {
      const user = await getUserById(enrollment.userId);
      if (user && user.email) {
        await notifyPaymentConfirmation(
          { 
            name: user.name || 'Student', 
            email: user.email,
            phone: user.phone || undefined,
          },
          {
            orderId: order.order_id,
            amount: enrollment.data?.amountPaid || order.order_amount || 0,
            currency: enrollment.data?.currency || 'INR',
            workshopName: (course?.content as any)?.en?.title || course?.slug || 'E-Learning Course',
            paymentMethod: 'Cashfree',
            transactionId,
          }
        );
        console.log('[Cashfree Webhook] Payment confirmation email sent to:', user.email);
      }
    } catch (emailErr) {
      // Don't fail the webhook if email fails
      console.error('[Cashfree Webhook] Email notification error:', emailErr);
    }
    
    console.log('[Cashfree Webhook] Enrollment activated:', updatedEnrollment?.id || enrollment.id);
    
    return NextResponse.json({
      success: true,
      message: 'Payment processed',
      enrollmentId: updatedEnrollment?.id || enrollment.id,
    });
    
  } catch (error: any) {
    console.error('[Cashfree Webhook Error]:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
