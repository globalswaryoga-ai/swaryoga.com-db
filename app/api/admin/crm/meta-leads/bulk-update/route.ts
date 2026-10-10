import { NextRequest, NextResponse } from 'next/server';
import { bunnyExecute, bunnyBatch } from '@/lib/bunnyDatabase';
// import { getWhatsAppScheduledJob } from '@/lib/schemas/enterpriseSchemas';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { ids, status, wtSettings, workshopId, bulkUpdates } = body;

    if (!bulkUpdates && (!ids || !ids.length || !status)) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    console.log("BULK UPDATE RECEIVED:");
    console.log("Status:", status);
    console.log("Updates:", JSON.stringify(bulkUpdates, null, 2));

    let updatedIds = ids || [];
    let modifiedCount = 0;
    const now = new Date().toISOString();
    
    if (bulkUpdates && bulkUpdates.length > 0) {
      updatedIds = bulkUpdates.map((u: any) => u.id);
      
      const selectResult = await bunnyExecute({
        sql: `SELECT document_id, data_json FROM leads_sql WHERE document_id IN (${updatedIds.map(() => '?').join(',')})`,
        args: updatedIds
      });
      const updatesMap = new Map(bulkUpdates.map((u: any) => [u.id, u]));
      
      const stmts = selectResult.rows.map((row: any) => {
        const u = updatesMap.get(row.document_id);
        const data = JSON.parse(String(row.data_json));
        data.status = u.status;
        data.updatedAt = now;
        data.metadata = data.metadata || {};
        if (u.reason) {
          data.metadata.ai9Reason = u.reason;
        }
        if (u.metadata) {
          data.metadata = { ...data.metadata, ...u.metadata };
        }
        return {
          sql: `UPDATE leads_sql SET data_json = ?, updated_at = ? WHERE document_id = ?`,
          args: [JSON.stringify(data), now, row.document_id]
        };
      });
      
      if (stmts.length > 0) {
        await bunnyBatch(stmts);
        modifiedCount = stmts.length;
      }
    } else {
      const selectResult = await bunnyExecute({
        sql: `SELECT document_id, data_json FROM leads_sql WHERE document_id IN (${ids.map(() => '?').join(',')})`,
        args: ids
      });
      
      const stmts = selectResult.rows.map((row: any) => {
        const data = JSON.parse(String(row.data_json));
        data.status = status;
        data.updatedAt = now;
        return {
          sql: `UPDATE leads_sql SET data_json = ?, updated_at = ? WHERE document_id = ?`,
          args: [JSON.stringify(data), now, row.document_id]
        };
      });
      
      if (stmts.length > 0) {
        await bunnyBatch(stmts);
        modifiedCount = stmts.length;
      }
    }

    // Auto-schedule WhatsApp Trigger Jobs (Temporarily disabled to remove MongoDB dependency)
    /*
    if (wtSettings) {
      const stageConfig = status === 'approved' ? wtSettings.approved : status === 'pending' ? wtSettings.pending : null;
      if (stageConfig && stageConfig.template) {
        const delayMs = Math.max(0, parseInt(stageConfig.delay) || 0) * 60 * 1000;
        const nextRunAt = new Date(Date.now() + delayMs);
        
        // const WhatsAppScheduledJob = getWhatsAppScheduledJob();
        
        const jobs = updatedIds.map((id: string) => ({
          name: `WT Trigger: ${status} - ${stageConfig.template}`,
          createdByUserId: 'system',
          status: 'active',
          targetType: 'leadIds',
          targetLeadIds: [id],
          provider: 'meta',
          messageType: 'template',
          metadata: { templateName: stageConfig.template, workshopId, triggerStage: status },
          nextRunAt,
          maxRuns: 1,
        }));
        
        if (jobs.length > 0) {
          // await WhatsAppScheduledJob.insertMany(jobs);
        }
      }
    }
    */

    return NextResponse.json({ success: true, modifiedCount });
  } catch (error: any) {
    console.error('Error updating bulk leads status:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
