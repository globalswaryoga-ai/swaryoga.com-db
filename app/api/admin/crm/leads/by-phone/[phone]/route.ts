import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { getLead } from '@/lib/schemas/enterpriseSchemas';

/**
 * GET /api/admin/crm/leads/by-phone/[phone]
 * Fetch a lead by phone number
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { phone: string } }
) {
  try {
    // Verify authentication
    const token = request.headers.get('Authorization')?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded || !decoded.userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Connect to database
    await connectDB();

    // Normalize phone number - remove all non-digits
    const normalizedPhone = String(params.phone).replace(/\D/g, '');

    if (!normalizedPhone) {
      return NextResponse.json(
        { error: 'Invalid phone number' },
        { status: 400 }
      );
    }

    // Get Lead model
    const Lead = getLead();

    // Search for lead by phone number
    // Try to match with different phone formats
    const lead = await Lead.findOne({
      $or: [
        { phoneNumber: normalizedPhone },
        { phoneNumber: { $regex: normalizedPhone + '$' } },
        { phoneNumber: { $regex: '^' + normalizedPhone } },
        { phoneNumber: { $regex: normalizedPhone } },
      ],
    }).lean();

    if (!lead) {
      return NextResponse.json(
        { error: 'Lead not found', phone: normalizedPhone },
        { status: 404 }
      );
    }

    // Return lead data
    return NextResponse.json({
      _id: lead._id,
      name: lead.name,
      phoneNumber: lead.phoneNumber,
      status: lead.status,
      label: lead.label,
      email: lead.email,
    });
  } catch (error) {
    console.error('[GET /api/admin/crm/leads/by-phone] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch lead' },
      { status: 500 }
    );
  }
}
