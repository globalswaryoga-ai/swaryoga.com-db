/**
 * Call Workflow API
 * GET  - List workflows (with filters: direction, status, leadId)
 * POST - Create a new workflow entry for a lead
 * PUT  - Update workflow fields (transcription, rules, answer, approval, etc.)
 */
import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { apiError, apiSuccess } from '@/lib/api-error';
import { getCallWorkflow, getLead } from '@/lib/schemas/enterpriseSchemas';

export const dynamic = 'force-dynamic';

// ── Status ordering for sidebar counts ──
const STATUS_ORDER = ['new', 'transcribed', 'rules_set', 'answer_ready', 'voice_ready', 'approved', 'scheduled', 'completed', 'cancelled'];

/**
 * GET /api/admin/crm/call-workflows?direction=inbound&status=new&leadId=xxx
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin) return apiError('UNAUTHORIZED');

    await connectDB();
    const CallWorkflow = getCallWorkflow();

    const direction = request.nextUrl.searchParams.get('direction') || 'inbound';
    const status = request.nextUrl.searchParams.get('status');
    const leadId = request.nextUrl.searchParams.get('leadId');
    const limit = Math.min(Number(request.nextUrl.searchParams.get('limit') || 50), 200);
    const skip = Number(request.nextUrl.searchParams.get('skip') || 0);

    const query: any = { direction };
    if (status) query.workflowStatus = status;
    if (leadId) query.leadId = leadId;

    // Get workflows + counts in parallel
    const [workflows, total, statusCounts] = await Promise.all([
      CallWorkflow.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      CallWorkflow.countDocuments(query),
      CallWorkflow.aggregate([
        { $match: { direction } },
        { $group: { _id: '$workflowStatus', count: { $sum: 1 } } },
      ]),
    ]);

    // Build status count map
    const counts: Record<string, number> = {};
    let totalAll = 0;
    for (const s of STATUS_ORDER) counts[s] = 0;
    for (const item of statusCounts) {
      counts[item._id] = item.count;
      totalAll += item.count;
    }
    counts['all'] = totalAll;

    return apiSuccess({ workflows, total, counts, direction });
  } catch (err: any) {
    console.error('[call-workflows GET]', err);
    return apiError('SERVER_ERROR', err.message);
  }
}

/**
 * POST /api/admin/crm/call-workflows
 * Body: { leadIds: string[], direction: 'inbound' | 'outbound' }
 * Creates workflow entries for selected leads
 */
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin) return apiError('UNAUTHORIZED');

    const { leadIds, direction } = await request.json();

    if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
      return apiError('VALIDATION_ERROR', 'leadIds array is required');
    }
    if (!['inbound', 'outbound'].includes(direction)) {
      return apiError('VALIDATION_ERROR', 'direction must be inbound or outbound');
    }

    await connectDB();
    const CallWorkflow = getCallWorkflow();
    const Lead = getLead();

    // Fetch lead details for snapshots
    const leads = await Lead.find({ _id: { $in: leadIds } })
      .select('name phoneNumber funnelStage country displayName')
      .lean() as any[];

    if (!leads.length) return apiError('NOT_FOUND', 'No leads found');

    // Check for existing open workflows for these leads
    const existingWorkflows = await CallWorkflow.find({
      leadId: { $in: leadIds },
      direction,
      workflowStatus: { $nin: ['completed'] },
    }).select('leadId').lean();

    const existingLeadIds = new Set(existingWorkflows.map((w: any) => String(w.leadId)));

    // Create workflows only for leads without existing open ones
    const toCreate = leads.filter((l: any) => !existingLeadIds.has(String(l._id)));

    const created = await CallWorkflow.insertMany(
      toCreate.map((lead: any) => ({
        leadId: lead._id,
        direction,
        workflowStatus: 'new',
        leadSnapshot: {
          name: lead.displayName || lead.name || '',
          phone: lead.phoneNumber || '',
          funnelStage: lead.funnelStage || '',
          country: lead.country || '',
        },
        createdBy: decoded.userId || decoded.email || 'admin',
      }))
    );

    return apiSuccess({
      created: created.length,
      skipped: existingLeadIds.size,
      message: `Created ${created.length} workflows, ${existingLeadIds.size} already had open workflows`,
    });
  } catch (err: any) {
    console.error('[call-workflows POST]', err);
    return apiError('SERVER_ERROR', err.message);
  }
}

/**
 * PUT /api/admin/crm/call-workflows
 * Body: { id, updates: { transcribedText?, rules?, preparedAnswer?, voiceUrl?, adminApproved?, scheduledAt?, ... } }
 */
export async function PUT(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin) return apiError('UNAUTHORIZED');

    const { id, updates } = await request.json();

    if (!id) return apiError('VALIDATION_ERROR', 'Workflow id is required');

    await connectDB();
    const CallWorkflow = getCallWorkflow();

    const workflow = await CallWorkflow.findById(id);
    if (!workflow) return apiError('NOT_FOUND', 'Workflow not found');

    // Allowed update fields
    const allowed = [
      'voiceRecordingUrl', 'transcribedText', 'lastQuery', 'scriptText',
      'rules', 'preparedAnswer', 'voiceUrl', 'adminApproved', 'scheduledAt',
      'notes', 'workflowStatus', 'aiFeedback',
    ];

    const $set: any = {};
    for (const key of allowed) {
      if (updates[key] !== undefined) {
        $set[key] = updates[key];
      }
    }

    // Auto-set approval fields
    if (updates.adminApproved === true) {
      $set.approvedBy = decoded.userId || decoded.email || 'admin';
      $set.approvedAt = new Date();
    }

    // Auto-advance workflow status based on what was updated
    if (!updates.workflowStatus) {
      const dir = workflow.direction;
      if (dir === 'inbound') {
        if (updates.adminApproved === true) $set.workflowStatus = 'approved';
        else if (updates.voiceUrl) $set.workflowStatus = 'voice_ready';
        else if (updates.preparedAnswer) $set.workflowStatus = 'answer_ready';
        else if (updates.rules) $set.workflowStatus = 'rules_set';
        else if (updates.transcribedText) $set.workflowStatus = 'transcribed';
      } else {
        if (updates.scheduledAt) $set.workflowStatus = 'scheduled';
        else if (updates.adminApproved === true) $set.workflowStatus = 'approved';
        else if (updates.voiceUrl) $set.workflowStatus = 'voice_ready';
        else if (updates.rules) $set.workflowStatus = 'rules_set';
        else if (updates.scriptText) $set.workflowStatus = 'transcribed';
      }
    }

    const updated = await CallWorkflow.findByIdAndUpdate(id, { $set }, { new: true }).lean();

    return apiSuccess({ workflow: updated });
  } catch (err: any) {
    console.error('[call-workflows PUT]', err);
    return apiError('SERVER_ERROR', err.message);
  }
}
