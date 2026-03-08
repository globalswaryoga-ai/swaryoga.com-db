/**
 * Workflow Execution Engine
 * Handles running automation workflows when triggers fire
 */

import { v4 as uuidv4 } from 'uuid';
import {
  Workflow,
  WorkflowExecution,
  WorkflowCondition,
  CONDITION_TYPES,
} from './automationConfig';

// ============ CONDITION EVALUATOR ============
export function evaluateConditions(
  conditions: WorkflowCondition[],
  lead: Record<string, any>
): boolean {
  if (!conditions || conditions.length === 0) return true;

  let result = true;

  for (let i = 0; i < conditions.length; i++) {
    const condition = conditions[i];
    const conditionResult = evaluateSingleCondition(condition, lead);

    if (i === 0) {
      result = conditionResult;
    } else {
      if (condition.logicOperator === 'OR') {
        result = result || conditionResult;
      } else {
        result = result && conditionResult;
      }
    }
  }

  return result;
}

function evaluateSingleCondition(
  condition: WorkflowCondition,
  lead: Record<string, any>
): boolean {
  const conditionDef = CONDITION_TYPES[condition.type];
  if (!conditionDef) return true;

  let fieldValue: any;

  if (condition.type === 'custom_field') {
    fieldValue = lead.customFields?.[condition.value?.fieldName];
  } else {
    fieldValue = lead[conditionDef.field];
  }

  const compareValue = condition.value;

  switch (condition.operator) {
    case 'equals':
      return String(fieldValue).toLowerCase() === String(compareValue).toLowerCase();
    case 'not_equals':
      return String(fieldValue).toLowerCase() !== String(compareValue).toLowerCase();
    case 'contains':
      if (Array.isArray(fieldValue)) {
        return fieldValue.includes(compareValue);
      }
      return String(fieldValue).toLowerCase().includes(String(compareValue).toLowerCase());
    case 'not_contains':
      if (Array.isArray(fieldValue)) {
        return !fieldValue.includes(compareValue);
      }
      return !String(fieldValue).toLowerCase().includes(String(compareValue).toLowerCase());
    case 'in':
      return Array.isArray(compareValue) && compareValue.includes(fieldValue);
    case 'is_set':
      return fieldValue !== null && fieldValue !== undefined && fieldValue !== '';
    case 'is_not_set':
      return fieldValue === null || fieldValue === undefined || fieldValue === '';
    case 'greater_than':
      return Number(fieldValue) > Number(compareValue);
    case 'less_than':
      return Number(fieldValue) < Number(compareValue);
    default:
      return true;
  }
}

