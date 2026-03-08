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

// Experience schema for community_experiences collection (main DB)
const experienceSchema = new mongoose.Schema({
  userId: { type: String },
  userName: { type: String, required: true },
  userPhone: { type: String },
  userEmail: { type: String },
  userPhoto: { type: String },
  content: { type: String, required: true },
  rating: { type: Number, min: 1, max: 5, required: true },
  photoUrl: { type: String },
  communityId: { type: String, default: 'global' },
  status: { type: String, enum: ['pending', 'approved', 'rejected', 'posted'], default: 'pending' },
  featured: { type: Boolean, default: false },
  approvedBy: { type: String },
  approvedAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
}, { collection: 'community_experiences' });

function getCommunitySubmissionModel() {
  const crmDb = mongoose.connection.useDb(process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm');
  return crmDb.models.CommunitySubmission || crmDb.model('CommunitySubmission', communitySubmissionSchema);
}

function getExperienceModel() {
  // Use main DB explicitly to avoid caching issues with mongoose models
  const mainDb = mongoose.connection.useDb(process.env.MONGODB_MAIN_DB_NAME || 'swaryogaDB');
  return mainDb.models.Experience || mainDb.model('Experience', experienceSchema);
}

// GET - Get all pending submissions (admin only)
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return apiError('UNAUTHORIZED');
    }
    
    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    if (!decoded || !decoded.isAdmin) {
      return apiError('FORBIDDEN', 'Admin access required');
    }
    
    
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || 'pending';
    const category = searchParams.get('category');
    
    const CommunitySubmission = getCommunitySubmissionModel();
    const Experience = getExperienceModel();
    
    // Query for CRM submissions
    const crmQuery: any = {};
    if (status !== 'all') {
      crmQuery.status = status;
    }
    if (category && category !== 'all') {
      crmQuery.category = category;
    }
    
    // Query for experiences (map status: approved in experiences = posted for consistency)
    const expQuery: any = {};
    if (status === 'pending') {
      expQuery.status = 'pending';
    } else if (status === 'approved') {
      // For CRM, approved != posted, but for experiences approved = ready to show
      expQuery.status = 'approved';
    } else if (status === 'rejected') {
      expQuery.status = 'rejected';
    } else if (status === 'posted') {
      expQuery.status = 'approved'; // Experiences that are approved = posted
    }
    // For experiences, only show category = 'experiences' or no filter
    if (category && category !== 'all' && category !== 'experiences') {
      // Don't fetch experiences if filtering by other categories
      expQuery._skipFetch = true;
    }
    
    // Fetch CRM submissions
    const crmSubmissions = await CommunitySubmission.find({ ...crmQuery })
      .sort({ createdAt: -1 })
      .lean();
    
    // Fetch experiences from main DB (unless filtered out)
    let experiences: any[] = [];
    if (!expQuery._skipFetch) {
      delete expQuery._skipFetch;
      console.log('[Submissions API] Fetching experiences with query:', expQuery);
      experiences = await Experience.find({ ...expQuery })
        .sort({ createdAt: -1 })
        .lean();
      console.log('[Submissions API] Found experiences:', experiences.length);
    }
    
    // Transform experiences to match submission format
    const transformedExperiences = experiences.map((exp: any) => ({
      _id: exp._id,
      source: 'experience', // Mark source for UI differentiation
      userId: exp.userId,
      userEmail: exp.userEmail || '',
      userName: exp.userName,
      participantName: exp.userName,
      category: 'experiences',
      status: exp.status === 'approved' ? 'approved' : exp.status,
      experienceDetails: exp.content,
      imageUrl: exp.photoUrl || exp.userPhoto,
      rating: exp.rating,
      communityId: exp.communityId,
      featured: exp.featured,
      createdAt: exp.createdAt,
      updatedAt: exp.createdAt,
    }));
    
    // Transform CRM submissions to mark source
    const transformedCrmSubmissions = crmSubmissions.map((sub: any) => ({
      ...sub,
      source: 'submission',
    }));
    
    // Merge and sort by createdAt
    const allSubmissions = [...transformedCrmSubmissions, ...transformedExperiences]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    // Get counts by status from both sources
    const crmCounts = await CommunitySubmission.aggregate([
      { $match: {  } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    
    const expCounts = await Experience.aggregate([
      { $match: {  } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    
    const statusCounts = {
      pending: 0,
      approved: 0,
      rejected: 0,
      posted: 0,
    };
    
    crmCounts.forEach((c: { _id: string; count: number }) => {
      if (c._id in statusCounts) {
        statusCounts[c._id as keyof typeof statusCounts] += c.count;
      }
    });
    
    expCounts.forEach((c: { _id: string; count: number }) => {
      if (c._id === 'pending') statusCounts.pending += c.count;
      else if (c._id === 'approved') statusCounts.approved += c.count;
      else if (c._id === 'rejected') statusCounts.rejected += c.count;
    });
    
    return apiSuccess({ submissions: allSubmissions, counts: statusCounts });
    
  } catch (error) {
    console.error('Get admin submissions error:', error);
    return apiError('SERVER_ERROR', 'Failed to fetch submissions');
  }
}

// PATCH - Update submission status or add admin notes
export async function PATCH(req: NextRequest) {
  try {
    await connectDB();
    
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return apiError('UNAUTHORIZED');
    }
    
    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    if (!decoded || !decoded.isAdmin) {
      return apiError('FORBIDDEN', 'Admin access required');
    }
    
    
    const body = await req.json();
    const { submissionId, status, adminNotes, answer, source } = body;
    
    if (!submissionId) {
      return apiError('VALIDATION_ERROR', 'Submission ID required');
    }
    
    // Handle experience source
    if (source === 'experience') {
      const Experience = getExperienceModel();
      const expUpdateData: any = {
        approvedBy: decoded.userId || decoded.email,
        approvedAt: new Date(),
      };
      if (status) {
        // Map 'posted' to 'approved' for experiences
        expUpdateData.status = status === 'posted' ? 'approved' : status;
      }
      
      const experience = await Experience.findOneAndUpdate(
        { _id: submissionId },
        { $set: expUpdateData },
        { new: true }
      ).lean();
      
      if (!experience) {
        return apiError('NOT_FOUND', 'Experience not found');
      }
      
      return apiSuccess({ submission: experience, message: 'Experience updated' });
    }
    
    // Handle CRM submission source
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
    
    const submission = await CommunitySubmission.findOneAndUpdate(
      { _id: submissionId },
      { $set: updateData },
      { new: true }
    ).lean();
    
    if (!submission) {
      return apiError('NOT_FOUND', 'Submission not found');
    }
    
    return apiSuccess({ submission, message: 'Submission updated' });
    
  } catch (error) {
    console.error('Update submission error:', error);
    return apiError('SERVER_ERROR', 'Failed to update submission');
  }
}

// DELETE - Delete a submission
export async function DELETE(req: NextRequest) {
  try {
    await connectDB();
    
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return apiError('UNAUTHORIZED');
    }
    
    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    if (!decoded || !decoded.isAdmin) {
      return apiError('FORBIDDEN', 'Admin access required');
    }
    
    
    const { searchParams } = new URL(req.url);
    const submissionId = searchParams.get('id');
    const source = searchParams.get('source');
    
    if (!submissionId) {
      return apiError('VALIDATION_ERROR', 'Submission ID required');
    }
    
    // Handle experience source
    if (source === 'experience') {
      const Experience = getExperienceModel();
      const result = await Experience.findOneAndDelete({ _id: submissionId });
      if (!result) {
        return apiError('NOT_FOUND', 'Experience not found');
      }
      return apiSuccess({ message: 'Experience deleted' });
    }
    
    // Handle CRM submission
    const CommunitySubmission = getCommunitySubmissionModel();
    
    const result = await CommunitySubmission.findOneAndDelete({ _id: submissionId });
    
    if (!result) {
      return apiError('NOT_FOUND', 'Submission not found');
    }
    
    return apiSuccess({ message: 'Submission deleted' });
    
  } catch (error) {
    console.error('Delete submission error:', error);
    return apiError('SERVER_ERROR', 'Failed to delete submission');
  }
}
