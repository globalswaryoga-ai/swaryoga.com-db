import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { resolveCrmSiteTenantAccess } from '@/lib/crm-site/tenantAccess';
import {
  AUTOMATION_LIMITS,
  validateWorkflow,
  Workflow,
  TRIGGER_TYPES,
  ACTION_TYPES,
} from '@/lib/crm-site/automationConfig';

export const dynamic = 'force-dynamic';
import { resolveTenantPlanAccess, resolveWorkflowPlanAccess } from '@/lib/crm-site/tenantPlanAccess';

/**
 * GET /api/crm-site/workflows
 * List all workflows for tenant
 * 
 * POST /api/crm-site/workflows
 * Create a new workflow
 * 
 * PATCH /api/crm-site/workflows
 * Update a workflow
 * 
 * DELETE /api/crm-site/workflows
 * Delete a workflow
 */

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const access = await resolveCrmSiteTenantAccess(request, {
      requestedTenantSlug: url.searchParams.get('tenant'),
    });
    if (access instanceof NextResponse) {
      return access;
    }

    const { crmDb, tenant, tenantSlug } = access;
    const workflowId = url.searchParams.get('id');

    if (!tenantSlug) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 400 });
    }

    // Get tenant plan
    const planAccess = resolveTenantPlanAccess(tenant);
    const plan = planAccess.plan;
    const limits = resolveWorkflowPlanAccess(tenant);

    if (!limits.enabled) {
      return NextResponse.json({ error: 'Automation workflows are not enabled for this plan' }, { status: 403 });
    }

    if (workflowId) {
      // Get single workflow
      const workflow = await crmDb.collection('workflows').findOne({
        tenantSlug,
        id: workflowId,
      });

      if (!workflow) {
        return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
      }

      // Get recent executions
      const executions = await crmDb.collection('workflow_executions')
        .find({ workflowId, tenantSlug })
        .sort({ startedAt: -1 })
        .limit(20)
        .toArray();

      return NextResponse.json({ workflow, executions });
    }

    // List all workflows
    const workflows = await crmDb.collection('workflows')
      .find({ tenantSlug })
      .sort({ createdAt: -1 })
      .toArray();

    // Get execution counts
    const executionCounts = await crmDb.collection('workflow_executions').aggregate([
      { $match: { tenantSlug } },
      { $group: { _id: '$workflowId', count: { $sum: 1 }, lastRun: { $max: '$startedAt' } } },
    ]).toArray();

    const countsMap = Object.fromEntries(
      executionCounts.map(e => [e._id, { count: e.count, lastRun: e.lastRun }])
    );

    const workflowsWithStats = workflows.map(w => ({
      ...w,
      runCount: countsMap[w.id]?.count || 0,
      lastRunAt: countsMap[w.id]?.lastRun,
    }));

    return NextResponse.json({
      workflows: workflowsWithStats,
      plan,
      limits,
      usage: {
        workflows: workflows.length,
        maxWorkflows: limits.workflows,
        canCreate: workflows.length < limits.workflows,
      },
      triggerTypes: TRIGGER_TYPES,
      actionTypes: ACTION_TYPES,
    });
  } catch (err: any) {
    console.error('Workflows GET error:', err);
    return NextResponse.json({ error: err.message || 'Failed to fetch workflows' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const access = await resolveCrmSiteTenantAccess(request, {
      requestedTenantSlug: body?.tenantSlug,
    });
    if (access instanceof NextResponse) {
      return access;
    }

    const { crmDb, decoded, tenant, tenantSlug } = access;
    const { name, description, trigger, conditions, actions } = body;

    if (!name || !trigger || !actions?.length) {
      return NextResponse.json({
        error: 'name, trigger, and actions are required',
      }, { status: 400 });
    }

    // Get tenant plan and check limits
    const planAccess = resolveTenantPlanAccess(tenant);
    const plan = planAccess.plan;
    const limits = resolveWorkflowPlanAccess(tenant);

    if (!limits.enabled) {
      return NextResponse.json({ error: 'Automation workflows are not enabled for this plan' }, { status: 403 });
    }

    // Check workflow count
    const existingCount = await crmDb.collection('workflows').countDocuments({ tenantSlug });
    if (existingCount >= limits.workflows) {
      return NextResponse.json({
        error: `Maximum ${limits.workflows} workflows allowed on ${plan} plan. Upgrade to create more.`,
      }, { status: 403 });
    }

    // Validate workflow
    const validation = validateWorkflow({ name, trigger, actions }, plan);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.errors.join(', ') }, { status: 400 });
    }

    // Create workflow
    const workflow: Workflow = {
      id: uuidv4(),
      tenantSlug,
      name: name.trim(),
      description: description?.trim() || '',
      trigger,
      conditions: conditions || [],
      actions: actions.map((a: any, i: number) => ({
        ...a,
        id: a.id || uuidv4(),
        order: i,
      })),
      isActive: true,
      runCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: (decoded as any).userId || (decoded as any).email,
    };

    await crmDb.collection('workflows').insertOne(workflow as any);

    return NextResponse.json({
      success: true,
      workflow,
    });
  } catch (err: any) {
    console.error('Workflows POST error:', err);
    return NextResponse.json({ error: err.message || 'Failed to create workflow' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const access = await resolveCrmSiteTenantAccess(request, {
      requestedTenantSlug: body?.tenantSlug,
    });
    if (access instanceof NextResponse) {
      return access;
    }

    const { crmDb, tenant, tenantSlug } = access;
    const { workflowId, ...updates } = body;

    if (!workflowId) {
      return NextResponse.json({ error: 'workflowId required' }, { status: 400 });
    }

    // Get tenant plan
    const plan = resolveTenantPlanAccess(tenant).plan;

    // Build update object
    const updateFields: Record<string, any> = { updatedAt: new Date() };

    if (updates.name !== undefined) updateFields.name = updates.name.trim();
    if (updates.description !== undefined) updateFields.description = updates.description.trim();
    if (updates.trigger !== undefined) updateFields.trigger = updates.trigger;
    if (updates.conditions !== undefined) updateFields.conditions = updates.conditions;
    if (updates.isActive !== undefined) updateFields.isActive = updates.isActive;

    if (updates.actions !== undefined) {
      // Validate actions count
      const limits = resolveWorkflowPlanAccess(tenant);
      if (!limits.enabled) {
        return NextResponse.json({ error: 'Automation workflows are not enabled for this plan' }, { status: 403 });
      }
      if (updates.actions.length > limits.actionsPerWorkflow) {
        return NextResponse.json({
          error: `Maximum ${limits.actionsPerWorkflow} actions allowed on ${plan} plan`,
        }, { status: 403 });
      }
      updateFields.actions = updates.actions.map((a: any, i: number) => ({
        ...a,
        id: a.id || uuidv4(),
        order: i,
      }));
    }

    const result = await crmDb.collection('workflows').findOneAndUpdate(
      { tenantSlug, id: workflowId },
      { $set: updateFields },
      { returnDocument: 'after' }
    );

    if (!result) {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, workflow: result });
  } catch (err: any) {
    console.error('Workflows PATCH error:', err);
    return NextResponse.json({ error: err.message || 'Failed to update workflow' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const access = await resolveCrmSiteTenantAccess(request, {
      requestedTenantSlug: body?.tenantSlug,
    });
    if (access instanceof NextResponse) {
      return access;
    }

    const { crmDb, tenantSlug } = access;
    const { workflowId } = body;

    if (!workflowId) {
      return NextResponse.json({ error: 'workflowId required' }, { status: 400 });
    }

    const result = await crmDb.collection('workflows').deleteOne({
      tenantSlug,
      id: workflowId,
    });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
    }

    // Also delete executions
    await crmDb.collection('workflow_executions').deleteMany({
      tenantSlug,
      workflowId,
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Workflows DELETE error:', err);
    return NextResponse.json({ error: err.message || 'Failed to delete workflow' }, { status: 500 });
  }
}
