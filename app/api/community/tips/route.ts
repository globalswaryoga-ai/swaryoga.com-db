import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';


// Tips Schema
const TipSchema = new mongoose.Schema({
  userId: { type: String },
  userName: { type: String, required: true },
  userPhone: { type: String },
  userEmail: { type: String },
  issue: { type: String, required: true }, // User's health/yoga issue
  tip: { type: String }, // Admin's tip/solution
  category: { type: String, default: 'health' }, // health, yoga, pranayama, lifestyle, nutrition
  communityId: { type: String, default: 'global' },
  status: { type: String, enum: ['pending', 'answered', 'rejected'], default: 'pending' },
  answeredBy: { type: String },
  answeredAt: { type: Date },
  featured: { type: Boolean, default: false },
  viewCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
}, { collection: 'community_tips' });

function getTip() {
  return mongoose.models.Tip || mongoose.model('Tip', TipSchema);
}

/**
 * GET /api/community/tips
 * Fetch answered tips (public) or all (admin)
 */
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const Tip = getTip();
    
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
        { issue: { $regex: search, $options: 'i' } },
        { tip: { $regex: search, $options: 'i' } },
      ];
    }
    
    const tips = await Tip.find(query)
      .sort({ featured: -1, answeredAt: -1, createdAt: -1 })
      .limit(limit)
      .lean();
    
    // Get category counts
    const categoryCounts = await Tip.aggregate([
      { $match: { status: 'answered' } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
    ]);
    
    // Get pending count for admin
    const pendingCount = await Tip.countDocuments({ status: 'pending' });
    
    return NextResponse.json({
      success: true,
      tips,
      categories: categoryCounts,
      pendingCount,
    });
  } catch (error) {
    console.error('[Tips] GET error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch tips',
    }, { status: 500 });
  }
}

/**
 * POST /api/community/tips
 * Submit a new issue (request for tip)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const { userName, issue, category, communityId, userPhone, userEmail } = body;
    
    if (!userName?.trim()) {
      return NextResponse.json({ success: false, error: 'Name is required' }, { status: 400 });
    }
    if (!issue?.trim()) {
      return NextResponse.json({ success: false, error: 'Please describe your issue' }, { status: 400 });
    }
    
    await connectDB();
    const Tip = getTip();
    
    const newTip = await Tip.create({
      userName: userName.trim(),
      userPhone,
      userEmail,
      issue: issue.trim(),
      category: category || 'health',
      communityId: communityId || 'global',
      status: 'pending',
    });
    
    console.log('[Tips] New issue submitted:', newTip._id, 'by', userName);
    
    return NextResponse.json({
      success: true,
      message: 'Your issue has been submitted! Our experts will provide tips soon.',
      tip: {
        _id: newTip._id,
        status: newTip.status,
      },
    });
  } catch (error) {
    console.error('[Tips] POST error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to submit issue',
    }, { status: 500 });
  }
}

/**
 * PATCH /api/community/tips
 * Admin: Provide tip or reject
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
    const { tipId, tip, action, featured, category } = body;
    
    if (!tipId) {
      return NextResponse.json({ success: false, error: 'Tip ID required' }, { status: 400 });
    }
    
    await connectDB();
    const Tip = getTip();
    
    const update: any = {};
    
    if (tip) {
      update.tip = tip.trim();
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
    
    const updated = await Tip.findByIdAndUpdate(
      tipId,
      { $set: update },
      { new: true }
    );
    
    if (!updated) {
      return NextResponse.json({ success: false, error: 'Tip not found' }, { status: 404 });
    }
    
    return NextResponse.json({
      success: true,
      message: tip ? 'Tip provided!' : 'Tip updated',
      tip: updated,
    });
  } catch (error) {
    console.error('[Tips] PATCH error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update tip',
    }, { status: 500 });
  }
}
