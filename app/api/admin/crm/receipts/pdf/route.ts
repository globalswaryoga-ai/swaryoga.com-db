import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import { PDFDocument, StandardFonts, rgb, degrees } from 'pdf-lib';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { tenantFilter } from '@/lib/crm-handlers';
import { CrmReceipt } from '@/lib/schemas/enterpriseSchemas';

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

// ─── PDF builder ──────────────────────────────────────────────────────────────

async function buildReceiptPdf(receipt: any): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page   = pdfDoc.addPage([595.28, 841.89]); // A4

  const bold   = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const reg    = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const { width: W, height: H } = page.getSize();
  const M = 40; // side margin

  // ─── colours ────────────────────────────────────────────────────────────────
  const orange    = rgb(0.91, 0.50, 0.10);   // #E8801A
  const darkGreen = rgb(0.18, 0.42, 0.31);   // #2D6A4F
  const teal      = rgb(0.10, 0.42, 0.33);   // #1A6B55
  const red       = rgb(0.75, 0.22, 0.17);   // #C0392B
  const darkBg    = rgb(0.10, 0.10, 0.17);   // #1A1A2E
  const white     = rgb(1, 1, 1);
  const black     = rgb(0.07, 0.07, 0.07);
  const gray      = rgb(0.40, 0.40, 0.40);
  const lightGray = rgb(0.96, 0.96, 0.96);
  const midGray   = rgb(0.87, 0.87, 0.87);

  const text = (t: string, x: number, y: number, opts: { size?: number; font?: any; color?: any } = {}) =>
    page.drawText(t, { x, y, size: opts.size ?? 10, font: opts.font ?? reg, color: opts.color ?? black });

  // ─── embed logos ────────────────────────────────────────────────────────────
  let logoImg: any = null;
  let sealImg: any = null;
  try {
    const buf = fs.readFileSync(path.join(process.cwd(), 'public', 'logo-square.png'));
    logoImg = await pdfDoc.embedPng(buf);
  } catch {}
  try {
    const buf = fs.readFileSync(path.join(process.cwd(), 'public', 'swar-yoga-seal.png'));
    sealImg = await pdfDoc.embedPng(buf);
  } catch {}

  // ═══════════════════════════════════════════════════════════════════════════
  // HEADER  (y = H-130 … H)
  // ═══════════════════════════════════════════════════════════════════════════
  // White background
  page.drawRectangle({ x: 0, y: H - 130, width: W, height: 130, color: white });

  // Green diagonal stripe — top-right corner
  page.drawRectangle({
    x: W * 0.52,
    y: H - 145,
    width: W * 0.68,
    height: 160,
    color: darkGreen,
    rotate: degrees(12),
  });

  // Logo
  if (logoImg) {
    page.drawImage(logoImg, { x: M, y: H - 116, width: 68, height: 68 });
  } else {
    page.drawEllipse({ x: M + 34, y: H - 82, xScale: 32, yScale: 32, color: darkGreen });
    text('SW', M + 18, H - 92, { size: 16, font: bold, color: white });
  }

  // Company text
  text('SWAR YOGA', M + 82, H - 48, { size: 19, font: bold, color: black });
  text('Maldad Road, Sangamner  •  Mo +91 93099 86820', M + 82, H - 66, { size: 8, color: gray });
  text('Email: mohan@swaryoga.com', M + 82, H - 78, { size: 8, color: gray });

  // Seal / logo top-right (inside stripe)
  if (sealImg) {
    page.drawImage(sealImg, { x: W - 108, y: H - 108, width: 60, height: 60 });
  } else {
    page.drawEllipse({ x: W - 78, y: H - 78, xScale: 28, yScale: 28, color: white });
    text('8', W - 85, H - 88, { size: 18, font: bold, color: darkGreen });
  }

  // INVOICE title
  text('INVOICE', W - M - bold.widthOfTextAtSize('INVOICE', 28) - 4, H - 66, { size: 28, font: bold, color: black });

  const receiptNumber = safe(receipt?.receiptNumber || receipt?._id);
  text(`No: ${receiptNumber}`, W - M - reg.widthOfTextAtSize(`No: ${receiptNumber}`, 10) - 4, H - 95, { size: 10, color: gray });

  // ─── Orange divider ────────────────────────────────────────────────────────
  page.drawRectangle({ x: 0, y: H - 134, width: W, height: 4, color: orange });

  // ═══════════════════════════════════════════════════════════════════════════
  // INVOICE TO  +  DATE/TOTAL  (y = H-244 … H-134)
  // ═══════════════════════════════════════════════════════════════════════════
  page.drawRectangle({ x: 0, y: H - 244, width: W, height: 110, color: white });

  // Left – customer
  text('INVOICE TO :', M, H - 154, { size: 8.5, color: gray });

  const custId = safe(receipt?.customerId || (receipt?.leadId?.toString?.() || '').slice(-6) || '—');
  text(`ID: ${custId}`, M, H - 170, { size: 10, font: bold });

  const customerName = safe(receipt?.customerName);
  text(trunc(customerName, 32), M, H - 186, { size: 16, font: bold, color: teal });

  const customerPhone = safe(receipt?.customerPhone);
  text(customerPhone, M, H - 204, { size: 9, color: gray });

  // Right – date + total
  const colR = W / 2 + 20;
  const issuedAt = fmt(receipt?.issuedAt || receipt?.createdAt);
  text(`Date: ${issuedAt}`, W - M - bold.widthOfTextAtSize(`Date: ${issuedAt}`, 10), H - 154, { size: 10, font: bold });

  // small orange bar
  page.drawRectangle({ x: colR, y: H - 172, width: W - colR - M, height: 2, color: orange });

  text('TOTAL AMOUNT', W - M - reg.widthOfTextAtSize('TOTAL AMOUNT', 8), H - 182, { size: 8, color: gray });

  const totalAmt = receipt?.payment?.paidAmount ?? receipt?.payment?.amount ?? 0;
  const totalStr = `RS. ${money(totalAmt)}/-`;
  text(totalStr, W - M - bold.widthOfTextAtSize(totalStr, 20), H - 204, { size: 20, font: bold, color: red });

  // ═══════════════════════════════════════════════════════════════════════════
  // TABLE  (y = H-284 … H-244)
  // ═══════════════════════════════════════════════════════════════════════════
  const tTop  = H - 248;
  const tW    = W - M * 2;
  const rowH  = 34;

  // Column positions & widths
  const cW = [tW * 0.50, tW * 0.13, tW * 0.19, tW * 0.18];
  const cX = [M, M + cW[0], M + cW[0] + cW[1], M + cW[0] + cW[1] + cW[2]];

  // Header row (orange)
  page.drawRectangle({ x: M, y: tTop - 24, width: tW, height: 24, color: orange });
  const hLabels = ['WORKSHOP', 'PERSON', 'FEES', 'TOTAL'];
  hLabels.forEach((h, i) => {
    const tx = i === 0 ? cX[i] + 8 : cX[i] + (cW[i] - bold.widthOfTextAtSize(h, 8.5)) / 2;
    text(h, tx, tTop - 16, { size: 8.5, font: bold, color: white });
  });

  const workshopName = safe(receipt?.workshopName || 'Workshop');
  const qty     = Number(receipt?.quantity ?? 1) || 1;
  const unitAmt = Number(receipt?.payment?.paidAmount ?? receipt?.payment?.amount ?? 0);

  // Row 1 (white)
  const r1Y = tTop - 24 - rowH;
  page.drawRectangle({ x: M, y: r1Y, width: tW, height: rowH, color: white });
  page.drawRectangle({ x: M, y: r1Y, width: tW, height: 1, color: midGray });
  text(trunc(workshopName, 36), cX[0] + 8, r1Y + 12, { size: 10, font: bold });
  text(String(qty), cX[1] + (cW[1] - reg.widthOfTextAtSize(String(qty), 9.5)) / 2, r1Y + 12, { size: 9.5 });
  text(`${money(unitAmt)}/-`, cX[2] + (cW[2] - reg.widthOfTextAtSize(`${money(unitAmt)}/-`, 9.5)) / 2, r1Y + 12, { size: 9.5 });

  // Row 2 (light gray) – payment received note
  const pay = receipt?.payment || {};
  const payMethod  = safe(pay?.method || pay?.provider || 'payment').toLowerCase().replace(/_/g, ' ');
  const payDate    = fmt(pay?.paidAt || receipt?.issuedAt || receipt?.createdAt);
  const receivedNote = `Received on the date of- ${payDate} (${payMethod})`;

  const r2Y = r1Y - rowH;
  page.drawRectangle({ x: M, y: r2Y, width: tW, height: rowH, color: lightGray });
  page.drawRectangle({ x: M, y: r2Y, width: tW, height: 1, color: midGray });
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

  const methodRaw = safe(pay?.method || pay?.provider || 'Bank Transfer');
  const method = methodRaw === '—'
    ? 'Bank Transfer'
    : methodRaw.charAt(0).toUpperCase() + methodRaw.slice(1).toLowerCase().replace(/_/g, ' ');
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

  // Sub Total
  page.drawRectangle({ x: bX, y: bY - lH, width: bW, height: lH, color: lightGray });
  text('Sub Total', bX + 8, bY - lH + 7, { size: 9 });
  text(`${money(unitAmt)}/-`, bX + bW - 8 - reg.widthOfTextAtSize(`${money(unitAmt)}/-`, 9), bY - lH + 7, { size: 9 });

  // Tax
  page.drawRectangle({ x: bX, y: bY - lH * 2, width: bW, height: lH, color: white });
  page.drawRectangle({ x: bX, y: bY - lH * 2, width: bW, height: 1, color: midGray });
  text('Tax', bX + 8, bY - lH * 2 + 7, { size: 9 });
  text('0', bX + bW - 8 - reg.widthOfTextAtSize('0', 9), bY - lH * 2 + 7, { size: 9 });

  // Total (orange bg)
  page.drawRectangle({ x: bX, y: bY - lH * 3 - 2, width: bW, height: lH + 2, color: orange });
  text('Total', bX + 8, bY - lH * 3 + 6, { size: 11, font: bold, color: white });
  const gtStr = `${money(grandTotal || unitAmt)}/-`;
  text(gtStr, bX + bW - 8 - bold.widthOfTextAtSize(gtStr, 11), bY - lH * 3 + 6, { size: 11, font: bold, color: white });

  // ═══════════════════════════════════════════════════════════════════════════
  // FOOTER
  // ═══════════════════════════════════════════════════════════════════════════
  page.drawRectangle({ x: 0, y: 0, width: W, height: 50, color: darkBg });
  text('+91 93099 86820', M, 20, { size: 8.5, color: rgb(0.7, 0.7, 0.75) });
  text('mohan@swaryoga.com', M + 130, 20, { size: 8.5, color: rgb(0.7, 0.7, 0.75) });
  const thanks = 'Thank you for your business';
  text(thanks, W - M - reg.widthOfTextAtSize(thanks, 8.5), 20, { size: 8.5, font: bold, color: rgb(0.7, 0.7, 0.75) });

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

    const receiptId = url.searchParams.get('id');
    const leadId    = url.searchParams.get('leadId');

    if (!receiptId && !leadId) {
      return NextResponse.json({ error: 'Missing id or leadId' }, { status: 400 });
    }

    await connectDB();

    let rec: any = null;

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
