import { NextRequest, NextResponse } from 'next/server';
import { getInvestmentById, updateInvestorKYC, InvestmentRecord } from '@/lib/bunnyInvestmentRepository';
import { getInvestorIdFromRequest } from '@/lib/investorSession';
import { getPaymentOptions, listInvestmentPayments } from '@/lib/bunnyInvestmentPortal';

export const dynamic = 'force-dynamic';

const mask = (value?: string, visible = 4) =>
  value ? `${'•'.repeat(Math.max(value.length - visible, 0))}${value.slice(-visible)}` : undefined;

function publicView(inv: InvestmentRecord) {
  const hasPan = Boolean(inv.panNumber);
  const hasAadhaar = Boolean(inv.aadhaarNumber);
  const hasBank = Boolean(inv.bankAccountNumber && inv.bankIfsc);
  const hasNominee = Boolean(inv.nomineeName);
  const profileComplete = hasPan && hasAadhaar && hasBank && hasNominee && Boolean(inv.postalAddress && inv.city && inv.state);
  return {
    id: inv.id,
    certificateNumber: inv.certificateNumber,
    investorName: inv.investorName,
    phone: inv.phone,
    email: inv.email || '',
    city: inv.city || '',
    state: inv.state || '',
    postalAddress: inv.postalAddress || '',
    totalInvestmentAmount: inv.totalInvestmentAmount,
    amountPaid: inv.amountPaid,
    remainingBalance: inv.remainingBalance,
    paymentStatus: inv.paymentStatus,
    kycStatus: inv.kycStatus,
    profileComplete,
    bookingDate: inv.bookingDate,
    finalDeadline: inv.finalDeadline,
    profit5yr: inv.profit5yr,
    profit10yr: inv.profit10yr,
    maturityAmount: inv.maturityAmount,
    nominee: {
      name: inv.nomineeName || '',
      relationship: inv.nomineeRelationship || '',
      phone: inv.nomineePhone || '',
    },
    bank: {
      accountHolder: inv.bankAccountHolder || '',
      bankName: inv.bankName || '',
      accountNumberMasked: mask(inv.bankAccountNumber),
      ifsc: inv.bankIfsc || '',
    },
    panMasked: mask(inv.panNumber),
    aadhaarMasked: mask(inv.aadhaarNumber),
  };
}

async function requireInvestor(request: NextRequest) {
  const id = getInvestorIdFromRequest(request);
  if (!id) return null;
  return getInvestmentById(id);
}

/** GET /api/investment/portal/me - the signed-in investor's dashboard data */
export async function GET(request: NextRequest) {
  try {
    const inv = await requireInvestor(request);
    if (!inv) return NextResponse.json({ error: 'Please sign in again' }, { status: 401 });

    const payments = await listInvestmentPayments(inv.id);
    return NextResponse.json({
      success: true,
      data: {
        investment: publicView(inv),
        options: getPaymentOptions(inv),
        payments: payments.map((p) => ({
          txnid: p.txnid,
          purpose: p.purpose,
          amount: p.amount,
          status: p.status,
          createdAt: p.createdAt,
        })),
      },
    });
  } catch (error: any) {
    console.error('Error in GET /api/investment/portal/me:', error);
    return NextResponse.json({ error: 'Could not load your dashboard' }, { status: 500 });
  }
}

/** PUT /api/investment/portal/me - update address, nominee and bank payout details */
export async function PUT(request: NextRequest) {
  try {
    const inv = await requireInvestor(request);
    if (!inv) return NextResponse.json({ error: 'Please sign in again' }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const clean = (v: unknown) => String(v ?? '').trim();

    const pan = clean(body.panNumber).toUpperCase();
    const aadhaar = clean(body.aadhaarNumber).replace(/\s/g, '');
    const ifsc = clean(body.bankIfsc).toUpperCase();
    const account = clean(body.bankAccountNumber);
    const confirmAccount = clean(body.confirmBankAccountNumber);
    const nomineePhone = clean(body.nomineePhone).replace(/\D/g, '').slice(-10);
    const nomineeAge = body.nomineeAge ? Number(body.nomineeAge) : undefined;

    if (pan && !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan)) return NextResponse.json({ error: 'PAN format is ABCDE1234F' }, { status: 400 });
    if (aadhaar && !/^[0-9]{12}$/.test(aadhaar)) return NextResponse.json({ error: 'Aadhaar must be 12 digits' }, { status: 400 });
    if (ifsc && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc)) return NextResponse.json({ error: 'IFSC format is ABCD0XXXXXX' }, { status: 400 });
    if (account && !/^[0-9]{6,18}$/.test(account)) return NextResponse.json({ error: 'Account number must be 6 to 18 digits' }, { status: 400 });
    if (account && account !== confirmAccount) return NextResponse.json({ error: 'Account numbers do not match' }, { status: 400 });
    if (nomineePhone && nomineePhone.length !== 10) return NextResponse.json({ error: 'Nominee phone must be 10 digits' }, { status: 400 });
    if (nomineeAge !== undefined && !(nomineeAge >= 1 && nomineeAge <= 120)) return NextResponse.json({ error: 'Nominee age is not valid' }, { status: 400 });

    await updateInvestorKYC({
      investmentId: inv.id,
      panNumber: pan || undefined,
      aadhaarNumber: aadhaar || undefined,
      bankAccountHolder: clean(body.bankAccountHolder) || undefined,
      bankName: clean(body.bankName) || undefined,
      bankAccountNumber: account || undefined,
      bankIfsc: ifsc || undefined,
      nomineeName: clean(body.nomineeName) || undefined,
      nomineeRelationship: clean(body.nomineeRelationship) || undefined,
      nomineeAge,
      nomineePhone: nomineePhone || undefined,
      postalAddress: clean(body.postalAddress) || undefined,
      city: clean(body.city) || undefined,
      state: clean(body.state) || undefined,
    });

    const updated = await getInvestmentById(inv.id);
    return NextResponse.json({ success: true, message: 'Profile saved', data: updated ? publicView(updated) : null });
  } catch (error: any) {
    console.error('Error in PUT /api/investment/portal/me:', error);
    return NextResponse.json({ error: 'Could not save your profile' }, { status: 500 });
  }
}
