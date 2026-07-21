import { NextRequest, NextResponse } from 'next/server';
import { connectDB, EnquiryForm } from '@/lib/db';
import { normalizePhone } from '@/lib/whatsapp';
import { getLead } from '@/lib/schemas/enterpriseSchemas';
import { allocateNextLeadNumber } from '@/lib/crm/leadNumber';
import { addLeadToMainBroadcastList } from '@/lib/crm/broadcast-automation';

export const dynamic = 'force-dynamic';

/** GET /api/join/[formId] — returns public form metadata */
export async function GET(
  _req: NextRequest,
  { params }: { params: { formId: string } }
) {
  await connectDB();
  const form = await EnquiryForm.findOne({ formId: params.formId, isActive: true }).lean() as any;
  if (!form) return NextResponse.json({ error: 'Form not found or inactive' }, { status: 404 });

  return NextResponse.json({
    success: true,
    form: {
      formId: form.formId,
      workshopName: form.workshopName,
      workshopDate: form.workshopDate,
      workshopTime: form.workshopTime,
      workshopMode: form.workshopMode,
      description: form.description,
      workshopImage: form.workshopImage || '',
      price: form.price || 0,
      currency: form.currency || 'INR',
      feeOptions: Array.isArray(form.feeOptions) ? form.feeOptions.map((f: any) => ({ label: f.label || '', price: f.price || 0 })) : [],
      groupLink: form.groupLink || '',
    },
  });
}

/** POST /api/join/[formId] — submit the enquiry form */
export async function POST(
  req: NextRequest,
  { params }: { params: { formId: string } }
) {
  await connectDB();
  const form = await EnquiryForm.findOne({ formId: params.formId, isActive: true }).lean() as any;
  if (!form) return NextResponse.json({ error: 'Form not found or inactive' }, { status: 404 });

  const body = await req.json();
  const { name, mobile, email, city, country } = body;

  if (!name?.trim() || !mobile?.trim() || !city?.trim()) {
    return NextResponse.json({ error: 'Name, mobile and city are required' }, { status: 400 });
  }

  // Increment submission count
  await EnquiryForm.findOneAndUpdate({ formId: params.formId }, { $inc: { submissionCount: 1 } });

  // Create/update CRM Lead
  let leadNumber: string | null = null;
  try {
    const Lead = getLead();
    const cleanedPhone = normalizePhone(mobile);
    const cleanedName = String(name).trim();

    if (cleanedPhone) {
      const existingLead = await Lead.findOne({ phoneNumber: cleanedPhone });

      if (existingLead) {
        if (!existingLead.leadNumber) {
          const { leadNumber: num } = await allocateNextLeadNumber();
          existingLead.leadNumber = num;
        }
        if (cleanedName && !existingLead.name) existingLead.name = cleanedName;
        existingLead.labels = Array.from(new Set([
          ...(existingLead.labels || []),
          'enquiry',
          'join-form',
          form.workshopName,
        ]));
        existingLead.metadata = {
          ...(existingLead.metadata || {}),
          lastEnquiry: {
            workshopId: form.workshopId || form.formId,
            workshopName: form.workshopName,
            city: city.trim(),
            country: country?.trim() || '',
            email: email?.trim() || '',
            submittedAt: new Date(),
            formId: params.formId,
          },
        };
        await existingLead.save();
        await addLeadToMainBroadcastList(existingLead);
        leadNumber = existingLead.leadNumber;
      } else {
        const { leadNumber: allocatedLeadNumber } = await allocateNextLeadNumber();
        const newLead = await Lead.create({
          leadNumber: allocatedLeadNumber,
          name: cleanedName || 'Unknown User',
          phoneNumber: cleanedPhone,
          email: email?.trim() || undefined,
          status: 'lead',
          source: 'join-form',
          workshopName: form.workshopName,
          labels: ['enquiry', 'join-form', form.workshopName],
          createdByUserId: 'system',
          assignedToUserId: 'system',
          metadata: {
            formType: 'join-form',
            workshopId: form.workshopId || form.formId,
            workshopName: form.workshopName,
            city: city.trim(),
            country: country?.trim() || '',
            email: email?.trim() || '',
            submittedAt: new Date(),
            formId: params.formId,
          },
        });
        await addLeadToMainBroadcastList(newLead);
        leadNumber = allocatedLeadNumber;
      }
    }
  } catch (err) {
    console.error('[join-form] CRM lead error (non-fatal):', err);
  }

  return NextResponse.json({ success: true, leadNumber }, { status: 201 });
}
