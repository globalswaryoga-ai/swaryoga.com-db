/**
 * Course Enrollment API
 * POST /api/recorded-courses/enroll - Enroll user in a course
 * 
 * Body: { courseId, currency?, useGiftHours? }
 */

import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import {
  getRecordedCourse,
  getCourseEnrollment,
} from '@/lib/schemas/recordedCourseSchemas';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    // Auth required
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
    
    const userId = decoded.id || decoded._id || decoded.userId;
    if (!userId) {
      return NextResponse.json({ error: 'User ID not found' }, { status: 401 });
    }
    
    const RecordedCourse = getRecordedCourse();
    const CourseEnrollment = getCourseEnrollment();
    
    // Get course
    const course = await RecordedCourse.findById(courseId);
    if (!course || !course.isActive || !course.isPublished) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }
    
    // Check existing enrollment
    const existingEnrollment = await CourseEnrollment.findOne({
      userId: userId,
      courseId: course._id,
      status: { $in: ['active', 'completed'] },
    });
    
    if (existingEnrollment) {
      return NextResponse.json({
        success: true,
        message: 'Already enrolled',
        enrollment: existingEnrollment,
        alreadyEnrolled: true,
      });
    }
    
    // Determine price based on currency
    let price = course.pricing?.INR?.price || 0;
    let currencyUsed: 'INR' | 'NPR' | 'USD' = 'INR';
    
    if (currency === 'USD' && course.pricing?.USD?.price) {
      price = course.pricing.USD.price;
      currencyUsed = 'USD';
    } else if (currency === 'NPR' && course.pricing?.NPR?.price) {
      price = course.pricing.NPR.price;
      currencyUsed = 'NPR';
    }
    
    // Check if free course or using gift hours
    const needsPayment = !course.isFree && price > 0;
    
    // Gift hours enrollment (trial access)
    if (useGiftHours && course.giftHours?.enabled) {
      // Check if user already used gift hours
      const existingGiftEnrollment = await CourseEnrollment.findOne({
        userId: userId,
        courseId: course._id,
      });
      
      if (existingGiftEnrollment) {
        return NextResponse.json({ 
          error: 'Gift hours already used for this course' 
        }, { status: 400 });
      }
      
      // Default 2 hours if not specified
      const giftHours = course.giftHours.hours || 2;
      
      // Create gift hours enrollment
      const enrollment = await CourseEnrollment.create({
        userId: userId,
        courseId: course._id,
        purchaseType: 'gift',
        currency: currencyUsed,
        amountPaid: 0,
        giftHoursUsed: 0,
        giftHoursRemaining: giftHours,
        progress: 0,
        videosWatched: [],
        totalWatchTime: 0,
        assignmentsCompleted: [],
        certificateIssued: false,
        status: 'active',
        enrolledAt: new Date(),
        // Gift access expires in 7 days
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });
      
      // Increment enrolled count
      await RecordedCourse.findByIdAndUpdate(course._id, {
        $inc: { enrolledCount: 1 },
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
      const enrollment = await CourseEnrollment.create({
        userId: userId,
        courseId: course._id,
        purchaseType: 'free',
        currency: currencyUsed,
        amountPaid: 0,
        giftHoursUsed: 0,
        giftHoursRemaining: 0,
        progress: 0,
        videosWatched: [],
        totalWatchTime: 0,
        assignmentsCompleted: [],
        certificateIssued: false,
        status: 'active',
        enrolledAt: new Date(),
      });
      
      // Increment enrolled count
      await RecordedCourse.findByIdAndUpdate(course._id, {
        $inc: { enrolledCount: 1 },
      });
      
      return NextResponse.json({
        success: true,
        message: 'Enrolled successfully',
        enrollment,
      });
    }
    
    // ============================================
    // PAID COURSE - INITIATE PAYMENT
    // ============================================
    const orderId = `RC-${course._id.toString().slice(-8)}-${Date.now()}`;
    
    // Create pending enrollment
    const pendingEnrollment = await CourseEnrollment.create({
      userId: userId,
      courseId: course._id,
      purchaseType: 'paid',
      paymentId: orderId,
      currency: currencyUsed,
      amountPaid: price,
      giftHoursUsed: 0,
      giftHoursRemaining: 0,
      progress: 0,
      videosWatched: [],
      totalWatchTime: 0,
      assignmentsCompleted: [],
      certificateIssued: false,
      status: 'expired', // Will be set to active after payment
      enrolledAt: new Date(),
    });
    
    // Prepare Cashfree order data
    const paymentData = {
      orderId,
      orderAmount: price,
      orderCurrency: currencyUsed,
      courseId: course._id,
      courseName: course.content?.en?.title || course.slug,
      enrollmentId: pendingEnrollment._id,
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
