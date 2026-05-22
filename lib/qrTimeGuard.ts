/**
 * QR WhatsApp Time Guard
 * Enforces no messages sent outside 5:00 AM – 10:30 PM IST
 * Apply to ALL QR send paths: broadcast API, qr-bridge /send, cron processor
 */

const ALLOWED_START = { h: 5,  m: 0  }; // 5:00 AM IST
const ALLOWED_END   = { h: 22, m: 30 }; // 10:30 PM IST
const TIMEZONE = 'Asia/Kolkata';

export function isQRSendAllowed(): boolean {
  const now = new Date();
  const ist = new Date(now.toLocaleString('en-US', { timeZone: TIMEZONE }));
  const totalMinutes = ist.getHours() * 60 + ist.getMinutes();
  const startMin = ALLOWED_START.h * 60 + ALLOWED_START.m;
  const endMin   = ALLOWED_END.h   * 60 + ALLOWED_END.m;
  return totalMinutes >= startMin && totalMinutes <= endMin;
}

export function getQRTimeGuardError(): string {
  return 'Messages cannot be sent after 10:30 PM or before 5:00 AM IST. Please try again during allowed hours (5:00 AM – 10:30 PM IST).';
}

export function getCurrentISTTime(): string {
  const now = new Date();
  const ist = new Date(now.toLocaleString('en-US', { timeZone: TIMEZONE }));
  return `${String(ist.getHours()).padStart(2,'0')}:${String(ist.getMinutes()).padStart(2,'0')} IST`;
}
