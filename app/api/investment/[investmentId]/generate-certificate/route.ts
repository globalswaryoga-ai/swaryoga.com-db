/**
 * API Route: Generate & Download Investment Certificate + Receipt
 * GET /api/investment/[investmentId]/generate-certificate
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { getInvestment } from '@/lib/schemas/investmentSchemas';
import { getAdminSettings } from '@/lib/schemas/enterpriseSchemas';
import { generateInvestmentCertificate } from '@/lib/certificate-generator';

export async function GET(
  request: NextRequest,
  { params }: { params: { investmentId: string } }
) {
  try {
    // Connect to database
    await connectDB();

    const investmentId = params.investmentId;

    // Get investment
    const Investment = getInvestment();
    const investment = await Investment.findById(investmentId).populate('userId');

    if (!investment) {
      return NextResponse.json({ error: 'Investment not found' }, { status: 404 });
    }

    // Get user data
    const user = investment.userId;

    // Get KYC data
    let kyc = null;
    if (investment.kycId) {
      const KYC = require('@/lib/schemas/enterpriseSchemas').getKYC();
      kyc = await KYC.findById(investment.kycId);
    }

    // Get admin settings
    const AdminSettings = getAdminSettings();
    const adminSettings = await AdminSettings.findOne();

    // Get payment data (optional - for additional details)
    let payment = null;
    if (investment.paymentId) {
      const Payment = require('@/lib/schemas/enterpriseSchemas').getPayment();
      payment = await Payment.findById(investment.paymentId);
    }

    // Generate PDF
    const pdfDoc = generateInvestmentCertificate({
      investment,
      user: {
        name: user.name,
        email: user.email,
        phone: user.phone,
        address: user.address,
      },
      kyc: kyc ? { aadharNumber: kyc.aadharNumber, panNumber: kyc.panNumber } : undefined,
      adminSettings: adminSettings
        ? {
            companyName: adminSettings.companyName,
            companyAddress: adminSettings.companyAddress,
            companyPhone: adminSettings.companyPhone,
            companyEmail: adminSettings.companyEmail,
            logoUrl: adminSettings.logoUrl,
            signatureUrl: adminSettings.signatureUrl,
            adminName: adminSettings.adminName,
            adminTitle: adminSettings.adminTitle,
            certificateNote: adminSettings.certificateNote,
            receiptNote: adminSettings.receiptNote,
          }
        : undefined,
    });

    // Generate PDF buffer
    const chunks: Buffer[] = [];
    const promise = new Promise<Buffer>((resolve, reject) => {
      pdfDoc.on('data', (chunk: Buffer) => chunks.push(chunk));
      pdfDoc.on('end', () => resolve(Buffer.concat(chunks)));
      pdfDoc.on('error', reject);
    });

    pdfDoc.end();
    const pdfBuffer = await promise;

    // Return PDF as downloadable file
    const filename = `Certificate_${investment.certificateNumber || investmentId}.pdf`;

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (error: any) {
    console.error('PDF generation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate certificate' },
      { status: 500 }
    );
  }
}
