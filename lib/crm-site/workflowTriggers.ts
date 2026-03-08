/**
 * Workflow Trigger Helpers
 * Use these functions to trigger workflows from CRM operations
 */

import { processWorkflowTrigger } from './workflowEngine';

// ============ TRIGGER HELPERS ============

/**
 * Trigger workflows when a new lead is created
 */
export async function triggerLeadCreated(
  tenantSlug: string,
  lead: Record<string, any>,
  crmDb: any
): Promise<void> {
  await processWorkflowTrigger('lead_created', { createdAt: new Date() }, lead, tenantSlug, crmDb);
}

/**
 * Trigger workflows when a lead status changes
 */
export async function triggerLeadStatusChanged(
  tenantSlug: string,
  lead: Record<string, any>,
  fromStatus: string,
  toStatus: string,
  crmDb: any
): Promise<void> {
  await processWorkflowTrigger(
    'lead_status_changed',
    { fromStatus, toStatus, changedAt: new Date() },
    lead,
    tenantSlug,
    crmDb
  );
}

/**
 * Trigger workflows when a lead is assigned
 */
export async function triggerLeadAssigned(
  tenantSlug: string,
  lead: Record<string, any>,
  assignedTo: string,
  assignedBy: string,
  crmDb: any
): Promise<void> {
  await processWorkflowTrigger(
    'lead_assigned',
    { assignedTo, assignedBy, assignedAt: new Date() },
    lead,
    tenantSlug,
    crmDb
  );
}

/**
 * Trigger workflows when a WhatsApp message is received
 */
export async function triggerMessageReceived(
  tenantSlug: string,
  lead: Record<string, any>,
  messageText: string,
  messageId: string,
  crmDb: any
): Promise<void> {
  await processWorkflowTrigger(
    'message_received',
    { messageText, messageId, receivedAt: new Date() },
    lead,
    tenantSlug,
    crmDb
  );
}

/**
 * Trigger workflows when a tag is added to a lead
 */
export async function triggerTagAdded(
  tenantSlug: string,
  lead: Record<string, any>,
  tagName: string,
  crmDb: any
): Promise<void> {
  await processWorkflowTrigger(
    'tag_added',
    { tagName, addedAt: new Date() },
    lead,
    tenantSlug,
    crmDb
  );
}

// ============ INLINE TRIGGER FUNCTION ============

/**
 * Generic workflow trigger that can be used inline
 * Automatically fetches the CRM database connection
 */
export async function triggerWorkflow(
  triggerType: string,
  tenantSlug: string,
  lead: Record<string, any>,
  triggerData: Record<string, any> = {}
): Promise<void> {
  try {
    const mongoose = (await import('mongoose')).default;
    
    // Ensure connection is established
    if (mongoose.connection.readyState !== 1) {
      const { connectDB } = await import('@/lib/db');
      await connectDB();
    }
    
    const crmDb = mongoose.connection.useDb(process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm');
    
    await processWorkflowTrigger(
      triggerType,
      { ...triggerData, triggeredAt: new Date() },
      lead,
      tenantSlug,
      crmDb
    );
  } catch (err) {
    console.error(`Workflow trigger ${triggerType} failed:`, err);
    // Don't throw - workflow failures shouldn't break main operations
  }
}
