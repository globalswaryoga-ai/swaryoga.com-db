import { NextRequest, NextResponse } from 'next/server';
import { connectDB, Message, User } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    // Get token from header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const payload = verifyToken(token);

    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    const { subject, message, recipientEmail, contactId } = await request.json();

    // Validate input
    if (!subject || !message || !recipientEmail) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get sender info
    const sender = await User.findById(payload.userId);
    if (!sender) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Determine sender role (admin if email is admin@swaryoga.com)
    const senderRole = sender.email === 'admin@swaryoga.com' ? 'admin' : 'user';

    // Create message
    const newMessage = new Message({
      senderId: payload.userId,
      senderEmail: sender.email,
      senderName: sender.name,
      senderRole: senderRole,
      recipientEmail: recipientEmail,
      subject: subject,
      message: message,
      contactId: contactId || null,
      isRead: false,
    });

    await newMessage.save();

    // TODO: Send actual email notification
    // For now, just save to database

    return NextResponse.json(
      {
        message: 'Message sent successfully',
        data: newMessage,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error sending message:', error);
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    // Get token from header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const payload = verifyToken(token);

    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    // Get user email
    const user = await User.findById(payload.userId);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Get messages for this user (either sent to or from this user)
    const { searchParams } = new URL(request.url);
    const limitParam = Number(searchParams.get('limit') || '200');
    const pageParam = Number(searchParams.get('page') || '1');

    const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 500) : 200;
    const page = Number.isFinite(pageParam) ? Math.max(pageParam, 1) : 1;
    const skip = (page - 1) * limit;

    const query = {
      $or: [
        { recipientEmail: user.email },
        { senderEmail: user.email },
      ],
    };

    const [messages, total] = await Promise.all([
      Message.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('senderEmail senderName senderRole recipientEmail subject message contactId isRead createdAt'),
      Message.countDocuments(query),
    ]);

    return NextResponse.json(
      {
        data: messages,
        meta: {
          total,
          page,
          limit,
          hasMore: skip + messages.length < total,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}
