import { NextRequest, NextResponse } from 'next/server';
import { processWorkflowTrigger } from '@/lib/crm-site/workflowEngine';
import { resolveCrmSiteTenantAccess } from '@/lib/crm-site/tenantAccess';

export const dynamic = 'force-dynamic';

/**
 * POST /api/crm-site/workflows/trigger
 * Trigger workflows for a specific event
 * 
 * This endpoint is called internally when events occur:
 * - Lead created
 * - Lead status changed
 * - Message received
 * - Tag added
 * - Lead assigned
 */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const access = await resolveCrmSiteTenantAccess(request, {
      requestedTenantSlug: body?.tenantSlug,
    });
    if (access instanceof NextResponse) {
      return access;
    }

    const { crmDb, tenantSlug } = access;
    const { triggerType, triggerData, lead } = body;

    if (!triggerType || !lead) {
      return NextResponse.json({
        error: 'triggerType and lead are required',
      }, { status: 400 });
    }

    // Process workflow triggers
    await processWorkflowTrigger(
      triggerType,
      triggerData || {},
      lead,
      tenantSlug,
      crmDb
    );

    return NextResponse.json({
      success: true,
      message: `Processed ${triggerType} trigger`,
    });
  } catch (err: any) {
    console.error('Workflow trigger error:', err);
    return NextResponse.json({ error: err.message || 'Failed to process trigger' }, { status: 500 });
  }
}

/**
 * GET /api/crm-site/workflows/trigger
 * Get workflow executions for a lead
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

    const { crmDb, tenantSlug } = access;
    const leadId = url.searchParams.get('leadId');

    const query: Record<string, any> = { tenantSlug };
    if (leadId) {
      query.triggeredBy = leadId;
    }

    const executions = await crmDb.collection('workflow_executions')
      .find(query)
      .sort({ startedAt: -1 })
      .limit(50)
      .toArray();

    // Get workflow names
    const workflowIds = [...new Set(executions.map(e => e.workflowId))];
    const workflows = await crmDb.collection('workflows')
      .find({ id: { $in: workflowIds }, tenantSlug })
      .toArray();

    const workflowMap = Object.fromEntries(workflows.map(w => [w.id, w.name]));

    const executionsWithNames = executions.map(e => ({
      ...e,
      workflowName: workflowMap[e.workflowId] || 'Unknown',
    }));

    return NextResponse.json({ executions: executionsWithNames });
  } catch (err: any) {
    console.error('Workflow executions GET error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
