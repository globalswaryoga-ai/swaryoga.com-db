import { NextRequest, NextResponse } from 'next/server';
import { connectDB, Order, CommunityMember } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const { userId, email, mobile } = await request.json();

    // Validate inputs
    if (!userId || !email || !mobile) {
      return NextResponse.json(
        { error: 'userId, email, and mobile are required' },
        { status: 400 }
      );
    }

    // Validate User ID format (6 digits)
    if (!/^\d{6}$/.test(userId)) {
      return NextResponse.json(
        { error: 'User ID must be exactly 6 digits' },
        { status: 400 }
      );
    }

    // Clean mobile number
    const cleanMobile = mobile.replace(/\D/g, '');
    const cleanEmail = email.trim().toLowerCase();

    // Check if user ID already exists in CommunityMember
    const existingMember = await CommunityMember.findOne({
      userId: userId,
    });

    if (existingMember) {
      return NextResponse.json(
        { 
          success: false,
          error: 'This User ID is already registered in the community'
        },
        { status: 409 }
      );
    }

    // Look for matching order in sales database
    // Search by email OR mobile number that matches the provided User ID context
    const order = await Order.findOne({
      $or: [
        { 'shippingAddress.email': cleanEmail },
        { 'shippingAddress.phone': { $regex: cleanMobile + '$' } },
      ],
      paymentStatus: { $in: ['completed', 'pending_manual'] }, // Only completed or pending manual orders
    }).lean();

    if (!order) {
      return NextResponse.json(
        {
          success: false,
          error: 'No matching sales record found. Please verify your email and mobile number match your order.',
          code: 'NO_ORDER_FOUND',
        },
        { status: 404 }
      );
    }

    // Verify that email and mobile match the order
    const emailMatch = order.shippingAddress?.email?.toLowerCase() === cleanEmail;
    const mobileMatch = order.shippingAddress?.phone?.includes(cleanMobile);

    if (!emailMatch && !mobileMatch) {
      return NextResponse.json(
        {
          success: false,
          error: 'Email and mobile number do not match your sales record',
          code: 'MISMATCH',
        },
        { status: 400 }
      );
    }

    // User ID validation successful - order exists with matching email or mobile
    return NextResponse.json(
      {
        success: true,
        message: 'User ID verified successfully. Please complete your profile to join the community.',
        data: {
          userId: userId,
          orderFound: true,
          verifiedEmail: emailMatch,
          verifiedMobile: mobileMatch,
          orderId: order._id,
          // Don't expose full order details for privacy
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('User ID validation error:', error);
    return NextResponse.json(
      { error: 'Failed to validate User ID' },
      { status: 500 }
    );
  }
}
