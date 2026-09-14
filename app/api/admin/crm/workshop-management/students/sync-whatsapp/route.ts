import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { getLead } from '@/lib/schemas/enterpriseSchemas';
import { getWorkshopStudent } from '@/lib/schemas/workshopStudentManagementSchemas';

function isAdmin(request: NextRequest) {
  const raw = request.headers.get('authorization') || '';
  return verifyToken(raw.startsWith('Bearer ') ? raw.slice(7) : raw)?.isAdmin;
}

function phoneOf(value: unknown) {
  const digits = String(value || '').replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 15 ? digits : '';
}

export async function POST(request: NextRequest) {
  if (!isAdmin(request)) return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  const body = await request.json();
  const cohortId = String(body.cohortId || '').trim();
  const participants = Array.isArray(body.participants) ? body.participants : [];
  if (!cohortId || !participants.length) {
    return NextResponse.json({ error: 'cohortId and group participants are required' }, { status: 400 });
  }

  await connectDB();
  const Lead = getLead();
  const Student = getWorkshopStudent();
  const phones: string[] = Array.from(new Set<string>(participants.map((p: any) => phoneOf(p.phone || p.number || p.id || p.jid)).filter((phone): phone is string => Boolean(phone))));
  const leads = await Lead.find({ $or: phones.flatMap((phone) => [{ phoneNumber: phone }, { phoneNumber: phone.replace(/^91/, '') }]) }).lean();
  const leadByPhone = new Map<string, any>();
  for (const lead of leads) {
    const phone = phoneOf(lead.phoneNumber || lead.phone);
    if (phone) leadByPhone.set(phone, lead);
  }

  let imported = 0;
  for (const participant of participants) {
    const phone = phoneOf(participant.phone || participant.number || participant.id || participant.jid);
    if (!phone) continue;
    const lead = leadByPhone.get(phone) || leadByPhone.get(phone.replace(/^91/, ''));
    const name = String(participant.name || participant.notify || lead?.name || phone).trim();
    const whatsappJid = String(participant.jid || participant.id || `${phone}@s.whatsapp.net`);
    await Student.findOneAndUpdate(
      { cohortId, phone },
      { $set: { cohortId, name, phone, whatsappNumber: phone, whatsappJid, source: 'whatsapp_group', active: true, ...(lead ? { metadata: { leadId: String(lead._id), leadNumber: lead.leadNumber } } : {}) } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    imported++;
  }
  return NextResponse.json({ success: true, imported, matchedLeads: leadByPhone.size });
}
