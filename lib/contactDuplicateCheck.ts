export function normalizeContactEmail(value?: string | null): string {
  return String(value ?? '').trim().toLowerCase();
}

export function normalizeContactPhone(value?: string | null): string {
  const input = String(value ?? '');
  if (!input) return '';

  const digits = input
    .replace(/@.*$/, '')
    .replace(/\D/g, '');

  if (digits.length < 10 || digits.length > 15) {
    return digits;
  }

  if (digits.length === 10) return `91${digits}`;
  if (digits.startsWith('0') && digits.length > 10) return digits.replace(/^0+/, '');
  return digits;
}

export function buildContactDuplicateQuery(email?: string | null, phone?: string | null): Array<Record<string, any>> {
  const clauses: Array<Record<string, any>> = [];
  const normalizedEmail = normalizeContactEmail(email);
  const normalizedPhone = normalizeContactPhone(phone);

  if (normalizedEmail && normalizedEmail.includes('@')) {
    clauses.push({ email: normalizedEmail });
  }

  if (normalizedPhone) {
    clauses.push(
      { phone: normalizedPhone },
      { phoneNumber: normalizedPhone },
      { mobile: normalizedPhone },
      { whatsappNumber: normalizedPhone },
    );
  }

  return clauses;
}

export function contactMatchesRecord(
  inputEmail?: string | null,
  inputPhone?: string | null,
  record?: Record<string, any> | null,
): boolean {
  if (!record) return false;

  const email = normalizeContactEmail(inputEmail);
  const phone = normalizeContactPhone(inputPhone);
  const recordEmail = normalizeContactEmail(
    record.email ?? record.emailAddress ?? record.userEmail ?? '',
  );
  const recordPhone = normalizeContactPhone(
    record.phone ?? record.phoneNumber ?? record.mobile ?? record.whatsappNumber ?? '',
  );

  if (email && recordEmail && email === recordEmail) return true;
  if (phone && recordPhone && phone === recordPhone) return true;

  return false;
}

export function matchContactRecord(
  inputEmail?: string | null,
  inputPhone?: string | null,
  record?: Record<string, any> | null,
): boolean {
  return contactMatchesRecord(inputEmail, inputPhone, record);
}
