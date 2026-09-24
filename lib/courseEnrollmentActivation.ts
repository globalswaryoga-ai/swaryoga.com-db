/**
 * E-learning course enrollment activation.
 *
 * When a Cashfree payment for a course order succeeds, the buyer must end up
 * with an ACTIVE CourseEnrollment — that's what unlocks their videos. This is
 * called from BOTH confirmation paths (the server webhook and the browser
 * return redirect) so whichever fires first activates access and the other is
 * a no-op. Idempotent via the order's enrollmentCreated flag and the unique
 * {userId, courseId} enrollment index.
 */

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { User } from '@/lib/db';
import { getCourseEnrollment, getRecordedCourse } from '@/lib/schemas/recordedCourseSchemas';

function normalizeEmail(value: unknown) {
  return String(value || '').trim().toLowerCase();
}

function buildAutoPassword() {
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
}

/**
 * Resolve the paying user to a real User _id. Guest checkouts (order.userId
 * like "guest-...") are matched by email, creating the account if needed so
 * the buyer can log in and reach their course.
 */
export async function resolveCourseAccessUser(order: any) {
  const shippingAddress = order.shippingAddress || {};
  const rawUserId = String(order.userId || '').trim();

  if (mongoose.Types.ObjectId.isValid(rawUserId)) {
    const existingById = await User.findById(rawUserId).select('_id').lean() as any;
    if (existingById?._id) return existingById._id;
  }

  const email = normalizeEmail(shippingAddress.email || order.email);
  if (!email) return null;

  const existingByEmail = await User.findOne({ email }).select('_id').lean() as any;
  if (existingByEmail?._id) return existingByEmail._id;

  const firstName = String(shippingAddress.firstName || '').trim();
  const lastName = String(shippingAddress.lastName || '').trim();
  const name = [firstName, lastName].filter(Boolean).join(' ') || email.split('@')[0] || 'Student';
  const hashedPassword = await bcrypt.hash(buildAutoPassword(), 10);

  const user = await User.create({
    name,
    email,
    phone: shippingAddress.phone ? String(shippingAddress.phone) : undefined,
    countryCode: '+91',
    country: shippingAddress.country || 'India',
    state: shippingAddress.state || 'Unknown',
    gender: 'Other',
    age: 18,
    profession: 'Student',
    password: hashedPassword,
  });

  return user._id;
}

/**
 * Ensure the order's buyer has an active enrollment in the order's course.
 * Safe to call multiple times and from multiple confirmation paths.
 * Returns true when the buyer has (or now has) active access.
 */
export async function activateCourseEnrollmentForOrder(order: any, paymentRef: string): Promise<boolean> {
  if (!order?.courseId) return false;
  if (order.enrollmentCreated) return true;

  const CourseEnrollment = getCourseEnrollment();
  const RecordedCourse = getRecordedCourse();

  const userId = await resolveCourseAccessUser(order);
  if (!userId) {
    console.error(`[Course Activation] Unable to resolve user for order ${order._id} (userId=${order.userId})`);
    return false;
  }

  const courseId = order.courseId;
  const existingEnrollment: any = await CourseEnrollment.findOne({ userId, courseId });

  if (existingEnrollment) {
    if (!['active', 'completed'].includes(String(existingEnrollment.status))) {
      existingEnrollment.status = 'active';
      existingEnrollment.purchaseType = 'paid';
      existingEnrollment.paymentId = paymentRef;
      existingEnrollment.currency = existingEnrollment.currency || 'INR';
      existingEnrollment.amountPaid = existingEnrollment.amountPaid || order.total;
      existingEnrollment.expiresAt = existingEnrollment.expiresAt || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
      await existingEnrollment.save();
      console.log(`[Course Activation] Re-activated enrollment ${existingEnrollment._id} for user ${userId}`);
    }
  } else {
    try {
      const enrollment = new CourseEnrollment({
        userId,
        courseId,
        purchaseType: 'paid',
        paymentId: paymentRef,
        currency: 'INR',
        amountPaid: order.total,
        status: 'active',
        progress: 0,
        videosWatched: [],
        totalWatchTime: 0,
        assignmentsCompleted: [],
        certificateIssued: false,
        enrolledAt: new Date(),
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year access
      });
      await enrollment.save();
      await RecordedCourse.findByIdAndUpdate(courseId, { $inc: { enrolledCount: 1 } });
      console.log(`[Course Activation] Created enrollment for user ${userId} in course ${courseId}`);
    } catch (e: any) {
      // Duplicate key = a concurrent confirmation path won the race — that's success.
      if (e?.code !== 11000) throw e;
    }
  }

  order.enrollmentCreated = true;
  await order.save();
  return true;
}
