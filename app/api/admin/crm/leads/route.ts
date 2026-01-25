import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { getLead } from '@/lib/schemas/enterpriseSchemas';
import { allocateNextLeadNumber } from '@/lib/crm/leadNumber';
import { 
  escapeRegexLiteral, 
  getViewerUserId, 
  isSuperAdmin, 
  normalizePhone 
} from '@/lib/crm-handlers';
import { addLeadToMainBroadcastList } from '@/lib/crm/broadcast-automation';

// Mark as dynamic since this route uses request.headers or request.url
export const dynamic = 'force-dynamic';


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
    // segmentation/filtering is accurate.
    // We allow a higher cap when explicitly requested via selectAll=true.
    // This still respects multi-user access control below (non-super-admins only see their own leads).
    const requestedLimit = Number(url.searchParams.get('limit') || 50) || 50;
    const selectAll = url.searchParams.get('selectAll') === 'true';
    const maxLimit = selectAll ? 5000 : 200;
    const limit = Math.min(requestedLimit, maxLimit);
    const skip = Math.max(Number(url.searchParams.get('skip') || 0) || 0, 0);

    await connectDB();
    const Lead = getLead();

    const filter: any = {};

    // Multi-user access control:
    // - Super-admin can see ALL leads and optionally filter by assigned user.
    // - Regular admins can ONLY see leads assigned to them (strict filtering).
    //   They cannot see unassigned leads or leads assigned to others.
    if (superAdmin) {
      // Super admin: optionally filter by specific user, otherwise show ALL
      if (userIdParam && String(userIdParam).trim()) {
        const uid = String(userIdParam).trim();
        filter.$or = [{ assignedToUserId: uid }, { createdByUserId: uid }];
      }
      // Otherwise no filter - show ALL leads
    } else {
      // Regular admin: STRICT filtering - only their own assigned leads
      // They must have leads explicitly assigned to them
      filter.$or = [{ assignedToUserId: viewerUserId }, { createdByUserId: viewerUserId }];
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
    // Lead model is initialized above via getLead()

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

    const rawPhone = String(body?.phoneNumber || '').trim();
    if (!rawPhone) {
      return NextResponse.json({ error: 'Missing: phoneNumber' }, { status: 400 });
    }
    const phoneNumber = normalizePhone(rawPhone);

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
    const Lead = getLead();

    // Validate Lead model
    // Initialized above via getLead()

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

    // Auto-add to main broadcast list
    try {
      await addLeadToMainBroadcastList(lead);
    } catch (e) {
      console.warn('Failed to auto-add lead to broadcast list:', e);
    }

    return NextResponse.json({ success: true, data: lead }, { status: 201 });
  } catch (error) {
    console.error('❌ POST /api/admin/crm/leads error:', error);
    const message = error instanceof Error ? error.message : 'Failed to create lead';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
