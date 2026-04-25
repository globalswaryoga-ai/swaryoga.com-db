import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { TenantTrial } from '@/lib/schemas/enterpriseSchemas';

export const dynamic = 'force-dynamic';


/**
 * POST /api/admin/crm/tenant/qr-lock
 * Lock a QR WhatsApp number to prevent reuse in free trials
 * Also update trial with QR number and set QR scanned date
 */
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { qrNumber } = body;

    if (!qrNumber) {
      return NextResponse.json({ error: 'QR number required' }, { status: 400 });
    }

    await connectDB();

    // Check if this QR number is already used in any free trial
    const existingTrial = await TenantTrial.findOne({
      qrWhatsAppNumber: qrNumber,
      status: { $ne: 'expired' } // Not expired trials
    });

    if (existingTrial && existingTrial.email !== decoded.email) {
      return NextResponse.json({
        available: false,
        message: 'This WhatsApp number was already used in a free trial. Please use a different number.',
        error: 'QR_NUMBER_LOCKED'
      }, { status: 409 });
    }

    // Update or create trial with QR number
    const updatedTrial = await TenantTrial.findOneAndUpdate(
      { email: decoded.email },
      {
        $set: {
          qrWhatsAppNumber: qrNumber,
          qrScannedAt: new Date(),
          lastActivityAt: new Date(),
        }
      },
      { upsert: true, new: true }
    );

    return NextResponse.json({
      available: true,
      message: 'QR number locked successfully',
      trial: {
        qrWhatsAppNumber: updatedTrial.qrWhatsAppNumber,
        qrScannedAt: updatedTrial.qrScannedAt,
        trialStartDate: updatedTrial.trialStartDate,
        trialEndDate: new Date(new Date(updatedTrial.trialStartDate).getTime() + 15 * 24 * 60 * 60 * 1000),
      }
    });
  } catch (error: any) {
    console.error('[qr-lock]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * GET /api/admin/crm/tenant/qr-lock?number=XXXXX
 * Check if a QR number is available (not already used in free trial)
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const qrNumber = request.nextUrl.searchParams.get('number');
    if (!qrNumber) {
      return NextResponse.json({ error: 'QR number required' }, { status: 400 });
    }

    await connectDB();

    // Check if QR number is already in use in a free trial (by different email)
    const existingTrial = await TenantTrial.findOne({
      qrWhatsAppNumber: qrNumber,
      email: { $ne: decoded.email },
      status: { $ne: 'expired' }
    }).lean();

    if (existingTrial) {
      return NextResponse.json({
        available: false,
        locked: true,
        message: 'This WhatsApp number was already used in another free trial'
      });
    }

    return NextResponse.json({
      available: true,
      locked: false,
      message: 'QR number is available'
    });
  } catch (error: any) {
    console.error('[qr-lock GET]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
