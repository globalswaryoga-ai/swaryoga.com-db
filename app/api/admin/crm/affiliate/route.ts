/**
 * Affiliate Program API
 * GET  — Get current user's affiliate status or list all affiliates (super admin)
 * POST — Apply to become an affiliate
 * PUT  — Update affiliate settings (super admin can update any, user can update own payment info)
 */
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { getAffiliate, getAffiliateReferral } from '@/lib/schemas/enterpriseSchemas';
import { getViewerUserId, isSuperAdmin } from '@/lib/crm-handlers';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';


// Generate unique affiliate code
function generateAffiliateCode(name: string): string {
  const cleanName = (name || 'affiliate').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 6);
  const randomPart = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `${cleanName}${randomPart}`;
}

export async function GET(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = getViewerUserId(decoded);
    const isAdmin = isSuperAdmin(decoded);
    const url = new URL(req.url);
    const listAll = url.searchParams.get('all') === 'true';

    await connectDB();
    const Affiliate = getAffiliate();
    const AffiliateReferral = getAffiliateReferral();

    // Super admin can list all affiliates
    if (isAdmin && listAll) {
      const status = url.searchParams.get('status');
      const search = url.searchParams.get('search') || '';
      const limit = Math.min(Number(url.searchParams.get('limit') || 50), 200);
      const skip = Number(url.searchParams.get('skip') || 0);

      const filter: any = {};
      if (status && status !== 'all') filter.status = status;
      if (search) {
        filter.$or = [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { affiliateCode: { $regex: search, $options: 'i' } },
        ];
      }

      const [affiliates, total] = await Promise.all([
        Affiliate.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
        Affiliate.countDocuments(filter),
      ]);

      // Get stats summary
      const stats = await Affiliate.aggregate([
        { $group: {
          _id: null,
          totalAffiliates: { $sum: 1 },
          totalSales: { $sum: '$totalSales' },
          totalEarnings: { $sum: '$totalEarnings' },
          pendingEarnings: { $sum: '$pendingEarnings' },
        }}
      ]);

      return NextResponse.json({
        success: true,
        affiliates,
        total,
        stats: stats[0] || { totalAffiliates: 0, totalSales: 0, totalEarnings: 0, pendingEarnings: 0 },
      });
    }

    // Regular user: get their own affiliate status
    const affiliate = await Affiliate.findOne({ userId }).lean();

    if (!affiliate) {
      return NextResponse.json({
        success: true,
        isAffiliate: false,
        affiliate: null,
        referrals: [],
      });
    }

    // Get user's referrals
    const referrals = await AffiliateReferral.find({ affiliateId: (affiliate as any)._id })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return NextResponse.json({
      success: true,
      isAffiliate: true,
      affiliate,
      referrals,
    });
  } catch (err: any) {
    console.error('[Affiliate GET]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = getViewerUserId(decoded);
    const body = await req.json();
    const { name, email, phone, paymentMethod, bankDetails, termsAccepted } = body;

    if (!name || !email) {
      return NextResponse.json({ error: 'Name and email are required' }, { status: 400 });
    }

    if (!termsAccepted) {
      return NextResponse.json({ error: 'You must accept the terms and conditions' }, { status: 400 });
    }

    await connectDB();
    const Affiliate = getAffiliate();

    // Check if already an affiliate
    const existing = await Affiliate.findOne({ userId });
    if (existing) {
      return NextResponse.json({ error: 'You are already registered as an affiliate' }, { status: 400 });
    }

    // Generate unique affiliate code
    let affiliateCode = generateAffiliateCode(name);
    let attempts = 0;
    while (await Affiliate.findOne({ affiliateCode }) && attempts < 10) {
      affiliateCode = generateAffiliateCode(name);
      attempts++;
    }

    const affiliate = await Affiliate.create({
      userId,
      affiliateCode,
      name,
      email,
      phone: phone || '',
      paymentMethod: paymentMethod || 'upi',
      bankDetails: bankDetails || {},
      status: 'pending', // Needs admin approval
      termsAccepted: true,
      termsAcceptedAt: new Date(),
      commissionPercent: 10, // Default 10%
    });

    return NextResponse.json({
      success: true,
      message: 'Affiliate application submitted! Pending approval.',
      affiliate,
    });
  } catch (err: any) {
    console.error('[Affiliate POST]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = getViewerUserId(decoded);
    const isAdmin = isSuperAdmin(decoded);
    const body = await req.json();
    const { affiliateId, status, commissionPercent, bankDetails, paymentMethod, notes } = body;

    await connectDB();
    const Affiliate = getAffiliate();

    // Super admin can update any affiliate
    if (isAdmin && affiliateId) {
      const updateData: any = {};
      
      if (status) {
        updateData.status = status;
        if (status === 'approved') {
          updateData.approvedAt = new Date();
          updateData.approvedBy = userId;
        }
      }
      if (typeof commissionPercent === 'number') {
        updateData.commissionPercent = Math.max(0, Math.min(100, commissionPercent));
      }
      if (notes !== undefined) updateData.notes = notes;
      if (bankDetails) updateData.bankDetails = bankDetails;
      if (paymentMethod) updateData.paymentMethod = paymentMethod;

      const updated = await Affiliate.findByIdAndUpdate(
        affiliateId,
        { $set: updateData },
        { new: true }
      ).lean();

      if (!updated) {
        return NextResponse.json({ error: 'Affiliate not found' }, { status: 404 });
      }

      return NextResponse.json({ success: true, affiliate: updated });
    }

    // Regular user can only update their own payment details
    const affiliate = await Affiliate.findOne({ userId });
    if (!affiliate) {
      return NextResponse.json({ error: 'Affiliate not found' }, { status: 404 });
    }

    const updateData: any = {};
    if (bankDetails) updateData.bankDetails = bankDetails;
    if (paymentMethod) updateData.paymentMethod = paymentMethod;

    const updated = await Affiliate.findOneAndUpdate(
      { userId },
      { $set: updateData },
      { new: true }
    ).lean();

    return NextResponse.json({ success: true, affiliate: updated });
  } catch (err: any) {
    console.error('[Affiliate PUT]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
