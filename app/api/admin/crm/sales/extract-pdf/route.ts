import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';
import { formatPersonName } from '@/lib/formatName';

const PDFParser = require('pdf2json');

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface ExtractedSale {
  customerName?: string;
  workshopName?: string;
  saleAmount?: number;
  saleDate?: string;
}

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin) throw new Error('Unauthorized');
    if (!isSuperAdmin(decoded)) throw new Error('Forbidden');

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file || !file.name.toLowerCase().endsWith('.pdf')) {
      throw new Error('Only PDF files are supported');
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const pdfParser = new PDFParser(null, true);

    return new Promise((resolve) => {
      pdfParser.on('pdfParser_dataReady', (pdfData: any) => {
        try {
          // Extract text from PDF
          const text = pdfData.Pages.map((page: any) =>
            page.Texts.map((t: any) => decodeURIComponent(t.R[0].T)).join(' ')
          ).join('\n');

          // Parse sales data from text (simple pattern matching)
          const lines = text.split('\n').filter(Boolean);
          const sales: ExtractedSale[] = [];

          // Look for patterns: amount (number), date (DD/MM/YYYY or similar), name
          const dateRegex = /(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})/;
          const amountRegex = /(?:₹|Rs\.?\s*)?(\d{1,3}(?:,?\d{3})*(?:\.\d{2})?)/g;

          for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line || line.length < 5) continue;

            const dateMatch = line.match(dateRegex);
            const amountMatches = line.match(amountRegex);

            if (dateMatch && amountMatches && amountMatches.length > 0) {
              const amount = parseFloat(amountMatches[amountMatches.length - 1].replace(/[₹Rs\s,]/g, ''));

              if (amount > 0 && amount < 1000000) {
                // Extract potential name (usually before amount)
                const namePart = line.substring(0, line.indexOf(amountMatches[amountMatches.length - 1])).trim();

                sales.push({
                  customerName: formatPersonName(namePart) || undefined,
                  saleAmount: amount,
                  saleDate: dateMatch[1],
                });
              }
            }
          }

          resolve(
            NextResponse.json({
              success: true,
              extracted: sales,
              count: sales.length,
              rawText: text.substring(0, 500),
            })
          );
        } catch (error) {
          resolve(
            NextResponse.json(
              { error: 'Failed to parse PDF content' },
              { status: 400 }
            )
          );
        }
      });

      pdfParser.on('pdfParser_dataError', (err: any) => {
        if (String(err).match(/password/i)) {
          resolve(
            NextResponse.json(
              { error: 'PDF is password-protected. Please provide an unencrypted PDF.' },
              { status: 400 }
            )
          );
        } else {
          resolve(
            NextResponse.json({ error: 'Failed to read PDF file' }, { status: 400 })
          );
        }
      });

      pdfParser.parseBuffer(buffer);
    });
  } catch (error: any) {
    const status = error.message === 'Unauthorized' ? 401 : error.message === 'Forbidden' ? 403 : 500;
    console.error('PDF extract error:', error);
    return NextResponse.json({ error: error.message || 'Failed to extract PDF' }, { status });
  }
}
