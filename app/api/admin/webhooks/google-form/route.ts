import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/db';
import { getLead } from '@/models/Lead';
import { generateLeadNumber } from '@/utils/leadNumber';
import { addLeadToMainBroadcastList } from '@/lib/brevo';

export async function POST(req: Request) {
  try {
    const url = new URL(req.url);
    const workshopId = url.searchParams.get('workshopId');

    if (!workshopId) {
      return NextResponse.json({ error: 'workshopId query parameter is required' }, { status: 400 });
    }

    const payload = await req.json();
    const responses = Array.isArray(payload) ? payload : (payload.responses || [payload]);

    await connectDB();
    const Lead = getLead();
    
    let createdCount = 0;

    for (const record of responses) {
      const email = record.email || record.Email || record.mail;
      const name = record.name || record.Name || record['First Name'] || `Lead ${Date.now()}`;
      const mobile = record.mobile || record.phone || record.whatsapp || record['WhatsApp Number'];
      
      const dynamicAnswers: Record<string, string> = {};
      Object.keys(record).forEach(k => {
        const val = record[k];
        if (val && !['name', 'email', 'mobile', 'phone', 'whatsapp'].some(kw => k.toLowerCase().includes(kw))) {
          dynamicAnswers[k] = val;
        }
      });

      const allocatedLeadNumber = await generateLeadNumber();
      
      const newLead = new Lead({
        leadNumber: allocatedLeadNumber,
        name: String(name).trim(),
        email: email ? String(email).trim() : undefined,
        phoneNumber: mobile ? String(mobile).trim() : undefined,
        status: 'new_lead',
        labels: ['enquiry'],
        source: 'Google Form Webhook',
        createdByUserId: 'system',
        assignedToUserId: 'system',
        metadata: {
          formType: 'admin-enquiry',
          workshopId: workshopId,
          submittedAt: new Date(),
          dynamicAnswers: dynamicAnswers,
        },
      });

      await newLead.save();
      await addLeadToMainBroadcastList(newLead);
      createdCount++;
    }

    return NextResponse.json({ success: true, created: createdCount }, { status: 201 });
  } catch (error) {
    console.error('Google Form Webhook Error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
