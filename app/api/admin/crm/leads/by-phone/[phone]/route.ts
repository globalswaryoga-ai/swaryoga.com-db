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

    // Normalize phone number using the app-wide standard
    let normalizedPhone = String(params.phone).replace(/\D/g, '');
    if (normalizedPhone.length === 10) {
      normalizedPhone = `91${normalizedPhone}`;
    }

    if (!normalizedPhone) {
      return NextResponse.json(
        { error: 'Invalid phone number' },
        { status: 400 }
      );
    }

    // Get Lead model
    const Lead = getLead();

    // Search for lead by phone number
    // We prioritize EXACT match on normalized phone first
    let lead = await Lead.findOne({ phoneNumber: normalizedPhone }).lean();
    
    if (!lead) {
      // Fallback: search for variants if exact match fails
      lead = await Lead.findOne({
        $or: [
          { phoneNumber: { $regex: normalizedPhone + '$' } },
          { phoneNumber: { $regex: '^' + normalizedPhone } },
        ],
      }).lean();
    }

    if (!lead) {
      // RETURN 200 with success: false instead of 404 to avoid console spam and bridge errors
      return NextResponse.json(
        { success: false, error: 'Lead not found', phone: normalizedPhone },
        { status: 200 }
      );
    }

    // Return lead data with success: true
    return NextResponse.json({
      success: true,
      _id: lead._id,
      name: lead.name,
      phoneNumber: lead.phoneNumber,
      status: lead.status,
      label: lead.label,
      email: lead.email,
      leadNumber: lead.leadNumber, // Include the 6-digit human-friendly ID
    });
  } catch (error) {
    console.error('[GET /api/admin/crm/leads/by-phone] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch lead' },
      { status: 500 }
    );
  }
}
