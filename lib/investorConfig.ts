/** Public base URL used for payment return links. */
export function getPublicBaseUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL || 'https://swaryoga.com').replace(/\/$/, '');
}
