/**
 * Tally Ledger API
 * GET  /api/tally/ledgers — List ledgers (with balance)
 * POST /api/tally/ledgers — Create a ledger
 */

import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { apiError, apiSuccess } from '@/lib/api-error';
import { getAccLedger, getAccGroup } from '@/lib/schemas/enterpriseSchemas';
import { calculateLedgerBalance, invalidateReportCache } from '@/lib/tally/engine';
import { resolveTallyOwnerId, getTallyOwnerIdForWrite } from '@/lib/tally/access';
import { scopeQuery } from '@/lib/tally/access';

export const dynamic = 'force-dynamic';


function getAuth(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return null;
  try {
    const decoded = verifyToken(token);
    return decoded;
  } catch { return null; }
}

export async function GET(request: NextRequest) {
  try {
    const decoded = getAuth(request);
    if (!decoded) return apiError('UNAUTHORIZED');

    await connectDB();
    const AccLedger = getAccLedger();

    const searchParams = request.nextUrl.searchParams;
    const fy = searchParams.get('fy') || '2023-24';
    const group = searchParams.get('group'); // ASSET, LIABILITY, etc.
    const withBalance = searchParams.get('withBalance') === 'true';

    const ownerId = resolveTallyOwnerId(decoded);
    const query: any = ownerId ? { financialYear: fy, isActive: true, ownerId } : { financialYear: fy, isActive: true };
    if (group) query.group = group;

    const ledgers = await AccLedger.find(query).sort({ group: 1, name: 1 }).lean();

    if (!withBalance) {
      return apiSuccess({
        ledgers: (ledgers as any[]).map(l => ({
          id: String(l._id),
          name: l.name,
          group: l.group,
          subGroup: l.subGroup,
          openingBalance: l.openingBalance,
          openingBalanceType: l.openingBalanceType,
          financialYear: l.financialYear,
        })),
        count: ledgers.length,
      });
    }

    // With balance calculation
    const ledgersWithBalance = await Promise.all(
      (ledgers as any[]).map(async (l) => {
        const bal = await calculateLedgerBalance(String(l._id), fy, undefined, undefined, ownerId);
        return {
          id: String(l._id),
          name: l.name,
          group: l.group,
          subGroup: l.subGroup,
          openingBalance: l.openingBalance,
          openingBalanceType: l.openingBalanceType,
          closingBalance: bal.closingBalance,
          closingBalanceType: bal.closingBalanceType,
          periodDebit: bal.periodDebit,
          periodCredit: bal.periodCredit,
        };
      })
    );

    return apiSuccess({ ledgers: ledgersWithBalance, count: ledgersWithBalance.length });
  } catch (error: any) {
    console.error('[Tally Ledgers GET]', error);
    return apiError('SERVER_ERROR', error.message);
  }
}

export async function POST(request: NextRequest) {
  try {
    const decoded = getAuth(request);
    if (!decoded) return apiError('UNAUTHORIZED');

    await connectDB();
    const AccLedger = getAccLedger();

    const body = await request.json();
    const { name, group, subGroup, openingBalance, openingBalanceType, financialYear, description, gstin, phone, email, address, state } = body;

    if (!name || !group || !financialYear) {
      return apiError('VALIDATION_ERROR', 'name, group, and financialYear are required');
    }

    const validGroups = ['ASSET', 'LIABILITY', 'INCOME', 'EXPENSE', 'CAPITAL'];
    if (!validGroups.includes(group)) {
      return apiError('VALIDATION_ERROR', `group must be one of: ${validGroups.join(', ')}`);
    }

    // Check duplicate
    const writeOwnerId = getTallyOwnerIdForWrite(decoded);
    const existing = await AccLedger.findOne(writeOwnerId ? { name: name.trim(), financialYear, ownerId: writeOwnerId } : { name: name.trim(), financialYear });
    if (existing) {
      return apiError('VALIDATION_ERROR', `Ledger "${name}" already exists for FY ${financialYear}`);
    }

    const ledger = await AccLedger.create({
      name: name.trim(),
      group,
      subGroup: subGroup || undefined,
      openingBalance: openingBalance || 0,
      openingBalanceType: openingBalanceType || 'DEBIT',
      financialYear,
      description,
      gstin, phone, email, address, state,
      createdByUserId: (decoded as any)?.userId,
      ownerId: getTallyOwnerIdForWrite(decoded),
    });

    invalidateReportCache(financialYear);

    return apiSuccess({
      id: String(ledger._id),
      name: ledger.name,
      group: ledger.group,
      message: `Ledger "${ledger.name}" created successfully`,
    }, 201);
  } catch (error: any) {
    console.error('[Tally Ledgers POST]', error);
    return apiError('SERVER_ERROR', error.message);
  }
}
