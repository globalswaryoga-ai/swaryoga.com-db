/**
 * User Assignments API
 * GET /api/user/assignments - Get all assignments for user
 */

import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { getCourseEnrollment, getRecordedCourse } from '@/lib/schemas/recordedCourseSchemas';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(authHeader.split(' ')[1]);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const userId = decoded.id || decoded._id || decoded.userId;

    const CourseEnrollment = getCourseEnrollment();
    const RecordedCourse = getRecordedCourse();

    // Get user's enrolled courses
    const enrollments = await CourseEnrollment.find({ userId }).populate('courseId');

    const assignments: any[] = [];

    // Get assignments from each course
    for (const enrollment of enrollments) {
      const course = enrollment.courseId;

      // Check if course has assignments collection
      try {
        const db = mongoose.connection.db;
        if (db) {
          const assignmentsCollection = db.collection('course_assignments');
          const courseAssignments = await assignmentsCollection
            .find({ courseId: course._id })
            .toArray();

          // Get submission status for each assignment
          for (const assignment of courseAssignments) {
            const submissionsCollection = db.collection('assignment_submissions');
            const submission = await submissionsCollection.findOne({
              userId: new mongoose.Types.ObjectId(userId),
              assignmentId: assignment._id,
            });

            assignments.push({
              id: assignment._id?.toString(),
              courseId: course._id?.toString(),
              courseTitle: course.content?.en?.title || course.title,
              title: assignment.title,
              description: assignment.description,
              dueDate: assignment.dueDate,
              type: assignment.type || 'assignment',
              totalPoints: assignment.totalPoints || 100,
              submissionStatus: submission ? submission.status : 'pending',
              submittedDate: submission?.submittedAt,
              score: submission?.score,
              feedback: submission?.feedback,
              questions: assignment.questions || [],
            });
          }
        }
      } catch (e) {
        // Collections might not exist yet
      }
    }

    // Sort by due date
    assignments.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

    return NextResponse.json({
      success: true,
      data: assignments,
    });

  } catch (error: any) {
    console.error('[User Assignments Error]:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
