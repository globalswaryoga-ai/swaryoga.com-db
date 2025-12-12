import { NextRequest, NextResponse } from 'next/server';
import { connectDB, Message, Contact } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import mongoose from 'mongoose';

// Admin sends reply to a contact message
export async function POST(request: NextRequest) {
  try {
    await connectDB();

    // Verify admin token
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if it's a Bearer token (JWT from user login with admin email)
    let isValidAdmin = false;
    let token = authHeader;
    
    if (authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
      const payload = verifyToken(token);
      // Allow if it's a JWT token with admin@swaryoga.com email
      if (payload && payload.email === 'admin@swaryoga.com') {
        isValidAdmin = true;
      }
    }

    // Also allow admin panel tokens (admin_xxxxx format)
    if (!isValidAdmin && token.startsWith('admin_')) {
      isValidAdmin = true;
    }

    if (!isValidAdmin) {
      return NextResponse.json({ error: 'Only admin can send replies' }, { status: 403 });
    }

    const { contactId, userEmail, subject, reply } = await request.json();

    if (!userEmail || !subject || !reply) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    let contact = null;
    if (contactId) {
      contact = await Contact.findById(contactId);
      if (!contact) {
        return NextResponse.json(
          { error: 'Contact message not found' },
          { status: 404 }
        );
      }
    }

    // Create reply message
    const replyMessage = new Message({
      senderId: new mongoose.Types.ObjectId(),
      senderEmail: 'admin@swaryoga.com',
      senderName: 'Swar Yoga Admin',
      senderRole: 'admin',
      recipientEmail: userEmail,
      subject: subject,
      message: reply,
      contactId: contactId || null,
      isRead: false,
    });

    await replyMessage.save();

    // Update contact status to replied
    if (contactId) {
      await Contact.findByIdAndUpdate(contactId, { status: 'replied' });
    }

    // TODO: Send actual email to user with reply

    return NextResponse.json(
      {
        message: 'Reply sent successfully',
        data: replyMessage,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error sending reply:', error);
    return NextResponse.json(
      { error: 'Failed to send reply' },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, { status: 204, headers: { Allow: 'POST, OPTIONS' } });
}
