/**
 * Tally Groups API
 * GET /api/tally/groups — List account sub-groups
 */

import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { apiError, apiSuccess } from '@/lib/api-error';
import { getAccGroup } from '@/lib/schemas/enterpriseSchemas';
import { resolveTallyOwnerId } from '@/lib/tally/access';
import { scopeQuery } from '@/lib/tally/access';

function getAuth(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return null;
  try {
    return verifyToken(token);
  } catch { return null; }
}

export async function GET(request: NextRequest) {
  try {
    const decoded = getAuth(request);
    if (!decoded) return apiError('UNAUTHORIZED');

    await connectDB();
    const AccGroup = getAccGroup();

    const searchParams = request.nextUrl.searchParams;
    const fy = searchParams.get('fy') || '2023-24';
    const nature = searchParams.get('nature'); // ASSET, LIABILITY, etc.

    const ownerId = resolveTallyOwnerId(decoded);
    const query: any = ownerId ? { financialYear: fy, ownerId } : { financialYear: fy };
    if (nature) query.nature = nature;

    const groups = await AccGroup.find(query).sort({ nature: 1, name: 1 }).lean();

    return apiSuccess({
      groups: (groups as any[]).map(g => ({
        id: String(g._id),
        name: g.name,
        nature: g.nature,
        report: g.report,
        affectsGrossProfit: g.affectsGrossProfit,
        isSystemDefault: g.isSystemDefault,
      })),
      count: groups.length,
    });
  } catch (error: any) {
    console.error('[Tally Groups GET]', error);
    return apiError('SERVER_ERROR', error.message);
  }
}
