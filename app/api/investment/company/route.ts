/**
 * API Route: Get Company Investment Info
 * GET /api/investment/company
 * Returns current share prices and company details
 */

import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Return current share prices
    // These can be updated quarterly by CA
    const companyInfo = {
      equityPrice: 110, // ₹110 per share (updated quarterly)
      equityPriceLastUpdated: new Date('2026-01-01'),
      preferencePrice: 10, // ₹10 per share (fixed)
      equityLotsPerUnit: 110, // 110 shares per lot = ₹12,100
      lotPrice: 12100, // 110 shares × ₹110 = ₹12,100 per lot
      companyName: 'Upamanyu Private Limited',
      dividendEligibilityMonths: 12, // Need to hold for 12 months for dividend
      priceUpdateFrequency: 'quarterly', // Updated every 3 months by CA
      nextPriceUpdate: new Date('2026-04-01'),
    };

    return NextResponse.json(companyInfo);
  } catch (error) {
    console.error('Error fetching company info:', error);
    return NextResponse.json(
      { error: 'Failed to fetch company information' },
      { status: 500 }
    );
  }
}
