/**
 * Receipt Generation API Endpoint
 * 
 * POST /api/receipts/generate-from-tally
 * 
 * Creates receipt from Tally invoice and sends via WhatsApp
 * Called from payment success callbacks (Cashfree, PayU)
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  createCrmReceiptFromTallyInvoice,
  sendReceiptViaWhatsApp,
  getReceiptWithTallyDetails,
} from '@/lib/tally/tallyReceiptIntegration';
import { connectDB } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const {
      tallyInvoiceId,
      leadId,
      customerPhone,
      paymentDetails,
      sendWhatsApp = true,
    } = body;

    // Validate required fields
    if (!tallyInvoiceId || !leadId || !customerPhone) {
      return NextResponse.json(
        {
          error: 'Missing required fields: tallyInvoiceId, leadId, customerPhone',
        },
        { status: 400 }
      );
    }

    if (!paymentDetails || !paymentDetails.status) {
      return NextResponse.json(
        {
          error: 'Missing paymentDetails or status',
        },
        { status: 400 }
      );
    }

    // 1. Create receipt from Tally invoice
    const receipt = await createCrmReceiptFromTallyInvoice(
      tallyInvoiceId,
      leadId,
      paymentDetails
    );

    // 2. Optionally send via WhatsApp
    let whatsappResult: any = null;
    if (sendWhatsApp) {
      whatsappResult = await sendReceiptViaWhatsApp(
        receipt._id.toString(),
        customerPhone
      );
    }

    return NextResponse.json({
      success: true,
      receiptId: receipt._id,
      receiptNumber: receipt.receiptNumber,
      message: 'Receipt created successfully',
      whatsappSent: sendWhatsApp && !!whatsappResult,
      details: {
        receipt: receipt.toObject(),
        whatsapp: whatsappResult,
      },
    });
  } catch (error: any) {
    console.error('[API] Error creating receipt:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create receipt' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/receipts/[id]
 * Fetch receipt with Tally invoice details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    const receiptId = params.id;
    const data = await getReceiptWithTallyDetails(receiptId);

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error: any) {
    console.error('[API] Error fetching receipt:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch receipt' },
      { status: 500 }
    );
  }
}
