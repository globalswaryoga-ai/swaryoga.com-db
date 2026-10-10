import { NextRequest, NextResponse } from 'next/server';
import { bunnyExecute } from '@/lib/bunnyDatabase';
import { buildCloudTemplateSendInput, sendWhatsAppTemplate } from '@/lib/whatsapp';

export async function POST(req: NextRequest) {
  try {
    const { ids, template } = await req.json();
    if (!ids || !ids.length || !template) {
      return NextResponse.json({ error: 'Missing ids or template' }, { status: 400 });
    }

    const inClause = ids.map(() => '?').join(',');
    const selectResult = await bunnyExecute({
      sql: `SELECT document_id, data_json FROM leads_sql WHERE document_id IN (${inClause})`,
      args: ids
    });

    const leads = selectResult.rows.map((r: any) => JSON.parse(r.data_json));

    let successCount = 0;
    const results: any[] = [];
    
    for (const lead of leads) {
      if (!lead.phoneNumber) continue;
      const input = buildCloudTemplateSendInput(lead.phoneNumber, template, 'en_US', []);
      let wtStatus = 'pending';
      let wtError = null;
      try {
          const apiResult = await sendWhatsAppTemplate(input);
          wtStatus = 'sent';
          successCount++;
          
          try {
              const { upsertBunnyMetaMessage } = await import('@/lib/bunnyMetaWhatsAppRepository');
              await upsertBunnyMetaMessage({
                  _id: apiResult.messages?.[0]?.id || `manual-${Date.now()}-${lead.phoneNumber}`,
                  waMessageId: apiResult.messages?.[0]?.id,
                  leadId: lead._id || lead.id,
                  phoneNumber: lead.phoneNumber,
                  direction: 'outbound',
                  messageType: 'template',
                  status: 'sent',
                  messageContent: template,
                  sentAt: new Date().toISOString(),
                  metadata: {
                      templateName: template,
                      isBulk: true,
                      source: 'meta-leads-trigger'
                  }
              });
          } catch(err) {
              console.error('Error logging to meta broadcast:', err);
          }
      } catch (err: any) {
          console.error(`Error sending to ${lead.phoneNumber}:`, err);
          wtStatus = 'failed';
          wtError = err.message || 'Unknown error';
          
          try {
              const { upsertBunnyMetaMessage } = await import('@/lib/bunnyMetaWhatsAppRepository');
              await upsertBunnyMetaMessage({
                  _id: `err-${Date.now()}-${lead.phoneNumber}`,
                  leadId: lead._id || lead.id,
                  phoneNumber: lead.phoneNumber,
                  direction: 'outbound',
                  messageType: 'template',
                  status: 'failed',
                  messageContent: template,
                  sentAt: new Date().toISOString(),
                  failureReason: wtError,
                  metadata: {
                      templateName: template,
                      isBulk: true,
                      source: 'meta-leads-trigger',
                      error: wtError
                  }
              });
          } catch(err) {
              console.error('Error logging failed meta broadcast:', err);
          }
      }
      
      lead.metadata = lead.metadata || {};
      lead.metadata.wtStatus = wtStatus;
      lead.metadata.wtError = wtError;
      lead.updatedAt = new Date().toISOString();
      
      await bunnyExecute({
          sql: `UPDATE leads_sql SET data_json = ?, updated_at = ? WHERE document_id = ?`,
          args: [JSON.stringify(lead), lead.updatedAt, lead._id || lead.id]
      });
      
      results.push({ id: lead._id || lead.id, wtStatus, wtError });
    }

    return NextResponse.json({ success: true, count: successCount, results });
  } catch (error: any) {
    console.error('Error triggering manual WT:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
