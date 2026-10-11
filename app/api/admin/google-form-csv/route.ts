import { NextRequest, NextResponse } from 'next/server';
import { parse } from 'csv-parse/sync';
import { resolveGoogleAccounts, getGoogleAccessToken, refreshGoogleAccessToken } from '@/lib/googleFormsAccounts';
import { registrationViewer } from '@/lib/registrationAuth';

function cleanUrl(rawUrl: string): string {
  let url = rawUrl.trim();
  // Strip trailing line numbers or devtools artifacts like :1 or :123
  url = url.replace(/:\d+$/, '');
  return url;
}

function getGoogleSheetCsvUrls(rawUrl: string): string[] {
  let url = cleanUrl(rawUrl);
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

  throw new Error('Failed to fetch CSV from Google Sheets. Access is restricted. Please change Google Sheet sharing to "Anyone with the link can view".');
}

async function fetchGoogleSheetViaOAuth(sheetId: string, scope: string): Promise<Record<string, string>[]> {
  const accounts = await resolveGoogleAccounts(scope);
  if (!accounts.length) throw new Error('Google Forms is not connected. Reconnect Google.');
  const errors: string[] = [];
  for (const entry of accounts) {
    try {
      let token = await getGoogleAccessToken(entry);
      const fetchSheet = () => fetch(`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(sheetId)}/values/A1:ZZ50000`, {
        headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(30000),
      });
      let response = await fetchSheet();
      if (response.status === 401 && entry.account.refreshToken) {
        token = await refreshGoogleAccessToken(entry);
        response = await fetchSheet();
      }
      if (!response.ok) throw new Error(`Google Sheets access failed (${response.status}). Reconnect Google and grant spreadsheet access.`);
      const data = await response.json() as { values?: string[][] };
      const [headers, ...rows] = data.values || [];
      if (!headers) return [];
      return rows.map(row => Object.fromEntries(headers.map((header, index) => [header, row[index] || ''])));
    } catch (error) {
      errors.push(error instanceof Error ? error.message : 'Google Sheets account unavailable.');
    }
  }
  throw new Error(errors.join('; '));
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const rawCsvUrl = url.searchParams.get('url');

    if (!rawCsvUrl || !rawCsvUrl.includes('docs.google.com')) {
      return NextResponse.json({ error: 'Invalid Google URL provided' }, { status: 400 });
    }

    const csvUrl = cleanUrl(rawCsvUrl);

    // 1. If user provided a Google Form Edit URL (e.g. docs.google.com/forms/d/1XYZ/edit), delegate to OAuth Google Form sync API
    if (csvUrl.includes('/forms/')) {
      try {
        const host = request.headers.get('host') || 'swaryoga.com';
        const protocol = host.includes('localhost') ? 'http' : 'https';
        const syncUrl = `${protocol}://${host}/api/admin/google-forms/sync?url=${encodeURIComponent(csvUrl)}`;
        const syncRes = await fetch(syncUrl, {
          headers: {
            cookie: request.headers.get('cookie') || '',
            authorization: request.headers.get('authorization') || '',
          },
        });
        const syncData = await syncRes.json();
        if (syncRes.ok && Array.isArray(syncData.data)) {
          return NextResponse.json({ data: syncData.data });
        }
        if (syncData.error) {
          return NextResponse.json({ error: syncData.error }, { status: syncRes.status || 400 });
        }
      } catch (formSyncErr) {
        console.warn('[google-form-csv] Google Forms OAuth sync fallback error:', formSyncErr);
      }
    }

    // 2. Fetch records either via public CSV or Google Sheets OAuth API
    let records: Record<string, string>[] = [];
    let publicError = '';

    try {
      const csvText = await fetchGoogleSheetCsv(csvUrl);
      records = parse(csvText, {
        columns: true,
        skip_empty_lines: true,
        relax_quotes: true,
        trim: true,
      });
    } catch (sheetErr: any) {
      publicError = sheetErr.message || String(sheetErr);

      // Attempt OAuth fetch for private Google Sheets
      const sheetIdMatch = csvUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
      const viewer = registrationViewer(request);
      if (sheetIdMatch && viewer) {
        try {
          records = await fetchGoogleSheetViaOAuth(sheetIdMatch[1], viewer.superAdmin ? 'shared' : viewer.userId);
          if (!records.length) return NextResponse.json({ data: [] });
        } catch (error) {
          return NextResponse.json({ error: error instanceof Error ? error.message : publicError }, { status: 403 });
        }
      }

      if (!records || records.length === 0) {
        // Fallback to Google Forms OAuth sync as final attempt
        try {
          const host = request.headers.get('host') || 'swaryoga.com';
          const protocol = host.includes('localhost') ? 'http' : 'https';
          const syncUrl = `${protocol}://${host}/api/admin/google-forms/sync?url=${encodeURIComponent(csvUrl)}`;
          const syncRes = await fetch(syncUrl, {
            headers: {
              cookie: request.headers.get('cookie') || '',
              authorization: request.headers.get('authorization') || '',
            },
          });
          const syncData = await syncRes.json();
          if (syncRes.ok && Array.isArray(syncData.data)) {
            return NextResponse.json({ data: syncData.data });
          }
        } catch (_) {}

        return NextResponse.json({
          error: 'Failed to fetch Google Sheet. The sheet access is restricted. Please ensure your Google account is connected or set Google Sheet sharing to "Anyone with the link can view".'
        }, { status: 400 });
      }
    }

    // Map the records to our Lead format
    const leads = records.map((record: Record<string, string>, index: number) => {
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
    return NextResponse.json({ error: String(error).replace('Error: ', '') }, { status: 400 });
  }
}
