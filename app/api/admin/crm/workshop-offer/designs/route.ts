import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { PDFDocument } from 'pdf-lib';
import { registrationViewer } from '@/lib/registrationAuth';
import { listOfferDesigns, listOfferRecords, finalizeOfferDocument, saveOfferDesign } from '@/lib/workshopOfferRepository';
import { validateOfferDesign } from '@/lib/workshopOfferDesign';
import { uploadUserFile } from '@/lib/bunny-storage';
import { offerAmount } from '@/lib/workshopOfferWorkflow';
import { offerContact } from '@/lib/workshopOfferContacts';

export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  const viewer = registrationViewer(request);
  if (!viewer) return NextResponse.json({ error: 'Admin authentication required' }, { status: 401 });
  try { return NextResponse.json({ data: await listOfferDesigns(viewer.superAdmin ? 'shared' : viewer.userId) }); }
  catch (error) { console.error('[offer designs]', error); return NextResponse.json({ error: 'Saved designs are unavailable' }, { status: 503 }); }
}

export async function POST(request: Request) {
  const viewer = registrationViewer(request);
  if (!viewer) return NextResponse.json({ error: 'Admin authentication required' }, { status: 401 });
  try {
    const body = await request.json();
    let design;
    try { design = validateOfferDesign(body.design); }
    catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Invalid design' }, { status: 400 }); }
    const scope = viewer.superAdmin ? 'shared' : viewer.userId;
    let record: Record<string, unknown> | undefined;
    if (design.kind !== 'ad') {
      record = (await listOfferRecords(scope))[design.leadId || ''];
      const contact = await offerContact(design.leadId || '', viewer);
      if (!contact) return NextResponse.json({ error: 'Saved participant not found in your account' }, { status: 404 });
      if (!record || record.status !== 'received') return NextResponse.json({ error: 'Confirm and save the payment first' }, { status: 409 });
      offerAmount(record.amount);
      if (design.kind === 'certificate' && body.approveCertificate !== true) return NextResponse.json({ error: 'Admin approval of certificate eligibility is required' }, { status: 400 });
      const number = crypto.createHash('sha256').update(`${scope}:${design.kind}:${design.leadId}`).digest('hex').slice(0, 12).toUpperCase();
      design.documentNumber = `${design.kind === 'receipt' ? 'SW-R' : 'SW-C'}-${number}`;
      design.id = `${design.kind}-${number}`;
      if (design.kind === 'receipt') design.subtitle = `${contact.name || 'Participant'}\nAmount received: INR ${offerAmount(record.amount).toFixed(2)}\nDate: ${record.date}\nPayment mode: ${record.paymentMode}\n${record.workshopName || 'Swar Yoga Workshop'}`;
    }
    const existing = (await listOfferDesigns(scope)).find(row => row.id === design.id);
    if (existing?.status === 'final') return NextResponse.json({ error: 'This document is already finalized. Open its saved PDF; no duplicate was created.' }, { status: 409 });
    if (design.status === 'final' && design.kind !== 'ad' && (!existing || body.design.subtitle !== design.subtitle || body.design.documentNumber !== design.documentNumber)) {
      return NextResponse.json({ error: 'Save the document draft first to restore the verified payment details and document number, then finalize its preview.' }, { status: 409 });
    }
    if (design.status === 'final' && existing?.predictionId && !['succeeded', 'failed', 'canceled'].includes(existing.generationStatus)) {
      return NextResponse.json({ error: 'Wait for the saved creative job to finish before finalizing this design.' }, { status: 409 });
    }
    // The file URL is server-owned; clients cannot mark a draft finalized without an artifact.
    delete design.fileUrl;
    if (design.status === 'final') {
      if (typeof body.png !== 'string' || !body.png.startsWith('data:image/png;base64,') || body.png.length > 12_000_000) {
        return NextResponse.json({ error: 'A PNG render is required to finalize the design' }, { status: 400 });
      }
      const bytes = Buffer.from(body.png.split(',')[1], 'base64');
      const pdf = await PDFDocument.create();
      const image = await pdf.embedPng(bytes);
      const page = pdf.addPage([design.width * 0.5, design.height * 0.5]);
      page.drawImage(image, { x: 0, y: 0, width: page.getWidth(), height: page.getHeight() });
      const artifact = await uploadUserFile(Buffer.from(await pdf.save()), `${design.id}.pdf`, viewer.userId, 'offer-designs', 'application/pdf');
      design.fileUrl = artifact.url;
    }
    const saved = { ...design, ...(existing?.predictionId ? { predictionId: existing.predictionId, generationStatus: existing.generationStatus, media: existing.media } : {}),
      paymentSnapshot: record, updatedByUserId: viewer.userId, updatedAt: new Date().toISOString() };
    if (design.leadId && record && design.status === 'final') {
      await finalizeOfferDocument(scope, design.id, design.kind, saved, design.leadId, record, design.kind === 'receipt'
        ? { receiptNumber: design.documentNumber, receiptDesignId: design.id, receiptUrl: design.fileUrl }
        : { certificateNumber: design.documentNumber, certificateDesignId: design.id, certificateUrl: design.fileUrl, certificateApprovedBy: viewer.userId });
    } else await saveOfferDesign(scope, design.id, design.kind, saved);
    return NextResponse.json({ success: true, data: saved });
  } catch (error) {
    console.error('[offer design save]', error);
    if (error instanceof Error && /Payment changed|already has/.test(error.message)) return NextResponse.json({ error: error.message }, { status: 409 });
    return NextResponse.json({ error: 'Design or artifact could not be saved. No message was sent.' }, { status: 503 });
  }
}
