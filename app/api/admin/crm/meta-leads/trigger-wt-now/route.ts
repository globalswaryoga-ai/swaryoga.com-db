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

    let languageCode = 'en';
    let dailyRunId = null;
    let templateSnapshot = null;
    try {
        const { bunnyExecute } = await import('@/lib/bunnyDatabase');
        const tmplRes = await bunnyExecute({
            sql: "SELECT data_json FROM whatsapp_templates_sql WHERE template_name = ?",
            args: [template]
        });
        if (tmplRes.rows.length > 0) {
            templateSnapshot = JSON.parse(String(tmplRes.rows[0].data_json));
            if (templateSnapshot.language) {
                languageCode = templateSnapshot.language;
            }
        }
        
        // Get or create daily broadcast run
        const todayStr = new Date().toLocaleDateString('en-GB'); // 10/10/2026
        const broadcastRunKey = `ai-triggers-${todayStr.replace(/\//g, '-')}`;
        const runRes = await bunnyExecute({ sql: "SELECT document_id, data_json FROM broadcast_runs_sql WHERE broadcast_run_key = ?", args: [broadcastRunKey] });
        if (runRes.rows.length > 0) {
            dailyRunId = runRes.rows[0].document_id;
        } else {
            const { broadcastRunCreate } = await import('@/lib/bunnyBroadcastRepository');
            const newRun = await broadcastRunCreate({
                broadcastRunKey,
                name: `AI-9W Triggers (${todayStr})`,
                mode: 'now',
                status: 'completed', // completed so it shows in reports instantly
                templateId: templateSnapshot?._id || 'ai_trigger', 
                templateSnapshot,
                createdByLabel: 'AI-9W Worker',
                stats: { total: 0, pending: 0, sent: 0, delivered: 0, read: 0, failed: 0, skipped: 0, blocked: 0 }
            });
            dailyRunId = newRun._id;
        }
    } catch (e) {
        console.error('Error fetching template/daily run:', e);
    }

    for (const lead of leads) {
      if (!lead.phoneNumber) continue;
      
      let bodyParams: string[] = [];
      let headerMedia: any = undefined;
      
      if (templateSnapshot?.components) {
          const bodyComp = templateSnapshot.components.find((c: any) => c.type === 'BODY');
          if (bodyComp && bodyComp.text) {
              const matches = bodyComp.text.match(/\{\{(\d+)\}\}/g);
              if (matches) {
                  for (let i = 0; i < matches.length; i++) {
                      if (i === 0) bodyParams.push(lead.name || 'Student');
                      else bodyParams.push('');
                  }
              }
          }
          
          const headerComp = templateSnapshot.components.find((c: any) => c.type === 'HEADER');
          if (headerComp && headerComp.example?.header_handle?.[0]) {
              const url = headerComp.example.header_handle[0];
              const format = String(headerComp.format || '').toLowerCase();
              if (format === 'image' || format === 'video' || format === 'document') {
                  headerMedia = { kind: format === 'document' ? 'document' : format, url };
              }
          }
      }
      
      const input: any = { to: lead.phoneNumber, templateName: template, languageCode: languageCode };
      if (bodyParams.length > 0) input.bodyParams = bodyParams;
      if (headerMedia) input.headerMedia = headerMedia;
      
      let wtStatus = 'pending';
      let wtError = null;
      try {
          const apiResult = await sendWhatsAppTemplate(input);
          wtStatus = 'sent';
          successCount++;
          
          try {
              const { upsertBunnyMetaMessage } = await import('@/lib/bunnyMetaWhatsAppRepository');
              await upsertBunnyMetaMessage({
                  _id: apiResult.waMessageId || `manual-${Date.now()}-${lead.phoneNumber}`,
                  waMessageId: apiResult.waMessageId,
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
      lead.metadata.wtLastTemplates = lead.metadata.wtLastTemplates || {};
      lead.metadata.wtLastTemplates[template] = new Date().toISOString();
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
