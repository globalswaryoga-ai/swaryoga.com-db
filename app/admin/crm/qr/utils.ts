import React from 'react';

/**
 * QR WhatsApp page utility functions and constants
 */

// Format phone number to readable format
export const formatPhoneNumber = (phone: string): string => {
  const cleaned = phone.replace(/[^0-9]/g, '');
  // LID internal IDs are 14+ digits — NOT phone numbers, don't format them
  if (cleaned.length >= 14) return phone;
  // Indian numbers
  if (cleaned.length === 10) return `+91 ${cleaned.slice(0, 5)} ${cleaned.slice(5)}`;
  if (cleaned.length === 12 && cleaned.startsWith('91')) return `+91 ${cleaned.slice(2, 7)} ${cleaned.slice(7)}`;
  if (cleaned.length === 13 && cleaned.startsWith('91')) return `+91 ${cleaned.slice(2, 7)} ${cleaned.slice(7)}`;
  // Other international numbers — add + prefix and space after country code
  if (cleaned.length >= 11 && cleaned.length <= 13) return `+${cleaned}`;
  // Fallback
  return phone;
};

// Get avatar color based on name/id
export const getAvatarColor = (name: string): string => {
  const colors = ['bg-indigo-500', 'bg-green-500', 'bg-purple-500', 'bg-pink-500', 'bg-yellow-500', 'bg-red-500', 'bg-indigo-500', 'bg-cyan-500'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
};

// Convert URLs in text to clickable links
export const URL_REGEX = /(https?:\/\/[^\s<>"']+)/gi;
export const linkifyText = (text: string): React.ReactNode[] => {
  const parts = text.split(URL_REGEX);
  return parts.map((part, i) =>
    URL_REGEX.test(part)
      ? React.createElement('a', { key: i, href: part, target: '_blank', rel: 'noopener noreferrer', className: 'text-indigo-600 hover:text-indigo-800 underline break-all' }, part)
      : React.createElement(React.Fragment, { key: i }, part)
  );
};

// Get initials from name
export const getInitials = (name: string): string => {
  if (!name || name.includes('QR Lead')) return '👤';
  return name
    .split(' ')
    .slice(0, 2)
    .map(n => n[0])
    .join('')
    .toUpperCase();
};

// Format uptime seconds to human string
export function formatUptime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}
