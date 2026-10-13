/**
 * Shared column and cell utilities for CRM registration views:
 * - My Data (_WorkshopFormTab)
 * - Leads Management (_LeadsManagementTab)
 * - Our Batches (_WorkshopFormTab)
 *
 * Ensures all three pages display the exact same rows and columns
 * without duplicate columns or misaligned data.
 */

// Keys that are already rendered as standard table columns
const STANDARD_CRM_KEYWORDS: Record<string, string[]> = {
  name: ['full name', 'your name', 'first name', 'last name', 'name', 'naam', 'pura naam', 'poora naam', 'नाव', 'नाम'],
  phone: ['whatsapp number', 'mobile number', 'phone number', 'contact number', 'whatsapp', 'mobile', 'phone', 'contact', 'नंबर', 'नम्बर'],
  email: ['email id', 'email address', 'email', 'e-mail', 'mail id', 'mail', 'ईमेल'],
  gender: ['gender', 'sex', 'ling', 'लिंग'],
  age: ['age', 'your age', 'वय', 'उम्र', 'आयु'],
  city: ['city name', 'city', 'town', 'location', 'शहर', 'गाव'],
  country: ['country and state-name', 'country name', 'country', 'state', 'nation', 'देश', 'राज्य'],
  timestamp: ['timestamp', 'submitted at', 'created at', 'submission date'],
};

/**
 * Checks if a question key is actually a standard CRM field that has its own
 * dedicated table column, so it is never duplicated into dynamic columns.
 */
export function isStandardCrmField(key: string, customMapping?: Record<string, string>): boolean {
  if (!key) return true;
  const trimmed = String(key).trim();
  const lower = trimmed.toLowerCase().replace(/[\r\n]+/g, ' ');

  // Check custom mapping values
  if (customMapping && typeof customMapping === 'object') {
    const mappedValues = Object.values(customMapping).filter(Boolean).map(v => String(v).trim().toLowerCase());
    if (mappedValues.includes(lower)) return true;
  }

  // Exact 'I am' when used for gender (Male / Female)
  if (lower === 'i am') return true;

  // Exact standard names
  if (['name', 'email', 'mobile', 'phone', 'whatsapp', 'gender', 'age', 'city', 'country', 'timestamp'].includes(lower)) {
    return true;
  }

  // Check phone variants
  if (lower.startsWith('whatsapp number') || lower.startsWith('mobile number') || lower.startsWith('phone number')) {
    return true;
  }

  // Check all standard keywords
  for (const list of Object.values(STANDARD_CRM_KEYWORDS)) {
    for (const kw of list) {
      if (lower === kw) return true;
    }
  }

  return false;
}

/**
 * Checks if a key is a static informational notice, section header, or thank you note
 * exported by Google Forms rather than an actual question.
 */
export function isInformationalNotice(key: string): boolean {
  if (!key) return true;
  const text = String(key).trim();

  // Multi-line long instructional text blocks
  if (text.includes('\n') && text.length > 40) return true;
  if (text.length > 120 && !text.includes('?')) return true;

  // Known Google Form static headers/notices
  if (text.startsWith('धन्यवाद') || text.startsWith('कृपया वर्कशॉप')) return true;
  if (text.startsWith('The Swar Yoga knowledge')) return true;
  if (text.startsWith('Thank you') || text.startsWith('Please note')) return true;

  return false;
}

/**
 * Normalizes question strings to avoid slight whitespace or casing duplicate columns.
 */
export function normalizeQuestionKey(key: string): string {
  return String(key || '')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[?:]+$/, '')
    .toLowerCase();
}

/**
 * Extracts and deduplicates dynamic question columns across all leads.
 * Excludes standard CRM fields, informational notices, and resolves duplicate questions.
 */
