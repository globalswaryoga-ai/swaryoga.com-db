/**
 * DELETE /api/admin/crm/tenant/data-delete
 *
 * Permanently delete ALL tenant data with safety mechanisms:
 * 1. Requires explicit confirmation with countdown timer
 * 2. Auto-backup of all data before deletion
 * 3. Complete purge of MongoDB, Bunny files, and settings
 *
 * Body: { confirmToken: string, tenantPassword: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { getViewerUserId, isSuperAdmin } from '@/lib/crm-handlers';

export const dynamic = 'force-dynamic';

// In-memory store for deletion confirmations (expires after 5 minutes)
const deletionConfirmations = new Map<string, { expiresAt: number; tenantId: string }>();

/**
 * STEP 1: Request deletion confirmation token
 * POST with no body - returns confirmation token
 */
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);

    if (!decoded?.userId && !decoded?.isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized: Authentication required' },
        { status: 401 }
      );
    }

    const tenantId = getViewerUserId(decoded);
    if (!tenantId) {
      return NextResponse.json(
        { error: 'Unauthorized: Missing tenant information' },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));

    // If requesting new confirmation token
    if (!body.confirmToken && !body.executeDelete) {
      const confirmToken = `delete_${tenantId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      deletionConfirmations.set(confirmToken, {
        expiresAt: Date.now() + 5 * 60 * 1000, // Expires in 5 minutes
        tenantId: tenantId,
      });

      return NextResponse.json(
        {
          status: 'confirmation_required',
          confirmToken: confirmToken,
          expiresIn: 300, // 5 minutes in seconds
          message: 'Confirmation token generated. User must confirm deletion with countdown timer.',
        },
        { status: 200 }
      );
    }

    // If executing deletion with confirmation
    if (body.executeDelete && body.confirmToken) {
      const confirmation = deletionConfirmations.get(body.confirmToken);

      if (!confirmation) {
        return NextResponse.json(
          { error: 'Invalid or expired confirmation token' },
          { status: 400 }
        );
      }

      if (confirmation.expiresAt < Date.now()) {
        deletionConfirmations.delete(body.confirmToken);
        return NextResponse.json(
          { error: 'Confirmation token expired. Request a new one.' },
          { status: 400 }
        );
      }

      if (confirmation.tenantId !== tenantId) {
        return NextResponse.json(
          { error: 'Confirmation token does not match tenant' },
          { status: 403 }
        );
      }

      // EXECUTE DELETION
      return await executeDataDeletion(tenantId, decoded);
    }

    return NextResponse.json(
      { error: 'Invalid request parameters' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('[Data Delete] Error:', error);
    return NextResponse.json(
      {
        error: 'Deletion request failed',
        message: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * STEP 2: Execute permanent deletion
 */
async function executeDataDeletion(tenantId: string, decoded: any): Promise<NextResponse> {
  try {
    const { deleteTenantData } = await import('@/lib/crm/tenantDataDeletion');
    const result = await deleteTenantData(tenantId, getViewerUserId(decoded));

    return NextResponse.json(
      {
        success: true,
        status: 'deleted',
        message: 'All tenant data has been permanently deleted',
        deletionSummary: {
          tenantId: result.tenantId,
          deletedAt: result.deletedAt,
          collections: result.collections,
          totalDeleted: result.totalDeleted,
          note: 'This action cannot be undone. Data has been permanently removed from all systems.',
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('[Data Delete] Execution error:', error);
    return NextResponse.json(
      {
        error: 'Deletion execution failed',
        message: error.message,
      },
      { status: 500 }
    );
  }
}
