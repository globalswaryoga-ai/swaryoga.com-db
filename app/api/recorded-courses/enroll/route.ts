/**

 * Course Enrollment API (Bunny Database / LibSQL)
 * POST /api/recorded-courses/enroll - Enroll user in a course
 */

import { NextRequest, NextResponse } from 'next/server';

import crypto from 'crypto';
import { verifyToken } from '@/lib/auth';
import { bunnyExecute, isBunnyDatabaseConfigured } from '@/lib/bunnyDatabase';

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


    const userId = decoded.id || decoded._id || decoded.userId;
    if (!userId) {
      return NextResponse.json({ error: 'User ID not found' }, { status: 401 });
    }


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
      return NextResponse.json({
        success: true,
        message: 'Already enrolled',
        enrollment: existingEnrollRes.rows[0],
        alreadyEnrolled: true,
      });
    }


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
      currencyUsed = 'USD';
    } else if (currency === 'NPR' && pricingObj?.NPR?.price) {
      price = pricingObj.NPR.price;
      currencyUsed = 'NPR';
    }


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

      return NextResponse.json({
        success: true,
        message: 'Gift hours activated',
        enrollment: { id: enrollId, _id: enrollId, courseId: realCourseId, status: 'active' },
        giftHours,
      });
    }


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

      return NextResponse.json({
        success: true,
        message: 'Enrolled successfully',
        enrollment: { id: enrollId, _id: enrollId, courseId: realCourseId, status: 'active' },
      });
    }


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

    const paymentData = {
      orderId,
      orderAmount: price,
      orderCurrency: currencyUsed,

      courseId: realCourseId,
      courseName: contentObj?.en?.title || course.slug,
      enrollmentId: enrollId,
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
