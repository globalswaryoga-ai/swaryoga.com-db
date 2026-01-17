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
      // Ensure leadNumber exists
      if (!lead.leadNumber) {
        const { leadNumber } = await allocateNextLeadNumber();
        lead.leadNumber = leadNumber;
      }

      // Keep basic identity info up to date
      if (!lead.name) lead.name = fullName;
      if (!lead.email) lead.email = email;
      lead.phoneNumber = phoneNumber;

      // Use schema-supported fields for workshop/payment context
      lead.workshopName = workshopName || lead.workshopName;

      lead.sales = lead.sales || {};
      lead.sales.stage = 'enrolled';
      if (!lead.sales.enrolledAt) lead.sales.enrolledAt = new Date();
      lead.sales.workshop = lead.sales.workshop || {};
      lead.sales.workshop.slug = workshopSlug || lead.sales.workshop.slug;
      lead.sales.workshop.mode = mode || lead.sales.workshop.mode;
      lead.sales.workshop.language = language || lead.sales.workshop.language;

      lead.sales.payment = lead.sales.payment || {};
      lead.sales.payment.status = 'paid';
      lead.sales.payment.currency = currency || lead.sales.payment.currency;
      if (amount) lead.sales.payment.amount = amount;
      if (orderId) lead.sales.payment.orderId = orderId;
      if (paymentId) lead.sales.payment.transactionId = paymentId;
      lead.sales.payment.provider = lead.sales.payment.provider || 'payment_gateway';
      if (!lead.sales.payment.paidAt) lead.sales.payment.paidAt = new Date();

      lead.inSales = true;
      lead.status = 'customer';

      console.log(`[Enroll] Updating existing lead: ${lead._id} (${phoneNumber})`);
    } else {
      // Create new lead with auto-allocated leadNumber
      const { leadNumber } = await allocateNextLeadNumber();

      lead = new Lead({
        name: fullName,
        email,
        phoneNumber,
        leadNumber,
        workshopName,
        status: 'customer',
        source: 'workshop_payment',
        labels: ['workshop_participant', workshopSlug],
        inSales: true,
        sales: {
          stage: 'enrolled',
          enrolledAt: new Date(),
          workshop: {
            slug: workshopSlug,
            mode,
            language,
          },
          payment: {
            status: 'paid',
            currency,
            amount,
            provider: 'payment_gateway',
            orderId: orderId || undefined,
            transactionId: paymentId || undefined,
            paidAt: new Date(),
          },
        },
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
          workshopSlug: (lead as any)?.sales?.workshop?.slug,
          workshopName: lead.workshopName,
          enrollmentAmount: (lead as any)?.sales?.payment?.amount,
          enrollmentCurrency: (lead as any)?.sales?.payment?.currency,
          enrollmentDate: (lead as any)?.sales?.enrolledAt,
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
