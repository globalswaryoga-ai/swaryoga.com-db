import { NextRequest } from 'next/server';
import { connectDB, getUser } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin, escapeRegexLiteral, parsePagination } from '@/lib/crm-handlers';
import { apiError, apiSuccess } from '@/lib/api-error';
import { getLead } from '@/lib/schemas/enterpriseSchemas';

export const dynamic = 'force-dynamic';


/**
 * Super Admin Users API
 * GET: List all website users with search, filter, pagination
 * POST: Convert a user to a CRM lead
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin || !isSuperAdmin(decoded)) {
      return apiError('UNAUTHORIZED');
    }

    await connectDB();
    const User = getUser();

    const url = new URL(request.url);
    const { limit, skip } = parsePagination(request);
    const search = url.searchParams.get('search') || '';
    const role = url.searchParams.get('role') || '';
    const country = url.searchParams.get('country') || '';
    const gender = url.searchParams.get('gender') || '';
    const sortBy = url.searchParams.get('sortBy') || 'createdAt';
    const sortOrder = url.searchParams.get('sortOrder') === 'asc' ? 1 : -1;
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');
    const hasOrders = url.searchParams.get('hasOrders'); // 'true' / 'false'

    // Build filter
    const filter: any = {};

    if (search) {
      const escaped = escapeRegexLiteral(search);
      filter.$or = [
        { name: { $regex: escaped, $options: 'i' } },
        { email: { $regex: escaped, $options: 'i' } },
        { phone: { $regex: escaped, $options: 'i' } },
        { userId: { $regex: escaped, $options: 'i' } },
      ];
    }

    if (role) filter.role = role;
    if (country) filter.country = { $regex: escapeRegexLiteral(country), $options: 'i' };
    if (gender) filter.gender = gender;

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const sortObj: any = {};
    sortObj[sortBy] = sortOrder;

    const [users, total] = await Promise.all([
      User.find(filter, '-password -lifePlanner')
        .sort(sortObj)
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(filter),
    ]);

    // If requested, fetch order count per user
    let usersWithOrders = users;
    if (hasOrders !== null) {
      const { default: mongoose } = await import('mongoose');
      const db = mongoose.connection.db;
      if (db) {
        const userIds = users.map((u: any) => u.userId || u._id?.toString());
        const ordersCol = db.collection('orders');

        // Get order counts for these users
        const orderCounts = await ordersCol.aggregate([
          { $match: { userId: { $in: userIds } } },
          { $group: { _id: '$userId', count: { $sum: 1 }, totalSpent: { $sum: '$total' } } },
        ]).toArray();

        const orderMap: Record<string, { count: number; totalSpent: number }> = {};
        for (const o of orderCounts) {
          orderMap[o._id] = { count: o.count, totalSpent: o.totalSpent };
        }

        usersWithOrders = users.map((u: any) => ({
          ...u,
          orderCount: orderMap[u.userId]?.count || 0,
          totalSpent: orderMap[u.userId]?.totalSpent || 0,
        }));
      }
    }

    return apiSuccess({
      users: usersWithOrders,
      total,
      limit,
      skip,
      hasMore: skip + limit < total,
    });
  } catch (err: any) {
    console.error('[super-admin/users] GET Error:', err);
    return apiError('SERVER_ERROR', err.message);
  }
}

/**
 * POST: Convert website user(s) to CRM lead(s)
 * Body: { userIds: string[], assignTo?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin || !isSuperAdmin(decoded)) {
      return apiError('UNAUTHORIZED');
    }

    await connectDB();
    const User = getUser();
    const Lead = getLead();

    const body = await request.json();
    const { userIds, assignTo } = body;

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return apiError('VALIDATION_ERROR', 'userIds array is required');
    }

    // Get user details
    const users = await User.find(
      { $or: [{ userId: { $in: userIds } }, { _id: { $in: userIds } }] },
      'userId name email phone country countryCode'
    ).lean();

    if (users.length === 0) {
      return apiError('NOT_FOUND', 'No users found');
    }

    const results: any[] = [];
    const viewerUserId = decoded.userId;

    for (const user of users as any[]) {
      // Check if lead already exists
      const existingLead = await Lead.findOne({
        $or: [
          { email: user.email },
          { phoneNumber: user.phone },
          { linkedUserId: user.userId },
        ],
        linkedUserId: viewerUserId,
      });

      if (existingLead) {
        results.push({ userId: user.userId, status: 'exists', leadId: existingLead._id });
        continue;
      }

      // Create new lead
      const newLead = await Lead.create({
        linkedUserId: viewerUserId,
        assignedToUserId: assignTo || viewerUserId,
        name: user.name || user.userId || 'Unknown',
        phoneNumber: user.phone || '',
        email: user.email || '',
        status: 'new',
        source: 'website_user',
        labels: ['Website User'],
        notes: `Imported from website user: ${user.userId}`,
      });

      results.push({ userId: user.userId, status: 'created', leadId: newLead._id });
    }

    return apiSuccess({ results, total: results.length });
  } catch (err: any) {
    console.error('[super-admin/users] POST Error:', err);
    return apiError('SERVER_ERROR', err.message);
  }
}
