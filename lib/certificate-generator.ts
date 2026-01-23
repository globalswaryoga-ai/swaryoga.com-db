/**
 * PDF Certificate & Receipt Generator
 * Creates professional 2-in-1 investment certificate + receipt (A4 size)
 * Uses PDFKit for color-rich formatting with letterhead and signatures
 */

import PDFDocument from 'pdfkit';
import { IInvestment } from '@/lib/schemas/investmentSchemas';
import { ENTITIES, ENTITY_NAMES, SHARE_TYPES, THEME_COLORS } from '@/lib/investment-constants';
import { formatCurrency, formatDate, calculateYears } from '@/lib/investment-utils';

interface CertificateData {
  investment: IInvestment & { userId?: any };
  user: { name: string; email: string; phone: string; address?: string };
  kyc?: { aadharNumber?: string; panNumber?: string };
  adminSettings?: {
    companyName: string;
    companyAddress: string;
    companyPhone: string;
    companyEmail: string;
    logoUrl?: string;
    signatureUrl?: string;
    adminName: string;
    adminTitle: string;
    certificateNote?: string;
    receiptNote?: string;
  };
}

/**
 * Generate A4 PDF with 2 pages: Certificate (Page 1) + Receipt (Page 2)
 */
export function generateInvestmentCertificate(data: CertificateData): PDFDocument {
  const doc = new PDFDocument({
    size: 'A4',
    margin: 40,
  });

  const { investment, user, kyc, adminSettings } = data;

  // ============ PAGE 1: INVESTMENT CERTIFICATE ============
  generateCertificatePage(doc, { investment, user, kyc, adminSettings });

  // Add page break
  doc.addPage();

  // ============ PAGE 2: PAYMENT RECEIPT & STATEMENT ============
  generateReceiptPage(doc, { investment, user, kyc, adminSettings });

  return doc;
}

/**
 * Generate Certificate Page (Page 1)
 */
