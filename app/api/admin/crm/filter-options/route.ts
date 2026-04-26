/**
 * CRM Filter Options API
 * GET  - Fetch custom filter options by category (all admins)
 * POST - Add a new custom filter option (superadmin only)
 */
import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { apiError, apiSuccess } from '@/lib/api-error';
import { getCRMFilterOption } from '@/lib/schemas/enterpriseSchemas';
import { isSuperAdmin } from '@/lib/crm-handlers';

export const dynamic = 'force-dynamic';


const VALID_CATEGORIES = ['country', 'workshop', 'connection'] as const;

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin && !decoded?.userId) return apiError('UNAUTHORIZED');

    await connectDB();
    const CRMFilterOption = getCRMFilterOption();

    const category = request.nextUrl.searchParams.get('category') || '';

    const query: any = {};
    if (category && VALID_CATEGORIES.includes(category as any)) {
      query.category = category;
    }

    const options = await CRMFilterOption.find(query).sort({ value: 1 }).lean();

    // Group by category
    const grouped: Record<string, string[]> = { country: [], workshop: [], connection: [] };
    for (const opt of options) {
      const o = opt as any;
      if (grouped[o.category]) {
        grouped[o.category].push(o.value);
      }
    }

    return apiSuccess({ options: grouped });
  } catch (err: any) {
    console.error('[CRM Filter Options GET]', err);
    return apiError('SERVER_ERROR', err.message);
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin && !decoded?.userId) return apiError('UNAUTHORIZED');

    // Only superadmins can add new filter options (shared across all users)
    if (!isSuperAdmin(decoded)) {
      return apiError('FORBIDDEN', 'Superadmin access required to add filter options');
    }

    const { category, value } = await request.json();

    if (!category || !VALID_CATEGORIES.includes(category)) {
      return apiError('VALIDATION_ERROR', 'Invalid category. Must be: country, workshop, or connection');
    }
    if (!value || typeof value !== 'string' || !value.trim()) {
      return apiError('VALIDATION_ERROR', 'Value is required');
    }

    await connectDB();
    const CRMFilterOption = getCRMFilterOption();

    // Upsert to avoid duplicates
    await CRMFilterOption.findOneAndUpdate(
      { category, value: value.trim() },
      { $setOnInsert: { category, value: value.trim() } },
      { upsert: true, new: true }
    );

    // Return all options for this category
    const all = await CRMFilterOption.find({ category }).sort({ value: 1 }).lean();
    const values = (all as any[]).map(o => o.value);

    return apiSuccess({ category, values, message: `Added "${value.trim()}" to ${category}` });
  } catch (err: any) {
    console.error('[CRM Filter Options POST]', err);
    return apiError('SERVER_ERROR', err.message);
  }
}
