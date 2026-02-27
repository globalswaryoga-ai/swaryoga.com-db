/**
 * Voucher Numbering Series API (Tally Prime Compatible)
 *
 * GET  /api/tally/numbering?fy=2024-25           — Get all numbering series for FY
 * PUT  /api/tally/numbering                       — Update a numbering series config
 * POST /api/tally/numbering                       — Reset counter for a series
 */

import { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { apiError, apiSuccess } from '@/lib/api-error';
import {
  getAllNumberingSeries,
  updateNumberingSeries,
  resetNumberingCounter,
  formatVoucherNumber,
} from '@/lib/tally/engine';

function getAuth(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return null;
  try {
    return verifyToken(token);
  } catch { return null; }
}

/**
 * GET — Fetch all numbering series configs for a financial year
 */
export async function GET(request: NextRequest) {
  try {
    const decoded = getAuth(request);
    if (!decoded) return apiError('UNAUTHORIZED');

    const fy = request.nextUrl.searchParams.get('fy') || '2024-25';
    const series = await getAllNumberingSeries(fy);

    return apiSuccess({ financialYear: fy, series });
  } catch (error: any) {
    console.error('[Numbering GET]', error);
    return apiError('SERVER_ERROR', error.message);
  }
}

/**
 * PUT — Update a numbering series configuration
 * Body: { voucherType, financialYear, prefix, suffix, separator, width, startingNumber, includeFYCode, fyPosition, method }
 */
export async function PUT(request: NextRequest) {
  try {
    const decoded = getAuth(request);
    if (!decoded || !(decoded as any).isAdmin) return apiError('UNAUTHORIZED');

    const body = await request.json();
    const { voucherType, financialYear, ...updates } = body;

    if (!voucherType || !financialYear) {
      return apiError('VALIDATION_ERROR', 'voucherType and financialYear are required');
    }

    const validTypes = ['RECEIPT', 'PAYMENT', 'JOURNAL', 'CONTRA', 'SALES', 'PURCHASE', 'DEBIT_NOTE', 'CREDIT_NOTE'];
    if (!validTypes.includes(voucherType)) {
      return apiError('VALIDATION_ERROR', `Invalid voucherType. Must be one of: ${validTypes.join(', ')}`);
    }

    // Sanitize updates — only allow safe fields
    const safeUpdates: Record<string, any> = {};
    if (updates.method !== undefined) safeUpdates.method = updates.method;
    if (updates.prefix !== undefined) safeUpdates.prefix = String(updates.prefix).trim();
    if (updates.suffix !== undefined) safeUpdates.suffix = String(updates.suffix).trim();
    if (updates.separator !== undefined) safeUpdates.separator = String(updates.separator);
    if (updates.startingNumber !== undefined) safeUpdates.startingNumber = Math.max(1, Number(updates.startingNumber) || 1);
    if (updates.width !== undefined) safeUpdates.width = Math.min(10, Math.max(1, Number(updates.width) || 4));
    if (updates.includeFYCode !== undefined) safeUpdates.includeFYCode = Boolean(updates.includeFYCode);
    if (updates.fyPosition !== undefined) safeUpdates.fyPosition = updates.fyPosition;

    const result = await updateNumberingSeries(voucherType, financialYear, safeUpdates);

    return apiSuccess({ message: 'Numbering series updated', series: result });
  } catch (error: any) {
    console.error('[Numbering PUT]', error);
    return apiError('SERVER_ERROR', error.message);
  }
}

/**
 * POST — Reset counter or preview
 * Body: { action: "reset" | "preview", voucherType, financialYear, resetTo?, previewConfig? }
 */
export async function POST(request: NextRequest) {
  try {
    const decoded = getAuth(request);
    if (!decoded || !(decoded as any).isAdmin) return apiError('UNAUTHORIZED');

    const body = await request.json();
    const { action, voucherType, financialYear } = body;

    if (action === 'preview') {
      // Generate a preview of what the next number would look like
      const config = body.config || {};
      const sampleNum = config.startingNumber || 1;
      const preview = formatVoucherNumber({
        prefix: config.prefix || '',
        suffix: config.suffix || '',
        separator: config.separator || '-',
        width: config.width || 4,
        includeFYCode: config.includeFYCode || false,
        fyPosition: config.fyPosition || 'after-prefix',
      }, sampleNum, financialYear || '2024-25');

      return apiSuccess({ preview });
    }

    if (action === 'reset') {
      if (!voucherType || !financialYear) {
        return apiError('VALIDATION_ERROR', 'voucherType and financialYear are required');
      }

      const resetTo = body.resetTo !== undefined ? Math.max(0, Number(body.resetTo) || 0) : 0;
      await resetNumberingCounter(voucherType, financialYear, resetTo);

      return apiSuccess({ message: `Counter reset to ${resetTo} for ${voucherType} in FY ${financialYear}` });
    }

    return apiError('VALIDATION_ERROR', 'action must be "reset" or "preview"');
  } catch (error: any) {
    console.error('[Numbering POST]', error);
    return apiError('SERVER_ERROR', error.message);
  }
}
