import { connectDB, Contact, Message } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    // Verify admin token
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();

    // Fetch contact messages from database
    const contacts = await Contact.find().sort({ createdAt: -1 });

    // Fetch direct messages sent to the admin so profile chat entries also appear
    const adminMessages = await Message.find({ recipientEmail: 'admin@swaryoga.com', senderRole: 'user' }).sort({ createdAt: -1 });

    const mappedContacts = contacts.map((contact) => ({
      _id: contact._id,
      name: contact.name,
      email: contact.email,
      phone: contact.phone,
      subject: contact.subject,
      message: contact.message,
      status: contact.status,
      isRead: contact.isRead ?? false,
      createdAt: contact.createdAt,
      source: 'contact',
    }));

    const mappedMessages = adminMessages.map((message) => ({
      _id: message._id,
      name: message.senderName,
      email: message.senderEmail,
      phone: '',
      subject: message.subject,
      message: message.message,
      status: message.isRead ? 'replied' : 'new message',
      isRead: message.isRead,
      createdAt: message.createdAt,
      source: 'profile-chat',
      contactId: message.contactId,
    }));

    const combined = [...mappedContacts, ...mappedMessages].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return NextResponse.json(combined, { status: 200 });
  } catch (error) {
    console.error('Error fetching contact data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch contact data' },
      { status: 500 }
    );
  }
}
