import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { Lead } from '@/lib/schemas/enterpriseSchemas';
import { allocateNextLeadNumber } from '@/lib/crm/leadNumber';

function escapeRegexLiteral(input: string): string {
  // Escape any characters that have special meaning in regex so user queries
  // can't crash the API with an invalid pattern (e.g. "(" or "[a-").
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getViewerUserId(decoded: any): string {
  return String(decoded?.userId || decoded?.username || '').trim();
}

function isSuperAdmin(decoded: any): boolean {
  return (
    decoded?.userId === 'admin' ||
    (Array.isArray(decoded?.permissions) && 
      (decoded.permissions.includes('all') || decoded.permissions.includes('broadcast')))
  );
}

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

    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const workshop = url.searchParams.get('workshop');
    const q = url.searchParams.get('q');
    const userIdParam = url.searchParams.get('userId');
  // NOTE: Some admin screens (e.g., Broadcast) need a large dataset so client-side
  // segmentation/filtering is accurate. We allow a higher cap for super-admin.
  const requestedLimit = Number(url.searchParams.get('limit') || 50) || 50;
  const selectAll = url.searchParams.get('selectAll') === 'true';
  const maxLimit = selectAll ? 5000 : 200;
  const limit = Math.min(requestedLimit, maxLimit);
    const skip = Math.max(Number(url.searchParams.get('skip') || 0) || 0, 0);

    await connectDB();

    const filter: any = {};

    // Multi-user access control:
    // - Super-admin can see all leads and optionally filter by assigned user.
    // - Other admins see only their own assigned leads.
    if (superAdmin) {
      if (userIdParam && String(userIdParam).trim()) {
        filter.assignedToUserId = String(userIdParam).trim();
      }
    } else {
      filter.assignedToUserId = viewerUserId;
    }

    if (status) filter.status = status;
    if (workshop) filter.workshopName = workshop;
    if (q) {
      const query = String(q).trim();
      if (query) {
        const safe = escapeRegexLiteral(query);
        filter.$or = [
          { name: { $regex: safe, $options: 'i' } },
          { phoneNumber: { $regex: safe, $options: 'i' } },
          { email: { $regex: safe, $options: 'i' } },
        ];
      }
    }

    // Ensure leads and filter are valid before querying
    if (!Lead) {
      return NextResponse.json({ error: 'Lead model not initialized' }, { status: 500 });
    }

    const leads = await Lead.find(filter)
      .sort({ lastMessageAt: -1, updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Lead.countDocuments(filter);

    return NextResponse.json({ success: true, data: { leads, total, limit, skip } }, { status: 200 });
  } catch (error) {
    console.error('❌ GET /api/admin/crm/leads error:', error);
    const message = error instanceof Error ? error.message : 'Failed to load leads';
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

    const phoneNumber = String(body?.phoneNumber || '').trim();
    if (!phoneNumber) {
      return NextResponse.json({ error: 'Missing: phoneNumber' }, { status: 400 });
    }

    const name = body?.name ? String(body.name).trim() : undefined;
    const email = body?.email ? String(body.email).trim().toLowerCase() : undefined;
    const status = body?.status ? String(body.status).trim() : undefined;
    const labels = Array.isArray(body?.labels) ? body.labels.map((x: any) => String(x)) : undefined;
    const source = body?.source ? String(body.source).trim() : undefined;
    const workshopId = body?.workshopId ? String(body.workshopId).trim() : undefined;
    const workshopName = body?.workshopName ? String(body.workshopName).trim() : undefined;

    // Ownership fields
    const requestedAssignedTo = body?.assignedToUserId ? String(body.assignedToUserId).trim() : '';
    const assignedToUserId = superAdmin && requestedAssignedTo ? requestedAssignedTo : viewerUserId;

    await connectDB();

    // Validate Lead model
    if (!Lead) {
      return NextResponse.json({ error: 'Lead model not initialized' }, { status: 500 });
    }

    // Check for duplicates by email or phone number
    const existingLead = await Lead.findOne({
      $or: [
        ...(email ? [{ email }] : []),
        { phoneNumber },
      ],
    });

    if (existingLead) {
      // Return existing lead info so UI can show it
      return NextResponse.json(
        {
          error: 'Lead already exists',
          duplicate: true,
          existingLead: {
            _id: existingLead._id,
            name: existingLead.name,
            email: existingLead.email,
            phoneNumber: existingLead.phoneNumber,
            status: existingLead.status,
            workshopName: existingLead.workshopName,
            createdAt: existingLead.createdAt,
          },
        },
        { status: 409 }
      );
    }

    // Allocate permanent 6-digit lead number (e.g., 006999)
    const { leadNumber } = await allocateNextLeadNumber();

    const lead = await Lead.create({
      leadNumber,
      phoneNumber,
      assignedToUserId,
      createdByUserId: viewerUserId,
      ...(name ? { name } : {}),
      ...(email ? { email } : {}),
      ...(status ? { status } : {}),
      ...(labels ? { labels } : {}),
      ...(source ? { source } : {}),
      ...(workshopId ? { workshopId } : {}),
      ...(workshopName ? { workshopName } : {}),
    });

    return NextResponse.json({ success: true, data: lead }, { status: 201 });
  } catch (error) {
    console.error('❌ POST /api/admin/crm/leads error:', error);
    const message = error instanceof Error ? error.message : 'Failed to create lead';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
