/**
 * Get payment link for a workshop based on mode, language, and currency
 * 
 * @param workshop - Workshop slug (e.g., 'swar-yoga-basic')
 * @param mode - Workshop mode (e.g., 'online', 'offline', 'residential')
 * @param language - Language (e.g., 'hindi', 'english', 'marathi')
 * @param currency - Currency code (e.g., 'INR', 'NPR', 'USD')
 * @returns Payment link URL or empty string if not found
 * 
 * @example
 * const link = getPaymentLink('swar-yoga-basic', 'online', 'hindi', 'INR');
 * // Returns: https://u.payu.in/HIfbfDWJVZqa (or configured link)
 */
export function getPaymentLink(
  workshop: string,
  mode: string,
  language: string,
  currency: string = 'INR'
): string {
  const envKey = `NEXT_PUBLIC_PAYMENT_LINK_${workshop.toUpperCase()}_${mode.toUpperCase()}_${language.toUpperCase()}_${currency.toUpperCase()}`;
  return process.env[envKey] || '';
}

/**
 * Alternative approach: Get payment link from environment variable format
 * workshop/{workshop-slug}/{mode}/{language}/{currency}=link
 */
export function getPaymentLinkByPath(
  workshop: string,
  mode: string,
  language: string,
  currency: string = 'INR'
): string {
  // This would work if you parse the .env.payment format into environment variables
  // Currently using the function above with env variable naming convention
  return getPaymentLink(workshop, mode, language, currency);
}

/**
 * Get a fallback payment link (default)
 * Used when no specific link is configured
 */
export function getFallbackPaymentLink(): string {
  return process.env.NEXT_PUBLIC_DEFAULT_PAYMENT_LINK || 'https://u.payu.in/HIfbfDWJVZqa';
}

/**
 * Helper to determine currency based on language/region
 */
export function getCurrencyForLanguage(language: string): string {
  const currencyMap: Record<string, string> = {
    'hindi': 'INR',
    'marathi': 'INR',
    'english': 'USD',
  };
  return currencyMap[language.toLowerCase()] || 'INR';
}
