import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { apiError, apiSuccess } from '@/lib/api-error';
import mongoose from 'mongoose';

// Define submission schema (same as user-facing API)
const communitySubmissionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  userEmail: { type: String, required: true },
  userName: { type: String, required: true },
  category: { 
    type: String, 
    enum: ['experiences', 'tips', 'transformations', 'questions'],
    required: true 
  },
  status: { 
    type: String, 
    enum: ['pending', 'approved', 'rejected', 'posted'],
    default: 'pending' 
  },
  participantName: { type: String, required: true },
  workshopName: { type: String },
  batchName: { type: String },
  imageUrl: { type: String },
  experienceDetails: { type: String },
  problemHeading: { type: String },
  problemDescription: { type: String },
  tipsDetails: { type: String },
  beforeStory: { type: String },
  afterStory: { type: String },
  question: { type: String },
  answer: { type: String },
  adminNotes: { type: String },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewedAt: { type: Date },
  postedAt: { type: Date },
  communityPostId: { type: mongoose.Schema.Types.ObjectId },
}, { timestamps: true });

function getCommunitySubmissionModel() {
  const crmDb = mongoose.connection.useDb(process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm');
  return crmDb.models.CommunitySubmission || crmDb.model('CommunitySubmission', communitySubmissionSchema);
}

// GET - Get all pending submissions (admin only)
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return apiError('Unauthorized', 401);
    }
    
    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    if (!decoded || !decoded.isAdmin) {
      return apiError('Admin access required', 403);
    }
    
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || 'pending';
    const category = searchParams.get('category');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    
    const CommunitySubmission = getCommunitySubmissionModel();
    
    const query: any = {};
    if (status !== 'all') {
      query.status = status;
    }
    if (category && category !== 'all') {
      query.category = category;
    }
    
    const submissions = await CommunitySubmission.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
    
    // Get counts by status
    const counts = await CommunitySubmission.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    
    const statusCounts = {
      pending: 0,
      approved: 0,
      rejected: 0,
      posted: 0,
    };
    counts.forEach((c: { _id: string; count: number }) => {
      if (c._id in statusCounts) {
        statusCounts[c._id as keyof typeof statusCounts] = c.count;
      }
    });
    
    return apiSuccess({ submissions, counts: statusCounts });
    
  } catch (error) {
    console.error('Get admin submissions error:', error);
    return apiError('Failed to fetch submissions', 500);
  }
}

// PATCH - Update submission status or add admin notes
export async function PATCH(req: NextRequest) {
  try {
    await connectDB();
    
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return apiError('Unauthorized', 401);
    }
    
    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    if (!decoded || !decoded.isAdmin) {
      return apiError('Admin access required', 403);
    }
    
    const body = await req.json();
    const { submissionId, status, adminNotes, answer } = body;
    
    if (!submissionId) {
      return apiError('Submission ID required', 400);
    }
    
    const CommunitySubmission = getCommunitySubmissionModel();
    
    const updateData: any = {
      reviewedBy: decoded.userId,
      reviewedAt: new Date(),
    };
    
    if (status) {
      updateData.status = status;
    }
    if (adminNotes !== undefined) {
      updateData.adminNotes = adminNotes;
    }
    if (answer !== undefined) {
      updateData.answer = answer;
    }
    if (status === 'posted') {
      updateData.postedAt = new Date();
    }
    
    const submission = await CommunitySubmission.findByIdAndUpdate(
      submissionId,
      { $set: updateData },
      { new: true }
    ).lean();
    
    if (!submission) {
      return apiError('Submission not found', 404);
    }
    
    return apiSuccess({ submission, message: 'Submission updated' });
    
  } catch (error) {
    console.error('Update submission error:', error);
    return apiError('Failed to update submission', 500);
  }
}

// DELETE - Delete a submission
export async function DELETE(req: NextRequest) {
  try {
    await connectDB();
    
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return apiError('Unauthorized', 401);
    }
    
    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    if (!decoded || !decoded.isAdmin) {
      return apiError('Admin access required', 403);
    }
    
    const { searchParams } = new URL(req.url);
    const submissionId = searchParams.get('id');
    
    if (!submissionId) {
      return apiError('Submission ID required', 400);
    }
    
    const CommunitySubmission = getCommunitySubmissionModel();
    
    const result = await CommunitySubmission.findByIdAndDelete(submissionId);
    
    if (!result) {
      return apiError('Submission not found', 404);
    }
    
    return apiSuccess({ message: 'Submission deleted' });
    
  } catch (error) {
    console.error('Delete submission error:', error);
    return apiError('Failed to delete submission', 500);
  }
}
