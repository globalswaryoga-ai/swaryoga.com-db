import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { tenantFilter } from '@/lib/crm-handlers';
import { CrmReceipt, SalesReport } from '@/lib/schemas/enterpriseSchemas';

const PAYMENT_MODE_LABELS: Record<string, string> = {
  payu: 'PayU',
  cashfree: 'Cashfree',
  upi: 'UPI (Paytm/PhonePe/GPay)',
  bank_transfer: 'Bank Transfer',
  paypal: 'PayPal',
  card: 'Card',
  cash: 'Cash',
  other: 'Other',
};

// Lets the PDF be built straight from a SalesReport when no CrmReceipt exists yet
// (e.g. sales recorded before receipts were generated for every sale).
function receiptShapeFromSale(sale: any) {
  const paidAmount = sale.paidAmount ?? sale.saleAmount ?? 0;
  return {
    _id: sale._id,
    leadId: sale.leadId,
    receiptNumber: sale.receiptNumber,
    customerId: sale.customerId,
    customerName: sale.customerName,
    customerPhone: sale.customerPhone,
    workshopName: sale.workshopName,
    issuedAt: sale.saleDate || sale.createdAt,
    createdAt: sale.createdAt,
    quantity: 1,
    payment: {
      amount: sale.saleAmount,
      paidAmount,
      method: sale.paymentMode,
      provider: sale.paymentMode,
      paidAt: sale.saleDate,
    },
  };
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// ─── helpers ──────────────────────────────────────────────────────────────────

function fmt(d?: string | number | Date | null): string {
  if (!d) return '—';
  const dt = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(dt.getTime())) return '—';
  return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function money(n: any): string {
  const v = Number(n);
  if (!Number.isFinite(v)) return '0';
  return v.toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

function safe(v: any): string {
  return String(v ?? '').replace(/\s+/g, ' ').trim() || '—';
}

function trunc(s: string, max = 50): string {
  return s.length > max ? s.slice(0, max - 1) + '…' : s;
}

// Scales every (x, y) coordinate pair in a simple absolute-command SVG path
// ("M", "L", "C", "Z" with plain numbers) by independent x/y factors, since
// pdf-lib's drawSvgPath only supports a single uniform scale.
function scaleSvgPath(d: string, scaleX: number, scaleY: number): string {
  const numbers = d.match(/-?\d+(\.\d+)?/g) || [];
  let i = 0;
  return d.replace(/-?\d+(\.\d+)?/g, (n) => {
    const v = Number(n);
    const scaled = i % 2 === 0 ? v * scaleX : v * scaleY;
    i++;
    return String(Math.round(scaled * 100) / 100);
  });
}

// ─── PDF builder ──────────────────────────────────────────────────────────────

async function buildReceiptPdf(receipt: any): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page   = pdfDoc.addPage([595.28, 841.89]); // A4

  const bold   = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const reg    = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const italic = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

  const { width: W, height: H } = page.getSize();
  const M = 40; // side margin

  // ─── colours (matching the sales/[id] receipt page design) ────────────────
  const orange     = rgb(0.953, 0.612, 0.075);  // #F39C12 — table header / accent
  const borderTan  = rgb(0.851, 0.635, 0.416);  // #D9A26A — table borders
  const accentGreen = rgb(0.357, 0.667, 0.184); // #5BAA2F — customer name
  const accentRed  = rgb(0.843, 0.180, 0.180);  // #D72E2E — totals
  const waveLight  = rgb(0.420, 0.722, 0.173);  // #6BB82C
  const waveDark   = rgb(0.325, 0.510, 0.365);  // #53825D
  const white      = rgb(1, 1, 1);
  const black      = rgb(0.07, 0.07, 0.07);
  const gray       = rgb(0.40, 0.40, 0.40);
  const lightGray  = rgb(0.96, 0.96, 0.96);
  const midGray    = rgb(0.87, 0.87, 0.87);

  const text = (t: string, x: number, y: number, opts: { size?: number; font?: any; color?: any } = {}) =>
    page.drawText(t, { x, y, size: opts.size ?? 10, font: opts.font ?? reg, color: opts.color ?? black });

  // ─── embed images ───────────────────────────────────────────────────────────
  // Pre-resized local copies — the source files are several MB and would
  // bloat every generated receipt if embedded at full size.
  let photoImg: any = null;
  let logoImg: any = null;
  let sealImg: any = null;
  let signatureImg: any = null;
  try {
    const buf = fs.readFileSync(path.join(process.cwd(), 'public', 'receipt-photo.jpg'));
    photoImg = await pdfDoc.embedJpg(buf);
  } catch {}
  try {
    const buf = fs.readFileSync(path.join(process.cwd(), 'public', 'receipt-logo.png'));
    logoImg = await pdfDoc.embedPng(buf);
  } catch {}
  try {
    const buf = fs.readFileSync(path.join(process.cwd(), 'public', 'receipt-seal.png'));
    sealImg = await pdfDoc.embedPng(buf);
  } catch {}
  try {
    const buf = fs.readFileSync(path.join(process.cwd(), 'public', 'receipt-signature.png'));
    signatureImg = await pdfDoc.embedPng(buf);
  } catch {}

  // White page background.
  page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: white });

  // ═══════════════════════════════════════════════════════════════════════════
  // TOP WAVE DECORATION  (decorative backdrop behind the header)
  // ═══════════════════════════════════════════════════════════════════════════
  const topWaveH = 130;
  const sx = W / 1000;
  const syTop = topWaveH / 200;
  // Drawn with y = H so the SVG's own (0,0) origin sits at the page top edge,
  // descending downward to match the original top-0 placement.
  page.drawSvgPath(scaleSvgPath('M0,0 L1000,0 L1000,20 C800,30 500,110 0,150 Z', sx, syTop), { x: 0, y: H, color: waveLight });
  page.drawSvgPath(scaleSvgPath('M0,0 L1000,0 L1000,170 C800,165 500,70 0,30 Z', sx, syTop), { x: 0, y: H, color: waveDark });

  // ═══════════════════════════════════════════════════════════════════════════
  // HEADER  (photo + brand on the left, logo + invoice no. on the right)
  // ═══════════════════════════════════════════════════════════════════════════
  if (photoImg) {
    page.drawImage(photoImg, { x: M, y: H - 92, width: 64, height: 64 });
  }

  text('SWAR YOGA', M + 78, H - 42, { size: 21, font: bold, color: black });
  text('Maldad Road, Sangamner • Mo +91 93099 86820', M + 78, H - 62, { size: 8, color: gray });
  text('Email: mohan@swaryoga.com', M + 78, H - 74, { size: 8, color: gray });

  if (logoImg) {
    page.drawImage(logoImg, { x: W - M - 54, y: H - 70, width: 54, height: 54 });
  }

  text('INVOICE', W - M - bold.widthOfTextAtSize('INVOICE', 26) , H - 92, { size: 26, font: bold, color: black });

  const receiptNumber = safe(receipt?.receiptNumber || receipt?._id);
  text(`No: ${receiptNumber}`, W - M - reg.widthOfTextAtSize(`No: ${receiptNumber}`, 10), H - 106, { size: 10, color: gray });

  // ─── Tan divider (matches ACCENT_BORDER on the HTML receipt) ─────────────────
  page.drawRectangle({ x: 0, y: H - 132, width: W, height: 2.5, color: borderTan });

  // ═══════════════════════════════════════════════════════════════════════════
  // INVOICE TO  +  DATE/TOTAL
  // ═══════════════════════════════════════════════════════════════════════════
  text('INVOICE TO :', M, H - 152, { size: 8.5, color: gray });

  // CrmReceipt documents store the lead's number as `leadNumber` (set at
  // receipt creation); the sale-fallback shape (receiptShapeFromSale) sets
  // `customerId` instead. `receipt.customerId` alone was never populated on
  // real CrmReceipt docs, which silently fell through to the ObjectId-hex
  // fallback for every receipt issued via the normal create flow.
  const custId = safe(receipt?.leadNumber || receipt?.customerId || (receipt?.leadId?.toString?.() || '').slice(-6) || '—');
  text(`ID: ${custId}`, M, H - 168, { size: 10, font: bold });

  const customerName = safe(receipt?.customerName);
  text(trunc(customerName, 32), M, H - 186, { size: 17, font: bold, color: accentGreen });

  const customerPhone = safe(receipt?.customerPhone);
  text(customerPhone, M, H - 204, { size: 9, color: gray });

  const issuedAt = fmt(receipt?.issuedAt || receipt?.createdAt);
  text(`Date: ${issuedAt}`, W - M - reg.widthOfTextAtSize(`Date: ${issuedAt}`, 10), H - 152, { size: 10 });

  text('TOTAL AMOUNT', W - M - reg.widthOfTextAtSize('TOTAL AMOUNT', 8), H - 182, { size: 8, color: gray });

  const totalAmt = receipt?.payment?.paidAmount ?? receipt?.payment?.amount ?? 0;
  const totalStr = `RS. ${money(totalAmt)}/-`;
  text(totalStr, W - M - bold.widthOfTextAtSize(totalStr, 22), H - 206, { size: 22, font: bold, color: accentRed });

  // ═══════════════════════════════════════════════════════════════════════════
  // FEE TABLE
  // ═══════════════════════════════════════════════════════════════════════════
  const tTop  = H - 248;
  const tW    = W - M * 2;
  const rowH  = 34;

  const cW = [tW * 0.50, tW * 0.13, tW * 0.19, tW * 0.18];
  const cX = [M, M + cW[0], M + cW[0] + cW[1], M + cW[0] + cW[1] + cW[2]];

  page.drawRectangle({ x: M, y: tTop - 24, width: tW, height: 24, color: orange });
  const hLabels = ['WORKSHOP', 'PERSON', 'FEES', 'TOTAL'];
  hLabels.forEach((h, i) => {
    const tx = i === 0 ? cX[i] + 8 : cX[i] + (cW[i] - bold.widthOfTextAtSize(h, 8.5)) / 2;
    text(h, tx, tTop - 16, { size: 8.5, font: bold, color: white });
  });

  const workshopName = safe(receipt?.workshopName || 'Workshop');
  const qty     = Number(receipt?.quantity ?? 1) || 1;
  const unitAmt = Number(receipt?.payment?.paidAmount ?? receipt?.payment?.amount ?? 0);

  const r1Y = tTop - 24 - rowH;
  page.drawRectangle({ x: M, y: r1Y, width: tW, height: rowH, color: white });
  page.drawRectangle({ x: M, y: r1Y, width: tW, height: 1, color: borderTan });
  text(trunc(workshopName, 36), cX[0] + 8, r1Y + 12, { size: 10, font: bold });
  text(String(qty), cX[1] + (cW[1] - reg.widthOfTextAtSize(String(qty), 9.5)) / 2, r1Y + 12, { size: 9.5 });
  text(`${money(unitAmt)}/-`, cX[2] + (cW[2] - reg.widthOfTextAtSize(`${money(unitAmt)}/-`, 9.5)) / 2, r1Y + 12, { size: 9.5 });

  const pay = receipt?.payment || {};
  const payMethod  = safe(pay?.method || pay?.provider || 'payment').toLowerCase();
  const payDate    = fmt(pay?.paidAt || receipt?.issuedAt || receipt?.createdAt);
  const receivedNote = `Received on the date of- ${payDate} (${payMethod})`;

  const r2Y = r1Y - rowH;
  page.drawRectangle({ x: M, y: r2Y, width: tW, height: rowH, color: lightGray });
  page.drawRectangle({ x: M, y: r2Y, width: tW, height: 1, color: borderTan });
  text(trunc(receivedNote, 46), cX[0] + 8, r2Y + 12, { size: 8.5, color: gray });
  text(`${money(unitAmt)}/-`, cX[2] + (cW[2] - reg.widthOfTextAtSize(`${money(unitAmt)}/-`, 9.5)) / 2, r2Y + 12, { size: 9.5 });
  text(money(unitAmt), cX[3] + (cW[3] - reg.widthOfTextAtSize(money(unitAmt), 9.5)) / 2, r2Y + 12, { size: 9.5 });

  const afterTable = r2Y - 22;

  // ═══════════════════════════════════════════════════════════════════════════
  // PAYMENT METHOD + TERMS  (left)
  // ═══════════════════════════════════════════════════════════════════════════
  let leftY = afterTable;

  text('Payment Method :', M, leftY, { size: 11, font: bold });
  leftY -= 18;

  const methodKey = safe(pay?.method || pay?.provider || '').toLowerCase();
  const method = PAYMENT_MODE_LABELS[methodKey]
    || (methodKey && methodKey !== '—' ? methodKey.charAt(0).toUpperCase() + methodKey.slice(1).replace(/_/g, ' ') : 'Bank Transfer');
  text(method, M, leftY, { size: 11 });
  leftY -= 20;

  const terms = [
    'No cancellation and no refund once payment is made.',
    'The amount paid is non-transferable to any other person.',
    'Please retain this invoice for your records.',
  ];
  for (const t of terms) {
    text(`• ${t}`, M, leftY, { size: 8.5, color: gray });
    leftY -= 13;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TOTALS BOX  (bottom-right)
  // ═══════════════════════════════════════════════════════════════════════════
  const bW   = 178;
  const bX   = W - M - bW;
  const bY   = afterTable;
  const lH   = 22;

  const discount  = Number(receipt?.payment?.discountAmount ?? 0) || 0;
  const grandTotal = Math.max(0, unitAmt - discount);

  page.drawRectangle({ x: bX, y: bY - lH, width: bW, height: lH, color: lightGray });
  text('Sub Total', bX + 8, bY - lH + 7, { size: 9 });
  text(`${money(unitAmt)}/-`, bX + bW - 8 - reg.widthOfTextAtSize(`${money(unitAmt)}/-`, 9), bY - lH + 7, { size: 9 });

  page.drawRectangle({ x: bX, y: bY - lH * 2, width: bW, height: lH, color: white });
  page.drawRectangle({ x: bX, y: bY - lH * 2, width: bW, height: 1, color: borderTan });
  text('Tax', bX + 8, bY - lH * 2 + 7, { size: 9 });
  text('0', bX + bW - 8 - reg.widthOfTextAtSize('0', 9), bY - lH * 2 + 7, { size: 9 });

  page.drawRectangle({ x: bX, y: bY - lH * 3 - 2, width: bW, height: lH + 2, color: orange });
  text('Total', bX + 8, bY - lH * 3 + 6, { size: 11, font: bold, color: white });
  const gtStr = `${money(grandTotal || unitAmt)}/-`;
  text(gtStr, bX + bW - 8 - bold.widthOfTextAtSize(gtStr, 11), bY - lH * 3 + 6, { size: 11, font: bold, color: white });

  // ═══════════════════════════════════════════════════════════════════════════
  // BOTTOM WAVE DECORATION + CLOSING  (seal/thank-you left, signature right)
  // ═══════════════════════════════════════════════════════════════════════════
  const bottomWaveH = 130;
  const syBottom = bottomWaveH / 200;
  page.drawSvgPath(scaleSvgPath('M1000,200 L0,200 L0,180 C200,170 500,90 1000,50 Z', sx, syBottom), { x: 0, y: bottomWaveH, color: waveLight });
  page.drawSvgPath(scaleSvgPath('M1000,200 L0,200 L0,30 C200,35 500,130 1000,170 Z', sx, syBottom), { x: 0, y: bottomWaveH, color: waveDark });

  const closeY = Math.min(bY - lH * 3 - 2 - 50, 230);

  if (sealImg) {
    page.drawImage(sealImg, { x: M + 10, y: closeY - 100, width: 100, height: 100 });
    text('"Thank you!"', M + 10, closeY - 116, { size: 13, font: bold });
    text('Your registration & payment are confirmed', M + 10, closeY - 130, { size: 8.5, color: gray });
  }

  if (signatureImg) {
    const sigW = 130, sigH = 65;
    const sigX = W - M - sigW;
    page.drawImage(signatureImg, { x: sigX, y: closeY - 70, width: sigW, height: sigH });
    text('Mohan Kalburgi', W - M - bold.widthOfTextAtSize('Mohan Kalburgi', 11), closeY - 86, { size: 11, font: bold });
    text('Yogacharya', W - M - italic.widthOfTextAtSize('Yogacharya', 9), closeY - 100, { size: 9, font: italic, color: gray });
  }

  const website = 'www.swaryoga.com';
  text(website, (W - bold.widthOfTextAtSize(website, 9)) / 2, 40, { size: 9, font: bold, color: gray });

  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
}

