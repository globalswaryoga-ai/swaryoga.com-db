import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { WhatsAppAccount } from '@/lib/schemas/enterpriseSchemas';
import { verifyToken } from '@/lib/auth';
import { Types } from 'mongoose';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);

    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    if (!Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: 'Invalid account ID' }, { status: 400 });
    }

    const account = await WhatsAppAccount.findById(params.id);

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    let healthStatus = 'down';
    let connectionError = '';

    // Perform basic health check based on account type
    if (account.accountType === 'meta' && account.metaAccessToken) {
      try {
        // For demonstration, just verify token exists
        healthStatus = 'healthy';
        connectionError = '';
      } catch (err) {
        healthStatus = 'down';
        connectionError = 'Meta API connection failed';
      }
    } else if (account.accountType === 'common' && account.commonApiKey) {
      try {
        // For demonstration, just verify key exists
        healthStatus = 'healthy';
        connectionError = '';
      } catch (err) {
        healthStatus = 'down';
        connectionError = 'Gateway connection failed';
      }
    } else {
      healthStatus = 'down';
      connectionError = 'Missing credentials';
    }

    const updated = await WhatsAppAccount.findByIdAndUpdate(
      params.id,
      {
        healthStatus,
        connectionError: connectionError || undefined,
        lastHealthCheck: new Date(),
      },
      { new: true }
    );

    return NextResponse.json(
      { success: true, data: updated },
      { status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Health check failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
