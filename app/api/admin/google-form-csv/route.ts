import { NextRequest, NextResponse } from 'next/server';
import { parse } from 'csv-parse/sync';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const csvUrl = url.searchParams.get('url');

    if (!csvUrl || !csvUrl.includes('docs.google.com/spreadsheets')) {
      return NextResponse.json({ error: 'Invalid Google Sheets CSV URL' }, { status: 400 });
    }

    // Proxy the fetch to avoid any potential CORS issues on the client
    const response = await fetch(csvUrl);
    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch CSV from Google Sheets' }, { status: response.status });
    }

    const csvText = await response.text();
    
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
        dynamicAnswers
      };
    });

    return NextResponse.json({ data: leads });
  } catch (error) {
    console.error('Error fetching/parsing CSV:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
