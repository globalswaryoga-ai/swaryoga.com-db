import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';

/**
 * POST /api/crm-site/contact
 * Stores a contact-us form submission in the CRM database.
 * Does NOT disturb main site or admin CRM — writes to a separate collection.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, phone, subject, message } = body;

    // Validate
    if (!name?.trim() || !email?.trim() || !subject?.trim() || !message?.trim()) {
      return NextResponse.json(
        { error: 'Name, email, subject, and message are required.' },
        { status: 400 }
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Invalid email address.' }, { status: 400 });
    }

    await connectDB();

    // Use the CRM database for contact submissions
    const mongoose = (await import('mongoose')).default;
    const crmDb = mongoose.connection.useDb(process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm');
    const ContactSubmission = crmDb.collection('crm_site_contacts');

    await ContactSubmission.insertOne({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone?.trim() || '',
      subject,
      message: message.trim(),
      source: 'crm-site-contact-form',
      status: 'new',
      createdAt: new Date(),
    });

    return NextResponse.json({ success: true, message: 'Message received.' });
  } catch (err: any) {
    console.error('CRM Site Contact Error:', err);
    return NextResponse.json(
      { error: 'Failed to submit contact form. Please try again.' },
      { status: 500 }
    );
  }
}
