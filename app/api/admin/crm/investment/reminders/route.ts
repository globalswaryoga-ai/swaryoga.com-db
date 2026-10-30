import { NextRequest, NextResponse } from 'next/server';
import { listAllInvestments, InvestmentRecord } from '@/lib/bunnyInvestmentRepository';
import { verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /api/admin/crm/investment/reminders
 * Generates personalized reminder targets for investors with pending balance
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.slice(7)
      : (request.cookies.get('adminToken')?.value || request.cookies.get('token')?.value || request.cookies.get('crm_token')?.value);

    const decoded = verifyToken(token);
    if (!decoded?.isAdmin && !decoded?.userId) {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 401 });
    }

    const { investments } = await listAllInvestments({ paymentStatus: 'booking_paid', limit: 200 });

    const reminderList = (investments as InvestmentRecord[]).map((inv: InvestmentRecord) => {
      const cleanPhone = inv.phone.replace(/\D/g, '');
      const waPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
      const formattedDue = `₹${inv.remainingBalance.toLocaleString('en-IN')}`;
      const formattedTotal = `₹${inv.totalInvestmentAmount.toLocaleString('en-IN')}`;
      const formatted5Yr = `₹${inv.profit5yr.toLocaleString('en-IN')}`;
      const formatted10Yr = `₹${inv.profit10yr.toLocaleString('en-IN')}`;

      // Clean, respectful, yogic reminder text without emojis clutter
      const message = `🙏 सादर प्रणाम ${inv.investorName} जी, जय स्वर योग!

Swar Yoga 10-Year Growth Opportunity के तहत आपकी सीट (Cert No: ${inv.certificateNumber}) सफलतापूर्वक आरक्षित है।

📊 आपके निवेश का विवरण:
• कुल निवेश राशि: ${formattedTotal}
• प्राप्त बुकिंग राशि: ₹${inv.amountPaid.toLocaleString('en-IN')}
• शेष देय राशि: ${formattedDue}
• अंतिम भुगतान तिथि: ${inv.finalDeadline}

📈 मिलने वाले लाभ:
• 5 वर्ष बाद: ${formatted5Yr} लाभ
• 10 वर्ष बाद: ${formatted10Yr} लाभ (कुल परिपक्वता: ₹${inv.maturityAmount.toLocaleString('en-IN')})

कृपया अपनी सीट पक्की करने एवं अंतिम दस्तावेजीकरण (KYC) पूर्ण करने हेतु शेष राशि समय सीमा से पूर्व जमा करें:
👉 https://swaryoga.com/investment/dashboard?cert=${encodeURIComponent(inv.certificateNumber)}

धन्यवाद,
Swar Yoga Foundation`;

      const clickToChatUrl = `https://wa.me/${waPhone}?text=${encodeURIComponent(message)}`;

      return {
        id: inv.id,
        certificateNumber: inv.certificateNumber,
        investorName: inv.investorName,
        phone: inv.phone,
        waPhone,
        remainingBalance: inv.remainingBalance,
        finalDeadline: inv.finalDeadline,
        kycStatus: inv.kycStatus,
        personalizedMessage: message,
        clickToChatUrl,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        totalPendingInvestors: reminderList.length,
        totalPendingAmount: reminderList.reduce((sum, r) => sum + r.remainingBalance, 0),
        reminders: reminderList,
      },
    });
  } catch (error: any) {
    console.error('Error in GET /api/admin/crm/investment/reminders:', error);
    return NextResponse.json({ error: error?.message || 'Server error' }, { status: 500 });
  }
}

