import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';
import {
  AUTOMATION_LIMITS,
  validateWorkflow,
  Workflow,
  TRIGGER_TYPES,
  ACTION_TYPES,
} from '@/lib/crm-site/automationConfig';

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
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    await connectDB();

    const url = new URL(request.url);
    const tenantSlug = url.searchParams.get('tenant') || (decoded as any).tenantSlug;
    const workflowId = url.searchParams.get('id');

    if (!tenantSlug) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 400 });
    }

    const mongoose = (await import('mongoose')).default;
    const crmDb = mongoose.connection.useDb(process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm');

    // Get tenant plan
    const tenant = await crmDb.collection('crm_tenants').findOne({ slug: tenantSlug });
    const plan = tenant?.plan || 'free';
    const limits = AUTOMATION_LIMITS[plan] || AUTOMATION_LIMITS.free;

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
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const body = await request.json();
    const { tenantSlug, name, description, trigger, conditions, actions } = body;

    if (!tenantSlug || !name || !trigger || !actions?.length) {
      return NextResponse.json({
        error: 'tenantSlug, name, trigger, and actions are required',
      }, { status: 400 });
    }

    await connectDB();
    const mongoose = (await import('mongoose')).default;
    const crmDb = mongoose.connection.useDb(process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm');

    // Get tenant plan and check limits
    const tenant = await crmDb.collection('crm_tenants').findOne({ slug: tenantSlug });
    const plan = tenant?.plan || 'free';
    const limits = AUTOMATION_LIMITS[plan] || AUTOMATION_LIMITS.free;

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

    await crmDb.collection('workflows').insertOne(workflow);

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
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const body = await request.json();
    const { tenantSlug, workflowId, ...updates } = body;

    if (!tenantSlug || !workflowId) {
      return NextResponse.json({ error: 'tenantSlug and workflowId required' }, { status: 400 });
    }

    await connectDB();
    const mongoose = (await import('mongoose')).default;
    const crmDb = mongoose.connection.useDb(process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm');

    // Get tenant plan
    const tenant = await crmDb.collection('crm_tenants').findOne({ slug: tenantSlug });
    const plan = tenant?.plan || 'free';

    // Build update object
    const updateFields: Record<string, any> = { updatedAt: new Date() };

    if (updates.name !== undefined) updateFields.name = updates.name.trim();
    if (updates.description !== undefined) updateFields.description = updates.description.trim();
    if (updates.trigger !== undefined) updateFields.trigger = updates.trigger;
    if (updates.conditions !== undefined) updateFields.conditions = updates.conditions;
    if (updates.isActive !== undefined) updateFields.isActive = updates.isActive;

    if (updates.actions !== undefined) {
      // Validate actions count
      const limits = AUTOMATION_LIMITS[plan] || AUTOMATION_LIMITS.free;
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
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const body = await request.json();
    const { tenantSlug, workflowId } = body;

    if (!tenantSlug || !workflowId) {
      return NextResponse.json({ error: 'tenantSlug and workflowId required' }, { status: 400 });
    }

    await connectDB();
    const mongoose = (await import('mongoose')).default;
    const crmDb = mongoose.connection.useDb(process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm');

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
