import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { Lead } from '@/lib/schemas/enterpriseSchemas';

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

    await connectDB();

    // Get status counts
    const statusCounts = await Promise.all([
      Lead.countDocuments({ status: 'lead' }),
      Lead.countDocuments({ status: 'prospect' }),
      Lead.countDocuments({ status: 'customer' }),
      Lead.countDocuments({ status: 'inactive' }),
    ]);

    // Get unique workshops
    const uniqueWorkshops = await Lead.distinct('workshopName', { workshopName: { $ne: null, $ne: '' } });

    // Get workshop counts
    const workshopCounts: Record<string, number> = {};
    for (const workshop of uniqueWorkshops) {
      const count = await Lead.countDocuments({ workshopName: workshop });
      workshopCounts[workshop] = count;
    }

    const total = await Lead.countDocuments();

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
        },
      },
      { status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load metadata';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
