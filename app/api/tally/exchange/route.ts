/**
 * Tally Data Exchange API
 * GET  /api/tally/exchange?fy=2025-26&format=xml|json  — Export data (Tally Prime compatible XML or JSON)
 * POST /api/tally/exchange  — Import data from Tally Prime XML or JSON
 */

import { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { apiError, apiSuccess } from '@/lib/api-error';
import { exportTallyXML, buildTallyXML, importTallyXML, exportTallyJSON, importTallyJSON, importExcelTally, importBankStatement } from '@/lib/tally/engine';
import { resolveTallyOwnerId, getTallyOwnerIdForWrite } from '@/lib/tally/access';

export const dynamic = 'force-dynamic';

function getAuth(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return null;
  try {
    return verifyToken(token);
  } catch { return null; }
}

/**
 * GET — Export accounting data in Tally Prime XML or JSON format
 */
export async function GET(request: NextRequest) {
  try {
    const decoded = getAuth(request);
    if (!decoded) return apiError('UNAUTHORIZED');

    const searchParams = request.nextUrl.searchParams;
    const fy = searchParams.get('fy') || '2023-24';
    const format = searchParams.get('format') || 'xml';
    const ownerId = resolveTallyOwnerId(decoded);

    if (format === 'xml') {
      const xml = await exportTallyXML(fy, ownerId);
      return new Response(xml, {
        status: 200,
        headers: {
          'Content-Type': 'application/xml; charset=utf-8',
          'Content-Disposition': `attachment; filename="TallyExport_FY${fy}.xml"`,
        },
      });
    } else if (format === 'json') {
      const json = await exportTallyJSON(fy, ownerId);
      return new Response(JSON.stringify(json, null, 2), {
        status: 200,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Content-Disposition': `attachment; filename="TallyExport_FY${fy}.json"`,
        },
      });
    } else {
      return apiError('VALIDATION_ERROR', 'format must be "xml" or "json"');
    }
  } catch (error: any) {
    console.error('[Tally Exchange GET]', error);
    return apiError('SERVER_ERROR', error.message);
  }
}

/**
 * POST — Import data from Tally Prime XML, JSON, or Excel (.xlsx)
 * Body: FormData with file (XML/JSON/XLSX) + fy (financial year)
 * OR: JSON body with { xmlContent, fy } for direct XML string import
 */
