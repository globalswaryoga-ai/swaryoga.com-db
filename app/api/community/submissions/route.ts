import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { apiError, apiSuccess } from '@/lib/api-error';
import mongoose from 'mongoose';

// Define submission schema
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
  // Common fields
  participantName: { type: String, required: true },
  workshopName: { type: String },
  batchName: { type: String },
  imageUrl: { type: String },
  // Category-specific fields
  experienceDetails: { type: String },
  problemHeading: { type: String },
  problemDescription: { type: String },
  tipsDetails: { type: String },
  beforeStory: { type: String },
  afterStory: { type: String },
  question: { type: String },
  answer: { type: String }, // Admin can provide answer when posting
  // Meta
  adminNotes: { type: String },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewedAt: { type: Date },
  postedAt: { type: Date },
  communityPostId: { type: mongoose.Schema.Types.ObjectId },
}, { timestamps: true });

function getCommunitySubmissionModel() {
  // Use CRM database
  const crmDb = mongoose.connection.useDb(process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm');
  return crmDb.models.CommunitySubmission || crmDb.model('CommunitySubmission', communitySubmissionSchema);
}

// POST - Create a new submission
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return apiError('UNAUTHORIZED');
    }
    
    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    if (!decoded || !decoded.userId) {
      return apiError('AUTHENTICATION_FAILED', 'Invalid token');
    }
    
    const body = await req.json();
    const {
      category,
      participantName,
      workshopName,
      batchName,
      imageUrl,
      experienceDetails,
      problemHeading,
      problemDescription,
      tipsDetails,
      beforeStory,
      afterStory,
      question,
    } = body;
    
    // Validation
    if (!category || !['experiences', 'tips', 'transformations', 'questions'].includes(category)) {
      return apiError('VALIDATION_ERROR', 'Invalid category');
    }
    
    if (!participantName?.trim()) {
      return apiError('VALIDATION_ERROR', 'Participant name is required');
    }
    
    // Category-specific validation
    if (category === 'experiences' && !experienceDetails?.trim()) {
      return apiError('VALIDATION_ERROR', 'Experience details are required');
    }
    if (category === 'tips' && (!problemHeading?.trim() || !tipsDetails?.trim())) {
      return apiError('VALIDATION_ERROR', 'Problem heading and tips details are required');
    }
    if (category === 'transformations' && (!beforeStory?.trim() || !afterStory?.trim())) {
      return apiError('VALIDATION_ERROR', 'Before and after stories are required');
    }
    if (category === 'questions' && !question?.trim()) {
      return apiError('VALIDATION_ERROR', 'Question is required');
    }
    
    const CommunitySubmission = getCommunitySubmissionModel();
    
    const submission = new CommunitySubmission({
      userId: decoded.userId,
      userEmail: decoded.email || '',
      userName: (decoded as any).name || participantName,
      category,
      status: 'pending',
      participantName: participantName.trim(),
      workshopName: workshopName?.trim() || '',
      batchName: batchName?.trim() || '',
      imageUrl: imageUrl?.trim() || '',
      experienceDetails: experienceDetails?.trim() || '',
      problemHeading: problemHeading?.trim() || '',
      problemDescription: problemDescription?.trim() || '',
      tipsDetails: tipsDetails?.trim() || '',
      beforeStory: beforeStory?.trim() || '',
      afterStory: afterStory?.trim() || '',
      question: question?.trim() || '',
    });
    
    await submission.save();
    
    return apiSuccess({ 
      message: 'Submission received successfully',
      submissionId: submission._id,
    });
    
  } catch (error) {
    console.error('Community submission error:', error);
    return apiError('SERVER_ERROR', 'Failed to submit');
  }
}

// GET - Get user's submissions (for their own history)
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return apiError('UNAUTHORIZED');
    }
    
    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    if (!decoded || !decoded.userId) {
      return apiError('AUTHENTICATION_FAILED', 'Invalid token');
    }
    
    const CommunitySubmission = getCommunitySubmissionModel();
    
    const submissions = await CommunitySubmission.find({ userId: decoded.userId })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    
    return apiSuccess({ submissions });
    
  } catch (error) {
    console.error('Get submissions error:', error);
    return apiError('SERVER_ERROR', 'Failed to fetch submissions');
  }
}
