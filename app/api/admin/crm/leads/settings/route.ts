import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { getCrmLeadSettings, getCrmCounter } from '@/lib/schemas/enterpriseSchemas';
import { LEAD_NUMBER_COUNTER_ID } from '@/lib/crm/leadNumber';

export const dynamic = 'force-dynamic';

function getViewerUserId(decoded: any): string {
  return String(decoded?.userId || decoded?.username || '').trim();
}

/**
 * GET /api/admin/crm/leads/settings
 * Get CRM lead settings for the current user
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = getViewerUserId(decoded);
    if (!userId) {
      return NextResponse.json({ error: 'Missing user identity' }, { status: 401 });
    }

    await connectDB();
    const CrmLeadSettings = getCrmLeadSettings();
    const CrmCounter = getCrmCounter();

    const settings = await CrmLeadSettings.findOne({ userId }).lean();

    // Also get current lead number counter
    const counter = await CrmCounter.findOne({ _id: LEAD_NUMBER_COUNTER_ID }).lean();
    const currentSeq = (counter as any)?.seq || 0;

    return NextResponse.json({
      success: true,
      data: {
        workshopNames: (settings as any)?.workshopNames || [],
        labelNames: (settings as any)?.labelNames || [],
        leadNumberStart: (settings as any)?.leadNumberStart || null,
        adminUserNames: (settings as any)?.adminUserNames || {},
        currentLeadNumberSeq: currentSeq,
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to load settings';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/**
 * PUT /api/admin/crm/leads/settings
 * Update CRM lead settings for the current user
 */
export async function PUT(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = getViewerUserId(decoded);
    if (!userId) {
      return NextResponse.json({ error: 'Missing user identity' }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    await connectDB();
    const CrmLeadSettings = getCrmLeadSettings();

    const update: any = {};

    // Workshop names
    if (Array.isArray(body.workshopNames)) {
      update.workshopNames = body.workshopNames
        .map((n: any) => String(n || '').trim())
        .filter(Boolean);
    }

    // Label names
    if (Array.isArray(body.labelNames)) {
      update.labelNames = body.labelNames
        .map((n: any) => String(n || '').trim())
        .filter(Boolean);
    }

    // Lead number start (only allow setting if not already set or increasing)
    if (body.leadNumberStart !== undefined && body.leadNumberStart !== null) {
      const start = Number(body.leadNumberStart);
      if (!isNaN(start) && start >= 0) {
        update.leadNumberStart = start;

        // Also update the counter if the new start is higher
        const CrmCounter = getCrmCounter();
        const currentCounter = await CrmCounter.findOne({ _id: LEAD_NUMBER_COUNTER_ID }).lean();
        const currentSeq = Number((currentCounter as any)?.seq || 0);

        if (start > currentSeq) {
          await CrmCounter.findOneAndUpdate(
            { _id: LEAD_NUMBER_COUNTER_ID },
            { $set: { seq: start - 1 } }, // -1 because allocation does +1
            { upsert: true }
          );
        }
      }
    }

    // Admin user display names
    if (body.adminUserNames && typeof body.adminUserNames === 'object') {
      const cleanMap: Record<string, string> = {};
      for (const [key, val] of Object.entries(body.adminUserNames)) {
        const k = String(key).trim();
        const v = String(val || '').trim();
        if (k && v) cleanMap[k] = v;
      }
      update.adminUserNames = cleanMap;
    }

    const result = await CrmLeadSettings.findOneAndUpdate(
      { userId },
      { $set: update },
      { new: true, upsert: true }
    ).lean();

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to save settings';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
