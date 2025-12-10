import { NextRequest, NextResponse } from 'next/server';
import { connectDB, Contact } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const { name, email, subject, message } = await request.json();

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
      subject,
      message,
      status: 'new',
    });

    await contact.save();

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
