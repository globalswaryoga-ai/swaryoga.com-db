/**
 * Investment Calculations & Utility Functions
 * Handles interest, dividend, and compound calculations
 */

import { CALCULATION } from '@/lib/investment-constants';

// ============ SIMPLE INTEREST CALCULATION ============
/**
 * Simple Interest = (P * R * T) / 100
 * P = Principal (amount)
 * R = Rate per annum (%)
 * T = Time period (years)
 */
export function calculateSimpleInterest(
  amount: number,
  ratePercentage: number,
  years: number
): {
  interest: number;
  total: number;
  yearly: Array<{ year: number; principalPaid: number; interest: number; total: number }>;
} {
  const interest = (amount * ratePercentage * years) / 100;
  const total = amount + interest;

  // Calculate yearly breakdown
  const yearly: { year: number; principalPaid: number; interest: number; total: number }[] = [];
  for (let year = 1; year <= years; year++) {
    const yearlyInterest = (amount * ratePercentage * 1) / 100;
    yearly.push({
      year,
      principalPaid: year === years ? amount : 0,
      interest: yearlyInterest,
      total: yearlyInterest + (year === years ? amount : 0),
    });
  }

  return { interest, total, yearly };
}

// ============ COMPOUND INTEREST CALCULATION ============
/**
 * Compound Interest = A = P(1 + R/100)^T
 * P = Principal
 * R = Rate per annum (%)
 * T = Time period (years)
 * CI = A - P
 */
export function calculateCompoundInterest(
  amount: number,
  ratePercentage: number,
  years: number
): {
  finalAmount: number;
  compoundInterest: number;
  yearly: Array<{ year: number; amount: number; interest: number }>;
} {
  const finalAmount = amount * Math.pow(1 + ratePercentage / 100, years);
  const compoundInterest = finalAmount - amount;

  // Calculate yearly breakdown
  const yearly: { year: number; amount: number; interest: number }[] = [];
  let previousAmount = amount;
  for (let year = 1; year <= years; year++) {
    const currentAmount = amount * Math.pow(1 + ratePercentage / 100, year);
    const yearlyInterest = currentAmount - previousAmount;
    yearly.push({
      year,
      amount: currentAmount,
      interest: yearlyInterest,
    });
    previousAmount = currentAmount;
  }

  return {
    finalAmount: Math.round(finalAmount * 100) / 100,
    compoundInterest: Math.round(compoundInterest * 100) / 100,
    yearly,
  };
}

// ============ PREFERENCE SHARE DIVIDEND CALCULATION ============
/**
 * Preference Dividend = Amount * 12% (fixed per year)
 */
export function calculatePreferenceDividend(
  amount: number,
  years: number
): {
  yearlyDividend: number;
  totalDividend: number;
  yearly: Array<{ year: number; dividend: number; totalReceived: number }>;
} {
  const yearlyDividend = amount * CALCULATION.PREFERENCE_DIVIDEND_RATE;
  const totalDividend = yearlyDividend * years;

  const yearly: { year: number; dividend: number; totalReceived: number }[] = [];
  for (let year = 1; year <= years; year++) {
    yearly.push({
      year,
      dividend: yearlyDividend,
      totalReceived: yearlyDividend * year,
    });
  }

  return {
    yearlyDividend: Math.round(yearlyDividend * 100) / 100,
    totalDividend: Math.round(totalDividend * 100) / 100,
    yearly,
  };
}

// ============ EQUITY SHARE RETURNS CALCULATION ============
/**
 * Equity Returns = 10% annual + capital appreciation
 * Assumes capital appreciation based on company growth
 */
export function calculateEquityReturns(
  amount: number,
  years: number,
  capitalAppreciationRate: number = 0.05 // 5% additional appreciation
): {
  annualReturn: number;
  totalCapitalGain: number;
  finalValue: number;
  yearly: Array<{ year: number; dividend: number; capitalGain: number; totalValue: number }>;
} {
  const annualReturn = amount * CALCULATION.EQUITY_ANNUAL_RATE;
  const capitalGainRate = 1 + capitalAppreciationRate;
  const finalValue = amount * Math.pow(capitalGainRate, years);
  const totalCapitalGain = finalValue - amount;

  const yearly: { year: number; dividend: number; capitalGain: number; totalValue: number }[] = [];
  for (let year = 1; year <= years; year++) {
    const annualDividend = annualReturn;
    const currentValue = amount * Math.pow(capitalGainRate, year);
    const cumulativeCapitalGain = currentValue - amount;
    yearly.push({
      year,
      dividend: annualDividend,
      capitalGain: cumulativeCapitalGain,
      totalValue: currentValue,
    });
  }

  return {
    annualReturn: Math.round(annualReturn * 100) / 100,
    totalCapitalGain: Math.round(totalCapitalGain * 100) / 100,
    finalValue: Math.round(finalValue * 100) / 100,
    yearly,
  };
}

