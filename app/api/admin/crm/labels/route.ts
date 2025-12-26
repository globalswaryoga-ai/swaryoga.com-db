import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { Lead } from '@/lib/schemas/enterpriseSchemas';
import mongoose from 'mongoose';

function getViewerUserId(decoded: any): string {
  return String(decoded?.userId || decoded?.username || '').trim();
}

function isSuperAdmin(decoded: any): boolean {
  return (
    decoded?.userId === 'admin' ||
    (Array.isArray(decoded?.permissions) && decoded.permissions.includes('all'))
  );
}

/**
 * Label management for CRM leads
 * GET: Get all unique labels with count
 * POST: Add a label to leads
 * DELETE: Remove a label
 */

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 401 });
    }

    const viewerUserId = getViewerUserId(decoded);
    if (!viewerUserId) {
      return NextResponse.json({ error: 'Unauthorized: Missing user identity' }, { status: 401 });
    }
    const superAdmin = isSuperAdmin(decoded);

    await connectDB();

    const baseMatch = superAdmin ? {} : { assignedToUserId: viewerUserId };

    // Aggregate to get all unique labels with counts
    const labelStats = await Lead.aggregate([
      { $match: baseMatch },
      { $unwind: { path: '$labels', preserveNullAndEmptyArrays: true } },
      { $group: { _id: '$labels', count: { $sum: 1 } } },
      { $match: { _id: { $ne: null } } },
      { $sort: { count: -1 } },
    ]);

    const labels = labelStats.map((stat: any) => ({
      label: stat._id,
      count: stat.count,
    }));

    return NextResponse.json({ success: true, data: { labels, total: labels.length } }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch labels';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 401 });
    }

    const viewerUserId = getViewerUserId(decoded);
    if (!viewerUserId) {
      return NextResponse.json({ error: 'Unauthorized: Missing user identity' }, { status: 401 });
    }
    const superAdmin = isSuperAdmin(decoded);

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { leadIds, label } = body;

    if (!Array.isArray(leadIds) || leadIds.length === 0) {
      return NextResponse.json({ error: 'No lead IDs provided' }, { status: 400 });
    }

    if (!label || typeof label !== 'string') {
      return NextResponse.json({ error: 'Invalid label' }, { status: 400 });
    }

    await connectDB();

    const objectIds = (leadIds as any[])
      .map((id) => String(id))
      .filter((id) => mongoose.Types.ObjectId.isValid(id))
      .map((id) => new mongoose.Types.ObjectId(id));

    if (objectIds.length === 0) {
      return NextResponse.json({ error: 'No valid lead IDs provided' }, { status: 400 });
    }

    const result = await Lead.updateMany(
      {
        _id: { $in: objectIds },
        ...(superAdmin ? {} : { assignedToUserId: viewerUserId }),
      },
      { $addToSet: { labels: label }, $set: { updatedAt: new Date() } }
    );

    return NextResponse.json(
      { success: true, data: { modified: result.modifiedCount, matched: result.matchedCount } },
      { status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to add label';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 401 });
    }

    const viewerUserId = getViewerUserId(decoded);
    if (!viewerUserId) {
      return NextResponse.json({ error: 'Unauthorized: Missing user identity' }, { status: 401 });
    }
    const superAdmin = isSuperAdmin(decoded);

    const url = new URL(request.url);
    const label = url.searchParams.get('label');

    if (!label) {
      return NextResponse.json({ error: 'Label parameter required' }, { status: 400 });
    }

    await connectDB();

    const result = await Lead.updateMany(
      superAdmin ? {} : { assignedToUserId: viewerUserId },
      { $pull: { labels: label }, $set: { updatedAt: new Date() } }
    );

    return NextResponse.json(
      { success: true, data: { modified: result.modifiedCount } },
      { status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete label';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