// ============ ACTION EXECUTOR ============
export async function executeAction(
  action: { id: string; type: string; config: Record<string, any> },
  context: {
    lead: Record<string, any>;
    tenantSlug: string;
    workflow: Workflow;
    crmDb: any;
  }
): Promise<{ success: boolean; result?: any; error?: string }> {
  const { lead, tenantSlug, crmDb } = context;

  try {
    switch (action.type) {
      case 'send_whatsapp': {
        // Queue WhatsApp message
        await crmDb.collection('workflow_message_queue').insertOne({
          tenantSlug,
          leadId: lead._id?.toString() || lead.id,
          phone: lead.phone,
          type: action.config.messageType || 'template',
          templateName: action.config.templateName,
          textMessage: action.config.textMessage,
          status: 'pending',
          workflowId: context.workflow.id,
          actionId: action.id,
          createdAt: new Date(),
        });
        return { success: true, result: 'Message queued' };
      }

      case 'send_email': {
        // Queue email
        await crmDb.collection('workflow_email_queue').insertOne({
          tenantSlug,
          leadId: lead._id?.toString() || lead.id,
          email: lead.email,
          subject: replaceVariables(action.config.subject, lead),
          body: replaceVariables(action.config.body, lead),
          status: 'pending',
          workflowId: context.workflow.id,
          actionId: action.id,
          createdAt: new Date(),
        });
        return { success: true, result: 'Email queued' };
      }

      case 'update_lead_status': {
        const oldStatus = lead.status;
        await crmDb.collection('leads').updateOne(
          { _id: lead._id },
          {
            $set: {
              status: action.config.newStatus,
              updatedAt: new Date(),
            },
            $push: {
              history: {
                type: 'status_change',
                from: oldStatus,
                to: action.config.newStatus,
                by: 'automation',
                workflowId: context.workflow.id,
                at: new Date(),
              },
            } as any,
          }
        );
        return { success: true, result: `Status changed to ${action.config.newStatus}` };
      }

      case 'assign_lead': {
        let assigneeId = action.config.assigneeId;

        if (action.config.assignmentType === 'round_robin') {
          // Get team members and assign round-robin
          const team = await crmDb.collection('tenant_team')
            .find({ tenantSlug, role: { $in: ['admin', 'editor'] } })
            .toArray();

          if (team.length > 0) {
            // Get last assignment index
            const lastAssignment = await crmDb.collection('workflow_state').findOne({
              tenantSlug,
              key: 'round_robin_index',
            });
            const nextIndex = ((lastAssignment?.value || 0) + 1) % team.length;
            assigneeId = team[nextIndex].userId;

            await crmDb.collection('workflow_state').updateOne(
              { tenantSlug, key: 'round_robin_index' },
              { $set: { value: nextIndex, updatedAt: new Date() } },
              { upsert: true }
            );
          }
        } else if (action.config.assignmentType === 'least_busy') {
          // Assign to team member with fewest active leads
          const team = await crmDb.collection('tenant_team')
            .find({ tenantSlug, role: { $in: ['admin', 'editor'] } })
            .toArray();

          if (team.length > 0) {
            const leadCounts = await crmDb.collection('leads').aggregate([
              {
                $match: {
                  tenantSlug,
                  assignedTo: { $in: team.map((t: any) => t.userId) },
                  status: { $nin: ['won', 'lost', 'inactive'] },
                },
              },
              { $group: { _id: '$assignedTo', count: { $sum: 1 } } },
            ]).toArray();

            const countMap = Object.fromEntries(leadCounts.map((c: any) => [c._id, c.count]));
            const sorted = team.sort((a: any, b: any) => (countMap[a.userId] || 0) - (countMap[b.userId] || 0));
            assigneeId = sorted[0].userId;
          }
        }

        if (assigneeId) {
          await crmDb.collection('leads').updateOne(
            { _id: lead._id },
            {
              $set: { assignedTo: assigneeId, updatedAt: new Date() },
              $push: {
                history: {
                  type: 'assigned',
                  to: assigneeId,
                  by: 'automation',
                  workflowId: context.workflow.id,
                  at: new Date(),
                },
              } as any,
            }
          );
          return { success: true, result: `Assigned to ${assigneeId}` };
        }
        return { success: false, error: 'No assignee found' };
      }

      case 'add_tag': {
        const tag = action.config.tagName?.trim();
        if (tag) {
          await crmDb.collection('leads').updateOne(
            { _id: lead._id },
            {
              $addToSet: { tags: tag },
              $set: { updatedAt: new Date() },
            }
          );
          return { success: true, result: `Tag "${tag}" added` };
        }
        return { success: false, error: 'No tag specified' };
      }

      case 'remove_tag': {
        const tag = action.config.tagName?.trim();
        if (tag) {
          await crmDb.collection('leads').updateOne(
            { _id: lead._id },
            {
              $pull: { tags: tag },
              $set: { updatedAt: new Date() },
            } as any
          );
          return { success: true, result: `Tag "${tag}" removed` };
        }
        return { success: false, error: 'No tag specified' };
      }

      case 'add_note': {
        await crmDb.collection('leads').updateOne(
          { _id: lead._id },
          {
            $push: {
              notes: {
                text: replaceVariables(action.config.noteText, lead),
                by: 'automation',
                workflowId: context.workflow.id,
                at: new Date(),
              },
            } as any,
            $set: { updatedAt: new Date() },
          }
        );
        return { success: true, result: 'Note added' };
      }

      case 'create_task': {
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + (action.config.dueInDays || 1));

        await crmDb.collection('tasks').insertOne({
          tenantSlug,
          leadId: lead._id?.toString() || lead.id,
          title: replaceVariables(action.config.taskTitle, lead),
          dueDate,
          assignedTo: action.config.assignTo === 'lead_owner' ? lead.assignedTo : action.config.assigneeId,
          status: 'pending',
          createdBy: 'automation',
          workflowId: context.workflow.id,
          createdAt: new Date(),
        });
        return { success: true, result: 'Task created' };
      }

      case 'webhook': {
        try {
          const response = await fetch(action.config.url, {
            method: action.config.method || 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              event: 'workflow_action',
              workflowId: context.workflow.id,
              lead: {
                id: lead._id?.toString() || lead.id,
                name: lead.name,
                email: lead.email,
                phone: lead.phone,
                status: lead.status,
                source: lead.source,
                tags: lead.tags,
              },
              timestamp: new Date().toISOString(),
            }),
          });
          return { success: response.ok, result: `Webhook ${response.status}` };
        } catch (err: any) {
          return { success: false, error: err.message };
        }
      }

      case 'delay': {
        // Delays are handled by scheduling the next action
        const delayMs = (action.config.delayMinutes || 60) * 60 * 1000;
        return {
          success: true,
          result: { delayMs, scheduledFor: new Date(Date.now() + delayMs) },
        };
      }

      default:
        return { success: false, error: `Unknown action type: ${action.type}` };
    }
  } catch (err: any) {
    console.error(`Action ${action.type} error:`, err);
    return { success: false, error: err.message };
  }
}

