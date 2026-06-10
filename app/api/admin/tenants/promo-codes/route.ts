/**
 * Promo Codes API — super-admin managed discount codes.
 *
 * Codes are NOT shown to new users; the super-admin creates them here and hands
 * them out manually. A selected user can then enter a code at checkout to get
 * the discount (5–100%) for a month or a year.
 *
 * Stored as ONE document { key: 'promo_codes', codes: [...] } inside the
 * existing `auto_config` collection (the cluster is at its 500-collection cap,
 * so no new collection can be created).
 *
 *   GET    /api/admin/tenants/promo-codes        — list (super-admin)
 *   POST   /api/admin/tenants/promo-codes        — create/update by code
 *   DELETE /api/admin/tenants/promo-codes?code=X — delete
 */

import { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';
import { apiSuccess, apiError } from '@/lib/api-error';

export const dynamic = 'force-dynamic';

const PROMO_DOC_KEY = 'promo_codes';

export interface PromoCode {
  code: string;
  discountPercent: number;        // 5–100
  duration: 'month' | 'year';     // how long the discount applies
  active: boolean;
  note?: string;                  // who it's for, internal
  updatedAt?: Date;
}

function requireSuperAdmin(request: NextRequest) {
  const decoded = verifyToken(request.headers.get('authorization')?.replace('Bearer ', '') || '');
  return decoded && isSuperAdmin(decoded) ? decoded : null;
}

function promoCollection() {
  return mongoose.connection
    .useDb(process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm')
    .collection('auto_config');
}

async function readCodes(): Promise<PromoCode[]> {
  const doc = await promoCollection().findOne({ key: PROMO_DOC_KEY });
  return Array.isArray((doc as any)?.codes) ? (doc as any).codes : [];
}

async function writeCodes(codes: PromoCode[]) {
  await promoCollection().updateOne(
    { key: PROMO_DOC_KEY },
    { $set: { key: PROMO_DOC_KEY, codes, updatedAt: new Date() } },
    { upsert: true },
  );
}

// Normalize a raw code: uppercase, alphanumeric + dashes.
function normCode(c: any): string {
  return String(c || '').trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
}

function clampPercent(v: any): number {
  return Math.max(5, Math.min(100, Math.round(Number(v) || 0)));
}

export async function GET(request: NextRequest) {
  if (!requireSuperAdmin(request)) return apiError('UNAUTHORIZED');
  try {
    await connectDB();
    return apiSuccess({ codes: await readCodes() });
  } catch (e) {
    console.error('[promo-codes GET]', e);
    return apiError('SERVER_ERROR', e instanceof Error ? e.message : 'Failed to load promo codes');
  }
}

export async function POST(request: NextRequest) {
  if (!requireSuperAdmin(request)) return apiError('UNAUTHORIZED');
  try {
    await connectDB();
    const body = await request.json();
    const code = normCode(body.code);
    if (!code) return apiError('VALIDATION_ERROR', 'code is required');

    const duration: 'month' | 'year' = body.duration === 'year' ? 'year' : 'month';
    const entry: PromoCode = {
      code,
      discountPercent: clampPercent(body.discountPercent),
      duration,
      active: body.active === undefined ? true : !!body.active,
      note: String(body.note || '').trim(),
      updatedAt: new Date(),
    };

    const codes = await readCodes();
    const idx = codes.findIndex((c) => normCode(c.code) === code);
    if (idx >= 0) codes[idx] = entry; else codes.push(entry);
    await writeCodes(codes);

    return apiSuccess({ code: entry, message: 'Promo code saved.' });
  } catch (e) {
    console.error('[promo-codes POST]', e);
    return apiError('SERVER_ERROR', e instanceof Error ? e.message : 'Failed to save promo code');
  }
}

export async function DELETE(request: NextRequest) {
  if (!requireSuperAdmin(request)) return apiError('UNAUTHORIZED');
  try {
    await connectDB();
    const code = normCode(new URL(request.url).searchParams.get('code'));
    if (!code) return apiError('VALIDATION_ERROR', 'code query param is required');

    const codes = await readCodes();
    const next = codes.filter((c) => normCode(c.code) !== code);
    if (next.length === codes.length) return apiError('NOT_FOUND', `Promo code "${code}" not found`);
    await writeCodes(next);

    return apiSuccess({ message: `Promo code "${code}" deleted.` });
  } catch (e) {
    console.error('[promo-codes DELETE]', e);
    return apiError('SERVER_ERROR', e instanceof Error ? e.message : 'Failed to delete promo code');
  }
}
