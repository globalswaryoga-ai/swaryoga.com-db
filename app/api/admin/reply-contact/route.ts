import { NextRequest, NextResponse } from 'next/server';
import { connectDB, Message, Contact } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import mongoose from 'mongoose';

// Admin sends reply to a contact message
export async function POST(request: NextRequest) {
  try {
    await connectDB();

    // Verify admin token
    const authHeader = request.headers.get('authorization') || '';

    const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : '';
    if (!bearer) {
      // Legacy admin-panel token support (only if configured)
      const expectedAdminPanelToken = (process.env.ADMIN_PANEL_TOKEN || '').trim();
      if (!expectedAdminPanelToken || authHeader !== expectedAdminPanelToken) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const decoded = bearer ? verifyToken(bearer) : null;
    if (bearer && !decoded?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Permission gate: email module
    if (bearer) {
      const perms = Array.isArray(decoded?.permissions) ? decoded.permissions : [];
      const isSuperAdmin = decoded?.userId === 'admin' || perms.includes('all');
      const canEmail = isSuperAdmin || perms.includes('email');
      if (!canEmail) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
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
