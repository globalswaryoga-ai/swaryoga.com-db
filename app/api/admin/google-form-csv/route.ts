import { NextRequest, NextResponse } from 'next/server';
import { parse } from 'csv-parse/sync';

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
        // Ensure it's valid CSV text, not an HTML login/permission page
        if (trimmed.length > 0 && !trimmed.startsWith('<!doctype html>') && !trimmed.startsWith('<html')) {
          return text;
        }
      }
    } catch (_) {}
  }

  throw new Error('Failed to fetch CSV from Google Sheets. Please ensure the Google Sheet access is set to "Anyone with the link can view".');
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const csvUrl = url.searchParams.get('url');

    if (!csvUrl || !csvUrl.includes('docs.google.com')) {
      return NextResponse.json({ error: 'Invalid Google Sheets URL' }, { status: 400 });
    }

    const csvText = await fetchGoogleSheetCsv(csvUrl);
    
    // Parse the CSV
    const records = parse(csvText, {
      columns: true,
      skip_empty_lines: true,
      relax_quotes: true,
      trim: true,
    });

    // Map the records to our Lead format
    const leads = records.map((record: any, index: number) => {
      // Find common keys (case insensitive)
      const findKey = (keywords: string[]) => {
        const keys = Object.keys(record);
        for (const kw of keywords) {
          const match = keys.find(k => k.toLowerCase().includes(kw));
          if (match && record[match]) return record[match];
        }
        return '';
      };

      const name = findKey(['name', 'first', 'full name']);
      const email = findKey(['email', 'mail']);
      const mobile = findKey(['mobile', 'phone', 'whatsapp']);
      const country = findKey(['country', 'nation']);
      const city = findKey(['city', 'town', 'location']);
      const gender = findKey(['gender', 'sex']);
      
      // Everything else goes to dynamicAnswers
      const dynamicAnswers: Record<string, string> = {};
      Object.keys(record).forEach(k => {
        const val = record[k];
        if (val && !['name', 'email', 'mobile', 'phone', 'whatsapp', 'country', 'city', 'gender'].some(kw => k.toLowerCase().includes(kw))) {
          dynamicAnswers[k] = val;
        }
      });

      return {
        id: `google-csv-${Date.now()}-${index}`,
        name: name || `Lead ${index + 1}`,
        email: email || '',
        mobile: mobile || '',
        phoneNumber: mobile || '',
        country: country || '',
        city: city || '',
        gender: gender || '',
        createdAt: record['Timestamp'] ? new Date(record['Timestamp']).toISOString() : new Date().toISOString(),
        dynamicAnswers,
        _rawRecord: record
      };
    });

    return NextResponse.json({ data: leads });
  } catch (error) {
    console.error('Error fetching/parsing CSV:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
