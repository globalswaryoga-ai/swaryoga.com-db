import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';


// Transformation Schema
const TransformationSchema = new mongoose.Schema({
  userId: { type: String },
  userName: { type: String, required: true },
  userPhone: { type: String },
  userEmail: { type: String },
  title: { type: String, required: true },
  story: { type: String, required: true },
  beforePhoto: { type: String },
  afterPhoto: { type: String },
  duration: { type: String }, // e.g., "3 months", "1 year"
  healthCondition: { type: String }, // What they improved
  yogaPractice: { type: String }, // What practices helped
  communityId: { type: String, default: 'global' },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  featured: { type: Boolean, default: false },
  approvedBy: { type: String },
  approvedAt: { type: Date },
  viewCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
}, { collection: 'community_transformations' });

function getTransformation() {
  return mongoose.models.Transformation || mongoose.model('Transformation', TransformationSchema);
}

/**
 * GET /api/community/transformations
 * Fetch approved transformations (public) or all (admin)
 */
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const Transformation = getTransformation();
    
    const url = new URL(request.url);
    const status = url.searchParams.get('status') || 'approved';
    const communityId = url.searchParams.get('communityId');
    const search = url.searchParams.get('search');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    
    const query: any = {};
    
    // Public only sees approved
    if (status === 'approved') {
      query.status = 'approved';
    } else if (status === 'all' || status === 'pending') {
      const authHeader = request.headers.get('authorization');
      if (!authHeader) {
        query.status = 'approved';
      } else {
        if (status === 'pending') query.status = 'pending';
      }
    }
    
    if (communityId) query.communityId = communityId;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { story: { $regex: search, $options: 'i' } },
        { healthCondition: { $regex: search, $options: 'i' } },
      ];
    }
    
    const transformations = await Transformation.find(query)
      .sort({ featured: -1, approvedAt: -1, createdAt: -1 })
      .limit(limit)
      .lean();
    
    // Get stats
    const stats = await Transformation.aggregate([
      { $match: { status: 'approved' } },
      {
        $group: {
          _id: null,
          totalCount: { $sum: 1 },
          withPhotos: { $sum: { $cond: [{ $and: ['$beforePhoto', '$afterPhoto'] }, 1, 0] } },
        },
      },
    ]);
    
    // Get pending count for admin
    const pendingCount = await Transformation.countDocuments({ status: 'pending' });
    
    return NextResponse.json({
      success: true,
      transformations,
      stats: stats[0] || { totalCount: 0, withPhotos: 0 },
      pendingCount,
    });
  } catch (error) {
    console.error('[Transformations] GET error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch transformations',
    }, { status: 500 });
  }
}

/**
 * POST /api/community/transformations
 * Submit a new transformation story
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const { 
      userName, title, story, beforePhoto, afterPhoto, 
      duration, healthCondition, yogaPractice, communityId, userPhone, userEmail 
    } = body;
    
    if (!userName?.trim()) {
      return NextResponse.json({ success: false, error: 'Name is required' }, { status: 400 });
    }
    if (!title?.trim()) {
      return NextResponse.json({ success: false, error: 'Title is required' }, { status: 400 });
    }
    if (!story?.trim()) {
      return NextResponse.json({ success: false, error: 'Please share your transformation story' }, { status: 400 });
    }
    
    await connectDB();
    const Transformation = getTransformation();
    
    const newTransformation = await Transformation.create({
      userName: userName.trim(),
      userPhone,
      userEmail,
      title: title.trim(),
      story: story.trim(),
      beforePhoto,
      afterPhoto,
      duration,
      healthCondition,
      yogaPractice,
      communityId: communityId || 'global',
      status: 'pending',
    });
    
    console.log('[Transformations] New story:', newTransformation._id, 'by', userName);
    
    return NextResponse.json({
      success: true,
      message: 'Your transformation story has been submitted! We\'ll review and publish it soon.',
      transformation: {
        _id: newTransformation._id,
        status: newTransformation.status,
      },
    });
  } catch (error) {
    console.error('[Transformations] POST error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to submit transformation',
    }, { status: 500 });
  }
}

/**
 * PATCH /api/community/transformations
 * Admin: Approve/reject/feature transformation
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
    const { transformationId, action, featured } = body;
    
    if (!transformationId) {
      return NextResponse.json({ success: false, error: 'Transformation ID required' }, { status: 400 });
    }
    
    await connectDB();
    const Transformation = getTransformation();
    
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
    
    const updated = await Transformation.findByIdAndUpdate(
      transformationId,
      { $set: update },
      { new: true }
    );
    
    if (!updated) {
      return NextResponse.json({ success: false, error: 'Transformation not found' }, { status: 404 });
    }
    
    return NextResponse.json({
      success: true,
      message: action === 'approve' ? 'Transformation approved!' : 'Transformation updated',
      transformation: updated,
    });
  } catch (error) {
    console.error('[Transformations] PATCH error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update transformation',
    }, { status: 500 });
  }
}
