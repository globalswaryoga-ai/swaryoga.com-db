/**
 * Promo Codes API — super-admin managed discount codes (Pure BunnyDB: crm_promo_codes_sql).
 *
 *   GET    /api/admin/tenants/promo-codes        — list (super-admin)
 *   POST   /api/admin/tenants/promo-codes        — create/update by code
 *   DELETE /api/admin/tenants/promo-codes?code=X — delete
 */

import { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';
import { apiSuccess, apiError } from '@/lib/api-error';
import {
  getPromoCodes,
  savePromoCode,
  deletePromoCode,
  type PromoCodeRecord,
} from '@/lib/tenant/bunnyTenantRepository';

export const dynamic = 'force-dynamic';

function requireSuperAdmin(request: NextRequest) {
  const decoded = verifyToken(request.headers.get('authorization')?.replace('Bearer ', '') || '');
  return decoded && isSuperAdmin(decoded) ? decoded : null;
}

function normCode(c: any): string {
  return String(c || '').trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
}

function clampPercent(v: any): number {
  return Math.max(5, Math.min(100, Math.round(Number(v) || 0)));
}

export async function GET(request: NextRequest) {
  if (!requireSuperAdmin(request)) return apiError('UNAUTHORIZED');
  try {
    const codes = await getPromoCodes();
    return apiSuccess({ codes });
  } catch (e: any) {
    console.error('[promo-codes GET Error]:', e);
    return apiError('SERVER_ERROR', e.message || 'Failed to load promo codes');
  }
}

export async function POST(request: NextRequest) {
  if (!requireSuperAdmin(request)) return apiError('UNAUTHORIZED');
  try {
    const body = await request.json();
    const code = normCode(body.code);
    if (!code) return apiError('VALIDATION_ERROR', 'code is required');

    const duration: 'month' | 'year' = body.duration === 'year' ? 'year' : 'month';
    const entry: PromoCodeRecord = {
      code,
      discountPercent: clampPercent(body.discountPercent),
      duration,
      active: body.active === undefined ? true : !!body.active,
      note: String(body.note || '').trim(),
      updatedAt: new Date().toISOString(),
    };

    await savePromoCode(entry);
    return apiSuccess({ entry, message: `Promo code ${code} saved in BunnyDB.` });
  } catch (e: any) {
    console.error('[promo-codes POST Error]:', e);
    return apiError('SERVER_ERROR', e.message || 'Failed to save promo code');
  }
}

export async function DELETE(request: NextRequest) {
  if (!requireSuperAdmin(request)) return apiError('UNAUTHORIZED');
  try {
    const code = normCode(new URL(request.url).searchParams.get('code'));
    if (!code) return apiError('VALIDATION_ERROR', 'code is required');

    const deleted = await deletePromoCode(code);
    if (!deleted) return apiError('NOT_FOUND', `Code "${code}" not found`);

    return apiSuccess({ deleted: true, code, message: `Promo code ${code} deleted from BunnyDB.` });
  } catch (e: any) {
    console.error('[promo-codes DELETE Error]:', e);
    return apiError('SERVER_ERROR', e.message || 'Failed to delete promo code');
  }
}
