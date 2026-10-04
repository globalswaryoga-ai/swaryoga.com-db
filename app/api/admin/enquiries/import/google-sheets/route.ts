import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { verifyToken } from '@/lib/auth';
import { parse } from 'csv-parse/sync';

export const dynamic = 'force-dynamic';

function getGoogleSheetCsvUrls(rawUrl: string): string[] {
  let url = rawUrl.trim();
  const urls: string[] = [];

  // Extract GID if present
  let gid = '';
  const gidMatch = url.match(/[?&]gid=([0-9]+)/) || url.match(/#gid=([0-9]+)/);
  if (gidMatch) {
    gid = gidMatch[1];
  }

  // Handle published web links (e.g. /d/e/2PACX-.../pubhtml or /pub)
  if (url.includes('/d/e/2PACX-')) {
    const pubBase = url.split('/pub')[0].split('?')[0].split('#')[0];
    urls.push(`${pubBase}/pub?output=csv${gid ? `&gid=${gid}` : ''}`);
    urls.push(`${pubBase}/pub?output=csv`);
  }

  // Extract sheet ID (/d/SPREADSHEET_ID)
  const idMatch = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
  if (idMatch) {
    const sheetId = idMatch[1];
    if (gid) {
      urls.push(`https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`);
      urls.push(`https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&gid=${gid}`);
    }
    urls.push(`https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`);
    urls.push(`https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv`);
  }

  // Fallback to modified rawUrl
  let exportUrl = url;
  if (exportUrl.includes('/edit')) {
    exportUrl = exportUrl.replace(/\/edit.*$/, `/export?format=csv${gid ? `&gid=${gid}` : ''}`);
  } else if (!exportUrl.includes('/export') && !exportUrl.includes('/gviz') && !exportUrl.includes('/pub')) {
    exportUrl = exportUrl.split('?')[0].split('#')[0] + `/export?format=csv${gid ? `&gid=${gid}` : ''}`;
  }
  urls.push(exportUrl);

  return Array.from(new Set(urls));
}

async function fetchGoogleSheetCsv(sheetUrl: string): Promise<string> {
  const candidateUrls = getGoogleSheetCsvUrls(sheetUrl);
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/csv,text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  };

  for (const fetchUrl of candidateUrls) {
    try {
      const response = await fetch(fetchUrl, { headers, redirect: 'follow' });
      if (response.ok) {
        const text = await response.text();
        const trimmed = text.trim().toLowerCase();
        if (trimmed.length > 0 && !trimmed.startsWith('<!doctype html>') && !trimmed.startsWith('<html')) {
          return text;
        }
      }
    } catch (_) {}
  }

  throw new Error('Failed to fetch CSV from Google Sheets. Please ensure the Google Sheet access is set to "Anyone with the link can view".');
}

export async function POST(req: NextRequest) {
  const decoded = verifyToken(req.headers.get('authorization')?.slice(7) || req.cookies.get('token')?.value || '');
  if (!decoded?.isAdmin) return NextResponse.json({ error: 'Admin access required' }, { status: 403 });

  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action') || 'import';
    const body = await req.json();
    const url = body.url;

    if (!url) return NextResponse.json({ error: 'URL is required' }, { status: 400 });

    const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (!match && !url.includes('docs.google.com')) return NextResponse.json({ error: 'Invalid Google Sheet URL' }, { status: 400 });
    const spreadsheetId = match ? match[1] : '';

    // Attempt Service Account fetch first if configured
    if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON && spreadsheetId) {
      try {
        const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
        const auth = new google.auth.GoogleAuth({
          credentials,
          scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
        });
        const sheets = google.sheets({ version: 'v4', auth });

        if (action === 'columns' || action === 'preview') {
          const res = await sheets.spreadsheets.values.get({ spreadsheetId, range: '1:1' });
          const columns = res.data.values?.[0] || [];
          if (columns.length > 0) return NextResponse.json({ success: true, columns });
        } else if (action === 'import') {
          const res = await sheets.spreadsheets.values.get({ spreadsheetId, range: 'A1:ZZ50000' });
          const values = res.data.values;
          if (values && values.length > 0) {
            const headers = values[0];
            const data: Record<string, string>[] = [];
            for (let i = 1; i < values.length; i++) {
              const rowData: Record<string, string> = {};
              for (let j = 0; j < headers.length; j++) {
                rowData[headers[j]] = values[i][j] || '';
              }
              data.push(rowData);
            }
            return NextResponse.json({ success: true, data, columns: headers });
          }
        }
      } catch (serviceAccErr) {
        console.warn('[Google Sheets] Service account fetch failed, attempting public CSV fallback:', serviceAccErr);
      }
    }

    // Public CSV Fetch Fallback Strategy
    const csvText = await fetchGoogleSheetCsv(url);
    const records = parse(csvText, {
      columns: true,
      skip_empty_lines: true,
      relax_quotes: true,
      trim: true,
    });

    if (records.length === 0) {
      return NextResponse.json({ error: 'Spreadsheet is empty or could not be read' }, { status: 400 });
    }

    const columns = Object.keys(records[0] || {});

    if (action === 'columns' || action === 'preview') {
      return NextResponse.json({ success: true, columns });
    }

    return NextResponse.json({ success: true, data: records, columns });
  } catch (error: any) {
    console.error('Google Sheets Import Error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to fetch Google Sheet data' }, { status: 500 });
  }
}
