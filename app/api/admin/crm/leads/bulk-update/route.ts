import { NextRequest, NextResponse } from 'next/server';
import { Types } from 'mongoose';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { Lead } from '@/lib/schemas/enterpriseSchemas';

type Body = {
  leadIds: string[];
  assignedToUserId?: string;
  workshopName?: string;
};

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 401 });
    }

    const body = (await request.json().catch(() => null)) as Body | null;
    if (!body || !Array.isArray(body.leadIds) || body.leadIds.length === 0) {
      return NextResponse.json({ error: 'leadIds is required' }, { status: 400 });
    }

    const assignedToUserId = body.assignedToUserId ? String(body.assignedToUserId).trim() : '';
    const workshopName = body.workshopName ? String(body.workshopName).trim() : '';

    if (!assignedToUserId && !workshopName) {
      return NextResponse.json({ error: 'Nothing to update (assignedToUserId/workshopName missing)' }, { status: 400 });
    }

    const objectIds = body.leadIds
      .map((id) => String(id))
      .filter((id) => Types.ObjectId.isValid(id))
      .map((id) => new Types.ObjectId(id));

    if (objectIds.length === 0) {
      return NextResponse.json({ error: 'No valid leadIds provided' }, { status: 400 });
    }

    await connectDB();

    const update: Record<string, any> = {};
    if (assignedToUserId) update.assignedToUserId = assignedToUserId;
    if (workshopName) update.workshopName = workshopName;

    const result = await Lead.updateMany({ _id: { $in: objectIds } }, { $set: update });

    return NextResponse.json(
      {
        success: true,
        data: {
          matchedCount: (result as any).matchedCount ?? (result as any).n ?? 0,
          modifiedCount: (result as any).modifiedCount ?? (result as any).nModified ?? 0,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Bulk update failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
