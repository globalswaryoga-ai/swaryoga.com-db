import { NextRequest, NextResponse } from 'next/server';
import { connectDB, Order } from '@/lib/db';
import { isAdminAuthorized } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeEmail(value: unknown): string {
  return String(value || '').trim().toLowerCase();
}

function getDaysParam(request: NextRequest, key: string): number | null {
  const url = new URL(request.url);
  const raw = url.searchParams.get(key);
  if (!raw) return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

function computeBeforeDate(days: number | null): Date | null {
  if (days == null) return null;
  const ms = days * 24 * 60 * 60 * 1000;
  return new Date(Date.now() - ms);
}

/**
 * GET /api/admin/orders/purge-failed
 * Preview counts of failed orders that would be deleted.
 *
 * Query params:
 *  - olderThanDays: number (optional)
 *  - paymentMethod: string (optional)
 *  - email: string (optional; matches shippingAddress.email)
 */
export async function GET(request: NextRequest) {
  try {
    if (!isAdminAuthorized(request)) {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 401 });
    }

    const url = new URL(request.url);
    const olderThanDays = getDaysParam(request, 'olderThanDays');
    const paymentMethod = url.searchParams.get('paymentMethod') || undefined;
    const email = normalizeEmail(url.searchParams.get('email')) || undefined;
    const before = computeBeforeDate(olderThanDays);

    await connectDB();

    const filter: Record<string, unknown> = {
      paymentStatus: 'failed',
    };

    if (paymentMethod) filter.paymentMethod = paymentMethod;
    if (before) filter.createdAt = { $lt: before };
    if (email) {
      filter['shippingAddress.email'] = { $regex: new RegExp(`^${escapeRegExp(email)}$`, 'i') };
    }

    const count = await Order.countDocuments(filter);

    return NextResponse.json({
      success: true,
      filter: {
        paymentStatus: 'failed',
        paymentMethod: paymentMethod || null,
        olderThanDays: olderThanDays ?? null,
        email: email || null,
      },
      count,
    });
  } catch (error) {
    console.error('Failed to preview purge-failed orders:', error);
    return NextResponse.json({ error: 'Failed to preview failed orders purge' }, { status: 500 });
  }
}

/**
 * POST /api/admin/orders/purge-failed
 * Delete failed orders.
 *
 * Body:
 *  {
 *    "confirm": "DELETE_FAILED_ORDERS",
 *    "olderThanDays"?: number,
 *    "paymentMethod"?: string,
 *    "email"?: string
 *  }
 */
export async function POST(request: NextRequest) {
  try {
    if (!isAdminAuthorized(request)) {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 401 });
    }

    const body = (await request.json().catch(() => null)) as null | {
      confirm?: string;
      olderThanDays?: number;
      paymentMethod?: string;
      email?: string;
    };

    if (!body || body.confirm !== 'DELETE_FAILED_ORDERS') {
      return NextResponse.json(
        {
          error: 'Confirmation required',
          hint: 'POST with { "confirm": "DELETE_FAILED_ORDERS" } to delete failed orders.',
        },
        { status: 400 }
      );
    }

    const olderThanDays = Number.isFinite(Number(body.olderThanDays)) ? Number(body.olderThanDays) : null;
    const before = computeBeforeDate(olderThanDays);
    const email = normalizeEmail(body.email) || undefined;

    await connectDB();

    const filter: Record<string, unknown> = {
      paymentStatus: 'failed',
    };

    if (body.paymentMethod) filter.paymentMethod = body.paymentMethod;
    if (before) filter.createdAt = { $lt: before };
    if (email) {
      filter['shippingAddress.email'] = { $regex: new RegExp(`^${escapeRegExp(email)}$`, 'i') };
    }

    const result = await Order.deleteMany(filter);

    return NextResponse.json({
      success: true,
      deletedCount: result.deletedCount || 0,
    });
  } catch (error) {
    console.error('Failed to purge failed orders:', error);
    return NextResponse.json({ error: 'Failed to purge failed orders' }, { status: 500 });
  }
}
