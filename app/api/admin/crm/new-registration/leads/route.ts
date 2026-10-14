import { NextResponse } from 'next/server';
import { loadBunnyLeads } from '@/lib/bunnyLeadsRepository';
import { listForms, listSubmissions } from '@/lib/bunny-forms-db';
import { registrationLeadOwned, registrationViewer } from '@/lib/registrationAuth';
import { assembleRegistrationLeads, filterRegistrationLeads } from '@/lib/registrationLeads';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const viewer = registrationViewer(request);
  if (!viewer) return NextResponse.json({ error: 'Admin authentication required' }, { status: 401 });
  try {
    const [allLeads, allForms, allSubmissions] = await Promise.all([loadBunnyLeads(), listForms(), listSubmissions()]);
    const leads = allLeads.filter(lead => registrationLeadOwned(lead, viewer));
    const forms = allForms.filter(form => viewer.superAdmin || form.createdBy === viewer.userId);
    const formIds = new Set(forms.map(form => form.formId));
    const submissions = allSubmissions.filter(submission => viewer.superAdmin || formIds.has(submission.formId));
    const url = new URL(request.url);
    const rows = filterRegistrationLeads(
      assembleRegistrationLeads(leads, submissions, forms),
      url.searchParams.get('formId') || '',
      url.searchParams.get('language') || '',
    );
    const questionMap: Record<string, string> = {};
    rows.forEach(r => {
      const answers = { ...(r.dynamicAnswers || {}), ...(r._rawRecord || {}), ...(r.answers || {}) };
      Object.keys(answers).forEach(k => {
        if (k && !k.startsWith('_') && k.length > 1) {
          questionMap[k] = k;
        }
      });
    });
    return NextResponse.json({ success: true, data: rows, count: rows.length, questionMap }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    console.error('Failed to load saved registration leads:', error);
    return NextResponse.json({ error: 'Saved form data is unavailable. Please retry; no records were removed.' }, { status: 503 });
  }
}
export async function PATCH(request: Request) {
  const viewer = registrationViewer(request);
  if (!viewer) return NextResponse.json({ error: 'Admin authentication required' }, { status: 401 });
  try {
    const body = await request.json();
    const { id, phone, phoneNumber, country, workshopId, batchId, batchName } = body || {};
    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'Lead ID is required' }, { status: 400 });
    }

    const { bunnyExecute } = await import('@/lib/bunnyDatabase');
    const { invalidateBunnyLeadsCache } = await import('@/lib/bunnyLeadsRepository');
    const { normalizePhoneWithCountry } = await import('@/lib/crm/phone');
    const now = new Date().toISOString();

    // 1. Clean phone if provided using participant's country
    let cleanPhone = '';
    if (phone || phoneNumber) {
      cleanPhone = normalizePhoneWithCountry(phone || phoneNumber, country);
    }

    // 2. Check if row is in leads_sql
    const leadRow = await bunnyExecute({
      sql: 'SELECT document_id, data_json FROM leads_sql WHERE document_id = ? LIMIT 1',
      args: [id],
    });

    if (leadRow.rows.length > 0) {
      const existing = JSON.parse(String(leadRow.rows[0].data_json || '{}'));
      const patch: Record<string, any> = {};
      if (cleanPhone) {
        patch.phoneNumber = cleanPhone;
        patch.mobile = cleanPhone;
        patch.whatsappNumber = cleanPhone;
      }
      if (workshopId || batchId) {
        patch.workshopId = workshopId || batchId;
        patch.metadata = { ...(existing.metadata || {}), workshopId: workshopId || batchId };
        if (batchName) {
          patch.workshopName = batchName;
          patch.metadata.workshopName = batchName;
        }
      }
      await bunnyExecute({
        sql: 'UPDATE leads_sql SET data_json = json_patch(data_json, ?), updated_at = ? WHERE document_id = ?',
        args: [JSON.stringify(patch), now, id],
      });
      invalidateBunnyLeadsCache();
      return NextResponse.json({ success: true, updated: 'lead', phone: cleanPhone });
    }

    // 3. Check if row is in form_submissions
    const subRow = await bunnyExecute({
      sql: 'SELECT id, answers, mobile, lead_id FROM form_submissions WHERE id = ? LIMIT 1',
      args: [id],
    });

    if (subRow.rows.length > 0) {
      const answers = JSON.parse(String(subRow.rows[0].answers || '{}'));
      if (cleanPhone) {
        // Update top-level mobile and common phone answer keys
        const phoneKeys = Object.keys(answers).filter(k => /phone|mobile|whatsapp|contact/i.test(k));
        for (const k of phoneKeys) answers[k] = cleanPhone;
      }
      if (batchName) {
        const batchKeys = Object.keys(answers).filter(k => /batch|date|workshop/i.test(k));
        for (const k of batchKeys) answers[k] = batchName;
      }
      await bunnyExecute({
        sql: `UPDATE form_submissions SET 
          mobile = COALESCE(?, mobile),
          answers = ?,
          form_data = CASE WHEN ? != '' THEN ? ELSE form_data END
        WHERE id = ?`,
        args: [cleanPhone || null, JSON.stringify(answers), workshopId || batchId || '', workshopId || batchId || '', id],
      });

      // Also update linked lead if lead_id exists
      const leadId = subRow.rows[0].lead_id;
      if (leadId) {
        const linkedPatch: Record<string, any> = {};
        if (cleanPhone) {
          linkedPatch.phoneNumber = cleanPhone;
          linkedPatch.mobile = cleanPhone;
          linkedPatch.whatsappNumber = cleanPhone;
        }
        if (workshopId || batchId) {
          linkedPatch.workshopId = workshopId || batchId;
          if (batchName) linkedPatch.workshopName = batchName;
        }
        await bunnyExecute({
          sql: 'UPDATE leads_sql SET data_json = json_patch(data_json, ?), updated_at = ? WHERE document_id = ?',
          args: [JSON.stringify(linkedPatch), now, String(leadId)],
        });
      }

      invalidateBunnyLeadsCache();
      return NextResponse.json({ success: true, updated: 'submission', phone: cleanPhone });
    }

    return NextResponse.json({ error: 'Record not found in database' }, { status: 404 });
  } catch (error) {
    console.error('Failed to update lead:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Update failed' }, { status: 500 });
  }
}
