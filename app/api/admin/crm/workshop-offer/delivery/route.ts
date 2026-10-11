import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { registrationViewer } from '@/lib/registrationAuth';
import { offerContact } from '@/lib/workshopOfferContacts';
import { listOfferDesigns, initOfferSchema } from '@/lib/workshopOfferRepository';
import { listTemplates, getTemplateById } from '@/lib/bunnyTemplatesRepository';
import { ensureBroadcastSchema } from '@/lib/bunnyBroadcastRepository';
import { bunnyBatch } from '@/lib/bunnyDatabase';
import { normalizePhone } from '@/lib/whatsapp';

export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  const viewer = registrationViewer(request);
  if (!viewer) return NextResponse.json({ error: 'Admin authentication required' }, { status: 401 });
  try {
    const templates = await listTemplates({ provider: 'meta', status: 'approved', ...(viewer.superAdmin ? {} : { createdBy: viewer.userId }) }, 200);
    return NextResponse.json({ data: templates.templates.filter((template: { headerFormat?: string }) => String(template.headerFormat).toUpperCase() === 'DOCUMENT') });
  } catch (error) { console.error('[offer delivery templates]', error); return NextResponse.json({ error: 'Approved document templates could not be loaded' }, { status: 503 }); }
}

export async function POST(request: Request) {
  const viewer = registrationViewer(request);
  if (!viewer) return NextResponse.json({ error: 'Admin authentication required' }, { status: 401 });
  try {
    const { designId, templateId, approved } = await request.json();
    if (typeof designId !== 'string' || typeof templateId !== 'string' || approved !== true) return NextResponse.json({ error: 'Review and approve the recipient and document before scheduling delivery' }, { status: 400 });
    if (!process.env.CRON_SECRET) return NextResponse.json({ error: 'CRON_SECRET must be configured before automated Meta delivery can run' }, { status: 503 });
    const scope = viewer.superAdmin ? 'shared' : viewer.userId;
    const design = (await listOfferDesigns(scope)).find(row => row.id === designId && row.kind !== 'ad' && row.status === 'final');
    if (!design?.fileUrl || !design.leadId) return NextResponse.json({ error: 'Finalize and save the document first' }, { status: 409 });
    const contact = await offerContact(design.leadId, viewer);
    if (!contact?.leadId) return NextResponse.json({ error: 'Link this participant to a CRM lead before Meta delivery' }, { status: 409 });
    const phone = normalizePhone(String(contact.phoneNumber || contact.mobile || ''));
    if (!/^\d{10,15}$/.test(phone)) return NextResponse.json({ error: 'Participant has no valid WhatsApp phone number' }, { status: 400 });
    const template = await getTemplateById(templateId);
    if (!template || String(template.status).toLowerCase() !== 'approved' || String(template.headerFormat).toUpperCase() !== 'DOCUMENT' ||
      (!viewer.superAdmin && String(template.createdBy || template.createdByUserId) !== viewer.userId)) return NextResponse.json({ error: 'Choose an approved Meta document template belonging to your account' }, { status: 400 });
    await Promise.all([initOfferSchema(), ensureBroadcastSchema()]);
    const id = `offer-doc_${crypto.createHash('sha256').update(`${scope}:${design.id}`).digest('hex').slice(0, 24)}`;
    const now = new Date().toISOString();
    const snapshot = { ...template, headerMedia: { kind: 'document', url: design.fileUrl, filename: `${design.documentNumber}.pdf` }, headerContent: design.fileUrl };
    await bunnyBatch([
      { sql: `INSERT INTO broadcast_runs_sql(document_id,broadcast_run_key,name,created_by_user_id,created_by_label,mode,provider,status,template_id,scheduled_at,data_json,created_at,updated_at)
        VALUES(?,?,?,?,?,'schedule','meta','scheduled',?,?,?,?,?) ON CONFLICT(document_id) DO NOTHING`,
        args: [id, id, `Offer ${design.kind}: ${contact.name || design.leadId}`, viewer.userId, viewer.userId, templateId, now, JSON.stringify({ templateSnapshot: snapshot, target: { type: 'selected', leadIds: [contact.leadId] }, stats: { total: 1, pending: 1, sent: 0, failed: 0 }, offerDocumentId: design.id }), now, now] },
      { sql: "INSERT INTO broadcast_run_messages_sql(document_id,run_id,lead_id,phone_number,status,created_at,updated_at) VALUES(?,?,?,?,'pending',?,?) ON CONFLICT(document_id) DO NOTHING", args: [`${id}_message`, id, String(contact.leadId), phone, now, now] },
      { sql: "UPDATE workshop_offer_records_sql SET data_json=json_set(data_json,?,?),updated_at=? WHERE scope=? AND lead_id=?", args: [`$.${design.kind}DeliveryRunId`, id, now, scope, design.leadId] },
    ]);
    return NextResponse.json({ success: true, runId: id, message: 'Document queued once in the existing Bunny Meta broadcast worker. Check Broadcast Reports for the delivery result.' });
  } catch (error) { console.error('[offer document delivery]', error); return NextResponse.json({ error: 'Document delivery could not be queued. No message was sent.' }, { status: 503 }); }
}
