import { NextResponse } from 'next/server';
import { getStudent } from '@/lib/workshopBunnyRepository';
import { sendEmail } from '@/lib/email';

export async function POST(request: Request) {
  try {
    const { studentId, channel, message } = await request.json();
    if (!studentId || !channel || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const student = await getStudent(studentId);
    if (!student) return NextResponse.json({ error: 'Student not found' }, { status: 404 });

    if (channel === 'meta') {
      const phone = (student.whatsappNumber || student.phone || '').replace(/\D/g, '');
      if (!phone) return NextResponse.json({ error: 'No phone number for student' }, { status: 400 });

      const metaToken = process.env.META_ACCESS_TOKEN;
      const phoneId = process.env.META_PHONE_NUMBER_ID;
      if (!metaToken || !phoneId) throw new Error('Meta API not configured');
      
      const payload = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: phone.length === 10 ? '91' + phone : phone,
        type: "text",
        text: { body: message }
      };
      
      const res = await fetch(`https://graph.facebook.com/v17.0/${phoneId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${metaToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Meta API error');
      return NextResponse.json({ success: true, data });
    }
    
    if (channel === 'qr') {
      const phone = (student.whatsappNumber || student.phone || '').replace(/\D/g, '');
      if (!phone) return NextResponse.json({ error: 'No phone number for student' }, { status: 400 });
      const jid = `${phone.length === 10 ? '91' + phone : phone}@s.whatsapp.net`;
      const origin = new URL(request.url).origin;
      const authHeader = request.headers.get('authorization');
      
      const res = await fetch(`${origin}/api/admin/crm/whatsapp/qr-bridge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authHeader ? { 'Authorization': authHeader } : {})
        },
        body: JSON.stringify({ path: '/send', body: { to: jid, message } })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to send via QR bridge. Make sure WhatsApp is connected in settings.');
      return NextResponse.json({ success: true, data });
    }
    
    if (channel === 'email') {
      const email = student.email;
      if (!email) return NextResponse.json({ error: 'No email address for student' }, { status: 400 });
      const result = await sendEmail({
        to: email,
        subject: 'Message from Workshop',
        html: `<p>${message.replace(/\n/g, '<br/>')}</p>`
      });
      if (!result.success) throw new Error(result.error || 'Failed to send email');
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid channel' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