// ============ CALCULATE INVESTMENT YEARS ============
export function calculateYears(startDate: Date, endDate: Date): number {
  const diffTime = endDate.getTime() - startDate.getTime();
  const diffDays = diffTime / (1000 * 60 * 60 * 24);
  return Math.round((diffDays / 365) * 100) / 100; // 2 decimal places
}

// ============ VALIDATE DATES ============
export function validateInvestmentDates(
  startDate: Date,
  endDate: Date
): { valid: boolean; error?: string } {
  if (!startDate || !endDate) {
    return { valid: false, error: 'Both start and end dates are required' };
  }

  if (startDate >= endDate) {
    return { valid: false, error: 'End date must be after start date' };
  }

  const minYears = 0.25; // 3 months
  const years = calculateYears(startDate, endDate);
  if (years < minYears) {
    return { valid: false, error: 'Investment period must be at least 3 months' };
  }

  return { valid: true };
}

// ============ FORMAT CURRENCY ============
export function formatCurrency(amount: number, currency: string = '₹'): string {
  // Server-safe number formatting (avoids toLocaleString)
  const formatted = amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${currency}${formatted}`;
}

// ============ FORMAT DATE ============
export function formatDate(date: Date | string | undefined | null): string {
  if (!date) return 'N/A';
  
  const d = typeof date === 'string' ? new Date(date) : date;
  
  // Check if date is valid
  if (!(d instanceof Date) || isNaN(d.getTime())) {
    return 'Invalid Date';
  }
  
  // Server-safe date formatting (avoids toLocaleDateString)
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const year = d.getFullYear();
  const month = months[d.getMonth()];
  const day = d.getDate();
  
  return `${day} ${month} ${year}`;
}

// ============ VALIDATE PHONE NUMBER ============
export function validatePhoneNumber(phone: string): boolean {
  const phoneRegex = /^[6-9]\d{9}$/;
  return phoneRegex.test(phone.replace(/\D/g, ''));
}

// ============ VALIDATE EMAIL ============
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// ============ CALCULATE MATURITY AMOUNT ============
export function calculateMaturityAmount(
  amount: number,
  ratePercentage: number,
  years: number,
  isCompound: boolean
): number {
  if (isCompound) {
    return calculateCompoundInterest(amount, ratePercentage, years).finalAmount;
  } else {
    return calculateSimpleInterest(amount, ratePercentage, years).total;
  }
}

// ============ LOT CALCULATIONS (UPAMANYU EQUITY) ============
/**
 * Calculate lot details for equity shares
 * 1 Lot = 110 shares @ current share price
 * Example: ₹12,100 = 110 shares @ ₹110
 */
export function calculateEquityLots(
  numberOfLots: number,
  currentSharePrice: number = 110
): {
  numberOfShares: number;
  sharesPerLot: number;
  lotPrice: number;
  totalAmount: number;
  profitIfPriceChanges: (newPrice: number) => number;
} {
  const SHARES_PER_LOT = 110;
  const numberOfShares = numberOfLots * SHARES_PER_LOT;
  const lotPrice = SHARES_PER_LOT * currentSharePrice;
  const totalAmount = numberOfLots * lotPrice;

  return {
    numberOfShares,
    sharesPerLot: SHARES_PER_LOT,
    lotPrice,
    totalAmount,
    profitIfPriceChanges: (newPrice: number) => {
      const newTotalValue = numberOfShares * newPrice;
      return newTotalValue - totalAmount;
    },
  };
}

// ============ SHARE PRICE PROFIT CALCULATION ============
/**
 * Calculate profit/loss based on share price change
 * Updated quarterly by CA
 * Used for equity shares only
 */
export function calculateSharePriceProfit(
  numberOfShares: number,
  buyPrice: number,
  currentPrice: number
): {
  buyValue: number;
  currentValue: number;
  profit: number;
  profitPercentage: number;
  gainPerShare: number;
} {
  const buyValue = numberOfShares * buyPrice;
  const currentValue = numberOfShares * currentPrice;
  const profit = currentValue - buyValue;
  const profitPercentage = (profit / buyValue) * 100;
  const gainPerShare = currentPrice - buyPrice;

  return {
    buyValue: Math.round(buyValue * 100) / 100,
    currentValue: Math.round(currentValue * 100) / 100,
    profit: Math.round(profit * 100) / 100,
    profitPercentage: Math.round(profitPercentage * 100) / 100,
    gainPerShare: Math.round(gainPerShare * 100) / 100,
  };
}

// ============ DIVIDEND ELIGIBILITY CHECK ============
/**
 * Check if investor is eligible for dividend
 * Equity holders need to hold for minimum 12 months
 * Preference shareholders are eligible from day 1
 */
export function checkDividendEligibility(
  investmentStartDate: Date | string,
  shareType: 'equity' | 'preference',
  currentDate: Date = new Date()
): {
  isEligible: boolean;
  holdingMonths: number;
  requiredMonths: number;
  monthsRemaining: number;
  eligibleFrom: Date;
} {
  const startDate = typeof investmentStartDate === 'string' 
    ? new Date(investmentStartDate) 
    : investmentStartDate;

  // Preference shares are eligible from day 1
  if (shareType === 'preference') {
    return {
      isEligible: true,
      holdingMonths: 0,
      requiredMonths: 0,
      monthsRemaining: 0,
      eligibleFrom: startDate,
    };
  }

  // Equity shares need 12 months holding
  const holdingMilliseconds = currentDate.getTime() - startDate.getTime();
  const holdingMonths = Math.floor(holdingMilliseconds / (1000 * 60 * 60 * 24 * 30.44));
  
  const eligibleFrom = new Date(startDate);
  eligibleFrom.setMonth(eligibleFrom.getMonth() + 12);
  
  const requiredMonths = 12;
  const monthsRemaining = Math.max(0, requiredMonths - holdingMonths);
  const isEligible = holdingMonths >= requiredMonths;

  return {
    isEligible,
    holdingMonths,
    requiredMonths,
    monthsRemaining,
    eligibleFrom,
  };
}

// ============ QUARTERLY DIVIDEND CALCULATION ============
/**
 * Calculate quarterly dividend for equity shares (after 1 year)
 * Dividend = Amount × 10% / 4 quarters
 */
export function calculateQuarterlyDividend(
  amount: number,
  quarterNumber: number = 1
): {
  quarterlyDividend: number;
  annualDividend: number;
  cumulativeUpToQuarter: number;
} {
  const annualDividend = amount * 0.10; // 10% p.a.
  const quarterlyDividend = Math.round((annualDividend / 4) * 100) / 100;
  const cumulativeUpToQuarter = quarterlyDividend * Math.min(quarterNumber, 4);

  return {
    quarterlyDividend,
    annualDividend: Math.round(annualDividend * 100) / 100,
    cumulativeUpToQuarter: Math.round(cumulativeUpToQuarter * 100) / 100,
  };
}

// ============ TOTAL EQUITY RETURN CALCULATION ============
/**
 * Calculate total return for equity shares
 * = Capital Gain (from share price) + Dividend (after 1 year)
 */
export function calculateTotalEquityReturn(
  numberOfShares: number,
  buyPrice: number,
  currentPrice: number,
  holdingMonths: number,
  hasReceivedDividend: boolean = false
): {
  capitalGain: number;
  dividendReceived: number;
  totalReturn: number;
  totalReturnPercentage: number;
  breakdown: {
    capitalGain: string;
    dividend: string;
    total: string;
  };
} {
  const buyValue = numberOfShares * buyPrice;
  const currentValue = numberOfShares * currentPrice;
  const capitalGain = currentValue - buyValue;

  // Dividend only if held for 12 months and received
  const isEligibleForDividend = holdingMonths >= 12;
  let dividendReceived = 0;
  
  if (isEligibleForDividend && hasReceivedDividend) {
    const annualDividend = buyValue * 0.10; // 10% of invested amount
    // Calculate full years of dividend
    const completedYears = Math.floor(holdingMonths / 12);
    dividendReceived = annualDividend * completedYears;
  }

  const totalReturn = capitalGain + dividendReceived;
  const totalReturnPercentage = (totalReturn / buyValue) * 100;

  return {
    capitalGain: Math.round(capitalGain * 100) / 100,
    dividendReceived: Math.round(dividendReceived * 100) / 100,
    totalReturn: Math.round(totalReturn * 100) / 100,
    totalReturnPercentage: Math.round(totalReturnPercentage * 100) / 100,
    breakdown: {
      capitalGain: `Capital Gain: ${formatCurrency(Math.round(capitalGain * 100) / 100)}`,
      dividend: `Dividend Received: ${formatCurrency(Math.round(dividendReceived * 100) / 100)}`,
      total: `Total Return: ${formatCurrency(Math.round(totalReturn * 100) / 100)}`,
    },
  };
}
