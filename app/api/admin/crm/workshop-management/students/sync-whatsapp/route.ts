import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { upsertStudent } from '@/lib/workshopBunnyRepository';

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

  const phones: string[] = Array.from(new Set<string>(participants.map((p: any) => phoneOf(p.phone || p.number || p.id || p.jid)).filter((phone): phone is string => Boolean(phone))));
  const leadByPhone = new Map<string, any>();

  let imported = 0;
  for (const participant of participants) {
    const phone = phoneOf(participant.phone || participant.number || participant.id || participant.jid);
    if (!phone) continue;
    const name = String(participant.name || participant.notify || phone).trim();
    const whatsappJid = String(participant.jid || participant.id || `${phone}@s.whatsapp.net`);
    await upsertStudent({ cohortId, name, phone, whatsappNumber: phone, whatsappJid, source: 'whatsapp_group', active: true });
    imported++;
  }
  return NextResponse.json({ success: true, imported, matchedLeads: leadByPhone.size });
}