function generateCertificatePage(
  doc: PDFDocument,
  data: CertificateData
): void {
  const { investment, user, kyc, adminSettings } = data;
  const pageWidth = doc.page.width;
  const centerX = pageWidth / 2;

  // ===== LETTERHEAD =====
  let currentY = 40;

  // Logo (if exists)
  if (adminSettings?.logoUrl) {
    try {
      doc.image(adminSettings.logoUrl, 50, currentY, { width: 80, height: 80 });
    } catch (e) {
      // Fallback if logo fails
    }
  }

  // Company Name (Right side)
  doc.fontSize(24).font('Helvetica-Bold').fillColor(THEME_COLORS.BLUE);
  doc.text(adminSettings?.companyName || 'Swar Yoga', 150, currentY, { width: 400 });

  currentY += 50;
  doc.fontSize(10).font('Helvetica').fillColor('#000');
  doc.text(adminSettings?.companyAddress || '', 50, currentY, { width: 500 });

  currentY += 20;
  doc.text(`📞 ${adminSettings?.companyPhone || ''} | 📧 ${adminSettings?.companyEmail || ''}`, 50, currentY);

  currentY += 35;

  // ===== CERTIFICATE TITLE =====
  doc.rect(40, currentY, pageWidth - 80, 40).fillAndStroke(THEME_COLORS.BLUE, THEME_COLORS.BLUE);
  doc.fontSize(20).font('Helvetica-Bold').fillColor('#fff');
  doc.text('INVESTMENT CERTIFICATE', 50, currentY + 8, { width: pageWidth - 100, align: 'center' });

  currentY += 50;

  // ===== INVESTMENT TYPE BANNER =====
  const entityName =
    investment.entity === ENTITIES.SWAR_SAKSHI
      ? '🏛️ PROPRIETORSHIP INVESTMENT'
      : '🏢 PRIVATE LIMITED - SHARE CERTIFICATE';

  doc.rect(40, currentY, pageWidth - 80, 30).fillAndStroke(THEME_COLORS.ORANGE, THEME_COLORS.ORANGE);
  doc.fontSize(14).font('Helvetica-Bold').fillColor('#fff');
  doc.text(entityName, 50, currentY + 5, { width: pageWidth - 100, align: 'center' });

  currentY += 40;

  // ===== CERTIFICATE NUMBER =====
  doc.fontSize(10).font('Helvetica-Bold').fillColor(THEME_COLORS.BLUE);
  doc.text(`Certificate No: ${investment.certificateNumber || 'CERT-' + investment._id}`, 50, currentY);

  currentY += 20;
  doc.fontSize(9).fillColor('#666');
  doc.text(`Issue Date: ${formatDate(investment.createdAt)} | Valid From: ${formatDate(investment.startDate)}`, 50, currentY);

  currentY += 35;

  // ===== INVESTOR DETAILS BOX =====
  drawBox(doc, 40, currentY, pageWidth - 80, 80, 'INVESTOR DETAILS', THEME_COLORS.GREEN);
  currentY += 25;

  doc.fontSize(10).font('Helvetica-Bold').fillColor('#000');
  doc.text('Name:', 50, currentY);
  doc.font('Helvetica').text(user.name, 150, currentY);

  currentY += 18;
  doc.font('Helvetica-Bold').text('Phone:', 50, currentY);
  doc.font('Helvetica').text(user.phone, 150, currentY);

  currentY += 18;
  doc.font('Helvetica-Bold').text('Email:', 50, currentY);
  doc.font('Helvetica').text(user.email, 150, currentY);

  currentY += 18;
  doc.font('Helvetica-Bold').text('Address:', 50, currentY);
  doc.font('Helvetica').text(user.address || 'Not Provided', 150, currentY, { width: 300 });

  currentY += 50;

  // ===== INVESTMENT DETAILS TABLE =====
  drawBox(doc, 40, currentY, pageWidth - 80, 90, 'INVESTMENT DETAILS', THEME_COLORS.BLUE);
  currentY += 25;

  const details =
    investment.entity === ENTITIES.SWAR_SAKSHI
      ? [
          ['Investment Amount:', formatCurrency(investment.amount)],
          ['Interest Rate:', `${investment.interestRate}% per annum`],
          ['Type:', investment.compound ? 'Compound Interest' : 'Simple Interest'],
          ['Duration:', `${calculateYears(investment.startDate, investment.endDate)} years`],
          ['Maturity Amount:', formatCurrency(investment.maturityAmount || 0)],
        ]
      : [
          ['Share Type:', SHARE_TYPES.PREFERENCE ? 'Preference (12% fixed)' : 'Equity (10% + gains)'],
          ['Number of Shares:', String(investment.numberOfShares || 0)],
          ['Share Price:', formatCurrency(investment.sharePrice || 0)],
          ['Total Investment:', formatCurrency(investment.amount)],
          ['Dividend/Return:', investment.shareType === SHARE_TYPES.PREFERENCE ? '12% Fixed' : '10% + Capital Gains'],
        ];

  doc.fontSize(9).font('Helvetica-Bold').fillColor('#000');
  details.forEach(([label, value]) => {
    doc.text(label, 50, currentY);
    doc.font('Helvetica').fillColor(THEME_COLORS.GREEN);
    doc.text(value, 250, currentY);
    doc.font('Helvetica-Bold').fillColor('#000');
    currentY += 16;
  });

  currentY += 15;

  // ===== KYC DETAILS =====
  if (kyc) {
    drawBox(doc, 40, currentY, pageWidth - 80, 50, 'KYC VERIFICATION', THEME_COLORS.RED);
    currentY += 25;

    doc.fontSize(9).font('Helvetica-Bold').fillColor('#000');
    doc.text('Aadhar:', 50, currentY);
    doc.font('Helvetica').text(kyc.aadharNumber || 'Not Verified', 150, currentY);

    currentY += 18;
    doc.font('Helvetica-Bold').text('PAN:', 50, currentY);
    doc.font('Helvetica').text(kyc.panNumber || 'Not Verified', 150, currentY);

    currentY += 30;
  }

  // ===== STATUS & NOTES =====
  doc.fontSize(9).font('Helvetica-Bold').fillColor(THEME_COLORS.BLUE);
  doc.text('Status:', 50, currentY);
  doc.fillColor(THEME_COLORS.GREEN).text('✓ ACTIVE - APPROVED', 150, currentY);

  currentY += 35;

  // Certificate note
  doc.fontSize(8).font('Helvetica-Oblique').fillColor('#666');
  doc.text(adminSettings?.certificateNote || '', 50, currentY, {
    width: pageWidth - 100,
    align: 'center',
  });

  currentY = doc.page.height - 100;

  // ===== SIGNATURE & SEAL =====
  doc.fontSize(10).font('Helvetica-Bold').fillColor('#000');
  doc.text('Authorized By:', 50, currentY);

  currentY += 25;

  // Signature image (if exists)
  if (adminSettings?.signatureUrl) {
    try {
      doc.image(adminSettings.signatureUrl, 50, currentY, { width: 100, height: 40 });
    } catch (e) {
      doc.text('[Signature]', 50, currentY);
    }
  } else {
    doc.text('[Signature]', 50, currentY);
  }

  currentY += 45;

  // Admin details
  doc.fontSize(9).font('Helvetica-Bold').fillColor('#000');
  doc.text(adminSettings?.adminName || 'Administrator', 50, currentY);
  doc.fontSize(8).font('Helvetica').fillColor('#666');
  doc.text(adminSettings?.adminTitle || 'Certificate Authority', 50, currentY + 15);

  // Right side: Seal/Logo
  if (adminSettings?.logoUrl) {
    try {
      doc.image(adminSettings.logoUrl, pageWidth - 120, currentY, { width: 60, height: 60 });
    } catch (e) {
      // Fallback
    }
  }
}

