/**
 * Tally Invoice Receipt Integration
 * 
 * Generates receipts from Tally invoices and sends via WhatsApp
 * Integrated with payment success flow
 */

import { connectDB } from '@/lib/db';
import { 
  getTallyInvoice, 
  getTallyCustomer,
  getCrmReceipt,
  getLead 
} from '@/lib/schemas/enterpriseSchemas';
import { sendWhatsAppMessage } from '@/lib/whatsapp'; // Your existing WhatsApp utility

/**
 * Generate formatted receipt text from Tally invoice
 */
export function formatTallyReceiptText(invoice: any, lead: any): string {
  const receiptDate = new Date(invoice.date).toLocaleDateString('en-IN');
  const dueDate = invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString('en-IN') : 'N/A';
  
  const lineItems = (invoice.lineItems || [])
    .map((item: any) => `• ${item.description}: ₹${item.rate} x ${item.quantity} = ₹${(item.rate * item.quantity).toFixed(2)}`)
    .join('\n');

  return `
🧘 *SWAR YOGA RECEIPT* 🧘

*Invoice #${invoice.tallyInvoiceNumber}*
📅 Date: ${receiptDate}
👤 Customer: ${lead.name || 'Valued Customer'}

*━━ Items ━━*
${lineItems || 'N/A'}

*━━ Amount Breakdown ━━*
Subtotal: ₹${invoice.subtotal.toFixed(2)}
GST (18%): ₹${invoice.gst.toFixed(2)}
───────────────
*Total: ₹${invoice.total.toFixed(2)}*

*Payment Status:* ${invoice.paymentStatus.toUpperCase()}
Paid Amount: ₹${invoice.paidAmount.toFixed(2)}
${invoice.pendingAmount > 0 ? `Pending: ₹${invoice.pendingAmount.toFixed(2)}\n` : ''}

*Thank you for your order!*
For support, contact: support@swaryoga.com

📎 [Receipt PDF](link-to-pdf)
  `.trim();
}

/**
 * Create CRM receipt from Tally invoice
 */
export async function createCrmReceiptFromTallyInvoice(
  tallyInvoiceId: string,
  leadId: string,
  paymentDetails: {
    status: string;
    currency: string;
    amount: number;
    paidAmount: number;
    method: string;
    provider: string;
    orderId?: string;
    transactionId?: string;
    paidAt?: Date;
  }
) {
  await connectDB();
  
  const TallyInvoice = getTallyInvoice();
  const CrmReceipt = getCrmReceipt();
  const Lead = getLead();

  try {
    // Fetch Tally invoice
    const invoice = await TallyInvoice.findById(tallyInvoiceId);
    if (!invoice) {
      throw new Error(`Tally invoice not found: ${tallyInvoiceId}`);
    }

    // Fetch lead
    const lead = await Lead.findById(leadId);
    if (!lead) {
      throw new Error(`Lead not found: ${leadId}`);
    }

    // Create CRM receipt
    const receipt = await CrmReceipt.create({
      leadId,
      leadNumber: lead.leadNumber,
      receiptNumber: `RCP-${Date.now()}`, // Auto-generate receipt number
      issuedAt: new Date(),
      
      customerName: lead.name,
      customerPhone: lead.phoneNumber,
      customerEmail: lead.email,
      
      workshopName: lead.sales?.workshop?.slug || 'Workshop',
      workshopSlug: lead.sales?.workshop?.slug,
      scheduleId: lead.sales?.workshop?.scheduleId,
      
      payment: paymentDetails,
      
      // Link to Tally invoice
      metadata: {
        tallyInvoiceId: invoice._id,
        tallyInvoiceNumber: invoice.tallyInvoiceNumber,
        tallyCustomerId: invoice.tallyCustomerId,
        lineItems: invoice.lineItems,
        notes: invoice.notes,
      },
    });

    // Update lead with receipt reference
    await Lead.updateOne(
      { _id: leadId },
      { lastReceiptId: receipt._id }
    );

    // Link receipt to Tally invoice (store receipt ID in Tally data)
    await TallyInvoice.updateOne(
      { _id: tallyInvoiceId },
      { 
        $set: { 
          'metadata.crmReceiptId': receipt._id,
          'metadata.linked': true 
        } 
      }
    );

    console.log(`[Receipt] Created receipt ${receipt._id} from Tally invoice ${invoice._id}`);
    return receipt;
  } catch (error) {
    console.error('[Receipt] Error creating receipt:', error);
    throw error;
  }
}

