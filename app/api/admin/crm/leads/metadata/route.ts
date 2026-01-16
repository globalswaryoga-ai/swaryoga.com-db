import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { getLead } from '@/lib/schemas/enterpriseSchemas';
import { CANONICAL_LABELS } from '@/lib/crm/labels';

// Mark as dynamic since this route uses request.headers or request.url
export const dynamic = 'force-dynamic';


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

/**
 * GET /api/admin/crm/leads/metadata
 * Get counts and unique workshops for filtering (no lead data, fast)
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

    const url = new URL(request.url);
    const userIdParam = url.searchParams.get('userId');
    const superAdmin = isSuperAdmin(decoded);

    const baseFilter: any = {};
    if (superAdmin) {
      if (userIdParam && String(userIdParam).trim()) {
        baseFilter.assignedToUserId = String(userIdParam).trim();
      }
    } else {
      baseFilter.assignedToUserId = viewerUserId;
    }

    await connectDB();
    const Lead = getLead();

    // Get status counts (scoped to visible leads)
    const statusCounts = await Promise.all([
      Lead.countDocuments({ ...baseFilter, status: 'lead' }),
      Lead.countDocuments({ ...baseFilter, status: 'prospect' }),
      Lead.countDocuments({ ...baseFilter, status: 'customer' }),
      Lead.countDocuments({ ...baseFilter, status: 'inactive' }),
    ]);

    // Get unique workshops (scoped)
    const uniqueWorkshops = await Lead.distinct('workshopName', {
      ...baseFilter,
      workshopName: { $nin: [null, ''] },
    });

    // Get workshop counts
    const workshopCounts: Record<string, number> = {};
    for (const workshop of uniqueWorkshops) {
      const count = await Lead.countDocuments({ ...baseFilter, workshopName: workshop });
      workshopCounts[workshop] = count;
    }

    const total = await Lead.countDocuments(baseFilter);

    // Distinct labels (scoped)
    const distinctLabelsRaw = await Lead.distinct('labels', {
      ...baseFilter,
      labels: { $exists: true, $ne: [] },
    });

    const distinctLabels = Array.isArray(distinctLabelsRaw)
      ? distinctLabelsRaw
          .flatMap((x: any) => (Array.isArray(x) ? x : [x]))
          .map((x: any) => String(x || '').trim())
          .filter(Boolean)
      : [];

    // UI should use canonical labels everywhere; legacy labels are returned only for analytics/debug.
    // If you want to fully hide legacy labels, the UI will ignore `labels` and only use `canonicalLabels`.
    const labels = Array.from(new Set(distinctLabels)).sort((a, b) => a.localeCompare(b));

    return NextResponse.json(
      {
        success: true,
        data: {
          total,
          statusCounts: {
            lead: statusCounts[0],
            prospect: statusCounts[1],
            customer: statusCounts[2],
            inactive: statusCounts[3],
          },
          workshops: uniqueWorkshops.sort(),
          workshopCounts,
          canonicalLabels: CANONICAL_LABELS,
          labels,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load metadata';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