export function getCleanDynamicColumns(
  leads: any[],
  mapping?: Record<string, string>,
): string[] {
  if (!Array.isArray(leads) || leads.length === 0) return [];

  const keyCounts = new Map<string, number>();
  const canonicalMap = new Map<string, string>(); // normalizedKey -> bestDisplayKey

  leads.forEach(lead => {
    if (!lead) return;
    const answers = lead.dynamicAnswers || lead._rawRecord;
    if (answers && typeof answers === 'object') {
      Object.keys(answers).forEach(k => {
        if (!k || isStandardCrmField(k, mapping) || isInformationalNotice(k)) return;
        const val = answers[k];
        if (val !== undefined && val !== null && String(val).trim() !== '') {
          const norm = normalizeQuestionKey(k);
          if (!canonicalMap.has(norm)) {
            // Keep first clean formatted key as canonical
            canonicalMap.set(norm, k.trim().replace(/\s+/g, ' '));
          }
          const canonical = canonicalMap.get(norm)!;
          keyCounts.set(canonical, (keyCounts.get(canonical) || 0) + 1);
        }
      });
    }
  });

  const uniqueKeys = Array.from(keyCounts.keys());

  // Priority sorting:
  // 1. Workshop dates / batch
  // 2. 14-day attendance
  // 3. Video camera requirement
  // 4. Repeater / new student
  // 5. Profession / Occupation
  // 6. Remaining questions
  const priority = (k: string) => {
    const lower = k.toLowerCase();
    if (lower.includes('workshop date') || lower.includes('workshop month') || lower.includes('which workshop') || lower.includes('तारीख')) return 10;
    if (lower.includes('14 day') || lower.includes('14-day') || lower.includes('14-दिवसीय') || lower.includes('ready to do')) return 20;
    if (lower.includes('video') || lower.includes('वीडियो')) return 30;
    if (lower.includes('new /repeater') || lower.includes('new / repeater') || lower.includes('repeater') || lower.includes('प्रतिभागी')) return 40;
    if (lower === 'i am a' || lower.includes('profession') || lower.includes('व्यवसाय')) return 50;
    if (lower.includes('education') || lower.includes('शिक्षा')) return 60;
    if (lower.includes('donation') || lower.includes('सहयोग') || lower.includes('fee')) return 70;
    return 100;
  };

  uniqueKeys.sort((a, b) => priority(a) - priority(b));
  return uniqueKeys;
}

/**
 * Robust cell value extractors that inspect top-level lead properties,
 * dynamicAnswers, and _rawRecord to ensure data is never lost or blank.
 */
export function getLeadPhone(lead: any): string {
  if (!lead) return '';
  const raw = {
    ...(lead.answers || {}),
    ...(lead.dynamicAnswers || {}),
    ...(lead._rawRecord || {}),
  };
  const candidates = [
    lead.mobile,
    lead.phoneNumber,
    lead.phone,
    lead.whatsapp,
    lead.whatsappNumber,
    raw['Whatsapp Number -add before country code\n+91 9075358557'],
    raw['Whatsapp Number -add before country code'],
    raw['Whatsapp Number(with country code)'],
    raw['Whatsapp Number'],
    raw['Mobile Number'],
    raw['Phone Number'],
    raw['Mobile'],
    raw['Phone'],
    raw['Contact Number'],
    raw['Contact'],
  ];

  for (const c of candidates) {
    if (c !== undefined && c !== null) {
      const s = String(c).trim();
      if (s && s !== 'No phone' && s !== '-') return s;
    }
  }

  // Fallback: check any key containing whatsapp / mobile / phone
  for (const [k, v] of Object.entries(raw)) {
    if (/(whatsapp|mobile|phone|संपर्क)/i.test(k) && v !== undefined && v !== null) {
      const s = String(v).trim();
      if (s && s !== 'No phone' && s !== '-') return s;
    }
  }

  return '';
}

export function getLeadName(lead: any): string {
  if (!lead) return 'Unknown';
  const raw = {
    ...(lead.answers || {}),
    ...(lead.dynamicAnswers || {}),
    ...(lead._rawRecord || {}),
  };
  const candidates = [
    lead.name,
    raw['Full Name'],
    raw['full name'],
    raw['Your Name'],
    raw['Name'],
    raw['name'],
    raw['Pura Naam'],
    raw['नाम'],
    raw['नाव'],
  ];

  for (const c of candidates) {
    if (c !== undefined && c !== null) {
      const s = String(c).trim();
      if (s && s !== '-' && s !== 'Unknown') return s;
    }
  }
  return lead.name || 'Unknown';
}

export function getLeadEmail(lead: any): string {
  if (!lead) return '-';
  const raw = {
    ...(lead.answers || {}),
    ...(lead.dynamicAnswers || {}),
    ...(lead._rawRecord || {}),
  };
  const candidates = [
    lead.email,
    raw['Email Id'],
    raw['Email ID'],
    raw['Email Address'],
    raw['Email'],
    raw['email'],
    raw['ईमेल'],
  ];

  for (const c of candidates) {
    if (c !== undefined && c !== null) {
      const s = String(c).trim();
      if (s && s.includes('@')) return s;
    }
  }
  return lead.email || '-';
}

