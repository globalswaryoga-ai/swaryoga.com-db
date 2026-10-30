import { NextRequest, NextResponse } from 'next/server';
import { calculateInvestmentReturns, BASE_UNIT_AMOUNT } from '@/lib/bunnyInvestmentRepository';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /api/investment/calculate?amount=11000
 * Comprehensive Investment Calculator with Monthly %, Compound Interest & Benchmark Comparisons
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const amountParam = searchParams.get('amount');
    const amount = Math.max(Number(amountParam) || BASE_UNIT_AMOUNT, BASE_UNIT_AMOUNT);

    const baseData = calculateInvestmentReturns(amount);

    // Benchmarks calculation (10-year horizon)
    const bankFdRate = 0.065; // 6.5% standard bank FD compounding annually
    const ppfRate = 0.071;    // 7.1% Government PPF compounding annually
    const inflationRate = 0.060; // 6.0% CPI inflation

    const bankFdMaturity = Math.round(amount * Math.pow(1 + bankFdRate, 10));
    const ppfMaturity = Math.round(amount * Math.pow(1 + ppfRate, 10));
    const inflationErodedPrincipal = Math.round(amount / Math.pow(1 + inflationRate, 10));

    // Timeline Progression milestones (Year 1 to Year 10)
    const yearlyTimeline: Array<{
      year: number;
      accumulatedProfit: number;
      totalPortfolioValue: number;
      milestoneNote?: string;
    }> = [];
    const annualSimpleYield = baseData.profit10yr / 10;

    for (let yr = 1; yr <= 10; yr++) {
      const accumulatedProfit = Math.round(annualSimpleYield * yr);
      const totalAccrued = amount + accumulatedProfit;
      const milestoneNote =
        yr === 5
          ? `⭐ 5-Year Milestone: ₹${baseData.profit5yr.toLocaleString('en-IN')} Profit Payout Available`
          : yr === 10
          ? `🏆 10-Year Full Maturity: ₹${baseData.profit10yr.toLocaleString('en-IN')} Profit (Total ₹${baseData.maturityAmount.toLocaleString('en-IN')})`
          : undefined;

      yearlyTimeline.push({
        year: yr,
        accumulatedProfit,
        totalPortfolioValue: totalAccrued,
        milestoneNote,
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        ...baseData,
        annualSimpleYieldRatePct: 16.36,
        depositBookingAmount: Math.max(Math.floor((amount / BASE_UNIT_AMOUNT)) * 1000, 1000),
        remainingPaymentAmount: amount - Math.max(Math.floor((amount / BASE_UNIT_AMOUNT)) * 1000, 1000),
        benchmarks: {
          swarYoga: {
            title: 'Swar Yoga 10-Yr Growth',
            maturity: baseData.maturityAmount,
            profit: baseData.profit10yr,
            cagrPct: baseData.annualCagrPct,
            riskProfile: 'Yogic Community Backed / Fixed Agreement',
          },
          bankFixedDeposit: {
            title: 'Bank Fixed Deposit (6.5% Compounded)',
            maturity: bankFdMaturity,
            profit: bankFdMaturity - amount,
            cagrPct: 6.5,
            comparisonVsSwar: baseData.maturityAmount - bankFdMaturity,
          },
          publicProvidentFund: {
            title: 'Public Provident Fund / PPF (7.1% Compounded)',
            maturity: ppfMaturity,
            profit: ppfMaturity - amount,
            cagrPct: 7.1,
            comparisonVsSwar: baseData.maturityAmount - ppfMaturity,
          },
          purchasingPower: {
            title: 'If Kept Idle in Cash (6.0% Inflation erosion)',
            realValueAfter10Yrs: inflationErodedPrincipal,
          },
        },
        yearlyTimeline,
      },
    });
  } catch (error: any) {
    console.error('Error in GET /api/investment/calculate:', error);
    return NextResponse.json({ error: error?.message || 'Calculation error' }, { status: 500 });
  }
}
