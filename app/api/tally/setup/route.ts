/**
 * Tally Setup API
 * POST /api/tally/setup — Seed default groups and create financial year
 */

import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { apiError, apiSuccess } from '@/lib/api-error';
import { getAccFinancialYear } from '@/lib/schemas/enterpriseSchemas';
import { seedDefaultGroups, seedGSTLedgers } from '@/lib/tally/engine';
import { resolveTallyOwnerId, getTallyOwnerIdForWrite } from '@/lib/tally/access';
import { scopeQuery } from '@/lib/tally/access';

export const dynamic = 'force-dynamic';


function getAuth(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return null;
  try {
    return verifyToken(token);
  } catch { return null; }
}

export async function POST(request: NextRequest) {
  try {
    const decoded = getAuth(request);
    if (!decoded) return apiError('UNAUTHORIZED');

    await connectDB();
    const AccFinancialYear = getAccFinancialYear();

    const body = await request.json();
    const { code, label, startDate, endDate, companyName } = body;

    if (!code || !startDate || !endDate) {
      return apiError('VALIDATION_ERROR', 'code (e.g. "2023-24"), startDate, and endDate are required');
    }

    // Create or find financial year
    const writeOwnerId = getTallyOwnerIdForWrite(decoded);
    let fy = await AccFinancialYear.findOne(writeOwnerId ? { code, ownerId: writeOwnerId } : { code });
    if (!fy) {
      // Mark all other FYs as not current
      await AccFinancialYear.updateMany(writeOwnerId ? { ownerId: writeOwnerId } : {}, { isCurrent: false });

      fy = await AccFinancialYear.create({
        code,
        label: label || `FY ${code}`,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        isCurrent: true,
        companyName: companyName || 'Upamnyu International Education Pvt. Ltd.',
        createdByUserId: (decoded as any)?.userId,
        ownerId: writeOwnerId,
      });
    }

    // Seed default groups
    const groups = await seedDefaultGroups(code, writeOwnerId);

    return apiSuccess({
      financialYear: {
        code: fy.code,
        label: fy.label,
        startDate: fy.startDate,
        endDate: fy.endDate,
        isCurrent: fy.isCurrent,
      },
      groups: {
        created: groups.created,
        total: groups.total,
      },
      message: `Financial Year ${code} setup complete. ${groups.created} default groups created.`,
    }, 201);
  } catch (error: any) {
    console.error('[Tally Setup POST]', error);
    return apiError('SERVER_ERROR', error.message);
  }
}

export async function GET(request: NextRequest) {
  try {
    const decoded = getAuth(request);
    if (!decoded) return apiError('UNAUTHORIZED');

    await connectDB();
    const AccFinancialYear = getAccFinancialYear();

    const ownerId = resolveTallyOwnerId(decoded);
    const years = await AccFinancialYear.find(ownerId ? { ownerId } : {}).sort({ code: -1 }).lean();

    return apiSuccess({
      financialYears: (years as any[]).map(y => ({
        id: String(y._id),
        code: y.code,
        label: y.label,
        startDate: y.startDate,
        endDate: y.endDate,
        isCurrent: y.isCurrent,
        isClosed: y.isClosed,
        companyName: y.companyName || '',
        businessType: y.businessType || '',
        legalName: y.legalName || '',
        tradeName: y.tradeName || '',
        ownerName: y.ownerName || '',
        fatherName: y.fatherName || '',
        designation: y.designation || '',
        gstin: y.gstin || '',
        pan: y.pan || '',
        tan: y.tan || '',
        cin: y.cin || '',
        udyam: y.udyam || '',
        phone: y.phone || '',
        altPhone: y.altPhone || '',
        email: y.email || '',
        website: y.website || '',
        address: y.address || '',
        city: y.city || '',
        state: y.state || '',
        pincode: y.pincode || '',
        country: y.country || 'India',
        bankName: y.bankName || '',
        bankAccountNo: y.bankAccountNo || '',
        bankIfsc: y.bankIfsc || '',
        bankBranch: y.bankBranch || '',
        logo: y.logo || '',
        notes: y.notes || '',
      })),
    });
  } catch (error: any) {
    console.error('[Tally Setup GET]', error);
    return apiError('SERVER_ERROR', error.message);
  }
}

// PATCH /api/tally/setup — Seed GST ledgers for a financial year
export async function PATCH(request: NextRequest) {
  try {
    const decoded = getAuth(request);
    if (!decoded) return apiError('UNAUTHORIZED');

    await connectDB();

    const body = await request.json();
    const { action, fy } = body;

    if (action === 'seed-gst' && fy) {
      const writeOwnerId = getTallyOwnerIdForWrite(decoded);
      const result = await seedGSTLedgers(fy, writeOwnerId);
      return apiSuccess({
        ...result,
        message: result.created > 0 ? `${result.created} GST ledgers created.` : 'GST ledgers already exist.',
      });
    }

    if (action === 'save-profile' && fy) {
      const AccFinancialYear = getAccFinancialYear();
      const profileFields = [
        'companyName', 'businessType', 'legalName', 'tradeName', 'ownerName', 'fatherName',
        'designation', 'gstin', 'pan', 'tan', 'cin', 'udyam',
        'phone', 'altPhone', 'email', 'website',
        'address', 'city', 'state', 'pincode', 'country',
        'bankName', 'bankAccountNo', 'bankIfsc', 'bankBranch', 'logo', 'notes',
      ];
      const update: Record<string, any> = {};
      for (const field of profileFields) {
        if (body[field] !== undefined) update[field] = body[field];
      }
      const writeOwnerId2 = getTallyOwnerIdForWrite(decoded);
      const updated = await AccFinancialYear.findOneAndUpdate(
        writeOwnerId2 ? { code: fy, ownerId: writeOwnerId2 } : { code: fy },
        { $set: update },
        { new: true }
      ).lean() as any;
      if (!updated) return apiError('NOT_FOUND', `FY ${fy} not found`);
      return apiSuccess({ message: 'Account profile saved successfully.', fy: updated.code });
    }

    if (action === 'toggle-lock' && fy) {
      const AccFinancialYear = getAccFinancialYear();
      const writeOwnerId3 = getTallyOwnerIdForWrite(decoded);
      const fyDoc = await AccFinancialYear.findOne(writeOwnerId3 ? { code: fy, ownerId: writeOwnerId3 } : { code: fy });
      if (!fyDoc) return apiError('NOT_FOUND', `FY ${fy} not found`);
      const newState = !(fyDoc as any).isClosed;
      await AccFinancialYear.updateOne(writeOwnerId3 ? { code: fy, ownerId: writeOwnerId3 } : { code: fy }, { $set: { isClosed: newState } });
      return apiSuccess({
        message: newState ? `FY ${fy} locked successfully.` : `FY ${fy} unlocked successfully.`,
        fy,
        isClosed: newState,
      });
    }

    return apiError('VALIDATION_ERROR', 'Invalid action. Use { action: "seed-gst", fy: "2023-24" }');
  } catch (error: any) {
    console.error('[Tally Setup PATCH]', error);
    return apiError('SERVER_ERROR', error.message);
  }
}
