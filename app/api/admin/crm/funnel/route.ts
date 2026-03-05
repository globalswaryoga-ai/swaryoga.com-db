import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { getFunnelConfig, getFunnelStageMapping, getLead, getFunnelStageHistory } from '@/lib/schemas/enterpriseSchemas';
import { apiError, apiSuccess } from '@/lib/api-error';
import { verifyToken, isSuperAdmin } from '@/lib/auth';

const CRM_DB_NAME = process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm';

// GET /api/admin/crm/funnel - List funnel config with stage distribution
export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const decoded = await verifyToken(req);
    if (!decoded?.userId || !decoded?.isAdmin) {
      return apiError('Unauthorized', 403);
    }

    // Get funnel config
    const FunnelConfig = getFunnelConfig();
    const config = await FunnelConfig.findOne({}).select().lean();

    if (!config) {
      return apiSuccess({ stages: [], stats: {} });
    }

    // Get stage distribution (count of leads in each stage)
    const FunnelStageMapping = getFunnelStageMapping();
    const stageCounts = await FunnelStageMapping.aggregate([
      { $group: { _id: '$stageKey', count: { $sum: 1 } } },
    ]);

    // Add counts to stages
    const stagesWithCounts = config.stages.map((stage: any) => ({
      ...stage,
      leadCount: stageCounts.find((s) => s._id === stage.key)?.count || 0,
    }));

    return apiSuccess({
      config,
      stages: stagesWithCounts,
      totalLeads: stageCounts.reduce((sum: number, s: any) => sum + s.count, 0),
    });
  } catch (err) {
    console.error('[funnel GET]', err);
    return apiError('Failed to fetch funnel', 500);
  }
}

// POST /api/admin/crm/funnel - Create new funnel config OR move lead
interface PostRequest {
  action: 'create-config' | 'move-lead';
  stages?: any[];
  leadId?: string;
  stageKey?: string;
  moveNote?: string;
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const decoded = await verifyToken(req);
    if (!decoded?.userId || !decoded?.isAdmin) {
      return apiError('Unauthorized', 403);
    }

    const body: PostRequest = await req.json();

    if (body.action === 'create-config') {
      // Create default funnel config if not exist
      const FunnelConfig = getFunnelConfig();
      const existing = await FunnelConfig.findOne({});

      if (existing) {
        return apiError('Funnel config already exists', 400);
      }

      const config = new FunnelConfig({
        name: 'Default Funnel',
        isActive: true,
        createdByUserId: decoded.userId,
        stages: body.stages || [
          { key: 'new', name: 'New', color: '#6366F1', order: 1, isDefault: true },
          { key: 'contacted', name: 'Contacted', color: '#3B82F6', order: 2 },
          { key: 'interested', name: 'Interested', color: '#06B6D4', order: 3 },
          { key: 'negotiating', name: 'Negotiating', color: '#F59E0B', order: 4 },
          { key: 'proposal', name: 'Proposal Sent', color: '#A78BFA', order: 5 },
          { key: 'won', name: 'Won', color: '#10B981', order: 6 },
          { key: 'lost', name: 'Lost', color: '#EF4444', order: 7 },
        ],
      });

      await config.save();
      return apiSuccess(config, 'Funnel config created', 201);
    }

    if (body.action === 'move-lead') {
      if (!body.leadId || !body.stageKey) {
        return apiError('leadId and stageKey required', 400);
      }

      // Find the funnel config
      const FunnelConfig = getFunnelConfig();
      const config = await FunnelConfig.findOne({});

      if (!config) {
        return apiError('Funnel config not found', 404);
      }

      const stage = config.stages.find((s: any) => s.key === body.stageKey);
      if (!stage) {
        return apiError('Stage not found', 404);
      }

      // Update or create mapping
      const FunnelStageMapping = getFunnelStageMapping();
      const mapping = await FunnelStageMapping.findOneAndUpdate(
        { leadId: body.leadId, funnelConfigId: config._id },
        {
          stageKey: body.stageKey,
          stageName: stage.name,
          color: stage.color,
          movedByUserId: decoded.userId,
          moveNote: body.moveNote || '',
          daysInStage: 0,
        },
        { upsert: true, new: true }
      );

      // Log history
      const FunnelStageHistory = getFunnelStageHistory();
      await FunnelStageHistory.create({
        leadId: body.leadId,
        fromStage: mapping.stageKey,
        toStage: body.stageKey,
        changedByUserId: decoded.userId,
        changedByName: decoded.userName || 'Admin',
        note: body.moveNote,
      });

      return apiSuccess(mapping, 'Lead moved', 200);
    }

    return apiError('Invalid action', 400);
  } catch (err) {
    console.error('[funnel POST]', err);
    return apiError('Failed to update funnel', 500);
  }
}

// PUT /api/admin/crm/funnel - Update funnel config
interface PutRequest {
  stages?: any[];
}

export async function PUT(req: NextRequest) {
  try {
    await connectDB();

    const decoded = await verifyToken(req);
    if (!decoded?.userId || !decoded?.isAdmin) {
      return apiError('Unauthorized', 403);
    }

    const body: PutRequest = await req.json();

    if (!body.stages || !Array.isArray(body.stages)) {
      return apiError('stages array required', 400);
    }

    // Sort stages by order
    const sortedStages = body.stages.sort((a, b) => a.order - b.order);

    const FunnelConfig = getFunnelConfig();
    const config = await FunnelConfig.findOneAndUpdate(
      {},
      { stages: sortedStages },
      { new: true }
    );

    if (!config) {
      return apiError('Funnel config not found', 404);
    }

    return apiSuccess(config, 'Funnel updated');
  } catch (err) {
    console.error('[funnel PUT]', err);
    return apiError('Failed to update funnel', 500);
  }
}

// DELETE /api/admin/crm/funnel - Delete staging
export async function DELETE(req: NextRequest) {
  try {
    await connectDB();

    const decoded = await verifyToken(req);
    if (!isSuperAdmin(decoded)) {
      return apiError('Only superadmin can delete', 403);
    }

    const { searchParams } = new URL(req.url);
    const stageKey = searchParams.get('stageKey');

    if (!stageKey) {
      return apiError('stageKey required', 400);
    }

    const FunnelConfig = getFunnelConfig();
    const config = await FunnelConfig.findOneAndUpdate(
      {},
      { $pull: { stages: { key: stageKey } } },
      { new: true }
    );

    if (!config) {
      return apiError('Funnel config not found', 404);
    }

    return apiSuccess(config, 'Stage deleted');
  } catch (err) {
    console.error('[funnel DELETE]', err);
    return apiError('Failed to delete stage', 500);
  }
}