/**
 * Generate Receipt & Payment Statement Page (Page 2)
 */
function generateReceiptPage(
  doc: PDFDocument,
  data: CertificateData
): void {
  const { investment, user, adminSettings } = data;
  const pageWidth = doc.page.width;

  let currentY = 40;

  // ===== RECEIPT HEADER =====
  doc.rect(40, currentY, pageWidth - 80, 35).fillAndStroke(THEME_COLORS.GREEN, THEME_COLORS.GREEN);
  doc.fontSize(18).font('Helvetica-Bold').fillColor('#fff');
  doc.text('PAYMENT RECEIPT & INVESTMENT STATEMENT', 50, currentY + 8, {
    width: pageWidth - 100,
    align: 'center',
  });

  currentY += 45;

  // Receipt number and date
  doc.fontSize(10).font('Helvetica-Bold').fillColor('#000');
  doc.text(`Receipt ID: INV-${investment._id}`, 50, currentY);
  doc.text(`Date: ${formatDate(new Date())}`, pageWidth - 150, currentY);

  currentY += 25;

  // ===== CUSTOMER INFORMATION =====
  drawBox(doc, 40, currentY, (pageWidth - 80) / 2 - 5, 70, 'INVESTOR', THEME_COLORS.BLUE);
  doc.fontSize(9).font('Helvetica').fillColor('#000');
  doc.text(user.name, 50, currentY + 25);
  doc.text(user.phone, 50, currentY + 40);
  doc.text(user.email, 50, currentY + 55);

  drawBox(doc, pageWidth / 2 + 5, currentY, (pageWidth - 80) / 2 - 5, 70, 'COMPANY', THEME_COLORS.ORANGE);
  doc.fontSize(9).font('Helvetica').fillColor('#000');
  doc.text(adminSettings?.companyName || 'Swar Yoga', pageWidth / 2 + 15, currentY + 25);
  doc.text(adminSettings?.companyAddress || '', pageWidth / 2 + 15, currentY + 40);
  doc.text(adminSettings?.companyEmail || '', pageWidth / 2 + 15, currentY + 55);

  currentY += 85;

  // ===== INVESTMENT SUMMARY TABLE =====
  drawBox(doc, 40, currentY, pageWidth - 80, 200, 'TRANSACTION DETAILS', THEME_COLORS.GREEN);
  currentY += 25;

  // Table headers
  const colX = [50, 200, 350, pageWidth - 90];
  doc.fontSize(9).font('Helvetica-Bold').fillColor('#fff');
  doc.rect(40, currentY - 20, pageWidth - 80, 20).fill(THEME_COLORS.BLUE);

  doc.fillColor('#fff');
  doc.text('Description', colX[0], currentY - 15);
  doc.text('Details', colX[1], currentY - 15);
  doc.text('Rate/Type', colX[2], currentY - 15);
  doc.text('Amount', colX[3], currentY - 15);

  currentY += 15;

  // Table rows
  const rows =
    investment.entity === ENTITIES.SWAR_SAKSHI
      ? [
          ['Investment Principal', `${investment.amount}`, 'Swar Sakshi', formatCurrency(investment.amount)],
          [
            'Interest Earned',
            `${investment.interestRate}%`,
            investment.compound ? 'Compound' : 'Simple',
            formatCurrency((investment.maturityAmount || 0) - investment.amount),
          ],
          ['Period', `${calculateYears(investment.startDate, investment.endDate)} Years`, formatDate(investment.startDate), formatDate(investment.endDate)],
          [
            'Total Payable',
            'On Maturity',
            formatDate(investment.endDate),
            formatCurrency(investment.maturityAmount || 0),
          ],
        ]
      : [
          ['Share Type', investment.shareType === SHARE_TYPES.PREFERENCE ? 'Preference' : 'Equity', `${investment.numberOfShares} Shares`, formatCurrency(investment.amount)],
          [
            'Annual Return',
            investment.shareType === SHARE_TYPES.PREFERENCE ? '12% Fixed' : '10% + Gains',
            formatCurrency(investment.sharePrice || 0),
            formatCurrency(investment.amount),
          ],
          ['Certificate No', `CERT-${investment.certificateNumber}`, 'Upamanyu Pvt Ltd', formatCurrency(investment.amount)],
          ['Status', 'ACTIVE', formatDate(investment.startDate), formatCurrency(investment.amount)],
        ];

  doc.fontSize(8).font('Helvetica').fillColor('#000');
  rows.forEach((row, idx) => {
    if (idx % 2 === 0) {
      doc.rect(40, currentY - 3, pageWidth - 80, 18).fill('#f5f5f5');
    }
    doc.fillColor('#000');
    doc.text(row[0], colX[0], currentY);
    doc.text(row[1], colX[1], currentY);
    doc.text(row[2], colX[2], currentY);
    doc.fillColor(THEME_COLORS.GREEN).font('Helvetica-Bold');
    doc.text(row[3], colX[3], currentY);
    currentY += 18;
  });

  currentY += 20;

  // ===== PAYMENT STATUS =====
  drawBox(doc, 40, currentY, pageWidth - 80, 60, 'PAYMENT STATUS', THEME_COLORS.RED);
  currentY += 25;

  doc.fontSize(10).font('Helvetica-Bold').fillColor(THEME_COLORS.GREEN);
  doc.text('✓ PAYMENT RECEIVED', 50, currentY);

  currentY += 18;
  doc.fontSize(9).font('Helvetica').fillColor('#000');
  doc.text(`Amount Received: ${formatCurrency(investment.amount)}`, 50, currentY);

  currentY += 18;
  doc.text(`Payment Date: ${formatDate(new Date())}`, 50, currentY);

  currentY += 40;

  // ===== RECEIPT NOTE =====
  doc.fontSize(8).font('Helvetica-Oblique').fillColor('#666');
  doc.text(adminSettings?.receiptNote || '', 50, currentY, {
    width: pageWidth - 100,
    align: 'center',
  });

  // ===== FOOTER SIGNATURE =====
  currentY = doc.page.height - 80;

  doc.fontSize(10).font('Helvetica-Bold').fillColor('#000');
  doc.text('Received By:', 50, currentY);
  doc.text('Customer:', pageWidth / 2 + 10, currentY);

  currentY += 40;

  doc.fontSize(9).fillColor('#666');
  doc.text(adminSettings?.adminName || 'Authorized Officer', 50, currentY);
  doc.text('_____________________', pageWidth / 2 + 10, currentY);
}

/**
 * Draw a colored box with title
 */
function drawBox(
  doc: PDFDocument,
  x: number,
  y: number,
  width: number,
  height: number,
  title: string,
  bgColor: string
): void {
  // Border
  doc.rect(x, y, width, height).stroke('#ddd');

  // Title bar
  doc.rect(x, y, width, 20).fillAndStroke(bgColor, bgColor);

  doc.fontSize(10).font('Helvetica-Bold').fillColor('#fff');
  doc.text(title, x + 10, y + 4, { width: width - 20 });
}
