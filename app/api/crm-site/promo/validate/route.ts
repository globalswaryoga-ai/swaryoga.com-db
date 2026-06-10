/**
 * GET /api/crm-site/promo/validate?code=XXXX
 *
 * Public endpoint a checkout user hits when they enter a promo code that was
 * handed to them manually. Returns the discount if the code is active. Codes
 * are never listed publicly — you can only validate one you already have.
 */

import { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/db';
import { apiSuccess, apiError } from '@/lib/api-error';

export const dynamic = 'force-dynamic';

const PROMO_DOC_KEY = 'promo_codes';

function normCode(c: any): string {
  return String(c || '').trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
}

export async function GET(request: NextRequest) {
  try {
    const code = normCode(new URL(request.url).searchParams.get('code'));
    if (!code) return apiError('VALIDATION_ERROR', 'code is required');

    await connectDB();
    const col = mongoose.connection
      .useDb(process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm')
      .collection('auto_config');
    const doc = await col.findOne({ key: PROMO_DOC_KEY });
    const codes: any[] = Array.isArray((doc as any)?.codes) ? (doc as any).codes : [];

    const match = codes.find((c) => normCode(c.code) === code && c.active !== false);
    if (!match) {
      return apiSuccess({ valid: false });
    }

    return apiSuccess({
      valid: true,
      code,
      discountPercent: Math.max(5, Math.min(100, Math.round(Number(match.discountPercent) || 0))),
      duration: match.duration === 'year' ? 'year' : 'month',
    });
  } catch (e) {
    console.error('[promo validate]', e);
    return apiError('SERVER_ERROR', e instanceof Error ? e.message : 'Failed to validate code');
  }
}
