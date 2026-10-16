/**
 * Course Enrollment API (BunnyDB)
 * POST /api/recorded-courses/enroll - Enroll user in a course
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import {
  getCourseById,
  getEnrollment,
  saveEnrollment,
} from '@/lib/bunnyCourseRepository';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(authHeader.split(' ')[1]);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const body = await request.json();
    const { courseId, currency = 'INR', useGiftHours } = body;

    if (!courseId) {
      return NextResponse.json({ error: 'Course ID required' }, { status: 400 });
    }

    const userId = (decoded as any).id || (decoded as any)._id || (decoded as any).userId;
    if (!userId) {
      return NextResponse.json({ error: 'User ID not found' }, { status: 401 });
    }

    const course = await getCourseById(courseId);
    if (!course || !course.isActive || !course.isPublished) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    const existingEnrollment = await getEnrollment(String(userId), course.id);
    if (existingEnrollment) {
      return NextResponse.json({
        success: true,
        message: 'Already enrolled',
        enrollment: existingEnrollment,
        alreadyEnrolled: true,
      });
    }

    let price = course.pricing?.INR?.price || 0;
    let currencyUsed = 'INR';
    if (currency === 'USD' && course.pricing?.USD?.price) {
      price = course.pricing.USD.price;
      currencyUsed = 'USD';
    } else if (currency === 'NPR' && course.pricing?.NPR?.price) {
      price = course.pricing.NPR.price;
      currencyUsed = 'NPR';
    }

    const needsPayment = !course.isFree && price > 0;

    // Gift hours trial enrollment
    if (useGiftHours && course.giftHours?.enabled) {
      const giftHours = course.giftHours.hours || 2;
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

      const enrollment = await saveEnrollment({
        userId: String(userId),
        courseId: course.id,
        status: 'active',
        expiresAt,
        data: {
          purchaseType: 'gift',
          currency: currencyUsed,
          giftHoursRemaining: giftHours,
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Gift hours activated',
        enrollment,
        giftHours,
      });
    }

    // Free course enrollment
    if (!needsPayment || course.isFree) {
      const enrollment = await saveEnrollment({
        userId: String(userId),
        courseId: course.id,
        status: 'active',
        data: {
          purchaseType: 'free',
          currency: currencyUsed,
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Enrolled successfully',
        enrollment,
      });
    }

    // Paid course payment initiation
    const orderId = `RC-${course.id.slice(-8)}-${Date.now()}`;
    const pendingEnrollment = await saveEnrollment({
      userId: String(userId),
      courseId: course.id,
      status: 'pending',
      data: {
        purchaseType: 'paid',
        paymentId: orderId,
        currency: currencyUsed,
        amountPaid: price,
      },
    });

    const paymentData = {
      orderId,
      orderAmount: price,
      orderCurrency: currencyUsed,
      courseId: course.id,
      courseName: course.content?.en?.title || course.slug,
      enrollmentId: pendingEnrollment.id,
      customerDetails: {
        customerId: userId,
        customerEmail: decoded.email || '',
        customerName: decoded.name || '',
      },
      returnUrl: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://swaryoga.com'}/e-learning/${course.slug}/payment/callback`,
      notifyUrl: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://swaryoga.com'}/api/recorded-courses/payment/webhook`,
    };

    return NextResponse.json({
      success: true,
      requiresPayment: true,
      paymentData,
      enrollment: pendingEnrollment,
    });
  } catch (error: any) {
    console.error('[Course Enrollment Error]:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