// ─── GET handler ──────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    // Accept token from header OR query param (for iframe embeds)
    const url   = new URL(request.url);
    const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
      || url.searchParams.get('token')
      || undefined;

    const decoded = verifyToken(token);
    if (!decoded?.isAdmin && !decoded?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const tf = tenantFilter(decoded, 'issuedByUserId');
    const saleTf = tenantFilter(decoded, 'reportedByUserId');

    const receiptId = url.searchParams.get('id');
    const leadId    = url.searchParams.get('leadId');
    const saleId    = url.searchParams.get('saleId');

    if (!receiptId && !leadId && !saleId) {
      return NextResponse.json({ error: 'Missing id, leadId or saleId' }, { status: 400 });
    }

    await connectDB();

    let rec: any = null;

    if (receiptId) {
      if (!mongoose.Types.ObjectId.isValid(receiptId)) {
        return NextResponse.json({ error: 'Invalid receipt id' }, { status: 400 });
      }
      rec = await (CrmReceipt as any).findOne({ _id: receiptId, ...tf }).lean();
    } else if (saleId) {
      if (!mongoose.Types.ObjectId.isValid(saleId)) {
        return NextResponse.json({ error: 'Invalid sale id' }, { status: 400 });
      }
      rec = await (CrmReceipt as any).findOne({ saleId, ...tf }).sort({ issuedAt: -1 }).lean();
      if (!rec) {
        // Older sales recorded before a CrmReceipt was generated for every sale —
        // build the same design straight from the sale record instead of 404ing.
        const sale = await (SalesReport as any).findOne({ _id: saleId, ...saleTf }).lean();
        if (sale) rec = receiptShapeFromSale(sale);
      }
    } else {
      if (!mongoose.Types.ObjectId.isValid(leadId!)) {
        return NextResponse.json({ error: 'Invalid lead id' }, { status: 400 });
      }
      rec = await (CrmReceipt as any)
        .findOne({ leadId: new mongoose.Types.ObjectId(leadId!), ...tf })
        .sort({ issuedAt: -1 })
        .lean();
      if (!rec) {
        const sale = await (SalesReport as any)
          .findOne({ leadId: new mongoose.Types.ObjectId(leadId!), ...saleTf })
          .sort({ saleDate: -1 })
          .lean();
        if (sale) rec = receiptShapeFromSale(sale);
      }
    }

    if (!rec) {
      return NextResponse.json({ error: 'Receipt not found' }, { status: 404 });
    }

    const pdfBytes = await buildReceiptPdf(rec);
    const filename = (rec?.receiptNumber || String(rec?._id || 'receipt')).replace(/[^a-zA-Z0-9_-]+/g, '_');

    const body = pdfBytes.buffer.slice(pdfBytes.byteOffset, pdfBytes.byteOffset + pdfBytes.byteLength) as ArrayBuffer;

    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${filename}.pdf"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    console.error('[PDF receipt] Error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to generate PDF' },
      { status: 500 }
    );
  }
}
