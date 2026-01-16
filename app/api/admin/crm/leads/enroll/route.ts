import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { getLead } from '@/lib/schemas/enterpriseSchemas';
import { allocateNextLeadNumber } from '@/lib/crm/leadNumber';
import { normalizePhone } from '@/lib/crm-handlers';

// Mark as dynamic since this route uses request.headers or request.url
export const dynamic = 'force-dynamic';


/**
 * POST /api/admin/crm/leads/enroll
 * 
 * Creates or updates a lead after workshop payment confirmation.
 * This endpoint is called from the payment success page (public, no auth required).
 * 
 * Body:
 * {
 *   firstName: string,
 *   lastName?: string,
 *   email: string,
 *   phone: string,
 *   workshopSlug: string,
 *   workshopName: string,
 *   amount: number,
 *   currency: string,
 *   orderId?: string,
 *   paymentId?: string,
 *   mode?: string,
 *   language?: string
 * }
 * 
 * Response:
 * {
 *   success: boolean,
 *   lead: {
 *     _id: string,
 *     leadNumber: string,
 *     name: string,
 *     email: string,
 *     phoneNumber: string,
 *     workshopName: string,
 *     status: string,
 *     ...
 *   },
 *   isNew: boolean,
 *   message: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    // Extract and validate required fields
    const firstName = body.firstName ? String(body.firstName).trim() : '';
    const lastName = body.lastName ? String(body.lastName).trim() : '';
    const email = body.email ? String(body.email).trim().toLowerCase() : '';
    const rawPhone = body.phone ? String(body.phone).trim() : '';
    const workshopSlug = body.workshopSlug ? String(body.workshopSlug).trim() : '';
    const workshopName = body.workshopName ? String(body.workshopName).trim() : '';
    const amount = body.amount ? Number(body.amount) : 0;
    const currency = body.currency ? String(body.currency).trim().toUpperCase() : 'INR';
    const orderId = body.orderId ? String(body.orderId).trim() : '';
    const paymentId = body.paymentId ? String(body.paymentId).trim() : '';
    const mode = body.mode ? String(body.mode).trim() : 'online';
    const language = body.language ? String(body.language).trim() : 'English';

    if (!firstName || !email || !rawPhone || !workshopSlug) {
      return NextResponse.json(
        { 
          error: 'Missing required fields: firstName, email, phone, workshopSlug' 
        },
        { status: 400 }
      );
    }

    const phoneNumber = normalizePhone(rawPhone);
    if (!phoneNumber) {
      return NextResponse.json(
        { error: 'Invalid phone number' },
        { status: 400 }
      );
    }

    const fullName = lastName ? `${firstName} ${lastName}` : firstName;

    await connectDB();
    const Lead = getLead();

    // Check if lead exists by email or phone
    let lead = await Lead.findOne({
      $or: [{ email }, { phoneNumber }],
    });

    let isNew = false;

    if (lead) {
      // Update existing lead with workshop enrollment
      if (!lead.workshopName || lead.workshopName !== workshopName) {
        lead.workshopName = workshopName;
      }
      if (!lead.workshopSlug || lead.workshopSlug !== workshopSlug) {
        lead.workshopSlug = workshopSlug;
      }
      if (amount && !lead.enrollmentAmount) {
        lead.enrollmentAmount = amount;
        lead.enrollmentCurrency = currency;
      }
      if (!lead.enrollmentDate) {
        lead.enrollmentDate = new Date();
      }
      if (orderId && !lead.orderId) {
        lead.orderId = orderId;
      }
      if (paymentId && !lead.paymentId) {
        lead.paymentId = paymentId;
      }
      if (mode && !lead.enrollmentMode) {
        lead.enrollmentMode = mode;
      }
      if (language && !lead.enrollmentLanguage) {
        lead.enrollmentLanguage = language;
      }
      if (!lead.status) {
        lead.status = 'enrolled';
      }

      console.log(`[Enroll] Updating existing lead: ${lead._id} (${phoneNumber})`);
    } else {
      // Create new lead with auto-allocated leadNumber
      const leadNumber = await allocateNextLeadNumber();

      lead = new Lead({
        name: fullName,
        email,
        phoneNumber,
        leadNumber,
        workshopSlug,
        workshopName,
        enrollmentAmount: amount,
        enrollmentCurrency: currency,
        enrollmentDate: new Date(),
        enrollmentMode: mode,
        enrollmentLanguage: language,
        orderId,
        paymentId,
        status: 'enrolled',
        source: 'workshop_payment',
        labels: ['workshop_participant', workshopSlug],
        // Set default assignment to sales team (can be updated later)
        assignedToUserId: 'sales-team',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      isNew = true;
      console.log(`[Enroll] Created new lead: ${lead.leadNumber} (${phoneNumber})`);
    }

    await lead.save();

    return NextResponse.json(
      {
        success: true,
        lead: {
          _id: lead._id?.toString(),
          leadNumber: lead.leadNumber,
          name: lead.name,
          email: lead.email,
          phoneNumber: lead.phoneNumber,
          workshopSlug: lead.workshopSlug,
          workshopName: lead.workshopName,
          enrollmentAmount: lead.enrollmentAmount,
          enrollmentCurrency: lead.enrollmentCurrency,
          enrollmentDate: lead.enrollmentDate,
          status: lead.status,
        },
        isNew,
        message: isNew
          ? `Lead created with ID ${lead.leadNumber}`
          : `Lead ${lead.leadNumber} updated with workshop enrollment`,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('❌ POST /api/admin/crm/leads/enroll error:', error);
    const message = error instanceof Error ? error.message : 'Failed to create/update lead';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'Lead enrollment endpoint - POST only',
  });
}
