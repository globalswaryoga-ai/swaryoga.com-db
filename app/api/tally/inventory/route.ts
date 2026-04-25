/**
 * Inventory / Stock Management API
 * GET  /api/tally/inventory?fy=...&type=items|groups|txns|summary
 * POST /api/tally/inventory { action: create-group|create-item|update-item|delete-item|create-txn|summary, ... }
 */

import { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { apiError, apiSuccess } from '@/lib/api-error';
import {

export const dynamic = 'force-dynamic';
  getStockGroups,
  createStockGroup,
  getStockItems,
  createStockItem,
  updateStockItem,
  deleteStockItem,
  getStockTransactions,
  createStockTransaction,
  getStockSummary,
} from '@/lib/tally/engine';
import { resolveTallyOwnerId, getTallyOwnerIdForWrite } from '@/lib/tally/access';

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

    const ownerId = resolveTallyOwnerId(decoded);
    const type = request.nextUrl.searchParams.get('type') || 'items';

    if (type === 'groups') {
      const groups = await getStockGroups(fy, ownerId);
      return apiSuccess({ groups });
    }

    if (type === 'txns') {
      const stockItemId = request.nextUrl.searchParams.get('stockItemId') || undefined;
      const txns = await getStockTransactions(fy, { stockItemId }, ownerId);
      return apiSuccess({ transactions: txns });
    }

    if (type === 'summary') {
      const summary = await getStockSummary(fy, ownerId);
      return apiSuccess(summary);
    }

    // Default: items
    const groupId = request.nextUrl.searchParams.get('groupId') || undefined;
    const items = await getStockItems(fy, { groupId }, ownerId);
    return apiSuccess({ items });
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

    if (action === 'create-group') {
      const { name, financialYear, parentId } = body;
      if (!name || !financialYear) return apiError('VALIDATION_ERROR', 'name and financialYear required');
      const writeOwnerId = getTallyOwnerIdForWrite(decoded);
      const doc = await createStockGroup({ name, financialYear, parentId, createdByUserId: (decoded as any).userId, ownerId: writeOwnerId });
      return apiSuccess({ stockGroup: doc });
    }

    if (action === 'create-item') {
      const { name, financialYear, stockGroupId, stockGroupName, unit, hsnCode, gstRate, openingQty, openingRate, openingValue, sellingPrice, purchasePrice, reorderLevel, godown } = body;
      if (!name || !financialYear) return apiError('VALIDATION_ERROR', 'name and financialYear required');
      const writeOwnerId = getTallyOwnerIdForWrite(decoded);
      const doc = await createStockItem({ name, financialYear, stockGroupId, stockGroupName, unit, hsnCode, gstRate, openingQty, openingRate, openingValue, sellingPrice, purchasePrice, reorderLevel, godown, createdByUserId: (decoded as any).userId, ownerId: writeOwnerId });
      return apiSuccess({ stockItem: doc });
    }

    if (action === 'update-item') {
      const { id, ...data } = body;
      if (!id) return apiError('VALIDATION_ERROR', 'id required');
      const doc = await updateStockItem(id, data);
      return apiSuccess({ stockItem: doc });
    }

    if (action === 'delete-item') {
      const { id } = body;
      if (!id) return apiError('VALIDATION_ERROR', 'id required');
      await deleteStockItem(id);
      return apiSuccess({ deleted: true });
    }

    if (action === 'create-txn') {
      const { stockItemId, stockItemName, txnType, qty, rate, value, date, voucherId, voucherNumber, godownFrom, godownTo, narration, financialYear } = body;
      if (!stockItemId || !txnType || !qty || !financialYear) return apiError('VALIDATION_ERROR', 'Required fields missing');
      const writeOwnerId = getTallyOwnerIdForWrite(decoded);
      const doc = await createStockTransaction({ stockItemId, stockItemName, txnType, qty, rate: rate || 0, value: value || qty * (rate || 0), date, voucherId, voucherNumber, godownFrom, godownTo, narration, financialYear, createdByUserId: (decoded as any).userId, ownerId: writeOwnerId });
      return apiSuccess({ transaction: doc });
    }

    if (action === 'summary') {
      const { financialYear } = body;
      if (!financialYear) return apiError('VALIDATION_ERROR', 'financialYear required');
      const ownerId = resolveTallyOwnerId(decoded);
      const summary = await getStockSummary(financialYear, ownerId);
      return apiSuccess(summary);
    }

    return apiError('VALIDATION_ERROR', 'Invalid action');
  } catch (e: any) {
    return apiError('SERVER_ERROR', e.message);
  }
}
