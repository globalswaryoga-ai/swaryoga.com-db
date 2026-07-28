/**
 * Browser Extension Group-Op Time Guard
 * Allowed hours for GROUP operations only: 5:00 AM – 10:30 PM IST.
 * 1:1 messages (Schedule Message to a person) are exempt — always allowed.
 */

const ALLOWED_START = { h: 5, m: 0 }; // 5:00 AM IST
const ALLOWED_END = { h: 22, m: 30 }; // 10:30 PM IST
const TIMEZONE = 'Asia/Kolkata';

export function isExtensionGroupOpAllowedNow(): boolean {
  const now = new Date();
  const ist = new Date(now.toLocaleString('en-US', { timeZone: TIMEZONE }));
  const totalMinutes = ist.getHours() * 60 + ist.getMinutes();
  const startMin = ALLOWED_START.h * 60 + ALLOWED_START.m;
  const endMin = ALLOWED_END.h * 60 + ALLOWED_END.m;
  return totalMinutes >= startMin && totalMinutes <= endMin;
}

export function getCurrentISTTime(): string {
  const now = new Date();
  const ist = new Date(now.toLocaleString('en-US', { timeZone: TIMEZONE }));
  return `${String(ist.getHours()).padStart(2, '0')}:${String(ist.getMinutes()).padStart(2, '0')} IST`;
}

export function getExtensionTimeGuardError(): string {
  return `Group operations are only allowed 5:00 AM – 10:30 PM IST (protects against looking robotic outside normal hours). Current time: ${getCurrentISTTime()}.`;
}
