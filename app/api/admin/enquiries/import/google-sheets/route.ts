import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const decoded = verifyToken(req.headers.get('authorization')?.slice(7) || req.cookies.get('token')?.value || '');
  if (!decoded?.isAdmin) return NextResponse.json({ error: 'Admin access required' }, { status: 403 });

  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');
    const body = await req.json();
    const url = body.url;

    if (!url) return NextResponse.json({ error: 'URL is required' }, { status: 400 });

    const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (!match) return NextResponse.json({ error: 'Invalid Google Sheet URL' }, { status: 400 });
    const spreadsheetId = match[1];

    if (!process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
      return NextResponse.json({ error: 'Server missing GOOGLE_SERVICE_ACCOUNT_JSON environment variable. Please add it to your Vercel project settings.' }, { status: 500 });
    }

    let credentials;
    try {
      credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
    } catch (e) {
      return NextResponse.json({ error: 'Invalid GOOGLE_SERVICE_ACCOUNT_JSON format in environment variables.' }, { status: 500 });
    }

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    if (action === 'columns') {
      // Just fetch the first row to get columns
      const res = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: '1:1',
      });
      const columns = res.data.values?.[0] || [];
      if (!columns.length) return NextResponse.json({ error: 'Spreadsheet is empty or headers not found' }, { status: 400 });
      return NextResponse.json({ success: true, columns });
    } else if (action === 'import') {
      // Fetch the entire active sheet
      const res = await sheets.spreadsheets.values.get({
        spreadsheetId,
        // Using a broad range to grab everything in the first sheet
        range: 'A1:ZZ50000', 
      });

      const values = res.data.values;
      if (!values || values.length === 0) {
        return NextResponse.json({ error: 'Spreadsheet is empty' }, { status: 400 });
      }

      const headers = values[0];
      const data = [];

      for (let i = 1; i < values.length; i++) {
        const rowData: Record<string, string> = {};
        for (let j = 0; j < headers.length; j++) {
          rowData[headers[j]] = values[i][j] || '';
        }
        data.push(rowData);
      }

      return NextResponse.json({ success: true, data });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error: any) {
    console.error('Google Sheets API Error:', error);
    let errorMsg = error.message;
    if (error.code === 403 && error.message.includes('permission')) {
      errorMsg = 'Permission denied. Make sure you shared the Google Sheet with the Service Account email.';
    }
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}