export async function POST(request: NextRequest) {
  try {
    const decoded = getAuth(request);
    if (!decoded || !(decoded as any).isAdmin) return apiError('UNAUTHORIZED');

    const contentType = request.headers.get('content-type') || '';
    let xmlContent = '';
    let fy = '2023-24';

    if (contentType.includes('multipart/form-data')) {
      // FormData upload
      const formData = await request.formData();
      const file = formData.get('file') as File | null;
      fy = (formData.get('fy') as string) || '2023-24';

      if (!file) return apiError('VALIDATION_ERROR', 'file is required');

      const fileName = file.name.toLowerCase();
      if (!fileName.endsWith('.xml') && !fileName.endsWith('.json') && !fileName.endsWith('.xlsx') && !fileName.endsWith('.xls') && !fileName.endsWith('.txt') && !fileName.endsWith('.pdf')) {
        return apiError('VALIDATION_ERROR', 'Only .xml, .json, .xlsx, .xls, .txt (bank statement) and .pdf files are supported');
      }

      // Max 50MB for data files
      if (file.size > 50 * 1024 * 1024) {
        return apiError('VALIDATION_ERROR', 'File size must be under 50MB');
      }

      // Bank Statement (.txt) — pre-extracted text from pdftotext
      if (fileName.endsWith('.txt')) {
        try {
          const text = await file.text();
          const bankName = (formData.get('bankName') as string) || 'Kotak Mahindra Bank';
          const fromTxn = parseInt((formData.get('fromTxn') as string) || '1');
          const toTxn = parseInt((formData.get('toTxn') as string) || '9999');
          const openingBalance = parseFloat((formData.get('openingBalance') as string) || '0');
          const writeOwnerId = getTallyOwnerIdForWrite(decoded);
          const result = await importBankStatement(text, bankName, fy, fromTxn, toTxn, openingBalance, (decoded as any)?.userId, writeOwnerId);
          return apiSuccess(result);
        } catch (e: any) {
          return apiError('VALIDATION_ERROR', `Bank statement import failed: ${e.message}`);
        }
      }

      // PDF Bank Statement — extract text using pdftotext then import
      if (fileName.endsWith('.pdf')) {
        try {
          const { execSync } = require('child_process');
          const fs = require('fs');
          const os = require('os');
          const path = require('path');

          // Save PDF to temp file
          const tmpDir = os.tmpdir();
          const tmpPdf = path.join(tmpDir, `bank_stmt_${Date.now()}.pdf`);
          const tmpTxt = path.join(tmpDir, `bank_stmt_${Date.now()}.txt`);
          const buffer = Buffer.from(await file.arrayBuffer());
          fs.writeFileSync(tmpPdf, buffer);

          // Extract text using pdftotext
          const pdfPassword = (formData.get('pdfPassword') as string) || '';
          const pwFlag = pdfPassword ? `-upw ${pdfPassword}` : '';
          execSync(`pdftotext ${pwFlag} -layout "${tmpPdf}" "${tmpTxt}"`, { timeout: 30000 });

          const text = fs.readFileSync(tmpTxt, 'utf-8');
          // Clean up temp files
          try { fs.unlinkSync(tmpPdf); fs.unlinkSync(tmpTxt); } catch {}

          const bankName = (formData.get('bankName') as string) || 'Kotak Mahindra Bank';
          const fromTxn = parseInt((formData.get('fromTxn') as string) || '1');
          const toTxn = parseInt((formData.get('toTxn') as string) || '9999');
          const openingBalance = parseFloat((formData.get('openingBalance') as string) || '0');

          const writeOwnerId = getTallyOwnerIdForWrite(decoded);
          const result = await importBankStatement(text, bankName, fy, fromTxn, toTxn, openingBalance, (decoded as any)?.userId, writeOwnerId);
          return apiSuccess(result);
        } catch (e: any) {
          return apiError('VALIDATION_ERROR', `PDF bank statement import failed: ${e.message}`);
        }
      }

      // Excel file — use dedicated Excel importer
      if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
        try {
          const buffer = Buffer.from(await file.arrayBuffer());
          const writeOwnerId = getTallyOwnerIdForWrite(decoded);
          const result = await importExcelTally(buffer, fy, (decoded as any)?.userId, writeOwnerId);
          return apiSuccess(result);
        } catch (e: any) {
          return apiError('VALIDATION_ERROR', `Excel import failed: ${e.message}`);
        }
      }

      xmlContent = await file.text();

      // If JSON file, convert to our internal format first
      if (fileName.endsWith('.json')) {
        try {
          const jsonData = JSON.parse(xmlContent);
          const writeOwnerId = getTallyOwnerIdForWrite(decoded);
          const result = await importTallyJSON(jsonData, fy, (decoded as any)?.userId, writeOwnerId);
          return apiSuccess(result);
        } catch (e: any) {
          return apiError('VALIDATION_ERROR', `Invalid JSON: ${e.message}`);
        }
      }
    } else {
      // JSON body with xmlContent
      const body = await request.json();
      xmlContent = body.xmlContent || body.xml || '';
      fy = body.fy || '2023-24';
    }

    if (!xmlContent) return apiError('VALIDATION_ERROR', 'No XML content provided');

    const writeOwnerId = getTallyOwnerIdForWrite(decoded);
    const result = await importTallyXML(xmlContent, fy, (decoded as any)?.userId, writeOwnerId);
    return apiSuccess(result);

  } catch (error: any) {
    console.error('[Tally Exchange POST]', error);
    return apiError('SERVER_ERROR', error.message);
  }
}
