import { NextRequest, NextResponse } from 'next/server';
import { updateInvestorKYC, getInvestmentById, getInvestmentByCertificate, InvestmentRecord } from '@/lib/bunnyInvestmentRepository';
import { uploadToBunnyStorage } from '@/lib/bunny-storage';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const maxDuration = 60;

/**
 * POST /api/investment/kyc
 * Submit or Update Investor KYC (PAN, Aadhaar, Bank Details, Nominee)
 * Supports JSON (with URLs or base64 data) or multipart/form-data
 */
export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';

    let investmentId = '';
    let certNo = '';
    let panNumber = '';
    let panDocUrl = '';
    let aadhaarNumber = '';
    let aadhaarFrontDocUrl = '';
    let aadhaarBackDocUrl = '';
    let bankAccountHolder = '';
    let bankName = '';
    let bankAccountNumber = '';
    let bankIfsc = '';
    let nomineeName = '';
    let nomineeRelationship = '';
    let nomineeAge: number | undefined;
    let nomineePhone = '';
    let postalAddress = '';
    let city = '';
    let state = '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      investmentId = formData.get('investmentId')?.toString() || '';
      certNo = formData.get('certificateNumber')?.toString() || '';
      panNumber = formData.get('panNumber')?.toString() || '';
      aadhaarNumber = formData.get('aadhaarNumber')?.toString() || '';
      bankAccountHolder = formData.get('bankAccountHolder')?.toString() || '';
      bankName = formData.get('bankName')?.toString() || '';
      bankAccountNumber = formData.get('bankAccountNumber')?.toString() || '';
      bankIfsc = formData.get('bankIfsc')?.toString() || '';
      nomineeName = formData.get('nomineeName')?.toString() || '';
      nomineeRelationship = formData.get('nomineeRelationship')?.toString() || '';
      nomineePhone = formData.get('nomineePhone')?.toString() || '';
      postalAddress = formData.get('postalAddress')?.toString() || '';
      city = formData.get('city')?.toString() || '';
      state = formData.get('state')?.toString() || '';

      const ageStr = formData.get('nomineeAge')?.toString();
      if (ageStr) nomineeAge = parseInt(ageStr, 10);

      // Upload PAN file if provided
      const panFile = formData.get('panFile') as File | null;
      if (panFile && panFile.size > 0) {
        const buffer = Buffer.from(await panFile.arrayBuffer());
        panDocUrl = await uploadToBunnyStorage(buffer, `kyc_pan_${Date.now()}_${panFile.name}`);
      }

      // Upload Aadhaar Front file if provided
      const aadhaarFront = formData.get('aadhaarFrontFile') as File | null;
      if (aadhaarFront && aadhaarFront.size > 0) {
        const buffer = Buffer.from(await aadhaarFront.arrayBuffer());
        aadhaarFrontDocUrl = await uploadToBunnyStorage(buffer, `kyc_aadhaar_front_${Date.now()}_${aadhaarFront.name}`);
      }

      // Upload Aadhaar Back file if provided
      const aadhaarBack = formData.get('aadhaarBackFile') as File | null;
      if (aadhaarBack && aadhaarBack.size > 0) {
        const buffer = Buffer.from(await aadhaarBack.arrayBuffer());
        aadhaarBackDocUrl = await uploadToBunnyStorage(buffer, `kyc_aadhaar_back_${Date.now()}_${aadhaarBack.name}`);
      }
    } else {
      const body = await request.json().catch(() => ({}));
      investmentId = body.investmentId || '';
      certNo = body.certificateNumber || '';
      panNumber = body.panNumber || '';
      panDocUrl = body.panDocUrl || '';
      aadhaarNumber = body.aadhaarNumber || '';
      aadhaarFrontDocUrl = body.aadhaarFrontDocUrl || '';
      aadhaarBackDocUrl = body.aadhaarBackDocUrl || '';
      bankAccountHolder = body.bankAccountHolder || '';
      bankName = body.bankName || '';
      bankAccountNumber = body.bankAccountNumber || '';
      bankIfsc = body.bankIfsc || '';
      nomineeName = body.nomineeName || '';
      nomineeRelationship = body.nomineeRelationship || '';
      nomineePhone = body.nomineePhone || '';
      nomineeAge = body.nomineeAge ? Number(body.nomineeAge) : undefined;
      postalAddress = body.postalAddress || '';
      city = body.city || '';
      state = body.state || '';

      // Handle Base64 file upload if passed
      if (body.panBase64 && !panDocUrl) {
        const base64Data = body.panBase64.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        panDocUrl = await uploadToBunnyStorage(buffer, `kyc_pan_${Date.now()}.jpg`);
      }
      if (body.aadhaarFrontBase64 && !aadhaarFrontDocUrl) {
        const base64Data = body.aadhaarFrontBase64.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        aadhaarFrontDocUrl = await uploadToBunnyStorage(buffer, `kyc_aadhaar_f_${Date.now()}.jpg`);
      }
      if (body.aadhaarBackBase64 && !aadhaarBackDocUrl) {
        const base64Data = body.aadhaarBackBase64.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        aadhaarBackDocUrl = await uploadToBunnyStorage(buffer, `kyc_aadhaar_b_${Date.now()}.jpg`);
      }
    }

    // Resolve Investment Record
    let record: InvestmentRecord | null = null;
    if (investmentId) {
      record = await getInvestmentById(investmentId);
    } else if (certNo) {
      record = await getInvestmentByCertificate(certNo);
    }

    if (!record) {
      return NextResponse.json({ error: 'Investment record not found with provided ID/Certificate' }, { status: 404 });
    }

    const updated = await updateInvestorKYC({
      investmentId: record.id,
      panNumber,
      panDocUrl: panDocUrl || undefined,
      aadhaarNumber,
      aadhaarFrontDocUrl: aadhaarFrontDocUrl || undefined,
      aadhaarBackDocUrl: aadhaarBackDocUrl || undefined,
      bankAccountHolder,
      bankName,
      bankAccountNumber,
      bankIfsc,
      nomineeName,
      nomineeRelationship,
      nomineeAge,
      nomineePhone,
      postalAddress,
      city,
      state,
    });

    return NextResponse.json({
      success: true,
      data: updated,
      message: '✅ Investor KYC documents & bank payout details submitted successfully! Status: Under Verification.',
    });
  } catch (error: any) {
    console.error('Error in POST /api/investment/kyc:', error);
    return NextResponse.json({ error: error?.message || 'KYC submission failed' }, { status: 500 });
  }
}
