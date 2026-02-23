import { NextRequest, NextResponse } from 'next/server';
import { connectDB, Contact, Message } from '@/lib/db';
import { getOrCreateLeadIdForPhone } from '@/lib/crm/leadNumber';
import { notifyContactFormSubmission } from '@/lib/notifications';

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const { name, email, phone, subject, message } = await request.json();

    // Validate input
    if (!name || !email || !subject || !message) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Ensure lead exists in CRM and label it as 'contacts'
    let leadNumber = '';
    if (phone) {
      try {
        leadNumber = await getOrCreateLeadIdForPhone(
          phone, 
          name, 
          email, 
          'website', 
          ['contacts']
        );
      } catch (e) {
        console.warn('CRM lead allocation failed (non-blocking):', e);
      }
    }

    // Create contact message
    const contact = new Contact({
      name,
      email,
      phone,
      subject,
      message,
      status: 'new',
      leadNumber // Optional: helps link the contact record to CRM lead
    });

    await contact.save();

    // Store message in admin inbox so replies appear in user profile
    const inboxMessage = new Message({
      senderId: contact._id,
      senderEmail: email,
      senderName: name,
      senderRole: 'user',
      recipientEmail: 'admin@swaryoga.com',
      subject,
      message,
      contactId: contact._id,
      isRead: false,
      leadNumber // Link here too if available
    });

    await inboxMessage.save();

    // Fire-and-forget: Send confirmation email to user + admin notification
    notifyContactFormSubmission(
      { name, email, phone },
      { subject, message },
    ).catch(err => console.error('[Contact] Notification error:', err));

    return NextResponse.json(
      { message: 'Message received successfully' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Contact form error:', error);
    return NextResponse.json(
      { error: 'Failed to submit contact form' },
      { status: 500 }
    );
  }
}
