import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';

// Question Schema
const QuestionSchema = new mongoose.Schema({
  userId: { type: String },
  userName: { type: String, required: true },
  userPhone: { type: String },
  userEmail: { type: String },
  question: { type: String, required: true },
  answer: { type: String },
  category: { type: String, default: 'general' }, // yoga, pranayama, health, lifestyle
  communityId: { type: String, default: 'global' },
  status: { type: String, enum: ['pending', 'answered', 'rejected'], default: 'pending' },
  answeredBy: { type: String },
  answeredAt: { type: Date },
  featured: { type: Boolean, default: false },
  viewCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
}, { collection: 'community_questions' });

function getQuestion() {
  return mongoose.models.Question || mongoose.model('Question', QuestionSchema);
}

/**
 * GET /api/community/questions
 * Fetch answered questions (public) or all (admin)
 */
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const Question = getQuestion();
    
    const url = new URL(request.url);
    const status = url.searchParams.get('status') || 'answered';
    const category = url.searchParams.get('category');
    const communityId = url.searchParams.get('communityId');
    const search = url.searchParams.get('search');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    
    const query: any = {};
    
    // Public only sees answered
    if (status === 'answered') {
      query.status = 'answered';
    } else if (status === 'all' || status === 'pending') {
      const authHeader = request.headers.get('authorization');
      if (!authHeader) {
        query.status = 'answered';
      } else {
        if (status === 'pending') query.status = 'pending';
      }
    }
    
    if (category && category !== 'all') query.category = category;
    if (communityId) query.communityId = communityId;
    if (search) {
      query.$or = [
        { question: { $regex: search, $options: 'i' } },
        { answer: { $regex: search, $options: 'i' } },
      ];
    }
    
    const questions = await Question.find(query)
      .sort({ featured: -1, answeredAt: -1, createdAt: -1 })
      .limit(limit)
      .lean();
    
    // Get category counts
    const categoryCounts = await Question.aggregate([
      { $match: { status: 'answered' } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
    ]);
    
    // Get pending count for admin
    const pendingCount = await Question.countDocuments({ status: 'pending' });
    
    return NextResponse.json({
      success: true,
      questions,
      categories: categoryCounts,
      pendingCount,
    });
  } catch (error) {
    console.error('[Questions] GET error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch questions',
    }, { status: 500 });
  }
}

/**
 * POST /api/community/questions
 * Submit a new question
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const { userName, question, category, communityId, userPhone, userEmail } = body;
    
    if (!userName?.trim()) {
      return NextResponse.json({ success: false, error: 'Name is required' }, { status: 400 });
    }
    if (!question?.trim()) {
      return NextResponse.json({ success: false, error: 'Question is required' }, { status: 400 });
    }
    
    await connectDB();
    const Question = getQuestion();
    
    const newQuestion = await Question.create({
      userName: userName.trim(),
      userPhone,
      userEmail,
      question: question.trim(),
      category: category || 'general',
      communityId: communityId || 'global',
      status: 'pending',
    });
    
    console.log('[Questions] New question:', newQuestion._id, 'by', userName);
    
    return NextResponse.json({
      success: true,
      message: 'Your question has been submitted! We\'ll answer it soon.',
      question: {
        _id: newQuestion._id,
        status: newQuestion.status,
      },
    });
  } catch (error) {
    console.error('[Questions] POST error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to submit question',
    }, { status: 500 });
  }
}

/**
 * PATCH /api/community/questions
 * Admin: Answer or reject question
 */
export async function PATCH(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')?.slice('Bearer '.length);
    if (!authHeader) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    
    const { verifyToken } = await import('@/lib/auth');
    const decoded = verifyToken(authHeader);
    if (!decoded?.isAdmin) {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
    }
    
    const body = await request.json();
    const { questionId, answer, action, featured, category } = body;
    
    if (!questionId) {
      return NextResponse.json({ success: false, error: 'Question ID required' }, { status: 400 });
    }
    
    await connectDB();
    const Question = getQuestion();
    
    const update: any = {};
    
    if (answer) {
      update.answer = answer.trim();
      update.status = 'answered';
      update.answeredBy = decoded.userId;
      update.answeredAt = new Date();
    }
    
    if (action === 'reject') {
      update.status = 'rejected';
    }
    
    if (typeof featured === 'boolean') {
      update.featured = featured;
    }
    
    if (category) {
      update.category = category;
    }
    
    const updated = await Question.findByIdAndUpdate(
      questionId,
      { $set: update },
      { new: true }
    );
    
    if (!updated) {
      return NextResponse.json({ success: false, error: 'Question not found' }, { status: 404 });
    }
    
    return NextResponse.json({
      success: true,
      message: answer ? 'Question answered!' : 'Question updated',
      question: updated,
    });
  } catch (error) {
    console.error('[Questions] PATCH error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update question',
    }, { status: 500 });
  }
}
