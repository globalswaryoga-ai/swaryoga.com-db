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

function getNumberParam(request: NextRequest, key: string): number | null {
  const url = new URL(request.url);
  const raw = url.searchParams.get(key);
  if (!raw) return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

function computeBeforeDateFromMinutes(minutes: number | null): Date | null {
  if (minutes == null) return null;
  const ms = minutes * 60 * 1000;
  return new Date(Date.now() - ms);
}

/**
 * GET /api/admin/orders/expire-pending
 * Preview counts of pending PayU orders that would be marked as failed (expired).
 *
 * Query params:
 *  - olderThanMinutes: number (optional; recommended >= 30)
 *  - paymentMethod: string (optional)
 *  - email: string (optional; matches shippingAddress.email)
 */
export async function GET(request: NextRequest) {
  try {
    if (!isAdminAuthorized(request)) {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 401 });
    }

    const url = new URL(request.url);
    const olderThanMinutes = getNumberParam(request, 'olderThanMinutes');
    const paymentMethod = url.searchParams.get('paymentMethod') || undefined;
    const email = normalizeEmail(url.searchParams.get('email')) || undefined;
    const before = computeBeforeDateFromMinutes(olderThanMinutes);

    await connectDB();

    const filter: Record<string, unknown> = {
      paymentStatus: 'pending',
      status: 'pending',
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
        paymentStatus: 'pending',
        status: 'pending',
        paymentMethod: paymentMethod || null,
        olderThanMinutes: olderThanMinutes ?? null,
        email: email || null,
      },
      count,
    });
  } catch (error) {
    console.error('Failed to preview expire-pending orders:', error);
    return NextResponse.json({ error: 'Failed to preview pending orders expiry' }, { status: 500 });
  }
}

/**
 * POST /api/admin/orders/expire-pending
 * Mark pending orders as failed (expired).
 *
 * Body:
 *  {
 *    "confirm": "EXPIRE_PENDING_ORDERS",
 *    "olderThanMinutes"?: number,
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
      olderThanMinutes?: number;
      paymentMethod?: string;
      email?: string;
    };

    if (!body || body.confirm !== 'EXPIRE_PENDING_ORDERS') {
      return NextResponse.json(
        {
          error: 'Confirmation required',
          hint: 'POST with { "confirm": "EXPIRE_PENDING_ORDERS" } to mark pending orders as expired.',
        },
        { status: 400 }
      );
    }

    const olderThanMinutes = Number.isFinite(Number(body.olderThanMinutes)) ? Number(body.olderThanMinutes) : null;
    const before = computeBeforeDateFromMinutes(olderThanMinutes);
    const email = normalizeEmail(body.email) || undefined;

    // Safety: require at least 30 minutes if a threshold was provided.
    if (olderThanMinutes != null && olderThanMinutes < 30) {
      return NextResponse.json(
        { error: 'olderThanMinutes must be at least 30 to avoid expiring in-flight payments.' },
        { status: 400 }
      );
    }

    await connectDB();

    const filter: Record<string, unknown> = {
      paymentStatus: 'pending',
      status: 'pending',
    };

    if (body.paymentMethod) filter.paymentMethod = body.paymentMethod;
    if (before) filter.createdAt = { $lt: before };
    if (email) {
      filter['shippingAddress.email'] = { $regex: new RegExp(`^${escapeRegExp(email)}$`, 'i') };
    }

    const result = await Order.updateMany(filter, {
      $set: {
        paymentStatus: 'failed',
        status: 'failed',
        failureReason: 'Expired: no payment confirmation received',
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      matchedCount: (result as any).matchedCount ?? (result as any).n ?? 0,
      modifiedCount: (result as any).modifiedCount ?? (result as any).nModified ?? 0,
    });
  } catch (error) {
    console.error('Failed to expire pending orders:', error);
    return NextResponse.json({ error: 'Failed to expire pending orders' }, { status: 500 });
  }
}
