import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin, getViewerUserId } from '@/lib/crm-handlers';
import { BankStatement, BankIncomeEntry } from '@/lib/schemas/enterpriseSchemas';
import { uploadAdminFile } from '@/lib/bunny-storage';
import PDFParser from 'pdf2json';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function verifyAdmin(request: NextRequest) {
  const token = request.headers.get('authorization')?.slice('Bearer '.length);
  const decoded = verifyToken(token);
  if (!decoded?.isAdmin) throw new Error('Unauthorized');
  if (!isSuperAdmin(decoded)) throw new Error('Forbidden');
  return decoded;
}

const MONTH_NAMES: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

function parseStatementDate(token: string): Date | null {
  let m = token.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
  if (m) {
    const day = parseInt(m[1], 10);
    const month = parseInt(m[2], 10);
    let year = parseInt(m[3], 10);
    if (year < 100) year += 2000;
    const date = new Date(year, month - 1, day);
    return isNaN(date.getTime()) ? null : date;
  }

  m = token.match(/^(\d{1,2})[\s\-]([A-Za-z]{3,9})[\s\-]?(\d{2,4})$/);
  if (m) {
    const day = parseInt(m[1], 10);
    const month = MONTH_NAMES[m[2].toLowerCase().slice(0, 3)];
    if (month === undefined) return null;
    let year = parseInt(m[3], 10);
    if (year < 100) year += 2000;
    const date = new Date(year, month, day);
    return isNaN(date.getTime()) ? null : date;
  }

  return null;
}

const DATE_RE = /^\s*(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}|\d{1,2}[\s\-][A-Za-z]{3,9}[\s\-]?\d{2,4})/;
const AMOUNT_RE = /\d{1,3}(?:,\d{2,3})*(?:\.\d{1,2})?/g;
const CREDIT_RE = /\b(cr|credit|deposit)\b/i;
const DEBIT_RE = /\b(dr|debit|withdrawal)\b/i;

interface ExtractedEntry {
  date: Date;
  month: string;
  description: string;
  amount: number;
}

function extractIncomeEntries(text: string): ExtractedEntry[] {
  const lines = text.split(/\r?\n/);
  const entries: ExtractedEntry[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    const dateMatch = line.match(DATE_RE);
    if (!dateMatch) continue;

    const date = parseStatementDate(dateMatch[1]);
    if (!date) continue;

    const rest = line.slice(dateMatch[0].length).trim();
    if (!rest) continue;

    // Only keep rows with an explicit credit marker — debit rows and
    // ambiguous lines are skipped to avoid polluting the tag queue.
    if (!CREDIT_RE.test(rest) || DEBIT_RE.test(rest)) continue;

    const amounts = rest.match(AMOUNT_RE) || [];
    if (!amounts.length) continue;

    const amount = parseFloat(amounts[amounts.length - 1].replace(/,/g, ''));
    if (!amount || isNaN(amount) || amount <= 0) continue;

    const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const description = rest.replace(AMOUNT_RE, ' ').replace(/\s{2,}/g, ' ').trim().slice(0, 300) || rest.slice(0, 300);

    entries.push({ date, month, description, amount });
  }

  return entries;
}

function extractPdfText(buffer: Buffer, password?: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const parser = new PDFParser(null, true, password || undefined);
    parser.on('pdfParser_dataError', (errData: any) => {
      const err = errData?.parserError || errData;
      reject(err instanceof Error ? err : new Error(String(err?.message || err || 'Failed to parse PDF')));
    });
    parser.on('pdfParser_dataReady', () => {
      resolve(parser.getRawTextContent());
    });
    try {
      parser.parseBuffer(buffer);
    } catch (err: any) {
      reject(err instanceof Error ? err : new Error(String(err)));
    }
  });
}

export async function POST(request: NextRequest) {
  try {
    const decoded = verifyAdmin(request);
    await connectDB();

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const bankName = String(formData.get('bankName') || '').trim();
    const password = String(formData.get('password') || '').trim();

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    if (!bankName) {
      return NextResponse.json({ error: 'Bank name is required' }, { status: 400 });
    }
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      return NextResponse.json({ error: 'Only PDF files are supported' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    let text = '';
    try {
      text = await extractPdfText(buffer, password || undefined);
    } catch (e: any) {
      const msg = String(e?.message || e || '');
      if (/password/i.test(msg)) {
        return NextResponse.json({
          error: password
            ? 'Incorrect PDF password. Please check and try again.'
            : 'This PDF is password-protected. Please enter the password and try again.',
        }, { status: 400 });
      }
      console.error('Bank statement PDF parse error:', e);
      return NextResponse.json({ error: `Failed to read PDF: ${msg}` }, { status: 400 });
    }

    let fileUrl = '';
    try {
      fileUrl = await uploadAdminFile(buffer, file.name, 'documents');
    } catch (e) {
      console.error('Bank statement upload to storage failed:', e);
    }

    const extracted = extractIncomeEntries(text);
    const userId = getViewerUserId(decoded);

    const statement = await BankStatement.create({
      bankName,
      fileName: file.name,
      fileUrl,
      uploadedByUserId: userId,
      status: extracted.length > 0 ? 'parsed' : 'failed',
      entryCount: extracted.length,
      rawTextSnippet: text.slice(0, 2000),
    });

    if (extracted.length > 0) {
      await BankIncomeEntry.insertMany(
        extracted.map((e) => ({
          statementId: statement._id,
          bankName,
          date: e.date,
          month: e.month,
          description: e.description,
          amount: e.amount,
          name: '',
          workshopName: '',
          tagged: false,
          createdByUserId: userId,
        }))
      );
    }

    return NextResponse.json({
      success: true,
      statementId: statement._id.toString(),
      entryCount: extracted.length,
      status: statement.status,
    });
  } catch (error: any) {
    const status = error.message === 'Unauthorized' ? 401 : error.message === 'Forbidden' ? 403 : 500;
    console.error('Bank statement upload error:', error);
    return NextResponse.json({ error: error.message || 'Upload failed' }, { status });
  }
}
