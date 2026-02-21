/**
 * Receipt Routes to Fetch Receipt Data
 * GET /api/receipts/[id] - Fetch receipt by ID
 * GET /api/receipts/lead/[leadId] - Fetch all receipts for a lead
 * GET /api/receipts/phone/[phone] - Fetch receipts by phone (customer lookup)
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { getCrmReceipt, getTallyInvoice } from '@/lib/schemas/enterpriseSchemas';

export async function GET(
  request: NextRequest,
  { params }: { params: { id?: string; leadId?: string; phone?: string } }
) {
  try {
    await connectDB();
    const CrmReceipt = getCrmReceipt();
    const TallyInvoice = getTallyInvoice();

    // Fetch by receipt ID
    if (params.id) {
      const receipt = await CrmReceipt.findById(params.id);
      if (!receipt) {
        return NextResponse.json(
          { error: 'Receipt not found' },
          { status: 404 }
        );
      }

      // Get Tally invoice if linked
      let tallyInvoice = null;
      if (receipt.metadata?.tallyInvoiceId) {
        tallyInvoice = await TallyInvoice.findById(receipt.metadata.tallyInvoiceId);
      }

      return NextResponse.json({
        success: true,
        data: {
          receipt: receipt.toObject(),
          tallyInvoice: tallyInvoice?.toObject(),
        },
      });
    }

    // Fetch by lead ID
    if (params.leadId) {
      const receipts = await CrmReceipt.find({ leadId: params.leadId })
        .sort({ issuedAt: -1 })
        .limit(10);

      return NextResponse.json({
        success: true,
        data: receipts,
        count: receipts.length,
      });
    }

    // Fetch by phone number
    if (params.phone) {
      const receipts = await CrmReceipt.find({ customerPhone: params.phone })
        .sort({ issuedAt: -1 })
        .limit(10);

      return NextResponse.json({
        success: true,
        data: receipts,
        count: receipts.length,
      });
    }

    return NextResponse.json(
      { error: 'No valid parameters provided' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('[API] Error fetching receipt:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch receipt' },
      { status: 500 }
    );
  }
}
