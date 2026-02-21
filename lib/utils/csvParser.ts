/**
 * Shared CSV/TSV parser with auto-column detection.
 * Used by Broadcast, Leads, and Sales bulk upload features.
 */

export interface CSVParseResult {
  headers: string[];
  rows: Record<string, string>[];
  delimiter: string;
}

export interface CSVColumnMap {
  name?: string;
  phone?: string;
  email?: string;
  status?: string;
  source?: string;
  workshop?: string;
  amount?: string;
  paymentMode?: string;
  date?: string;
  address?: string;
  customerId?: string;
  batchDate?: string;
  labels?: string;
}

export interface CSVContact {
  name?: string;
  phoneNumber: string;
  email?: string;
  raw: Record<string, string>;
}

/**
 * Parse CSV/TSV text into headers and rows.
 * Auto-detects delimiter (comma, semicolon, tab).
 */
export function parseCSVText(text: string): CSVParseResult {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return { headers: [], rows: [], delimiter: ',' };

  // Detect delimiter
  const first = lines[0];
  let delimiter = ',';
  if (first.includes('\t')) delimiter = '\t';
  else if (first.split(';').length > first.split(',').length) delimiter = ';';

  const parseRow = (line: string): string[] => {
    const result: string[] = [];
    let cur = '';
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQ && i + 1 < line.length && line[i + 1] === '"') { cur += '"'; i++; }
        else inQ = !inQ;
      } else if (ch === delimiter && !inQ) {
        result.push(cur.trim()); cur = '';
      } else cur += ch;
    }
    result.push(cur.trim());
    return result;
  };

  const headers = parseRow(lines[0]);
  const rows = lines.slice(1).map(line => {
    const vals = parseRow(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = vals[i] || ''; });
    return row;
  }).filter(row => Object.values(row).some(v => v.trim()));

  return { headers, rows, delimiter };
}

/**
 * Auto-detect column mappings from header names.
 * Matches common column name patterns for phone, name, email, etc.
 */
export function autoDetectColumns(headers: string[]): CSVColumnMap {
  const map: CSVColumnMap = {};
  const lower = headers.map(h => h.toLowerCase().replace(/[\s_\-]/g, ''));

  const findCol = (patterns: string[], fuzzyPatterns?: string[]): string | undefined => {
    // Exact match first
    for (const p of patterns) {
      const idx = lower.findIndex(h => h === p);
      if (idx !== -1) return headers[idx];
    }
    // Fuzzy/contains match
    if (fuzzyPatterns) {
      for (const p of fuzzyPatterns) {
        const idx = lower.findIndex(h => h.includes(p));
        if (idx !== -1) return headers[idx];
      }
    }
    return undefined;
  };

  // Phone (most important)
  map.phone = findCol(
    ['phone', 'phonenumber', 'mobile', 'mobilenumber', 'contact', 'number', 'whatsapp', 'wanumber', 'wa', 'cell', 'tel', 'telephone'],
    ['phone', 'mobile', 'number', 'whatsapp']
  );

  // Name
  map.name = findCol(
    ['name', 'fullname', 'firstname', 'customername', 'leadname', 'contactname', 'studentname'],
    ['name']
  );

  // Email
  map.email = findCol(
    ['email', 'emailaddress', 'mail'],
    ['email', 'mail']
  );

  // Status
  map.status = findCol(
    ['status', 'leadstatus', 'salestatus'],
    ['status']
  );

  // Source
  map.source = findCol(
    ['source', 'leadsource', 'medium', 'channel'],
    ['source']
  );

  // Workshop / Program
  map.workshop = findCol(
    ['workshop', 'workshopname', 'program', 'programname', 'course', 'coursename', 'batch'],
    ['workshop', 'program', 'course']
  );

  // Amount / Sale Amount
  map.amount = findCol(
    ['amount', 'saleamount', 'total', 'totalamount', 'price', 'fee', 'workshopfee'],
    ['amount', 'price', 'fee', 'total']
  );

  // Payment Mode
  map.paymentMode = findCol(
    ['paymentmode', 'payment', 'paymentmethod', 'mode'],
    ['payment', 'mode']
  );

  // Date / Sale Date
  map.date = findCol(
    ['date', 'saledate', 'createddate', 'registrationdate', 'joindate'],
    ['date']
  );

  // Address
  map.address = findCol(
    ['address', 'customeraddress', 'location', 'city'],
    ['address', 'location']
  );

  // Customer ID
  map.customerId = findCol(
    ['customerid', 'custid', 'id', 'registrationid'],
    ['customerid', 'custid']
  );

  // Batch Date
  map.batchDate = findCol(
    ['batchdate', 'batchstart', 'startdate'],
    ['batch']
  );

  // Labels / Tags
  map.labels = findCol(
    ['labels', 'tags', 'label', 'tag'],
    ['label', 'tag']
  );

  return map;
}

/**
 * Fallback: detect phone column by examining data content.
 */
export function detectPhoneByData(headers: string[], rows: Record<string, string>[]): string | undefined {
  for (const h of headers) {
    const sample = rows.slice(0, 10).map(r => r[h]).filter(Boolean);
    if (sample.some(v => /^\+?\d[\d\s\-()]{6,}$/.test(v.trim()))) {
      return h;
    }
  }
  return undefined;
}

/**
 * Normalize a phone number:
 * - Strip non-digit chars (except leading +)
 * - Remove leading +
 * - If 10 digits, prefix with 91 (India)
 */
export function normalizePhoneCSV(raw: string): string {
  if (!raw) return '';
  let d = raw.replace(/[^0-9+]/g, '').replace(/^\+/, '');
  if (d.length === 10) d = '91' + d;
  return d;
}