export function getLeadGender(lead: any): string {
  if (!lead) return '-';
  const g = String(lead.gender || '').trim();
  if (/^(male|female|other|पुरुष|महिला)$/i.test(g)) return g;

  const raw = {
    ...(lead.answers || {}),
    ...(lead.dynamicAnswers || {}),
    ...(lead._rawRecord || {}),
  };
  const candidates = [
    raw['I am'],
    raw['Gender'],
    raw['gender'],
    raw['Sex'],
    raw['लिंग'],
  ];

  for (const c of candidates) {
    if (c !== undefined && c !== null) {
      const s = String(c).trim();
      if (/^(male|female|other|पुरुष|महिला)$/i.test(s)) return s;
    }
  }
  return '-';
}

export function getLeadAge(lead: any): string {
  if (!lead) return '-';
  const raw = {
    ...(lead.answers || {}),
    ...(lead.dynamicAnswers || {}),
    ...(lead._rawRecord || {}),
  };
  const candidates = [
    lead.age,
    raw['Age'],
    raw['age'],
    raw['Your Age'],
    raw['वय'],
    raw['उम्र'],
    raw['आयु'],
  ];

  for (const c of candidates) {
    if (c !== undefined && c !== null) {
      const s = String(c).trim();
      if (s && s !== '-') return s;
    }
  }
  return '-';
}

export function getLeadCity(lead: any): string {
  if (!lead) return '-';
  const raw = {
    ...(lead.answers || {}),
    ...(lead.dynamicAnswers || {}),
    ...(lead._rawRecord || {}),
  };
  const candidates = [
    lead.city,
    raw['City Name'],
    raw['City'],
    raw['city'],
    raw['शहर'],
    raw['Town'],
    raw['गाव'],
  ];

  for (const c of candidates) {
    if (c !== undefined && c !== null) {
      const s = String(c).trim();
      // Avoid accidental email in city field
      if (s && s !== '-' && !s.includes('@')) return s;
    }
  }
  return lead.city && !lead.city.includes('@') ? lead.city : '-';
}

export function getLeadCountry(lead: any): string {
  if (!lead) return '-';
  const raw = {
    ...(lead.answers || {}),
    ...(lead.dynamicAnswers || {}),
    ...(lead._rawRecord || {}),
  };
  const candidates = [
    lead.country,
    raw['Country and State-Name'],
    raw['Country'],
    raw['country'],
    raw['Country Name'],
    raw['State'],
    raw['देश'],
  ];

  for (const c of candidates) {
    if (c !== undefined && c !== null) {
      const s = String(c).trim();
      if (s && s !== '-' && !s.includes('@')) return s;
    }
  }
  return lead.country && !lead.country.includes('@') ? lead.country : '-';
}

export function getLeadTimestamp(lead: any): string {
  if (!lead) return '-';
  const raw = {
    ...(lead.answers || {}),
    ...(lead.dynamicAnswers || {}),
    ...(lead._rawRecord || {}),
  };
  const ts = lead.createdAt || lead.submittedAt || raw['Timestamp'] || raw['timestamp'];
  if (!ts) return '-';
  try {
    const d = new Date(ts);
    if (isNaN(d.getTime())) return String(ts);
    return d.toLocaleString();
  } catch {
    return String(ts);
  }
}

/**
 * Resolves answer for a dynamic question column, checking direct key,
 * normalized key, and raw record variants.
 */
export function getLeadAnswer(lead: any, column: string): string {
  if (!lead || !column) return '-';
  const answers = {
    ...(lead.answers || {}),
    ...(lead.dynamicAnswers || {}),
    ...(lead._rawRecord || {}),
  };

  if (answers[column] !== undefined && answers[column] !== null && String(answers[column]).trim() !== '') {
    return String(answers[column]).trim();
  }

  // Normalized key match
  const targetNorm = normalizeQuestionKey(column);
  for (const [k, v] of Object.entries(answers)) {
    if (normalizeQuestionKey(k) === targetNorm && v !== undefined && v !== null && String(v).trim() !== '') {
      return String(v).trim();
    }
  }

  return '-';
}
