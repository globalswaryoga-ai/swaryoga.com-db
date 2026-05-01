/**
 * Shared utility for permanently deleting all tenant data
 * Used by: data-delete route + inactive account auto-delete scheduler
 */

import { connectDB } from '@/lib/db';

export interface DeletionResult {
  tenantId: string;
  deletedAt: string;
  collections: {
    leads: number;
    messages: number;
    broadcasts: number;
    templates: number;
    funnelData: number;
    reports: number;
  };
  totalDeleted: number;
  bunnyPath?: string;
}

/**
 * Permanently delete all data for a tenant
 * Deletes from all CRM collections and writes audit log
 * Does NOT delete audit logs (kept for compliance)
 * Bunny CDN cleanup is logged but not implemented (requires Bunny API key access)
 */
export async function deleteTenantData(tenantId: string, deletedBy: string = 'admin'): Promise<DeletionResult> {
  try {
    await connectDB();

    const deletionLog = {
      tenantId: tenantId,
      deletedAt: new Date().toISOString(),
      deletedBy: deletedBy,
      reason: deletedBy === 'auto-cleanup' ? 'subscription_expired_30_days' : 'manual_deletion',
      collections: {
        leads: 0,
        messages: 0,
        broadcasts: 0,
        templates: 0,
        funnelData: 0,
        reports: 0,
      },
    };

    const db = require('mongoose').connection.db;

    // DELETE FROM COLLECTIONS
    try {
      // Delete leads
      const leadsCollection = db?.collection('leads');
      if (leadsCollection) {
        const leadResult = await leadsCollection.deleteMany({ createdByUserId: tenantId });
        deletionLog.collections.leads = leadResult.deletedCount;
      }

      // Delete messages
      const messagesCollection = db?.collection('whatsappmessages');
      if (messagesCollection) {
        const msgResult = await messagesCollection.deleteMany({ createdByUserId: tenantId });
        deletionLog.collections.messages = msgResult.deletedCount;
      }

      // Delete broadcasts
      const broadcastsCollection = db?.collection('broadcasts');
      if (broadcastsCollection) {
        const bcResult = await broadcastsCollection.deleteMany({ createdByUserId: tenantId });
        deletionLog.collections.broadcasts = bcResult.deletedCount;
      }

      // Delete templates
      const templatesCollection = db?.collection('templates');
      if (templatesCollection) {
        const tplResult = await templatesCollection.deleteMany({ createdByUserId: tenantId });
        deletionLog.collections.templates = tplResult.deletedCount;
      }

      // Delete funnel data
      const funnelCollection = db?.collection('funneldata');
      if (funnelCollection) {
        const funnelResult = await funnelCollection.deleteMany({ createdByUserId: tenantId });
        deletionLog.collections.funnelData = funnelResult.deletedCount;
      }

      // Delete reports
      const reportsCollection = db?.collection('reports');
      if (reportsCollection) {
        const reportResult = await reportsCollection.deleteMany({ createdByUserId: tenantId });
        deletionLog.collections.reports = reportResult.deletedCount;
      }

      // DELETE BUNNY FILES (placeholder - real implementation would use Bunny API)
      const bunnyPath = `tenants/${tenantId}/`;
      console.log(`[Tenant Data Deletion] Bunny folder cleanup would delete: ${bunnyPath}`);
      // TODO: Call Bunny API to delete all files in tenants/{tenantId}/ folder

      // Log deletion for audit trail
      const auditCollection = db?.collection('tenant_deletion_audit');
      if (auditCollection) {
        await auditCollection.insertOne(deletionLog);
      }

      return {
        tenantId: tenantId,
        deletedAt: deletionLog.deletedAt,
        collections: deletionLog.collections,
        totalDeleted: Object.values(deletionLog.collections).reduce((a, b) => a + (b as number), 0),
        bunnyPath: bunnyPath,
      };
    } catch (dbError: any) {
      console.error('[Tenant Data Deletion] Database deletion error:', dbError);
      throw new Error(`Deletion failed: ${dbError.message}`);
    }
  } catch (error: any) {
    console.error('[Tenant Data Deletion] Execution error:', error);
    throw error;
  }
}
