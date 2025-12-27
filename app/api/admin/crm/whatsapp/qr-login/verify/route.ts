import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { WhatsAppAccount } from '@/lib/schemas/enterpriseSchemas';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, phoneNumber, accountName, provider } = body;

    if (!sessionId || !phoneNumber || !accountName) {
      return NextResponse.json(
        { error: 'Missing required fields: sessionId, phoneNumber, accountName' },
        { status: 400 }
      );
    }

    // Get admin token from body (passed from client after QR scan)
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);

    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    // Validate phone number format
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      return NextResponse.json(
        { error: 'Invalid phone number format' },
        { status: 400 }
      );
    }

    // Check if phone already exists
    const existing = await WhatsAppAccount.findOne({
      $or: [
        { commonPhoneNumber: phoneNumber },
        { metaPhoneNumber: phoneNumber },
      ],
    });

    if (existing) {
      return NextResponse.json(
        { error: `Phone number already registered: ${phoneNumber}` },
        { status: 409 }
      );
    }

    // Create new WhatsApp account from QR scan
    const newAccount = new WhatsAppAccount({
      accountName: accountName || `WhatsApp - ${phoneNumber}`,
      accountType: 'common',
      commonPhoneNumber: phoneNumber,
      commonProvider: provider || 'manual',
      commonProviderId: `qr-${sessionId}`,
      isActive: true,
      isDefault: false,
      status: 'connected',
      healthStatus: 'healthy',
      createdByUserId: decoded.userId,
      managedByUserIds: [decoded.userId],
      tags: ['qr-authenticated', 'common-gateway'],
      dailyMessageLimit: 1000,
      dailyMessagesReset: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    await newAccount.save();

    return NextResponse.json({
      success: true,
      data: {
        accountId: newAccount._id,
        accountName: newAccount.accountName,
        phoneNumber: newAccount.commonPhoneNumber,
        status: 'connected',
        message: `✅ WhatsApp number ${phoneNumber} authenticated successfully!`,
      },
    }, { status: 201 });
  } catch (err) {
    console.error('[QR-Login] Verify error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Verification failed' },
      { status: 500 }
    );
  }
}
