import { NextRequest, NextResponse } from 'next/server';

interface RefundRequest {
  name: string;
  email: string;
  transactionId: string;
  workshopName: string;
  reason: string;
  message: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: RefundRequest = await request.json();

    // Validate required fields
    const { name, email, transactionId, workshopName, reason } = body;

    if (!name || !email || !transactionId || !workshopName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      );
    }

    // Store refund request (in production, save to MongoDB)
    const refundData = {
      id: `REF-${Date.now()}`,
      name,
      email,
      transactionId,
      workshopName,
      reason,
      message: body.message || '',
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    console.log('Refund Request:', refundData);

    // In production: Save to MongoDB
    // const db = await connectToDatabase();
    // await db.collection('refunds').insertOne(refundData);

    // Send confirmation email (in production)
    // await sendRefundConfirmationEmail(email, refundData);

    return NextResponse.json(
      {
        success: true,
        message: 'Refund request submitted successfully',
        refundId: refundData.id,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Refund request error:', error);
    return NextResponse.json(
      { error: 'Failed to process refund request' },
      { status: 500 }
    );
  }
}
