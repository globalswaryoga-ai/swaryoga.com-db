import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { CrmReceipt } from '@/lib/schemas/enterpriseSchemas';

export const runtime = 'nodejs';

function formatDate(d?: string | number | Date | null): string {
  if (!d) return '—';
  const dt = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(dt.getTime())) return '—';
  return dt.toLocaleDateString('en-IN');
}

function money(amount: any, currency?: string): string {
  const n = Number(amount);
  if (!Number.isFinite(n)) return '—';
  const curr = (currency || 'INR').toUpperCase();
  // Keep it simple and consistent across nodes
  const formatted = n.toLocaleString('en-IN', { maximumFractionDigits: 2 });
  // Standard PDF fonts (WinAnsi) can't render ₹ reliably; use ISO code.
  if (curr === 'INR') return `INR ${formatted}`;
  return `${curr} ${formatted}`;
}

function safeText(v: any): string {
  const s = String(v ?? '').trim();
  return s || '—';
}

function asOneLine(v: any): string {
  const s = String(v ?? '').replace(/\s+/g, ' ').trim();
  return s || '—';
}

async function buildReceiptPdf(receipt: any): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // A4 in points

  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const { width, height } = page.getSize();

  const marginX = 48;
  let y = height - 52;

  const brandColor = rgb(0.78, 0.12, 0.16);
  const textColor = rgb(0.12, 0.16, 0.22);
  const mutedColor = rgb(0.42, 0.45, 0.5);
  const lineColor = rgb(0.85, 0.87, 0.9);

  const drawText = (text: string, opts: { x: number; y: number; size?: number; font?: any; color?: any } ) => {
    page.drawText(text, {
      x: opts.x,
      y: opts.y,
      size: opts.size ?? 11,
      font: opts.font ?? helvetica,
      color: opts.color ?? textColor,
    });
  };

  // Header
  drawText('SWAR YOGA', { x: marginX, y, size: 24, font: helveticaBold, color: brandColor });
  y -= 18;
  drawText('Receipt / Tax Invoice', { x: marginX, y, size: 12, font: helveticaBold, color: textColor });

  const rightX = width - marginX;
  const receiptNumber = safeText(receipt?.receiptNumber || receipt?._id);
  const issuedAt = formatDate(receipt?.issuedAt || receipt?.createdAt);

  drawText(`Receipt No: ${receiptNumber}`, {
    x: rightX - helvetica.widthOfTextAtSize(`Receipt No: ${receiptNumber}`, 10),
    y: height - 52,
    size: 10,
    font: helvetica,
    color: mutedColor,
  });
  drawText(`Date: ${issuedAt}`, {
    x: rightX - helvetica.widthOfTextAtSize(`Date: ${issuedAt}`, 10),
    y: height - 66,
    size: 10,
    font: helvetica,
    color: mutedColor,
  });

  y -= 14;
  page.drawLine({ start: { x: marginX, y }, end: { x: width - marginX, y }, thickness: 1, color: lineColor });
  y -= 22;

  // Address block
  const addr = 'Off No 04, Vedant Complex, Maldad Road, Sangamner - 422605, MH, India.';
  drawText('Organizer:', { x: marginX, y, size: 10, font: helveticaBold, color: mutedColor });
  drawText('Swar Yoga', { x: marginX + 72, y, size: 10, font: helvetica, color: textColor });
  y -= 14;
  drawText('Address:', { x: marginX, y, size: 10, font: helveticaBold, color: mutedColor });
  drawText(addr, { x: marginX + 72, y, size: 10, font: helvetica, color: textColor });

  y -= 22;
  page.drawLine({ start: { x: marginX, y }, end: { x: width - marginX, y }, thickness: 1, color: lineColor });
  y -= 18;

  // Customer
  const customerName = asOneLine(receipt?.customerName);
  const customerPhone = asOneLine(receipt?.customerPhone);
  const customerEmail = asOneLine(receipt?.customerEmail);

  drawText('Billed To', { x: marginX, y, size: 12, font: helveticaBold, color: textColor });
  y -= 14;
  drawText(`Name: ${customerName}`, { x: marginX, y, size: 10, font: helvetica, color: textColor });
  y -= 12;
  drawText(`Phone: ${customerPhone}`, { x: marginX, y, size: 10, font: helvetica, color: textColor });
  y -= 12;
  drawText(`Email: ${customerEmail}`, { x: marginX, y, size: 10, font: helvetica, color: textColor });

  y -= 22;

  // Items table header
  const col1 = marginX;
  const col2 = marginX + 290;
  const col3 = width - marginX;

  page.drawRectangle({ x: marginX, y: y - 14, width: width - marginX * 2, height: 18, color: rgb(0.95, 0.96, 0.97) });
  drawText('Description', { x: col1 + 6, y: y - 10, size: 10, font: helveticaBold, color: textColor });
  drawText('Amount', {
    x: col3 - helveticaBold.widthOfTextAtSize('Amount', 10) - 6,
    y: y - 10,
    size: 10,
    font: helveticaBold,
    color: textColor,
  });
  y -= 22;

  const workshopName = asOneLine(receipt?.workshopName || 'Workshop');
  const currency = receipt?.payment?.currency || 'INR';
  const paidAmount = receipt?.payment?.paidAmount ?? receipt?.payment?.amount;

  // Row
  drawText(workshopName, { x: col1 + 6, y, size: 10, font: helvetica, color: textColor });
  drawText(money(paidAmount, currency), {
    x: col3 - helvetica.widthOfTextAtSize(money(paidAmount, currency), 10) - 6,
    y,
    size: 10,
    font: helvetica,
    color: textColor,
  });
  y -= 14;
  page.drawLine({ start: { x: marginX, y }, end: { x: width - marginX, y }, thickness: 1, color: lineColor });
  y -= 12;

  // Payment details
  const pay = receipt?.payment || {};
  const details = [
    pay?.method ? `Method: ${asOneLine(pay.method)}` : null,
    pay?.provider ? `Provider: ${asOneLine(pay.provider)}` : null,
    pay?.transactionId ? `Txn: ${asOneLine(pay.transactionId)}` : null,
    pay?.orderId ? `Order: ${asOneLine(pay.orderId)}` : null,
    pay?.status ? `Status: ${asOneLine(pay.status)}` : null,
    pay?.paidAt ? `Paid At: ${formatDate(pay.paidAt)}` : null,
  ].filter(Boolean);

  if (details.length) {
    drawText('Payment:', { x: marginX, y, size: 10, font: helveticaBold, color: mutedColor });
    y -= 12;
    for (const line of details) {
      drawText(String(line), { x: marginX, y, size: 9, font: helvetica, color: textColor });
      y -= 11;
      if (y < 120) break;
    }
  }

  // Footer
  y = Math.max(y, 120);
  page.drawLine({ start: { x: marginX, y }, end: { x: width - marginX, y }, thickness: 1, color: lineColor });
  y -= 18;

  drawText('Thank you for your participation in Swar Yoga.', { x: marginX, y, size: 10, font: helvetica, color: textColor });
  y -= 12;
  drawText('Note: Fees once paid are non-refundable.', { x: marginX, y, size: 9, font: helvetica, color: mutedColor });

  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
}

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 401 });
    }

    const url = new URL(request.url);
    const receiptId = url.searchParams.get('id');
    const leadId = url.searchParams.get('leadId');

    if (!receiptId && !leadId) {
      return NextResponse.json({ error: 'Missing id or leadId' }, { status: 400 });
    }

    await connectDB();

    let rec: any | null = null;

    if (receiptId) {
      if (!mongoose.Types.ObjectId.isValid(receiptId)) {
        return NextResponse.json({ error: 'Invalid receipt id' }, { status: 400 });
      }
      rec = await (CrmReceipt as any).findById(receiptId).lean();
    } else {
      if (!mongoose.Types.ObjectId.isValid(leadId!)) {
        return NextResponse.json({ error: 'Invalid lead id' }, { status: 400 });
      }
      rec = await (CrmReceipt as any)
        .findOne({ leadId: new mongoose.Types.ObjectId(leadId!) })
        .sort({ issuedAt: -1 })
        .lean();
    }

    if (!rec) {
      return NextResponse.json({ error: 'Receipt not found' }, { status: 404 });
    }

    const pdf = await buildReceiptPdf(rec);
    const filenameBase = (rec?.receiptNumber || String(rec?._id || 'receipt')).replace(/[^a-zA-Z0-9_-]+/g, '_');

  const body = pdf.buffer.slice(pdf.byteOffset, pdf.byteOffset + pdf.byteLength) as ArrayBuffer;

    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filenameBase}.pdf"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to generate PDF';
    const details =
      process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'development'
        ? { stack: error instanceof Error ? error.stack : undefined }
        : undefined;
    return NextResponse.json({ error: message, ...(details || {}) }, { status: 500 });
  }
}
