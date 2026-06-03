/**
 * Admin API for E-Learning Analytics
 * GET /api/admin/e-learning/analytics - Get overall stats
 * GET /api/admin/e-learning/analytics?period=daily|weekly|monthly|yearly - Dashboard analytics with period filter
 * GET /api/admin/e-learning/analytics?courseId=... - Course specific stats
 * GET /api/admin/e-learning/analytics?userId=... - User specific stats
 */

import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';
import { getCourseEnrollment, getRecordedCourse, getVideoWatchLog } from '@/lib/schemas/recordedCourseSchemas';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';

function checkSuperAdminAccess(decoded: any | null): boolean {
  if (!decoded) return false;
  return isSuperAdmin(decoded);
}

function calculateDateRange(period: string): { startDate: Date; endDate: Date; format: string } {
  const endDate = new Date();
  const startDate = new Date();

  switch (period) {
    case 'daily':
      startDate.setDate(startDate.getDate() - 1);
      return { startDate, endDate, format: 'daily' };
    case 'weekly':
      startDate.setDate(startDate.getDate() - 7);
      return { startDate, endDate, format: 'weekly' };
    case 'yearly':
      startDate.setFullYear(startDate.getFullYear() - 1);
      return { startDate, endDate, format: 'yearly' };
    case 'monthly':
    default:
      startDate.setDate(startDate.getDate() - 30);
      return { startDate, endDate, format: 'monthly' };
  }
}

function formatDate(date: Date, format: string): string {
  const d = new Date(date);
  if (format === 'daily') {
    return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
  } else if (format === 'weekly') {
    return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
  } else if (format === 'yearly') {
    return d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
  }
  return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
}

