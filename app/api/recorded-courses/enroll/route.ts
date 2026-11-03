/**
<<<<<<< HEAD
 * Course Enrollment API (BunnyDB)
=======
 * Course Enrollment API (Bunny Database / LibSQL)
>>>>>>> 9f221716 (feat(rag-video): migrate to Bunny DB, replace HeyGen with Replicate & OpenAI, add MP4 Whisper transcription)
 * POST /api/recorded-courses/enroll - Enroll user in a course
 */

import { NextRequest, NextResponse } from 'next/server';
<<<<<<< HEAD
import { verifyToken } from '@/lib/auth';
import {
  getCourseById,
  getEnrollment,
  saveEnrollment,
} from '@/lib/bunnyCourseRepository';
=======
import crypto from 'crypto';
import { verifyToken } from '@/lib/auth';
import { bunnyExecute, isBunnyDatabaseConfigured } from '@/lib/bunnyDatabase';
>>>>>>> 9f221716 (feat(rag-video): migrate to Bunny DB, replace HeyGen with Replicate & OpenAI, add MP4 Whisper transcription)

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

<<<<<<< HEAD
    const body = await request.json();
    const { courseId, currency = 'INR', useGiftHours } = body;

    if (!courseId) {
      return NextResponse.json({ error: 'Course ID required' }, { status: 400 });
    }

    const userId = (decoded as any).id || (decoded as any)._id || (decoded as any).userId;
=======
    const userId = decoded.id || decoded._id || decoded.userId;
>>>>>>> 9f221716 (feat(rag-video): migrate to Bunny DB, replace HeyGen with Replicate & OpenAI, add MP4 Whisper transcription)
    if (!userId) {
      return NextResponse.json({ error: 'User ID not found' }, { status: 401 });
    }

