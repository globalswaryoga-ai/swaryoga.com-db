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
    ['phone', 'phonenumber', 'mobile', 'mobilenumber', 'mobileno', 'phoneno', 'contact', 'contactnumber', 'contactno', 'number', 'whatsapp', 'whatsappnumber', 'whatsappno', 'wanumber', 'wa', 'cell', 'cellphone', 'tel', 'telephone', 'मोबाइल', 'फोन'],
    ['phone', 'mobile', 'number', 'whatsapp', 'contact', 'cell', 'tel']
  );

  // Name
  map.name = findCol(
    ['name', 'fullname', 'firstname', 'customername', 'leadname', 'contactname', 'studentname', 'personname', 'नाम'],
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
 * Looks for columns where values look like phone numbers.
 */
export function detectPhoneByData(headers: string[], rows: Record<string, string>[]): string | undefined {
  // Score each column based on how many values look like phone numbers
  const scores: { header: string; score: number }[] = [];
  
  for (const h of headers) {
    const sample = rows.slice(0, 20).map(r => r[h]).filter(Boolean);
    let phoneCount = 0;
    
    for (const v of sample) {
      const cleaned = v.replace(/[^0-9]/g, '');
      // Check if it looks like a phone number (7-15 digits)
      if (cleaned.length >= 7 && cleaned.length <= 15) {
        // Additional check: original value should have phone-like format
        if (/^\+?\d[\d\s\-().,]{6,}$/.test(v.trim()) || /^\d{10,}$/.test(cleaned)) {
          phoneCount++;
        }
      }
    }
    
    if (phoneCount > 0) {
      scores.push({ header: h, score: phoneCount / sample.length });
    }
  }
  
  // Return the column with highest score (at least 50% phone-like values)
  scores.sort((a, b) => b.score - a.score);
  return scores.length > 0 && scores[0].score >= 0.5 ? scores[0].header : undefined;
}

/**
 * Normalize a phone number:
 * - Strip non-digit chars (except leading +)
 * - Remove leading +
 * - If 10 digits, prefix with 91 (India)
 * - Handle common formats
 */
export function normalizePhoneCSV(raw: string): string {
  if (!raw) return '';
  // Remove all non-digits except leading +
  let d = raw.replace(/[^0-9+]/g, '').replace(/^\+/, '');
  // Remove leading 0 (common in Indian mobile with 0 prefix)
  if (d.startsWith('0') && d.length === 11) d = d.slice(1);
  // If 10 digits, prefix with 91 (India)
  if (d.length === 10) d = '91' + d;
  // If starts with 91 and has extra 0, clean it (e.g., 910XXXXXXXXXX -> 91XXXXXXXXXX)
  if (d.startsWith('910') && d.length === 13) d = '91' + d.slice(3);
  return d;
}
