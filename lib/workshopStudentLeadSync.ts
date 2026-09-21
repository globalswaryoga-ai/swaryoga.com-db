import { getLead } from '@/lib/schemas/enterpriseSchemas';
import { connectDB } from '@/lib/db';
import { allocateNextLeadNumber } from '@/lib/crm/leadNumber';
import { normalizePhoneStrict } from '@/lib/crm/phone';

function digits(value: unknown) {
  return String(value || '').replace(/\D/g, '');
}

export async function syncWorkshopStudentLead(input: {
  name: string;
  email?: string;
  phone?: string;
  whatsappNumber?: string;
  ownerUserId?: string;
  workshopName?: string;
  age?: string | number;
  city?: string;
  country?: string;
}) {
  await connectDB();
  const Lead = getLead();
  const email = String(input.email || '').trim().toLowerCase();
  const rawPhone = input.phone || input.whatsappNumber || '';
  const normalized = rawPhone ? normalizePhoneStrict(rawPhone, { defaultCountryCode: '91' }) : null;
  const phoneNumber = normalized?.ok ? normalized.phone : digits(rawPhone);
  let lead: any = null;

  if (email) lead = await Lead.findOne({ email }).sort({ updatedAt: -1 });
  if (!lead && phoneNumber) {
    lead = await Lead.findOne({ $or: [{ phoneNumber }, { phoneNumber: phoneNumber.replace(/^91/, '') }] }).sort({ updatedAt: -1 });
  }

  if (lead) {
    const update: Record<string, unknown> = {};
    if (!lead.name && input.name) update.name = input.name;
    if (!lead.email && email) update.email = email;
    if (!lead.phoneNumber && phoneNumber) update.phoneNumber = phoneNumber;
    if (input.workshopName) update.workshopName = input.workshopName;
    if (!lead.age && input.age) update.age = Number(input.age) || undefined;
    if (!lead.city && input.city) update.city = input.city;
    if (!lead.country && input.country) update.country = input.country;
    if (Object.keys(update).length) {
      await Lead.updateOne({ _id: lead._id }, { $set: update });
      lead = { ...lead.toObject?.() || lead, ...update };
    }
  } else if (phoneNumber && input.ownerUserId) {
    const allocated = await allocateNextLeadNumber(input.ownerUserId);
    lead = await Lead.create({
      leadNumber: allocated.leadNumber,
      name: input.name,
      email: email || undefined,
      phoneNumber,
      workshopName: input.workshopName || undefined,
      age: input.age ? Number(input.age) || undefined : undefined,
      city: input.city || undefined,
      country: input.country || undefined,
      source: 'workshop',
      assignedToUserId: input.ownerUserId,
      createdByUserId: input.ownerUserId,
    });
  }

  return lead ? { leadId: String(lead._id), leadNumber: String(lead.leadNumber || '') } : { leadId: '', leadNumber: '' };
}