<<<<<<< HEAD
    const course = await getCourseById(courseId);
    if (!course || !course.isActive || !course.isPublished) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    const existingEnrollment = await getEnrollment(String(userId), course.id);
    if (existingEnrollment) {
=======
    if (!isBunnyDatabaseConfigured()) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const body = await request.json();
    const { courseId, currency = 'INR', useGiftHours } = body;

    if (!courseId) {
      return NextResponse.json({ error: 'Course ID required' }, { status: 400 });
    }

    // 1. Fetch course from Bunny DB
    const courseRes = await bunnyExecute({
      sql: 'SELECT * FROM recorded_courses_sql WHERE id = ? OR slug = ? LIMIT 1',
      args: [courseId, courseId],
    });

    if (!courseRes.rows.length) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    const course = courseRes.rows[0];
    const realCourseId = String(course.id);

    // 2. Check existing enrollment in Bunny DB
    const existingEnrollRes = await bunnyExecute({
      sql: `SELECT * FROM course_enrollments_sql 
            WHERE user_id = ? AND course_id = ? AND status IN ('active', 'completed') LIMIT 1`,
      args: [userId, realCourseId],
    });

    if (existingEnrollRes.rows.length) {
>>>>>>> 9f221716 (feat(rag-video): migrate to Bunny DB, replace HeyGen with Replicate & OpenAI, add MP4 Whisper transcription)
      return NextResponse.json({
        success: true,
        message: 'Already enrolled',
        enrollment: existingEnrollRes.rows[0],
        alreadyEnrolled: true,
      });
    }

<<<<<<< HEAD
    let price = course.pricing?.INR?.price || 0;
    let currencyUsed = 'INR';
    if (currency === 'USD' && course.pricing?.USD?.price) {
      price = course.pricing.USD.price;
=======
    let pricingObj: any = {};
    try {
      pricingObj = course.pricing_json ? JSON.parse(String(course.pricing_json)) : {};
    } catch {}

    let giftHoursObj: any = {};
    try {
      giftHoursObj = course.gift_hours_json ? JSON.parse(String(course.gift_hours_json)) : {};
    } catch {}

    let contentObj: any = {};
    try {
      contentObj = course.content_json ? JSON.parse(String(course.content_json)) : {};
    } catch {}

    let price = pricingObj?.INR?.price || 0;
    let currencyUsed: 'INR' | 'NPR' | 'USD' = 'INR';

    if (currency === 'USD' && pricingObj?.USD?.price) {
      price = pricingObj.USD.price;
>>>>>>> 9f221716 (feat(rag-video): migrate to Bunny DB, replace HeyGen with Replicate & OpenAI, add MP4 Whisper transcription)
      currencyUsed = 'USD';
    } else if (currency === 'NPR' && pricingObj?.NPR?.price) {
      price = pricingObj.NPR.price;
      currencyUsed = 'NPR';
    }

<<<<<<< HEAD
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

=======
    const isFree = Boolean(course.is_free) || price === 0;
    const now = new Date().toISOString();
    const enrollId = `enr_${crypto.randomBytes(8).toString('hex')}`;

    // 3. Gift hours enrollment
    if (useGiftHours && giftHoursObj?.enabled) {
      const giftRes = await bunnyExecute({
        sql: 'SELECT * FROM course_enrollments_sql WHERE user_id = ? AND course_id = ? LIMIT 1',
        args: [userId, realCourseId],
      });

      if (giftRes.rows.length) {
        return NextResponse.json({ error: 'Gift hours already used for this course' }, { status: 400 });
      }

      const giftHours = Number(giftHoursObj.hours) || 2;
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

      const dataJson = JSON.stringify({
        purchaseType: 'gift',
        currency: currencyUsed,
        amountPaid: 0,
        giftHours,
      });

      await bunnyExecute({
        sql: `INSERT INTO course_enrollments_sql 
              (id, user_id, course_id, status, enrolled_at, expires_at, progress_percent, videos_watched_json, data_json, created_at, updated_at)
              VALUES (?, ?, ?, 'active', ?, ?, 0, '[]', ?, ?, ?)`,
        args: [enrollId, userId, realCourseId, now, expiresAt, dataJson, now, now],
      });

>>>>>>> 9f221716 (feat(rag-video): migrate to Bunny DB, replace HeyGen with Replicate & OpenAI, add MP4 Whisper transcription)
      return NextResponse.json({
        success: true,
        message: 'Gift hours activated',
        enrollment: { id: enrollId, _id: enrollId, courseId: realCourseId, status: 'active' },
        giftHours,
      });
    }

<<<<<<< HEAD
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

=======
    // 4. Free course enrollment
    if (isFree) {
      const dataJson = JSON.stringify({
        purchaseType: 'free',
        currency: currencyUsed,
        amountPaid: 0,
      });

      await bunnyExecute({
        sql: `INSERT INTO course_enrollments_sql 
              (id, user_id, course_id, status, enrolled_at, expires_at, progress_percent, videos_watched_json, data_json, created_at, updated_at)
              VALUES (?, ?, ?, 'active', ?, NULL, 0, '[]', ?, ?, ?)`,
        args: [enrollId, userId, realCourseId, now, dataJson, now, now],
      });

>>>>>>> 9f221716 (feat(rag-video): migrate to Bunny DB, replace HeyGen with Replicate & OpenAI, add MP4 Whisper transcription)
      return NextResponse.json({
        success: true,
        message: 'Enrolled successfully',
        enrollment: { id: enrollId, _id: enrollId, courseId: realCourseId, status: 'active' },
      });
    }

<<<<<<< HEAD
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

=======
    // 5. Paid course - create pending enrollment & return order data
    const orderId = `RC-${realCourseId.slice(-8)}-${Date.now()}`;
    const dataJson = JSON.stringify({
      purchaseType: 'paid',
      orderId,
      currency: currencyUsed,
      amountPaid: price,
    });

    await bunnyExecute({
      sql: `INSERT INTO course_enrollments_sql 
            (id, user_id, course_id, status, enrolled_at, expires_at, progress_percent, videos_watched_json, data_json, created_at, updated_at)
            VALUES (?, ?, ?, 'pending', ?, NULL, 0, '[]', ?, ?, ?)`,
      args: [enrollId, userId, realCourseId, now, dataJson, now, now],
    });

>>>>>>> 9f221716 (feat(rag-video): migrate to Bunny DB, replace HeyGen with Replicate & OpenAI, add MP4 Whisper transcription)
    const paymentData = {
      orderId,
      orderAmount: price,
      orderCurrency: currencyUsed,
<<<<<<< HEAD
      courseId: course.id,
      courseName: course.content?.en?.title || course.slug,
      enrollmentId: pendingEnrollment.id,
=======
      courseId: realCourseId,
      courseName: contentObj?.en?.title || course.slug,
      enrollmentId: enrollId,
>>>>>>> 9f221716 (feat(rag-video): migrate to Bunny DB, replace HeyGen with Replicate & OpenAI, add MP4 Whisper transcription)
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
      enrollment: { id: enrollId, _id: enrollId, status: 'pending' },
    });
  } catch (error: any) {
    console.error('[Course Enrollment Error]:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
