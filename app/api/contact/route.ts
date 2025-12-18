import { NextRequest, NextResponse } from 'next/server';
import { connectDB, Contact, Message } from '@/lib/db';

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

    // Create contact message
    const contact = new Contact({
      name,
      email,
      phone,
      subject,
      message,
      status: 'new',
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
    });

    await inboxMessage.save();

    // TODO: Send email notification to admin
    // TODO: Send confirmation email to user

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
