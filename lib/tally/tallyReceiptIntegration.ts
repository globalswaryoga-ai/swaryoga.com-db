/**
 * Tally Receipt Integration
 *
 * Creates CRM receipts from Tally invoices and sends them via WhatsApp.
 * Used by /api/receipts/generate-from-tally endpoint.
 */

import { connectDB } from '@/lib/db';
import mongoose from 'mongoose';

interface PaymentDetails {
  status: string;
  transactionId?: string;
  amount?: number;
  method?: string;
  gateway?: string;
}

/**
 * Create a CRM receipt document from a Tally invoice.
 */
export async function createCrmReceiptFromTallyInvoice(
  tallyInvoiceId: string,
  leadId: string,
  paymentDetails: PaymentDetails
) {
  await connectDB();

  const db = mongoose.connection.db;
  if (!db) throw new Error('Database not connected');
  const invoice = await db.collection('tally_invoices').findOne({
    _id: new mongoose.Types.ObjectId(tallyInvoiceId),
  });

  if (!invoice) {
    throw new Error(`Tally invoice not found: ${tallyInvoiceId}`);
  }

  const inv = invoice as any;

  // Generate receipt number
  const receiptNumber = `REC-${Date.now()}`;

  // Create receipt in the receipts collection
  const receipt = await db.collection('receipts').insertOne({
    receiptNumber,
    tallyInvoiceId: new mongoose.Types.ObjectId(tallyInvoiceId),
    leadId: new mongoose.Types.ObjectId(leadId),
    invoiceNumber: inv.invoiceNumber,
    customerName: inv.customerName || inv.partyName,
    amount: paymentDetails.amount || inv.total,
    paymentStatus: paymentDetails.status,
    transactionId: paymentDetails.transactionId,
    paymentMethod: paymentDetails.method,
    paymentGateway: paymentDetails.gateway,
    createdAt: new Date(),
  });

  return {
    _id: receipt.insertedId,
    receiptNumber,
    toObject() {
      return {
        _id: receipt.insertedId,
        receiptNumber,
        tallyInvoiceId,
        leadId,
        amount: paymentDetails.amount || inv.total,
        paymentStatus: paymentDetails.status,
      };
    },
  };
}

/**
 * Send a receipt via WhatsApp to the customer.
 */
export async function sendReceiptViaWhatsApp(
  receiptId: string,
  customerPhone: string
) {
  // Placeholder — actual WhatsApp sending would use the Meta API
  // via @/lib/whatsapp utilities
  console.log(`[Receipt] Would send receipt ${receiptId} to ${customerPhone} via WhatsApp`);

  return {
    sent: false,
    message: 'WhatsApp receipt sending not yet configured',
    receiptId,
    phone: customerPhone,
  };
}

/**
 * Fetch a receipt along with its associated Tally invoice details.
 */
export async function getReceiptWithTallyDetails(receiptId: string) {
  await connectDB();

  const db = mongoose.connection.db;
  if (!db) throw new Error('Database not connected');

  const receipt = await db.collection('receipts').findOne({
    _id: new mongoose.Types.ObjectId(receiptId),
  });

  if (!receipt) {
    throw new Error(`Receipt not found: ${receiptId}`);
  }

  let invoice: any = null;
  if (receipt.tallyInvoiceId) {
    invoice = await db.collection('tally_invoices').findOne({
      _id: new mongoose.Types.ObjectId(receipt.tallyInvoiceId.toString()),
    });
  }

  return {
    receipt,
    invoice,
  };
}
