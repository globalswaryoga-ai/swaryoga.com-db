import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { getLead, getWhatsAppMessage } from '@/lib/schemas/enterpriseSchemas';
import { allocateNextLeadNumber } from '@/lib/crm/leadNumber';
import {
  escapeRegexLiteral,
  getViewerUserId,
  isSuperAdmin,
  isManager,
  getVisibleUserIds,
  normalizePhone
} from '@/lib/crm-handlers';
import { getTenantFilter, enrichTenantData } from '@/lib/crm/tenantIsolation';

export const dynamic = 'force-dynamic';
import { addLeadToMainBroadcastList } from '@/lib/crm/broadcast-automation';
import { logger } from '@/lib/logger';

// Mark as dynamic since this route uses request.headers or request.url


export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin && !decoded?.userId) {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 401 });
    }

    const viewerUserId = getViewerUserId(decoded);
    if (!viewerUserId) {
      return NextResponse.json({ error: 'Unauthorized: Missing user identity' }, { status: 401 });
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // TENANT ISOLATION: Leads are completely isolated by tenant (CRM admin)
    // - Super Admin: can view all leads from all tenants (with optional userId filter)
    // - Regular Admin (Tenant): ONLY views leads they created or are assigned to
    // - Manager: views their team's leads only
    // This ensures each tenant's leads are completely private
    // ═══════════════════════════════════════════════════════════════════════════════
    const superAdmin = isSuperAdmin(decoded);
    const manager = isManager(decoded);
    const visibleUserIds = getVisibleUserIds(decoded);

    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const workshop = url.searchParams.get('workshop');
    const label = url.searchParams.get('label');
    const q = url.searchParams.get('q');
    const userIdParam = url.searchParams.get('userId');
    const metaOnly24h = url.searchParams.get('metaOnly24h') === '1';  // Filter for Meta messages in 24h
    const qrOnly = url.searchParams.get('qrOnly') === '1';            // Filter for QR bridge contacts only
    // NOTE: Some admin screens (e.g., Broadcast) need a large dataset so client-side
    // segmentation/filtering is accurate.
    // We allow a higher cap when explicitly requested via selectAll=true.
    // This still respects multi-user access control below (non-super-admins only see their own leads).
    const requestedLimit = Number(url.searchParams.get('limit') || 50) || 50;
    const selectAll = url.searchParams.get('selectAll') === 'true';
    const maxLimit = selectAll ? 10000 : 200;
    const limit = Math.min(requestedLimit, maxLimit);
    const skip = Math.max(Number(url.searchParams.get('skip') || 0) || 0, 0);

    await connectDB();
    const Lead = getLead();

    // ── Fetch by explicit ids (bypasses qrOnly/ownership filters for super-admins) ──
    // Used by the broadcast pages to pull in leads pre-selected from the
    // Enquiries page that wouldn't otherwise show up in the qrOnly/scoped lists.
    const idsParam = url.searchParams.get('ids');
    if (idsParam) {
      const validIds = idsParam.split(',').map(s => s.trim()).filter(id => mongoose.Types.ObjectId.isValid(id));
      if (validIds.length === 0) {
        return NextResponse.json({ success: true, data: { leads: [], total: 0, limit, skip } }, { status: 200 });
      }
      const idFilter: any = { _id: { $in: validIds } };
      if (visibleUserIds !== null) {
        idFilter.$or = [{ assignedToUserId: { $in: visibleUserIds } }, { createdByUserId: { $in: visibleUserIds } }];
      }
      const idsLeads = await Lead.find(idFilter).lean();
      return NextResponse.json({ success: true, data: { leads: idsLeads, total: idsLeads.length, limit, skip } }, { status: 200 });
    }

    const filter: any = {};

    // Read source early — QR data is tenant-isolated SaaS, so even the super
    // admin must be scoped to their OWN qr_whatsapp leads (no cross-tenant view).
    // The QR pages use the unified lead pool (no source param), so they pass
    // scope=own instead; qrOnly is also a QR context and must be own-scoped.
    const source = url.searchParams.get('source');
    const scopeOwn = url.searchParams.get('scope') === 'own';
    const isQrSource = source === 'qr_whatsapp';

    // Multi-user access control (3-tier):
    // - Super-admin: see ALL leads, optionally filter by specific user
    // - Manager (MR Admin): see leads assigned to themselves OR their team members
    // - Regular admin: ONLY see leads assigned to them
    // Store access control conditions separately to combine with other filters
    let accessControlConditions: any[] | null = null;

    if (visibleUserIds === null) {
      // Super admin: optionally filter by specific user, otherwise show ALL
      if (userIdParam && String(userIdParam).trim()) {
        const uid = String(userIdParam).trim();
        if (uid === '__unassigned__') {
          accessControlConditions = [{ assignedToUserId: { $in: [null, '', 'system'] } }, { assignedToUserId: { $exists: false } }];
        } else {
          accessControlConditions = [{ assignedToUserId: uid }, { createdByUserId: uid }];
        }
      } else if (isQrSource || qrOnly || scopeOwn) {
        // QR is per-tenant: scope the super admin to their OWN QR leads so other
        // tenants' QR leads never leak into their list, broadcast, funnel, etc.
        accessControlConditions = [{ assignedToUserId: viewerUserId }, { createdByUserId: viewerUserId }];
      } else {
        // SaaS isolation: the super admin's default view is their OWN leads plus
        // unowned/global leads (public website signups). Other tenants' leads
        // (CSV imports, QR, manual) never mix in — use the userId filter to
        // inspect a specific tenant.
        // NOTE: website-originated leads (enquiry form, /forms/[formType],
        // workshop-join, signup) are created with the literal string 'system'
        // for both owner fields, not null — so 'system' must count as unowned
        // here too, or those leads never appear in the default Leads list.
        accessControlConditions = [
          { assignedToUserId: viewerUserId },
          { createdByUserId: viewerUserId },
          {
            $and: [
              { $or: [{ assignedToUserId: { $in: [null, '', 'system'] } }, { assignedToUserId: { $exists: false } }] },
              { $or: [{ createdByUserId: { $in: [null, '', 'system'] } }, { createdByUserId: { $exists: false } }] },
            ],
          },
        ];
      }
    } else if (visibleUserIds.length > 1) {
      // Manager: can see their team's leads
      if (userIdParam && String(userIdParam).trim() && visibleUserIds.includes(userIdParam)) {
        // Filter to specific team member
        const uid = String(userIdParam).trim();
        accessControlConditions = [{ assignedToUserId: uid }, { createdByUserId: uid }];
      } else {
        // Show all team leads
        accessControlConditions = [
          { assignedToUserId: { $in: visibleUserIds } }, 
          { createdByUserId: { $in: visibleUserIds } }
        ];
      }
    } else {
      // Regular admin: STRICT filtering - only their own assigned leads
      accessControlConditions = [{ assignedToUserId: viewerUserId }, { createdByUserId: viewerUserId }];
    }

    const excludeSource = url.searchParams.get('excludeSource');
    // status/workshop/label accept comma-separated values for multi-select filters.
    if (status) {
      const values = status.split(',').map(s => s.trim()).filter(Boolean);
      if (values.length) filter.status = values.length > 1 ? { $in: values } : values[0];
    }
    if (workshop) {
      const values = workshop.split(',').map(s => s.trim()).filter(Boolean);
      if (values.length) filter.workshopName = values.length > 1 ? { $in: values } : values[0];
    }
    if (label) {
      const values = label.split(',').map(s => s.trim()).filter(Boolean);
      if (values.length) filter.labels = values.length > 1 ? { $in: values } : values[0];
    }
    if (source) filter.source = source;
    if (excludeSource) {
      const excluded = excludeSource.split(',').map(s => s.trim()).filter(Boolean);
      if (excluded.length) filter.source = { ...(typeof filter.source === 'object' ? filter.source : {}), $nin: excluded };
    }
    
    // Build search conditions
    let searchConditions: any[] | null = null;
    if (q) {
      const query = String(q).trim();
      if (query) {
        const safe = escapeRegexLiteral(query);
        searchConditions = [
          { name: { $regex: safe, $options: 'i' } },
          { phoneNumber: { $regex: safe, $options: 'i' } },
          { email: { $regex: safe, $options: 'i' } },
        ];
      }
    }

    // Combine access control and search using $and
    // This ensures both conditions are respected
    if (accessControlConditions && searchConditions) {
      // Both access control AND search: must match one access control condition AND one search condition
      filter.$and = [
        { $or: accessControlConditions },
        { $or: searchConditions }
      ];
    } else if (accessControlConditions) {
      // Only access control
      filter.$or = accessControlConditions;
    } else if (searchConditions) {
      // Only search (super admin with no user filter)
      filter.$or = searchConditions;
    }

    // Ensure leads and filter are valid before querying
    // Lead model is initialized above via getLead()

    // ── Filter by QR bridge contacts (all-time) ──
    if (qrOnly) {
      const WhatsAppMessage = getWhatsAppMessage();
      const qrLeadIds = await WhatsAppMessage.find({
        provider: 'qr',
        leadId: { $exists: true, $ne: null },
      }).distinct('leadId').lean();

      const qrIds = qrLeadIds.map((id: any) => String(id));

      if (qrIds.length === 0) {
        return NextResponse.json({ success: true, data: { leads: [], total: 0, limit, skip } }, { status: 200 });
      }

      if (filter.$and) {
        filter.$and.push({ _id: { $in: qrIds } });
      } else if (filter.$or) {
        filter.$and = [{ $or: filter.$or }, { _id: { $in: qrIds } }];
        delete filter.$or;
      } else {
        filter._id = { $in: qrIds };
      }
    }

    // ── Filter by Meta messages in 24-hour window ──
    if (metaOnly24h) {
      const WhatsAppMessage = getWhatsAppMessage();
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      // Find leads with Meta messages in last 24 hours
      const metaMessageLeads = await WhatsAppMessage.find({
        provider: 'meta',
        createdAt: { $gte: twentyFourHoursAgo },
        leadId: { $exists: true, $ne: null }
      })
        .distinct('leadId')
        .lean();

      const metaLeadIds = metaMessageLeads.map(id => String(id));
      
      // Add to filter: must have Meta messages in last 24 hours
      if (metaLeadIds.length === 0) {
        // No Meta messages in 24h, return empty
        return NextResponse.json({ success: true, data: { leads: [], total: 0, limit, skip } }, { status: 200 });
      }
      
      if (filter.$and) {
        filter.$and.push({ _id: { $in: metaLeadIds } });
      } else if (filter.$or) {
        // Wrap existing $or in $and
        filter.$and = [{ $or: filter.$or }, { _id: { $in: metaLeadIds } }];
        delete filter.$or;
      } else {
        filter._id = { $in: metaLeadIds };
      }
    }

    const leads = await Lead.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Lead.countDocuments(filter);

    return NextResponse.json(
      { success: true, data: { leads, total, limit, skip } },
      {
        status: 200,
        headers: { 'Cache-Control': 'private, max-age=10, stale-while-revalidate=30' },
      },
    );
  } catch (error) {
    logger.error('leads', 'GET /api/admin/crm/leads failed', error);
    const message = error instanceof Error ? error.message : 'Failed to load leads';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin && !decoded?.userId) {
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

    // ─── TENANT ISOLATION: Lead ownership ───
    // Each lead must be assigned to a tenant (CRM admin)
    // Regular tenants can only create leads assigned to themselves
    // Super-admin can create leads for other tenants
    const requestedAssignedTo = body?.assignedToUserId ? String(body.assignedToUserId).trim() : '';
    const assignedToUserId = superAdmin && requestedAssignedTo ? requestedAssignedTo : viewerUserId;

    await connectDB();
    const Lead = getLead();

    // ── Enforce plan lead limit for non-Super-Admin users ──
    if (!superAdmin) {
      try {
        const { getCRMSubscription } = await import('@/lib/db');
        const CRMSubscription = getCRMSubscription();

        const subscription = await CRMSubscription.findOne({ userId: viewerUserId });
        if (subscription) {
          const maxLeads = subscription.leadsLimit || 500;
          const currentCount = await Lead.countDocuments({
            $or: [
              { assignedToUserId: viewerUserId },
              { createdByUserId: viewerUserId },
            ],
          });
          if (currentCount >= maxLeads) {
            return NextResponse.json(
              {
                error: `Lead limit reached (${maxLeads}). Upgrade your plan to add more leads.`,
                limitReached: true,
                currentCount,
                maxLeads,
              },
              { status: 402 },
            );
          }
        }
      } catch (e) {
        // Log but don't block lead creation if plan check fails
        console.warn('[leads] Plan limit check failed, allowing creation:', e);
      }
    }

    // Check for duplicates by email or phone number - WITHIN CURRENT TENANT ONLY
    const dupConditions: any[] = [
      {
        $or: [
          ...(email ? [{ email }] : []),
          { phoneNumber },
        ],
      },
      // CRITICAL: Filter by current user/tenant to prevent cross-tenant data exposure
      {
        $or: [
          { assignedToUserId: viewerUserId },
          { createdByUserId: viewerUserId },
        ],
      },
    ];
    // Scope duplicate detection to the SAME source. QR and Meta are separate
    // pipelines, so the same phone can legitimately exist as BOTH a Meta lead and
    // a QR lead — a Meta lead must not block adding that number to QR leads.
    if (source) dupConditions.push({ source });
    const existingLead = await Lead.findOne({ $and: dupConditions });

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
    const { leadNumber } = await allocateNextLeadNumber(viewerUserId);

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
  } catch (error: any) {
    logger.error('leads', 'POST /api/admin/crm/leads failed', error);

    // Handle MongoDB E11000 duplicate key error
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern || {})[0] || 'field';
      return NextResponse.json(
        {
          error: `A lead with this ${field} already exists for your account`,
          duplicate: true,
          field
        },
        { status: 409 }
      );
    }

    const message = error instanceof Error ? error.message : 'Failed to create lead';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
