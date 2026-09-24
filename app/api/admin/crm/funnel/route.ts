import { NextRequest } from 'next/server';
import { apiError, apiSuccess } from '@/lib/api-error';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin, getViewerUserId, getVisibleUserIds } from '@/lib/crm-handlers';
import { 
  getBunnyFunnelConfig, 
  createBunnyFunnelConfig, 
  updateBunnyFunnelConfig, 
  getBunnyFunnelStageMappings, 
  upsertBunnyFunnelStageMapping, 
  createBunnyFunnelStageHistory 
} from '@/lib/bunnyFunnelRepository';
import { listBunnyLeads } from '@/lib/bunnyLeadsRepository';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const decoded = verifyToken(req.headers.get('authorization') || '');
    if (!decoded?.isAdmin && !decoded?.userId) {
      return apiError('Unauthorized', 403);
    }

    const superAdmin = isSuperAdmin(decoded);
    const viewerUserId = getViewerUserId(decoded);
    
    // Get funnel config
    const config = await getBunnyFunnelConfig(viewerUserId, superAdmin);

    if (!config) {
      return apiSuccess({ stages: [], stats: {} });
    }

    // Get stage distribution - scoped by visible leads
    const visibleUserIds = getVisibleUserIds(decoded);
    
    // Get leads visible to this user to find their IDs
    const result = await listBunnyLeads({ 
      visibleUserIds, 
      viewerUserId, 
      skip: 0, 
      limit: Number.MAX_SAFE_INTEGER 
    });
    
    const leadIds = result.leads.map((l: any) => String(l._id));
    
    const mappings = await getBunnyFunnelStageMappings(leadIds);
    
    // Calculate stage counts
    const stageCounts = mappings.reduce((acc: Record<string, number>, mapping: any) => {
      const key = mapping.stageKey;
      if (key) acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    // Add counts to stages
    const stagesWithCounts = (config.stages || []).map((stage: any) => ({
      ...stage,
      leadCount: stageCounts[stage.key] || 0,
    }));

    const totalLeads = Object.values(stageCounts).reduce((sum: number, count: any) => sum + count, 0);

    return apiSuccess({
      config,
      stages: stagesWithCounts,
      totalLeads,
    });
  } catch (err) {
    console.error('[funnel GET]', err);
    return apiError('Failed to fetch funnel', 500);
  }
}

interface PostRequest {
  action: 'create-config' | 'move-lead';
  stages?: any[];
  leadId?: string;
  stageKey?: string;
  moveNote?: string;
}

export async function POST(req: NextRequest) {
  try {
    const decoded = verifyToken(req.headers.get('authorization') || '');
    if (!decoded?.isAdmin && !decoded?.userId) {
      return apiError('Unauthorized', 403);
    }

    const body: PostRequest = await req.json();

    if (body.action === 'create-config') {
      const viewerUserId = getViewerUserId(decoded);
      const superAdmin = isSuperAdmin(decoded);
      const existing = await getBunnyFunnelConfig(viewerUserId, superAdmin);

      if (existing) {
        return apiError('Funnel config already exists', 400);
      }

      const config = await createBunnyFunnelConfig({
        name: 'Default Funnel',
        isActive: true,
        createdByUserId: decoded.userId || decoded.username,
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

      return apiSuccess(config, 201);
    }

    if (body.action === 'move-lead') {
      if (!body.leadId || !body.stageKey) {
        return apiError('leadId and stageKey required', 400);
      }

      const viewerUserId = getViewerUserId(decoded);
      const superAdmin = isSuperAdmin(decoded);
      const config = await getBunnyFunnelConfig(viewerUserId, superAdmin);

      if (!config) {
        return apiError('Funnel config not found', 404);
      }

      const stage = (config.stages || []).find((s: any) => s.key === body.stageKey);
      if (!stage) {
        return apiError('Stage not found', 404);
      }

      // Check current mapping to see where they came from
      const mappings = await getBunnyFunnelStageMappings([body.leadId]);
      const currentMapping = mappings.find((m: any) => m.funnelConfigId === config._id);
      const fromStage = currentMapping ? currentMapping.stageKey : null;

      // Update mapping
      const mapping = await upsertBunnyFunnelStageMapping(body.leadId, config._id, {
        stageKey: body.stageKey,
        stageName: stage.name,
        color: stage.color,
        movedByUserId: decoded.userId || decoded.username,
        moveNote: body.moveNote || '',
        daysInStage: 0,
      });

      // Log history
      await createBunnyFunnelStageHistory({
        leadId: body.leadId,
        fromStage,
        toStage: body.stageKey,
        changedByUserId: decoded.userId || decoded.username,
        changedByName: decoded.username || 'Admin',
        note: body.moveNote,
      });

      return apiSuccess(mapping);
    }

    return apiError('Invalid action', 400);
  } catch (err) {
    console.error('[funnel POST]', err);
    return apiError('Failed to update funnel', 500);
  }
}

interface PutRequest {
  stages?: any[];
}

export async function PUT(req: NextRequest) {
  try {
    const decoded = verifyToken(req.headers.get('authorization') || '');
    if (!decoded?.isAdmin && !decoded?.userId) {
      return apiError('Unauthorized', 403);
    }

    const body: PutRequest = await req.json();

    if (!body.stages || !Array.isArray(body.stages)) {
      return apiError('stages array required', 400);
    }

    // Sort stages by order
    const sortedStages = body.stages.sort((a, b) => a.order - b.order);

    const viewerUserId = getViewerUserId(decoded);
    const superAdmin = isSuperAdmin(decoded);
    const existing = await getBunnyFunnelConfig(viewerUserId, superAdmin);
    
    if (!existing) {
      return apiError('Funnel config not found', 404);
    }

    const config = await updateBunnyFunnelConfig(existing._id, { stages: sortedStages });
    return apiSuccess(config);
  } catch (err) {
    console.error('[funnel PUT]', err);
    return apiError('Failed to update funnel', 500);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const decoded = verifyToken(req.headers.get('authorization') || '');
    if (!decoded || !isSuperAdmin(decoded)) {
      return apiError('Only superadmin can delete', 403);
    }

    const { searchParams } = new URL(req.url);
    const stageKey = searchParams.get('stageKey');

    if (!stageKey) {
      return apiError('stageKey required', 400);
    }

    const config = await getBunnyFunnelConfig(getViewerUserId(decoded), true);
    if (!config) {
      return apiError('Funnel config not found', 404);
    }
    
    const newStages = (config.stages || []).filter((s: any) => s.key !== stageKey);
    const updated = await updateBunnyFunnelConfig(config._id, { stages: newStages });

    return apiSuccess(updated);
  } catch (err) {
    console.error('[funnel DELETE]', err);
    return apiError('Failed to delete stage', 500);
  }
}