/**
 * GET - Get analytics data
 */
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let decoded: any;
    try {
      decoded = verifyToken(authHeader.split(' ')[1]);
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    if (!checkSuperAdminAccess(decoded)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const period = request.nextUrl.searchParams.get('period');
    const courseId = request.nextUrl.searchParams.get('courseId');
    const userId = request.nextUrl.searchParams.get('userId');

    const CourseEnrollment = getCourseEnrollment();
    const RecordedCourse = getRecordedCourse();
    const VideoWatchLog = getVideoWatchLog();

    // Dashboard analytics with period filter
    if (period && !courseId && !userId) {
      const { startDate, endDate, format } = calculateDateRange(period);

      // New workshops in period
      const newWorkshops = await RecordedCourse.countDocuments({
        createdAt: { $gte: startDate, $lte: endDate },
        isPublished: true,
      });

      // New enrollments in period
      const newEnrollments = await CourseEnrollment.countDocuments({
        enrolledAt: { $gte: startDate, $lte: endDate },
      });

      // Active users in period
      const activeUsers = await CourseEnrollment.countDocuments({
        status: 'active',
        enrolledAt: { $gte: startDate, $lte: endDate },
      });

      // Get enrollments for period to calculate payments
      const enrollmentsInPeriod = await CourseEnrollment.find({
        enrolledAt: { $gte: startDate, $lte: endDate },
      }).populate('courseId', 'pricing');

      const paymentsReceived = enrollmentsInPeriod.reduce((sum: number, enrollment: any) => {
        const pricing = enrollment.courseId?.pricing;
        if (pricing && enrollment.status !== 'gift') {
          const amount = pricing.INR || 0;
          return sum + amount;
        }
        return sum;
      }, 0);

      // Enrollment trend over time
      const enrollmentTrend = await CourseEnrollment.aggregate([
        {
          $match: {
            enrolledAt: { $gte: startDate, $lte: endDate },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: {
                format: format === 'yearly' ? '%Y-%m' : '%Y-%m-%d',
                date: '$enrolledAt',
              },
            },
            count: { $sum: 1 },
          },
        },
        {
          $sort: { _id: 1 },
        },
      ]);

      // Revenue trend over time
      const revenueTrend = await CourseEnrollment.aggregate([
        {
          $match: {
            enrolledAt: { $gte: startDate, $lte: endDate },
            status: { $ne: 'gift' },
          },
        },
        {
          $lookup: {
            from: 'recordedcourses',
            localField: 'courseId',
            foreignField: '_id',
            as: 'course',
          },
        },
        {
          $unwind: '$course',
        },
        {
          $group: {
            _id: {
              $dateToString: {
                format: format === 'yearly' ? '%Y-%m' : '%Y-%m-%d',
                date: '$enrolledAt',
              },
            },
            amount: {
              $sum: {
                $convert: { input: '$course.pricing.INR', to: 'double', onError: 0, onNull: 0 },
              },
            },
          },
        },
        {
          $sort: { _id: 1 },
        },
      ]);

      // Progress distribution
      const progressDistribution = await CourseEnrollment.aggregate([
        {
          $match: {
            enrolledAt: { $gte: startDate, $lte: endDate },
          },
        },
        {
          $bucket: {
            groupBy: { $convert: { input: '$progress', to: 'double', onError: 0, onNull: 0 } },
            boundaries: [0, 25, 50, 75, 100, 101],
            default: 'other',
            output: { count: { $sum: 1 } },
          },
        },
      ]);

      // Top courses by enrollment
      const topCourses = await CourseEnrollment.aggregate([
        {
          $match: {
            enrolledAt: { $gte: startDate, $lte: endDate },
          },
        },
        {
          $group: {
            _id: '$courseId',
            enrollments: { $sum: 1 },
          },
        },
        {
          $lookup: {
            from: 'recordedcourses',
            localField: '_id',
            foreignField: '_id',
            as: 'course',
          },
        },
        {
          $unwind: '$course',
        },
        {
          $group: {
            _id: '$_id',
            title: { $first: '$course.content.en.title' },
            enrollments: { $first: '$enrollments' },
            revenue: {
              $sum: {
                $multiply: [
                  '$enrollments',
                  { $convert: { input: '$course.pricing.INR', to: 'double', onError: 0, onNull: 0 } },
                ],
              },
            },
          },
        },
        {
          $sort: { enrollments: -1 },
        },
        {
          $limit: 10,
        },
      ]);

      // Recent enrollments
      const recentEnrollments = await CourseEnrollment.aggregate([
        {
          $match: {
            enrolledAt: { $gte: startDate, $lte: endDate },
          },
        },
        {
          $lookup: {
            from: 'users',
            localField: 'userId',
            foreignField: '_id',
            as: 'user',
          },
        },
        {
          $unwind: '$user',
        },
        {
          $lookup: {
            from: 'recordedcourses',
            localField: 'courseId',
            foreignField: '_id',
            as: 'course',
          },
        },
        {
          $unwind: '$course',
        },
        {
          $project: {
            userName: '$user.name',
            userEmail: '$user.email',
            courseName: '$course.content.en.title',
            enrolledAt: '$enrolledAt',
          },
        },
        {
          $sort: { enrolledAt: -1 },
        },
        {
          $limit: 10,
        },
      ]);

      // Format trend data
      const formattedEnrollmentTrend = enrollmentTrend.map((item: any) => ({
        date: formatDate(new Date(item._id), format),
        count: item.count,
      }));

      const formattedRevenueTrend = revenueTrend.map((item: any) => ({
        date: formatDate(new Date(item._id), format),
        amount: Math.round(item.amount),
      }));

      // Format progress distribution
      const progressRanges = ['0-25%', '25-50%', '50-75%', '75-100%'];
      const formattedProgressDistribution = progressDistribution.map((item: any, idx: number) => ({
        range: progressRanges[idx] || 'Unknown',
        count: item.count || 0,
      }));

      return NextResponse.json({
        success: true,
        stats: {
          newWorkshops,
          newEnrollments,
          paymentsReceived: Math.round(paymentsReceived),
          activeUsers,
          enrollmentsTrend: formattedEnrollmentTrend,
          revenueTrend: formattedRevenueTrend,
          progressDistribution: formattedProgressDistribution,
          topCourses: topCourses.map((c: any) => ({
            title: c.title,
            enrollments: c.enrollments,
            revenue: Math.round(c.revenue || 0),
          })),
          recentEnrollments,
        },
      });
    }

    // Overall stats
    if (!courseId && !userId) {
      const totalEnrollments = await CourseEnrollment.countDocuments();
      const activeEnrollments = await CourseEnrollment.countDocuments({ status: 'active' });
      const completedEnrollments = await CourseEnrollment.countDocuments({ status: 'completed' });
      const totalCourses = await RecordedCourse.countDocuments({ isPublished: true });

      const watchLogs = await VideoWatchLog.aggregate([
        {
          $group: {
            _id: null,
            totalWatchTime: { $sum: '$watchDuration' },
            totalSessions: { $sum: 1 },
          },
        },
      ]);

      const enrollmentStats = await CourseEnrollment.aggregate([
        {
          $group: {
            _id: null,
            avgProgress: { $avg: '$progress' },
            totalWatchTime: { $sum: '$totalWatchTime' },
          },
        },
      ]);

      return NextResponse.json({
        success: true,
        stats: {
          totalEnrollments,
          activeEnrollments,
          completedEnrollments,
          totalCourses,
          avgProgress: enrollmentStats[0]?.avgProgress || 0,
          totalWatchTime: enrollmentStats[0]?.totalWatchTime || 0,
          totalWatchSessions: watchLogs[0]?.totalSessions || 0,
        },
      });
    }

    // Course specific stats
    if (courseId) {
      const course = await RecordedCourse.findById(courseId);
      if (!course) {
        return NextResponse.json({ error: 'Course not found' }, { status: 404 });
      }

      const enrollments = await CourseEnrollment.find({ courseId }).populate('userId', 'name email');
      const totalEnrolled = enrollments.length;
      const completed = enrollments.filter((e: any) => e.status === 'completed').length;
      const active = enrollments.filter((e: any) => e.status === 'active').length;
      const avgProgress = enrollments.reduce((sum: number, e: any) => sum + (e.progress || 0), 0) / (totalEnrolled || 1);
      const totalWatchTime = enrollments.reduce((sum: number, e: any) => sum + (e.totalWatchTime || 0), 0);

      return NextResponse.json({
        success: true,
        course: {
          title: course.content?.en?.title,
          slug: course.slug,
        },
        stats: {
          totalEnrolled,
          completed,
          active,
          completionRate: totalEnrolled > 0 ? Math.round((completed / totalEnrolled) * 100) : 0,
          avgProgress: Math.round(avgProgress),
          totalWatchTime,
          enrollmentDetails: enrollments.map((e: any) => ({
            userId: e.userId?._id,
            userName: e.userId?.name,
            userEmail: e.userId?.email,
            progress: e.progress,
            status: e.status,
            watchTime: e.totalWatchTime,
            enrolledAt: e.enrolledAt,
          })),
        },
      });
    }

    // User specific stats
    if (userId) {
      const enrollments = await CourseEnrollment.find({ userId: new mongoose.Types.ObjectId(userId) })
        .populate('courseId', 'slug content.en.title');

      const stats = enrollments.map((e: any) => ({
        courseId: e.courseId?._id,
        courseName: e.courseId?.content?.en?.title,
        courseSlug: e.courseId?.slug,
        progress: e.progress,
        status: e.status,
        watchTime: e.totalWatchTime,
        enrolledAt: e.enrolledAt,
        certificateIssued: e.certificateIssued,
      }));

      const totalWatchTime = enrollments.reduce((sum: number, e: any) => sum + (e.totalWatchTime || 0), 0);
      const avgProgress = enrollments.length > 0
        ? Math.round(enrollments.reduce((sum: number, e: any) => sum + e.progress, 0) / enrollments.length)
        : 0;

      return NextResponse.json({
        success: true,
        stats: {
          totalCourses: enrollments.length,
          totalWatchTime,
          avgProgress,
          completedCourses: enrollments.filter((e: any) => e.status === 'completed').length,
          enrollments: stats,
        },
      });
    }

    return NextResponse.json({ success: true, stats: {} });

  } catch (error: any) {
    console.error('[Analytics GET Error]:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
