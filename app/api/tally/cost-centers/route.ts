/**
 * Cost Centers API
 * GET  /api/tally/cost-centers?fy=...
 * POST /api/tally/cost-centers  { action: create|update|delete|report, ... }
 */

import { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { apiError, apiSuccess } from '@/lib/api-error';
import {
  getCostCenters,
  createCostCenter,
  updateCostCenter,
  deleteCostCenter,
  getCostCenterReport,
} from '@/lib/tally/engine';

function getAuth(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return null;
  try { return verifyToken(token); } catch { return null; }
}

export async function GET(request: NextRequest) {
  try {
    const decoded = getAuth(request);
    if (!decoded || !(decoded as any).isAdmin) return apiError('UNAUTHORIZED');

    const fy = request.nextUrl.searchParams.get('fy');
    if (!fy) return apiError('VALIDATION_ERROR', 'fy parameter required');

    const centers = await getCostCenters(fy);
    return apiSuccess({ centers });
  } catch (e: any) {
    return apiError('SERVER_ERROR', e.message);
  }
}

export async function POST(request: NextRequest) {
  try {
    const decoded = getAuth(request);
    if (!decoded || !(decoded as any).isAdmin) return apiError('UNAUTHORIZED');

    const body = await request.json();
    const { action } = body;

    if (action === 'create') {
      const { name, category, financialYear, parentId, description, budgetAmount } = body;
      if (!name || !financialYear) return apiError('VALIDATION_ERROR', 'name and financialYear required');
      const doc = await createCostCenter({ name, category: category || 'department', financialYear, parentId, description, budgetAmount, createdByUserId: (decoded as any).userId });
      return apiSuccess({ costCenter: doc });
    }

    if (action === 'update') {
      const { id, ...data } = body;
      if (!id) return apiError('VALIDATION_ERROR', 'id required');
      const doc = await updateCostCenter(id, data);
      return apiSuccess({ costCenter: doc });
    }

    if (action === 'delete') {
      const { id } = body;
      if (!id) return apiError('VALIDATION_ERROR', 'id required');
      await deleteCostCenter(id);
      return apiSuccess({ deleted: true });
    }

    if (action === 'report') {
      const { financialYear } = body;
      if (!financialYear) return apiError('VALIDATION_ERROR', 'financialYear required');
      const report = await getCostCenterReport(financialYear);
      return apiSuccess(report);
    }

    return apiError('VALIDATION_ERROR', 'Invalid action');
  } catch (e: any) {
    return apiError('SERVER_ERROR', e.message);
  }
}
