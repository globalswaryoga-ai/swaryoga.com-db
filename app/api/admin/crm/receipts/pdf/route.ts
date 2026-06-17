import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { PDFDocument, StandardFonts, rgb, degrees } from 'pdf-lib';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { tenantFilter, getViewerUserId } from '@/lib/crm-handlers';
import { CrmReceipt } from '@/lib/schemas/enterpriseSchemas';

export const dynamic = 'force-dynamic';

// Mark as dynamic since this route uses request.headers or request.url


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

function trunc(text: string, max = 80) {
  const s = String(text || '');
  if (s.length <= max) return s;
  return s.slice(0, max - 1) + '…';
}

function parsePercent(v: any): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, n));
}

async function buildReceiptPdf(receipt: any): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // A4 in points

  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const { width, height } = page.getSize();

  const marginX = 44;
  let y = height - 48;

  // Palette inspired by the sample invoice screenshot.
  const green = rgb(0.44, 0.67, 0.18);
  const dark = rgb(0.16, 0.2, 0.25);
  const textColor = rgb(0.15, 0.18, 0.22);
  const mutedColor = rgb(0.42, 0.45, 0.5);
  const lineColor = rgb(0.88, 0.9, 0.92);
  const softFill = rgb(0.96, 0.97, 0.97);

  const drawText = (text: string, opts: { x: number; y: number; size?: number; font?: any; color?: any } ) => {
    page.drawText(text, {
      x: opts.x,
      y: opts.y,
      size: opts.size ?? 11,
      font: opts.font ?? helvetica,
      color: opts.color ?? textColor,
    });
  };

  // Header band (dark) with a green accent.
  const headerH = 92;
  page.drawRectangle({ x: 0, y: height - headerH, width, height: headerH, color: dark });
  // pdf-lib doesn't expose a polygon helper on the page type;
  // approximate the diagonal accent using a slightly rotated rectangle.
  page.drawRectangle({
    x: width * 0.42,
    y: height - headerH,
    width: width * 0.36,
    height: headerH,
    color: green,
    rotate: degrees(12),
  });

  drawText('SWAR YOGA', { x: marginX, y: height - 54, size: 22, font: helveticaBold, color: rgb(1, 1, 1) });
  drawText('Swar Yoga Workshop Receipt', {
    x: marginX,
    y: height - 76,
    size: 10,
    font: helvetica,
    color: rgb(0.9, 0.92, 0.94),
  });

  // Big INVOICE title
  drawText('INVOICE', {
    x: width - marginX - helveticaBold.widthOfTextAtSize('INVOICE', 28),
    y: height - 64,
    size: 28,
    font: helveticaBold,
    color: green,
  });

  y = height - headerH - 22;

  const receiptNumber = safeText(receipt?.receiptNumber || receipt?._id);
  const issuedAt = formatDate(receipt?.issuedAt || receipt?.createdAt);

  // Invoice meta (top-right)
  const metaBoxW = 210;
  const metaBoxH = 44;
  page.drawRectangle({ x: width - marginX - metaBoxW, y: y - metaBoxH + 10, width: metaBoxW, height: metaBoxH, color: softFill });
  drawText(`Invoice No: ${trunc(receiptNumber, 28)}`, { x: width - marginX - metaBoxW + 10, y: y - 8, size: 9, font: helvetica, color: mutedColor });
  drawText(`Invoice Date: ${issuedAt}`, { x: width - marginX - metaBoxW + 10, y: y - 21, size: 9, font: helvetica, color: mutedColor });

  // From / To blocks
  const fromX = marginX;
  const toX = width / 2 + 8;
  const blockYTop = y;

  const orgName = asOneLine(receipt?.organizationName || receipt?.organizerName || 'Swar Yoga');
  const orgContact = asOneLine(receipt?.organizationContact || '+91 00000 00000');
  const orgEmail = asOneLine(receipt?.organizationEmail || 'info@swaryoga.com');
  const orgAddress = asOneLine(
    receipt?.organizationAddress ||
      'Off No 04, Vedant Complex, Maldad Road, Sangamner - 422605, MH, India.'
  );

  const customerName = asOneLine(receipt?.customerName);
  const customerPhone = asOneLine(receipt?.customerPhone);
  const customerEmail = asOneLine(receipt?.customerEmail);

  const label = (t: string, x: number, yy: number) => drawText(t, { x, y: yy, size: 9, font: helveticaBold, color: green });
  const val = (t: string, x: number, yy: number) => drawText(trunc(t, 46), { x, y: yy, size: 9.5, font: helvetica, color: textColor });

  label('Invoice From:', fromX, blockYTop);
  val(orgName, fromX, blockYTop - 13);
  val(orgAddress, fromX, blockYTop - 26);
  val(`Phone: ${orgContact}`, fromX, blockYTop - 39);
  val(`Email: ${orgEmail}`, fromX, blockYTop - 52);

  label('Invoice To:', toX, blockYTop);
  val(customerName, toX, blockYTop - 13);
  val(`Phone: ${customerPhone}`, toX, blockYTop - 26);
  val(`Email: ${customerEmail}`, toX, blockYTop - 39);

  y = blockYTop - 74;

  // Items table (like screenshot: NO | PRODUCT DESCRIPTION | PRICE | QTY | TOTAL)
  const tableX = marginX;
  const tableW = width - marginX * 2;
  const headerY = y;
  const rowH = 28;

  const colNoW = 34;
  const colDescW = 270;
  const colPriceW = 80;
  const colQtyW = 50;
  const colTotalW = tableW - (colNoW + colDescW + colPriceW + colQtyW);

  const colNoX = tableX;
  const colDescX = colNoX + colNoW;
  const colPriceX = colDescX + colDescW;
  const colQtyX = colPriceX + colPriceW;
  const colTotalX = colQtyX + colQtyW;

  // Header row
  page.drawRectangle({ x: tableX, y: headerY - 18, width: tableW, height: 20, color: green });
  const headerText = (t: string, x: number) =>
    drawText(t, { x, y: headerY - 13, size: 9, font: helveticaBold, color: rgb(1, 1, 1) });
  headerText('NO.', colNoX + 8);
  headerText('PRODUCT DESCRIPTION', colDescX + 8);
  headerText('PRICE', colPriceX + 8);
  headerText('QTY.', colQtyX + 8);
  headerText('TOTAL', colTotalX + 8);

  y = headerY - 30;

  const currency = receipt?.payment?.currency || 'INR';
  const qty = Number(receipt?.quantity ?? 1) || 1;
  const unitPrice = Number(receipt?.payment?.unitAmount ?? receipt?.payment?.paidAmount ?? receipt?.payment?.amount ?? 0) || 0;

  // discount/tax fields (optional for now)
  const discountAmount = Number(receipt?.payment?.discountAmount ?? receipt?.discountAmount ?? 0) || 0;
  const taxRate = parsePercent(receipt?.payment?.taxPercent ?? receipt?.taxPercent ?? 0);

  const subTotal = Math.max(0, unitPrice * qty);
  const afterDiscount = Math.max(0, subTotal - discountAmount);
  const taxAmount = Math.max(0, (afterDiscount * taxRate) / 100);
  const grandTotal = Math.max(0, afterDiscount + taxAmount);

  const workshopName = asOneLine(receipt?.workshopName || 'Workshop');
  const workshopSubtitle = asOneLine(receipt?.workshopSubtitle || receipt?.scheduleLabel || '');

  // Single row (for now) – can be extended later to multiple line items.
  page.drawRectangle({ x: tableX, y: y - rowH + 6, width: tableW, height: rowH, color: rgb(1, 1, 1) });
  const cellY = y - 8;
  drawText('01', { x: colNoX + 10, y: cellY, size: 9.5, font: helveticaBold, color: mutedColor });
  drawText(trunc(workshopName, 40), { x: colDescX + 8, y: cellY, size: 9.5, font: helveticaBold, color: textColor });
  if (workshopSubtitle && workshopSubtitle !== '—') {
    drawText(trunc(workshopSubtitle, 52), { x: colDescX + 8, y: cellY - 11, size: 8.5, font: helvetica, color: mutedColor });
  }
  drawText(money(unitPrice, currency), { x: colPriceX + 8, y: cellY, size: 9.5, font: helvetica, color: textColor });
  drawText(String(qty), { x: colQtyX + 16, y: cellY, size: 9.5, font: helvetica, color: textColor });
  drawText(money(subTotal, currency), { x: colTotalX + 8, y: cellY, size: 9.5, font: helvetica, color: textColor });

  y -= 46;

  // Totals box at bottom-right
  const totalsX = width - marginX - 230;
  const totalsYTop = y + 38;
  const totalsW = 230;
  const lineH = 14;

  const totalsLine = (labelText: string, valueText: string, row: number) => {
    const yy = totalsYTop - row * lineH;
    drawText(labelText, { x: totalsX + 10, y: yy, size: 9, font: helvetica, color: mutedColor });
    drawText(valueText, {
      x: totalsX + totalsW - 10 - helvetica.widthOfTextAtSize(valueText, 9),
      y: yy,
      size: 9,
      font: helvetica,
      color: textColor,
    });
  };

  page.drawRectangle({ x: totalsX, y: totalsYTop - 4 * lineH - 10, width: totalsW, height: 4 * lineH + 56, color: softFill });
  totalsLine('Subtotal:', money(subTotal, currency), 0);
  totalsLine('Discount:', money(discountAmount, currency), 1);
  totalsLine(`Tax (${taxRate.toFixed(0)}%):`, money(taxAmount, currency), 2);

  // Total highlight row
  const totalBandY = totalsYTop - 3 * lineH - 20;
  page.drawRectangle({ x: totalsX, y: totalBandY, width: totalsW, height: 32, color: green });
  drawText('Total:', { x: totalsX + 10, y: totalBandY + 10, size: 12, font: helveticaBold, color: rgb(1, 1, 1) });
  const totalText = money(grandTotal || receipt?.payment?.paidAmount || receipt?.payment?.amount, currency);
  drawText(totalText, {
    x: totalsX + totalsW - 10 - helveticaBold.widthOfTextAtSize(totalText, 12),
    y: totalBandY + 10,
    size: 12,
    font: helveticaBold,
    color: rgb(1, 1, 1),
  });

  y = totalBandY - 28;

  // Payment details (bottom-left)
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
    drawText('Payment Method:', { x: marginX, y, size: 10, font: helveticaBold, color: green });
    y -= 14;
    for (const line of details) {
      drawText(String(line), { x: marginX, y, size: 9, font: helvetica, color: textColor });
      y -= 11;
      if (y < 120) break;
    }
  }

  // Footer band (dark)
  const footerH = 54;
  page.drawRectangle({ x: 0, y: 0, width, height: footerH, color: dark });

  drawText(asOneLine(receipt?.organizationPhone || orgContact), { x: marginX, y: 18, size: 9, font: helvetica, color: rgb(0.9, 0.92, 0.94) });
  drawText(asOneLine(receipt?.organizationEmail || orgEmail), {
    x: marginX + 160,
    y: 18,
    size: 9,
    font: helvetica,
    color: rgb(0.9, 0.92, 0.94),
  });
  drawText('Thank you for your business', {
    x: width - marginX - helveticaBold.widthOfTextAtSize('Thank you for your business', 10),
    y: 18,
    size: 10,
    font: helveticaBold,
    color: rgb(0.9, 0.92, 0.94),
  });

  // Terms (above footer)
  const termsY = Math.max(footerH + 44, y);
  drawText('Terms & Conditions:', { x: marginX, y: termsY, size: 10, font: helveticaBold, color: green });
  drawText('Fees once paid are non-refundable. Contact support for questions about your workshop access.', {
    x: marginX,
    y: termsY - 14,
    size: 9,
    font: helvetica,
    color: mutedColor,
  });

  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    // Iframes (used for inline preview) can't set a custom Authorization
    // header, so accept the token as a query param too.
    const token = request.headers.get('authorization')?.slice('Bearer '.length) || url.searchParams.get('token') || undefined;
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin && !decoded?.userId) {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 401 });
    }
    const tf = tenantFilter(decoded, 'issuedByUserId');

    const receiptId = url.searchParams.get('id');
    const leadId = url.searchParams.get('leadId');
    const download = url.searchParams.get('download') === '1';

    if (!receiptId && !leadId) {
      return NextResponse.json({ error: 'Missing id or leadId' }, { status: 400 });
    }

    await connectDB();

    let rec: any | null = null;

    if (receiptId) {
      if (!mongoose.Types.ObjectId.isValid(receiptId)) {
        return NextResponse.json({ error: 'Invalid receipt id' }, { status: 400 });
      }
      rec = await (CrmReceipt as any).findOne({ _id: receiptId, ...tf }).lean();
    } else {
      if (!mongoose.Types.ObjectId.isValid(leadId!)) {
        return NextResponse.json({ error: 'Invalid lead id' }, { status: 400 });
      }
      rec = await (CrmReceipt as any)
        .findOne({ leadId: new mongoose.Types.ObjectId(leadId!), ...tf })
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
        'Content-Disposition': `${download ? 'attachment' : 'inline'}; filename="${filenameBase}.pdf"`,
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
