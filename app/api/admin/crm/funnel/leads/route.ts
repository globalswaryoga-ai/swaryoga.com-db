/**
 * Funnel Leads API
 * GET - Fetch leads grouped by funnel stage with counts
 */
import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { apiError, apiSuccess } from '@/lib/api-error';
import { getLead, getWhatsAppMessage } from '@/lib/schemas/enterpriseSchemas';
import { getViewerUserId, isSuperAdmin } from '@/lib/crm-handlers';

export const dynamic = 'force-dynamic';


export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin) return apiError('UNAUTHORIZED');

    await connectDB();
    const Lead = getLead();
    const WhatsAppMessage = getWhatsAppMessage();
    const url = new URL(request.url);

    const viewerId = getViewerUserId(decoded);
    const isSuper = isSuperAdmin(decoded);

    // Filters
    const stage = url.searchParams.get('stage') || '';
    const assignedTo = url.searchParams.get('assignedTo') || '';
    const search = url.searchParams.get('search') || '';
    const country = url.searchParams.get('country') || '';
    const languageCode = url.searchParams.get('language') || '';
    const region = url.searchParams.get('region') || '';
    const state = url.searchParams.get('state') || '';
    const label = url.searchParams.get('label') || '';
    const workshopName = url.searchParams.get('workshop') || '';
    const month = url.searchParams.get('month') || ''; // YYYY-MM format
    const fetchAll = url.searchParams.get('all') === '1'; // fetch leads even without stage
    const metaOnly24h = url.searchParams.get('metaOnly24h') === '1'; // show only Meta messages in 24h window
    const limit = Math.min(Number(url.searchParams.get('limit') || 50), 200);
    const skip = Number(url.searchParams.get('skip') || 0);

    // Build base query
    const query: any = {};

    // Non-super admins only see their own leads
    if (!isSuper) {
      query.$and = [
        { $or: [
          { assignedToUserId: viewerId },
          { createdByUserId: viewerId },
        ] },
      ];
    } else if (assignedTo) {
      query.assignedToUserId = assignedTo;
    }

    if (search) {
      const esc = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const searchOr = {
        $or: [
          { name: { $regex: esc, $options: 'i' } },
          { displayName: { $regex: esc, $options: 'i' } },
          { phoneNumber: { $regex: esc, $options: 'i' } },
          { email: { $regex: esc, $options: 'i' } },
          { leadNumber: { $regex: esc, $options: 'i' } },
          { source: { $regex: esc, $options: 'i' } },
          { workshopName: { $regex: esc, $options: 'i' } },
          { country: { $regex: esc, $options: 'i' } },
          { labels: { $regex: esc, $options: 'i' } },
          { title: { $regex: esc, $options: 'i' } },
        ],
      };
      if (query.$and) {
        query.$and.push(searchOr);
      } else {
        query.$or = searchOr.$or;
      }
    }

    const source = url.searchParams.get('source') || '';
    const excludeSource = url.searchParams.get('excludeSource') || '';
    if (country) query.country = country;
    if (languageCode) query.language = languageCode; // filter by language name (e.g., "Hindi"), not code
    if (region) query.region = region;
    if (state) query.state = state;
    if (label) query.labels = label;
    if (workshopName) query.workshopName = workshopName;
    if (source) query.source = source;
    if (excludeSource) {
      const excluded = excludeSource.split(',').map(s => s.trim()).filter(Boolean);
      query.source = { ...(typeof query.source === 'object' ? query.source : {}), $nin: excluded };
    }
    if (month) {
      const [y, m] = month.split('-').map(Number);
      if (y && m) {
        const start = new Date(y, m - 1, 1);
        const end = new Date(y, m, 1);
        query.createdAt = { $gte: start, $lt: end };
      }
    }

    // ── Filter by Meta messages in last 24 hours ──
    if (metaOnly24h) {
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
      
      if (query.$and) {
        query.$and.push({ _id: { $in: metaLeadIds } });
      } else if (query.$or) {
        // Wrap existing $or in $and
        query.$and = [{ $or: query.$or }, { _id: { $in: metaLeadIds } }];
        delete query.$or;
      } else {
        query._id = { $in: metaLeadIds };
      }
    }

    // Get stage counts (aggregation)
    const stageCounts = await Lead.aggregate([
      { $match: query },
      {
        $group: {
          _id: { $ifNull: ['$funnelStage', 'new_lead'] },
          count: { $sum: 1 },
        },
      },
    ]);

    const stageCountMap: Record<string, number> = {};
    for (const sc of stageCounts) {
      stageCountMap[sc._id] = sc.count;
    }

    // Fetch leads for specific stage or all
    let leads: any[] = [];
    if (stage || fetchAll) {
      const leadQuery = stage
        ? { ...query, funnelStage: stage === 'new_lead' ? { $in: [stage, null, ''] } : stage }
        : { ...query };
      leads = await Lead.find(leadQuery)
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('name phoneNumber email status labels source workshopName funnelStage assignedToUserId createdByUserId leadNumber lastMessageAt chatStatus createdAt updatedAt sales.payment.status title displayName country countryCode language languageCode region state city firstTouchedAt')
        .lean();
    }

    // Distinct values for filters
    const [distinctLabels, distinctWorkshops, distinctCountries, distinctLanguages] = await Promise.all([
      Lead.distinct('labels', query),
      Lead.distinct('workshopName', query),
      Lead.distinct('country', query),
      Lead.distinct('language', query),
    ]);

    // Total leads count
    const totalLeads = stage
      ? await Lead.countDocuments(stage === 'new_lead' ? { ...query, funnelStage: { $in: [stage, null, ''] } } : { ...query, funnelStage: stage })
      : await Lead.countDocuments(query);

    return apiSuccess({
      stageCounts: stageCountMap,
      leads,
      totalLeads,
      pagination: { limit, skip },
      filters: {
        labels: distinctLabels.filter(Boolean).sort(),
        workshops: distinctWorkshops.filter(Boolean).sort(),
        countries: distinctCountries.filter(Boolean).sort(),
        languages: distinctLanguages.filter(Boolean).sort(),
      },
    });
  } catch (err: any) {
    console.error('[Funnel Leads GET]', err);
    return apiError('SERVER_ERROR', err.message);
  }
}
