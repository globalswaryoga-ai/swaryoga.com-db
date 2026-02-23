/**
 * Tally Prime CRM Dashboard API
 *
 * GET  /api/admin/crm/tally                   — dashboard summary
 * GET  /api/admin/crm/tally?action=test        — connection test
 * GET  /api/admin/crm/tally?action=ledgers     — all ledgers (optional ?group=Sundry Debtors)
 * GET  /api/admin/crm/tally?action=vouchers&type=Sales&from=20250401&to=20260331
 * GET  /api/admin/crm/tally?action=stock       — stock items
 * GET  /api/admin/crm/tally?action=daybook&from=20260223&to=20260223
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import {
  getTallyConfig,
  testTallyConnection,
  fetchDashboardSummary,
  fetchLedgers,
  fetchVouchers,
  fetchStockItems,
  fetchDayBook,
} from '@/lib/tally/tallyPrimeAPI';

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

export async function GET(request: NextRequest) {
  try {
    // Auth check — admin only
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return unauthorized();
    const decoded = verifyToken(authHeader.split(' ')[1]);
    if (!decoded || !decoded.isAdmin) return unauthorized();

    await connectDB();

    const { searchParams } = request.nextUrl;
    const action = searchParams.get('action') || 'dashboard';

    // Return current config status (never expose password)
    const config = getTallyConfig();
    const configStatus = {
      url: config.url,
      companyName: config.companyName || '(not set)',
      serialNumber: config.serialNumber ? '••••' + config.serialNumber.slice(-4) : '(not set)',
      email: config.email || '(not set)',
      configured: config.configured,
    };

    switch (action) {
      case 'test': {
        const result = await testTallyConnection();
        return NextResponse.json({ success: true, config: configStatus, connection: result });
      }

      case 'ledgers': {
        const group = searchParams.get('group') || undefined;
        const ledgers = await fetchLedgers(group);
        return NextResponse.json({ success: true, count: ledgers.length, ledgers });
      }

      case 'vouchers': {
        const type = searchParams.get('type') || 'Sales';
        const from = searchParams.get('from') || undefined;
        const to = searchParams.get('to') || undefined;
        const vouchers = await fetchVouchers(type, from, to);
        return NextResponse.json({ success: true, count: vouchers.length, vouchers });
      }

      case 'stock': {
        const items = await fetchStockItems();
        return NextResponse.json({ success: true, count: items.length, items });
      }

      case 'daybook': {
        const from = searchParams.get('from') || undefined;
        const to = searchParams.get('to') || undefined;
        const vouchers = await fetchDayBook(from, to);
        return NextResponse.json({ success: true, count: vouchers.length, vouchers });
      }

      case 'dashboard':
      default: {
        const summary = await fetchDashboardSummary();
        return NextResponse.json({ success: true, config: configStatus, summary });
      }
    }
  } catch (error: any) {
    console.error('[Tally API Error]', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 },
    );
  }
}
