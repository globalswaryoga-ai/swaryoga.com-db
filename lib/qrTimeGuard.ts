/**
 * QR WhatsApp Time Guard
 * Allowed hours: 5:00 AM – 10:30 PM IST
 * Messages sent outside hours are QUEUED and auto-sent at 5:00 AM next morning.
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

/** Returns next 5:00 AM IST as a UTC Date */
export function getNext5AMIST(): Date {
  const now = new Date();
  const ist = new Date(now.toLocaleString('en-US', { timeZone: TIMEZONE }));

  // Build 5:00 AM today in IST
  const next5AM = new Date(ist);
  next5AM.setHours(5, 0, 0, 0);

  // If already past 5 AM, push to tomorrow
  if (ist >= next5AM) {
    next5AM.setDate(next5AM.getDate() + 1);
  }

  // IST = UTC+5:30 → subtract 5h30m to get UTC
  return new Date(next5AM.getTime() - (5.5 * 60 * 60 * 1000));
}

export function getCurrentISTTime(): string {
  const now = new Date();
  const ist = new Date(now.toLocaleString('en-US', { timeZone: TIMEZONE }));
  return `${String(ist.getHours()).padStart(2,'0')}:${String(ist.getMinutes()).padStart(2,'0')} IST`;
}

export function getQRTimeGuardError(): string {
  return `Outside allowed hours (5:00 AM – 10:30 PM IST). Current time: ${getCurrentISTTime()}`;
}