/**
 * Send receipt via WhatsApp
 */
export async function sendReceiptViaWhatsApp(
  receiptId: string,
  customerPhone: string
) {
  await connectDB();
  
  const CrmReceipt = getCrmReceipt();
  const Lead = getLead();

  try {
    // Fetch receipt
    const receipt = await CrmReceipt.findById(receiptId);
    if (!receipt) {
      throw new Error(`Receipt not found: ${receiptId}`);
    }

    // Fetch lead for formatting
    const lead = await Lead.findById(receipt.leadId);
    if (!lead) {
      throw new Error(`Lead not found for receipt`);
    }

    // Format receipt text
    const receiptText = formatTallyReceiptText(receipt.metadata, lead);

    // Send via WhatsApp
    const result = await sendWhatsAppMessage({
      to: customerPhone,
      type: 'text',
      text: {
        preview_url: true,
        body: receiptText,
      },
    });

    console.log(`[Receipt] Sent via WhatsApp to ${customerPhone}:`, result);
    return result;
  } catch (error) {
    console.error('[Receipt] Error sending WhatsApp:', error);
    throw error;
  }
}

/**
 * Complete payment flow: Create receipt + Send WhatsApp
 */
export async function completePaymentWithReceipt(
  tallyInvoiceId: string,
  leadId: string,
  customerPhone: string,
  paymentDetails: {
    status: string;
    currency: string;
    amount: number;
    paidAmount: number;
    method: string;
    provider: string;
    orderId?: string;
    transactionId?: string;
    paidAt?: Date;
  }
) {
  try {
    // 1. Create CRM receipt from Tally invoice
    const receipt = await createCrmReceiptFromTallyInvoice(
      tallyInvoiceId,
      leadId,
      paymentDetails
    );

    // 2. Send receipt via WhatsApp
    await sendReceiptViaWhatsApp(receipt._id.toString(), customerPhone);

    return {
      success: true,
      receiptId: receipt._id,
      message: 'Receipt created and sent via WhatsApp',
    };
  } catch (error) {
    console.error('[Payment] Error completing payment:', error);
    throw error;
  }
}

/**
 * Get receipt with Tally invoice details
 */
export async function getReceiptWithTallyDetails(receiptId: string) {
  await connectDB();
  
  const CrmReceipt = getCrmReceipt();
  const TallyInvoice = getTallyInvoice();

  try {
    const receipt = await CrmReceipt.findById(receiptId);
    if (!receipt) {
      throw new Error(`Receipt not found: ${receiptId}`);
    }

    // Fetch linked Tally invoice if available
    const tallyInvoiceId = receipt.metadata?.tallyInvoiceId;
    let tallyInvoice = null;

    if (tallyInvoiceId) {
      tallyInvoice = await TallyInvoice.findById(tallyInvoiceId);
    }

    return {
      receipt: receipt.toObject(),
      tallyInvoice: tallyInvoice?.toObject() || null,
    };
  } catch (error) {
    console.error('[Receipt] Error fetching receipt:', error);
    throw error;
  }
}

/**
 * Generate PDF receipt (optional - requires pdfkit or similar)
 */
export async function generatePdfReceipt(receiptId: string): Promise<Buffer> {
  await connectDB();
  
  const CrmReceipt = getCrmReceipt();
  const Lead = getLead();

  try {
    const receipt = await CrmReceipt.findById(receiptId);
    if (!receipt) {
      throw new Error(`Receipt not found: ${receiptId}`);
    }

    const lead = await Lead.findById(receipt.leadId);

    // Using a simple text format for now
    // For production, use 'pdfkit' or 'html2pdf' libraries
    const pdfContent = formatTallyReceiptText(receipt.metadata, lead);

    return Buffer.from(pdfContent, 'utf-8');
  } catch (error) {
    console.error('[PDF] Error generating PDF:', error);
    throw error;
  }
}