// ============ VARIABLE REPLACEMENT ============
function replaceVariables(text: string, lead: Record<string, any>): string {
  if (!text) return text;

  return text
    .replace(/\{\{lead\.name\}\}/gi, lead.name || '')
    .replace(/\{\{lead\.email\}\}/gi, lead.email || '')
    .replace(/\{\{lead\.phone\}\}/gi, lead.phone || '')
    .replace(/\{\{lead\.status\}\}/gi, lead.status || '')
    .replace(/\{\{lead\.source\}\}/gi, lead.source || '')
    .replace(/\{\{lead\.firstName\}\}/gi, (lead.name || '').split(' ')[0] || '')
    .replace(/\{\{date\}\}/gi, new Date().toLocaleDateString())
    .replace(/\{\{time\}\}/gi, new Date().toLocaleTimeString());
}

// ============ WORKFLOW RUNNER ============
export async function runWorkflow(
  workflow: Workflow,
  lead: Record<string, any>,
  triggerData: Record<string, any>,
  crmDb: any
): Promise<WorkflowExecution> {
  const execution: WorkflowExecution = {
    workflowId: workflow.id,
    tenantSlug: workflow.tenantSlug,
    triggeredBy: lead._id?.toString() || lead.id || 'unknown',
    triggerData,
    status: 'running',
    actionsExecuted: [],
    startedAt: new Date(),
  };

  try {
    // Check conditions
    if (!evaluateConditions(workflow.conditions, lead)) {
      execution.status = 'completed';
      execution.actionsExecuted.push({
        actionId: 'conditions',
        status: 'skipped',
        result: 'Conditions not met',
        executedAt: new Date(),
      });
      execution.completedAt = new Date();
      await crmDb.collection('workflow_executions').insertOne(execution);
      return execution;
    }

    // Execute actions in order
    const sortedActions = [...workflow.actions].sort((a, b) => a.order - b.order);

    for (const action of sortedActions) {
      const result = await executeAction(action, {
        lead,
        tenantSlug: workflow.tenantSlug,
        workflow,
        crmDb,
      });

      execution.actionsExecuted.push({
        actionId: action.id,
        status: result.success ? 'success' : 'failed',
        result: result.result,
        error: result.error,
        executedAt: new Date(),
      });

      // Handle delays
      if (action.type === 'delay' && result.success && result.result?.delayMs) {
        // Schedule remaining actions
        const remainingActions = sortedActions.filter(a => a.order > action.order);
        if (remainingActions.length > 0) {
          await crmDb.collection('scheduled_workflow_actions').insertOne({
            workflowId: workflow.id,
            executionId: execution._id,
            tenantSlug: workflow.tenantSlug,
            leadId: lead._id?.toString() || lead.id,
            actions: remainingActions,
            scheduledFor: result.result.scheduledFor,
            status: 'pending',
            createdAt: new Date(),
          });
        }
        break; // Stop execution, will continue after delay
      }
    }

    execution.status = 'completed';
    execution.completedAt = new Date();
  } catch (err: any) {
    execution.status = 'failed';
    execution.error = err.message;
    execution.completedAt = new Date();
  }

  await crmDb.collection('workflow_executions').insertOne(execution);

  // Update workflow run count
  await crmDb.collection('workflows').updateOne(
    { id: workflow.id, tenantSlug: workflow.tenantSlug },
    { $inc: { runCount: 1 }, $set: { lastRunAt: new Date() } }
  );

  return execution;
}

// ============ TRIGGER PROCESSOR ============
export async function processWorkflowTrigger(
  triggerType: string,
  triggerData: Record<string, any>,
  lead: Record<string, any>,
  tenantSlug: string,
  crmDb: any
): Promise<void> {
  // Find active workflows matching this trigger
  const workflows = await crmDb.collection('workflows').find({
    tenantSlug,
    isActive: true,
    'trigger.type': triggerType,
  }).toArray();

  for (const workflow of workflows) {
    // Check trigger-specific conditions
    const trigger = workflow.trigger;

    if (triggerType === 'lead_status_changed') {
      if (trigger.config?.fromStatus && trigger.config.fromStatus !== triggerData.fromStatus) {
        continue;
      }
      if (trigger.config?.toStatus && trigger.config.toStatus !== triggerData.toStatus) {
        continue;
      }
    }

    if (triggerType === 'message_received') {
      if (trigger.config?.contains) {
        const messageText = triggerData.messageText?.toLowerCase() || '';
        if (!messageText.includes(trigger.config.contains.toLowerCase())) {
          continue;
        }
      }
    }

    if (triggerType === 'tag_added') {
      if (trigger.config?.tagName && trigger.config.tagName !== triggerData.tagName) {
        continue;
      }
    }

    // Run the workflow
    try {
      await runWorkflow(workflow, lead, triggerData, crmDb);
    } catch (err) {
      console.error(`Workflow ${workflow.id} execution error:`, err);
    }
  }
}
