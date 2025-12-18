/**
 * Payment Link Resolver
 * Automatically resolves payment links from .env.payment based on:
 * - Workshop slug
 * - Language (hindi, english, marathi)
 * - Mode (online, offline, residential, recorded)
 * - Currency (INR, NPR, USD)
 */

type Language = 'hindi' | 'english' | 'marathi';
type Mode = 'online' | 'offline' | 'residential' | 'recorded';
type Currency = 'INR' | 'NPR' | 'USD';

/**
 * Resolves a payment link for a specific workshop, language, mode, and currency
 * Format in .env.payment: workshop/{slug}_{language}_{mode}_{currency}=<url>
 * Also supports simple format: workshop/{slug}=<url>
 */
export const getPaymentLink = (
  workshopSlug: string,
  language?: Language,
  mode?: Mode,
  currency?: Currency
): string => {
  // Build the environment variable key based on parameters
  let envKey: string;

  if (language && mode && currency) {
    // Full format: workshop/slug_language_mode_currency
    envKey = `NEXT_PUBLIC_WORKSHOP_${workshopSlug}_${language}_${mode}_${currency}`;
  } else if (language && mode) {
    // Partial format: workshop/slug_language_mode
    envKey = `NEXT_PUBLIC_WORKSHOP_${workshopSlug}_${language}_${mode}`;
  } else {
    // Simple format: workshop/slug
    envKey = `NEXT_PUBLIC_WORKSHOP_${workshopSlug}`;
  }

  // Try to get from environment variables
  const envValue = process.env[envKey];
  if (envValue) {
    return envValue;
  }

  // Fallback: Try to construct from .env.payment direct key
  // This is for client-side usage where env vars might not be available
  // In that case, the key should be in format: workshop/slug_language_mode_currency
  if (typeof window !== 'undefined') {
    console.warn(`Payment link not found for: ${envKey}`);
  }

  return '';
};

/**
 * Gets all payment links for a workshop across all languages, modes, and currencies
 */
export const getWorkshopPaymentLinks = (
  workshopSlug: string
): Record<Language, Record<Mode, Record<Currency, string>>> => {
  const languages: Language[] = ['hindi', 'english', 'marathi'];
  const modes: Mode[] = ['online', 'offline', 'residential', 'recorded'];
  const currencies: Currency[] = ['INR', 'NPR', 'USD'];

  const result: Record<Language, Record<Mode, Record<Currency, string>>> = {
    hindi: { online: { INR: '', NPR: '', USD: '' }, offline: { INR: '', NPR: '', USD: '' }, residential: { INR: '', NPR: '', USD: '' }, recorded: { INR: '', NPR: '', USD: '' } },
    english: { online: { INR: '', NPR: '', USD: '' }, offline: { INR: '', NPR: '', USD: '' }, residential: { INR: '', NPR: '', USD: '' }, recorded: { INR: '', NPR: '', USD: '' } },
    marathi: { online: { INR: '', NPR: '', USD: '' }, offline: { INR: '', NPR: '', USD: '' }, residential: { INR: '', NPR: '', USD: '' }, recorded: { INR: '', NPR: '', USD: '' } },
  };

  for (const language of languages) {
    for (const mode of modes) {
      for (const currency of currencies) {
        result[language][mode][currency] = getPaymentLink(workshopSlug, language, mode, currency);
      }
    }
  }

  return result;
};

/**
 * Gets payment link for a specific combination
 * Example: getPaymentLinkForWorkshop('swar-yoga-basic', 'hindi', 'online', 'INR')
 */
export const getPaymentLinkForWorkshop = (
  workshopSlug: string,
  language?: Language,
  mode?: Mode,
  currency?: Currency
): string => {
  return getPaymentLink(workshopSlug, language, mode, currency);
};
