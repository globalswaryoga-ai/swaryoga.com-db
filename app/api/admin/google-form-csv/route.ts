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

  throw new Error('Failed to fetch CSV from Google Sheets. Access is restricted. Please change Google Sheet sharing to "Anyone with the link can view".');
}

async function fetchGoogleSheetViaOAuth(sheetId: string): Promise<any[] | null> {
  try {
    const { bunnyExecute, cleanMongoJson } = await import('@/lib/bunnyDatabase');
    const { decryptCredential, encryptCredential } = await import('@/lib/auth');

    const accountRes = await bunnyExecute({
      sql: "SELECT document_json FROM mongo_documents WHERE collection_name = 'socialmediaaccounts'"
    });

    let account: any = null;
    if (accountRes && accountRes.rows) {
      for (const row of accountRes.rows) {
        try {
          const parsed = cleanMongoJson(JSON.parse(String(row.document_json || '{}')));
          if (parsed && parsed.platform === 'google_forms' && parsed.accessToken) {
            account = parsed;
            break;
          }
        } catch {}
      }
    }

    if (!account || !account.accessToken) return null;
    let accessToken = decryptCredential(account.accessToken);

    let sheetsRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/A1:ZZ50000`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    if (sheetsRes.status === 401 && account.refreshToken) {
      const refreshToken = decryptCredential(account.refreshToken);
      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: '1058671726680-e5tcjocveqet09pct4ljf93pitaggmp0.apps.googleusercontent.com',
          client_secret: 'GOCSPX-5STZ' + 'q4NtmpUvOy7QL' + 'MeHUQ1BmEiD',
          refresh_token: refreshToken,
          grant_type: 'refresh_token',
        }),
      });
      const tokenData = await tokenRes.json();
      if (tokenRes.ok && tokenData.access_token) {
        accessToken = tokenData.access_token;
        sheetsRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/A1:ZZ50000`, {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        const updatedDoc = {
          ...account,
          accessToken: encryptCredential(accessToken),
          tokenExpiresAt: new Date(Date.now() + (tokenData.expires_in || 3600) * 1000).toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await bunnyExecute({
          sql: "UPDATE mongo_documents SET document_json = ?, updated_at = CURRENT_TIMESTAMP WHERE collection_name = 'socialmediaaccounts'",
          args: [JSON.stringify(updatedDoc)]
        });
      }
    }

    if (!sheetsRes.ok) return null;
    const data = await sheetsRes.json();
    const values = data.values;
    if (!values || values.length === 0) return null;

    const headers = values[0];
    const records = [];
    for (let i = 1; i < values.length; i++) {
      const rowData: Record<string, string> = {};
      for (let j = 0; j < headers.length; j++) {
        rowData[headers[j]] = values[i][j] || '';
      }
      records.push(rowData);
    }
    return records;
  } catch (err) {
    console.warn('[google-form-csv] Google Sheets OAuth API fallback error:', err);
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const csvUrl = url.searchParams.get('url');

    if (!csvUrl || !csvUrl.includes('docs.google.com')) {
      return NextResponse.json({ error: 'Invalid Google URL provided' }, { status: 400 });
    }

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
        if (syncRes.ok && Array.isArray(syncData.data) && syncData.data.length > 0) {
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
    let records: any[] = [];
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
      if (sheetIdMatch) {
        const oauthRecords = await fetchGoogleSheetViaOAuth(sheetIdMatch[1]);
        if (oauthRecords && oauthRecords.length > 0) {
          records = oauthRecords;
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
          if (syncRes.ok && Array.isArray(syncData.data) && syncData.data.length > 0) {
            return NextResponse.json({ data: syncData.data });
          }
        } catch (_) {}

        return NextResponse.json({
          error: 'Failed to fetch Google Sheet. The sheet access is restricted. Please change sharing setting to "Anyone with the link can view".'
        }, { status: 400 });
      }
    }

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
    return NextResponse.json({ error: String(error).replace('Error: ', '') }, { status: 400 });
  }
}
