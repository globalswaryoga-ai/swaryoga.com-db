/**
 * @fileoverview Smart Signup Quality & Bot Validation
 * Distinguishes legitimate users from automated bot spam.
 */

const COMMON_ENDING_TRIGRAPHS = new Set([
  'ght', 'nch', 'rth', 'nds', 'mps', 'ngs', 'nts', 'rks', 'lts', 'rds', 'rst', 'tch', 'ing', 'lth', 'nth', 'dth', 'kht'
]);

const COMMON_STARTING_TRIGRAPHS = new Set([
  'str', 'scr', 'spl', 'spr', 'shr', 'thr', 'chr', 'phr', 'ksh'
]);

const ACCEPTED_CONSONANT_CLUSTERS = [
  'kshm', 'rshn', 'ddhr', 'ndhr', 'sthr', 'ngth', 'rthm', 'ndsh'
];

const DISPOSABLE_EMAIL_DOMAINS = new Set([
  'tempmail.com', '10minutemail.com', 'mailinator.com', 'guerrillamail.com',
  'sharklasers.com', 'throwawaymail.com', 'getairmail.com', 'dispostable.com',
  'yopmail.com', 'trashmail.com', 'fakeinbox.com', 'temp-mail.org'
]);

export function isGibberishWord(rawWord: string): boolean {
  const w = rawWord.toLowerCase().trim();
  if (w.length < 3) return false;

  // 1. No vowels in word of 3+ letters
  if (!/[aeiouy]/.test(w)) return true;

  // 2. 4+ consecutive consonants unless recognized transliteration
  const consCluster = w.match(/[bcdfghjklmnpqrstvwxz]{4,}/g);
  if (consCluster) {
    const hasAccepted = consCluster.some(c => ACCEPTED_CONSONANT_CLUSTERS.includes(c));
    if (!hasAccepted) return true;
  }

  // 3. 3+ identical consecutive characters (e.g. zzz, fff)
  if (/(.)\1{2}/.test(w)) return true;


  // 4. Letter 'q' not followed by 'u' (almost exclusively bot tokens like Yxqsg, Uqty)
  if (/q(?!u)/.test(w)) return true;

  // 5. Unnatural 3-consonant word endings
  const endMatch = w.match(/([bcdfghjklmnpqrstvwxz]{3})$/);
  if (endMatch && !COMMON_ENDING_TRIGRAPHS.has(endMatch[1])) return true;

  // 6. Unnatural 3-consonant word beginnings
  const startMatch = w.match(/^([bcdfghjklmnpqrstvwxz]{3})/);
  if (startMatch && !COMMON_STARTING_TRIGRAPHS.has(startMatch[1])) return true;

  return false;
}

export type SignupQualityResult = {
  isLegitimate: boolean;
  status: 'active' | 'pending';
  reasons: string[];
};

export function evaluateSignupQuality(input: {
  name?: string;
  email?: string;
  phone?: string;
  country?: string;
  state?: string;
  gender?: string;
  age?: number | string;
  profession?: string;
  honeypot?: string;
}): SignupQualityResult {
  const reasons: string[] = [];

  // Honeypot check: If the hidden honeypot input is filled, it is 100% an automated bot
  if (input.honeypot && String(input.honeypot).trim() !== '') {
    reasons.push('Automated bot form submission detected (honeypot triggered)');
  }

  // Name check
  const name = String(input.name || '').trim();
  if (!name || name.length < 2) {
    reasons.push('Name is too short or missing');
  } else {
    const words = name.split(/\s+/).filter(Boolean);
    for (const word of words) {
      if (isGibberishWord(word)) {
        reasons.push(`Suspicious unpronounceable word in name: "${word}"`);
      }
    }
  }

  // Email check
  const email = String(input.email || '').trim().toLowerCase();
  const [username, domain] = email.split('@');
  if (!username || !domain) {
    reasons.push('Invalid email structure');
  } else {
    // Check dot-separated spam pattern (e.g., m.arkljo.n.e.s5.59@gmail.com)
    const dotCount = (username.match(/\./g) || []).length;
    if (dotCount >= 3) {
      reasons.push(`Suspicious bot email pattern (${dotCount} dots in username)`);
    }

    if (DISPOSABLE_EMAIL_DOMAINS.has(domain)) {
      reasons.push(`Disposable email domain: ${domain}`);
    }
  }

  // Phone check
  const cleanPhone = String(input.phone || '').replace(/\D/g, '');
  if (cleanPhone.length < 8 || cleanPhone.length > 15) {
    reasons.push(`Invalid phone length (${cleanPhone.length} digits)`);
  } else {
    // Check repeating numbers like 1111111111 or sequential 1234567890
    if (/^(\d)\1+$/.test(cleanPhone)) {
      reasons.push('Fake phone number (all repeating digits)');
    }
    if (cleanPhone.includes('123456789') || cleanPhone.includes('987654321')) {
      reasons.push('Fake phone number (sequential digits)');
    }
  }

  // Location / details check
  const country = String(input.country || '').trim();
  const state = String(input.state || '').trim();
  if (!country || country.length < 2) {
    reasons.push('Missing or invalid country');
  }
  if (!state || state.length < 2) {
    reasons.push('Missing or invalid state');
  }

  const isLegitimate = reasons.length === 0;

  return {
    isLegitimate,
    isLikelyLegitimate: isLegitimate,
    status: isLegitimate ? 'active' : 'pending',
    suggestedStatus: isLegitimate ? 'active' : 'pending',
    reasons,
  };
}
