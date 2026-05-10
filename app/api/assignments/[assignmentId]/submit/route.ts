/**
 * Assignment Submission API
 * POST /api/assignments/[assignmentId]/submit - Submit assignment/quiz
 */

import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import mongoose from 'mongoose';

interface RouteParams {
  params: Promise<{ assignmentId: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    await connectDB();

    const { assignmentId } = await params;

    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(authHeader.split(' ')[1]);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const userId = decoded.id || decoded._id || decoded.userId;
    const body = await request.json();
    const { answers, file } = body;

    try {
      const db = mongoose.connection.db;
      if (!db) throw new Error('Database connection failed');

      const assignmentsCollection = db.collection('course_assignments');
      const submissionsCollection = db.collection('assignment_submissions');

      // Get assignment details
      const assignment = await assignmentsCollection.findOne({
        _id: new mongoose.Types.ObjectId(assignmentId),
      });

      if (!assignment) {
        return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
      }

      // Calculate score for quiz
      let score = 0;
      if (assignment.type === 'quiz' && assignment.questions && answers) {
        score = assignment.questions.reduce((total: number, question: any) => {
          if (question.type === 'multiple-choice' && answers[question.id] === question.correctAnswer) {
            return total + question.points;
          }
          // Note: essay/short-answer questions need manual grading
          return total;
        }, 0);
      }

      // Create or update submission
      const submission = {
        userId: new mongoose.Types.ObjectId(userId),
        assignmentId: new mongoose.Types.ObjectId(assignmentId),
        status: 'submitted',
        submittedAt: new Date(),
        answers: answers || {},
        fileUrl: file,
        score: assignment.type === 'quiz' ? score : null,
        feedback: null,
        gradePoints: assignment.type === 'quiz' ? score : null,
      };

      const result = await submissionsCollection.updateOne(
        {
          userId: new mongoose.Types.ObjectId(userId),
          assignmentId: new mongoose.Types.ObjectId(assignmentId),
        },
        { $set: submission },
        { upsert: true }
      );

      return NextResponse.json({
        success: true,
        message: 'Submission received',
        assignment: {
          ...assignment,
          submissionStatus: 'submitted',
          score: submission.score,
        },
      });

    } catch (e: any) {
      console.error('Submission error:', e);
      throw e;
    }

  } catch (error: any) {
    console.error('[Assignment Submit Error]:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
