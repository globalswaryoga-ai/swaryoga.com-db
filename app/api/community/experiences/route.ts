import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';

// Experience Schema
const ExperienceSchema = new mongoose.Schema({
  userId: { type: String },
  userName: { type: String, required: true },
  userPhone: { type: String },
  userEmail: { type: String },
  userPhoto: { type: String },
  content: { type: String, required: true },
  rating: { type: Number, min: 1, max: 5, required: true },
  photoUrl: { type: String },
  communityId: { type: String, default: 'global' },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  featured: { type: Boolean, default: false },
  approvedBy: { type: String },
  approvedAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
}, { collection: 'community_experiences' });

function getExperience() {
  return mongoose.models.Experience || mongoose.model('Experience', ExperienceSchema);
}

/**
 * GET /api/community/experiences
 * Fetch approved experiences (public) or all (admin)
 */
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const Experience = getExperience();
    
    const url = new URL(request.url);
    const status = url.searchParams.get('status') || 'approved';
    const communityId = url.searchParams.get('communityId');
    const featured = url.searchParams.get('featured');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    
    const query: any = {};
    
    // Public only sees approved
    if (status === 'approved') {
      query.status = 'approved';
    } else if (status === 'all') {
      // Admin sees all - need auth check
      const authHeader = request.headers.get('authorization');
      if (!authHeader) {
        query.status = 'approved'; // Fallback to approved only
      }
    } else {
      query.status = status;
    }
    
    if (communityId) query.communityId = communityId;
    if (featured === 'true') query.featured = true;
    
    const experiences = await Experience.find(query)
      .sort({ featured: -1, createdAt: -1 })
      .limit(limit)
      .lean();
    
    // Calculate stats
    const stats = await Experience.aggregate([
      { $match: { status: 'approved' } },
      { $group: {
        _id: null,
        avgRating: { $avg: '$rating' },
        totalCount: { $sum: 1 },
        fiveStars: { $sum: { $cond: [{ $eq: ['$rating', 5] }, 1, 0] } },
      }}
    ]);
    
    return NextResponse.json({
      success: true,
      experiences,
      stats: stats[0] || { avgRating: 5, totalCount: 0, fiveStars: 0 },
    });
  } catch (error) {
    console.error('[Experiences] GET error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch experiences',
    }, { status: 500 });
  }
}

/**
 * POST /api/community/experiences
 * Submit a new experience
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const { userName, content, rating, photoUrl, communityId, userPhone, userEmail } = body;
    
    if (!userName?.trim()) {
      return NextResponse.json({ success: false, error: 'Name is required' }, { status: 400 });
    }
    if (!content?.trim()) {
      return NextResponse.json({ success: false, error: 'Experience content is required' }, { status: 400 });
    }
    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json({ success: false, error: 'Rating must be 1-5 stars' }, { status: 400 });
    }
    
    await connectDB();
    const Experience = getExperience();
    
    const experience = await Experience.create({
      userName: userName.trim(),
      userPhone,
      userEmail,
      content: content.trim(),
      rating: Math.round(rating),
      photoUrl,
      communityId: communityId || 'global',
      status: 'pending', // All submissions start as pending
    });
    
    console.log('[Experiences] New submission:', experience._id, 'by', userName);
    
    return NextResponse.json({
      success: true,
      message: 'Thank you! Your experience has been submitted for review.',
      experience: {
        _id: experience._id,
        status: experience.status,
      },
    });
  } catch (error) {
    console.error('[Experiences] POST error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to submit experience',
    }, { status: 500 });
  }
}

/**
 * PATCH /api/community/experiences
 * Admin: Approve/reject experience
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
    const { experienceId, action, featured } = body;
    
    if (!experienceId) {
      return NextResponse.json({ success: false, error: 'Experience ID required' }, { status: 400 });
    }
    
    await connectDB();
    const Experience = getExperience();
    
    const update: any = {};
    
    if (action === 'approve') {
      update.status = 'approved';
      update.approvedBy = decoded.userId;
      update.approvedAt = new Date();
    } else if (action === 'reject') {
      update.status = 'rejected';
    }
    
    if (typeof featured === 'boolean') {
      update.featured = featured;
    }
    
    const updated = await Experience.findByIdAndUpdate(
      experienceId,
      { $set: update },
      { new: true }
    );
    
    if (!updated) {
      return NextResponse.json({ success: false, error: 'Experience not found' }, { status: 404 });
    }
    
    return NextResponse.json({
      success: true,
      message: action === 'approve' ? 'Experience approved!' : 'Experience updated',
      experience: updated,
    });
  } catch (error) {
    console.error('[Experiences] PATCH error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update experience',
    }, { status: 500 });
  }
}
