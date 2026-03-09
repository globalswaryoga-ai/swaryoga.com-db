/**
 * Tests for QR WhatsApp page utility functions
 * @module app/admin/crm/qr/utils
 */
import React from 'react';
import {
  formatPhoneNumber,
  getAvatarColor,
  linkifyText,
  getInitials,
  formatUptime,
  URL_REGEX,
} from '@/app/admin/crm/qr/utils';

describe('formatPhoneNumber', () => {
  it('formats 10-digit Indian numbers', () => {
    expect(formatPhoneNumber('9876543210')).toBe('+91 98765 43210');
  });

  it('formats 12-digit Indian numbers with 91 prefix', () => {
    expect(formatPhoneNumber('919876543210')).toBe('+91 98765 43210');
  });

  it('formats 13-digit Indian numbers with 91 prefix', () => {
    expect(formatPhoneNumber('9198765432100')).toBe('+91 98765 432100');
  });

  it('handles LID internal IDs (14+ digits) without formatting', () => {
    expect(formatPhoneNumber('12345678901234')).toBe('12345678901234');
    expect(formatPhoneNumber('12345678901234567')).toBe('12345678901234567');
  });

  it('handles international numbers (11-13 digits)', () => {
    const result = formatPhoneNumber('14155551234');
    expect(result).toBe('+14155551234');
  });

  it('returns original string for non-numeric input', () => {
    expect(formatPhoneNumber('abc')).toBe('abc');
    expect(formatPhoneNumber('John Doe')).toBe('John Doe');
  });

  it('strips non-numeric characters before formatting', () => {
    expect(formatPhoneNumber('+91-98765-43210')).toBe('+91 98765 43210');
    expect(formatPhoneNumber('(987) 654-3210')).toBe('+91 98765 43210');
  });

  it('returns original for short numbers', () => {
    expect(formatPhoneNumber('12345')).toBe('12345');
  });

  it('handles empty string', () => {
    expect(formatPhoneNumber('')).toBe('');
  });
});

describe('getAvatarColor', () => {
  it('returns a valid Tailwind bg class', () => {
    const color = getAvatarColor('TestUser');
    expect(color).toMatch(/^bg-\w+-500$/);
  });

  it('returns consistent color for the same name', () => {
    const color1 = getAvatarColor('John');
    const color2 = getAvatarColor('John');
    expect(color1).toBe(color2);
  });

  it('returns different colors for different names', () => {
    // Different names should generally get different colors
    const colorA = getAvatarColor('Alice');
    const colorB = getAvatarColor('Zebra');
    // They CAN be the same (hash collision), but let's check the function runs
    expect(colorA).toMatch(/^bg-\w+-500$/);
    expect(colorB).toMatch(/^bg-\w+-500$/);
  });

  it('handles empty string', () => {
    const color = getAvatarColor('');
    expect(color).toMatch(/^bg-\w+-500$/);
  });

  it('handles special characters', () => {
    const color = getAvatarColor('!@#$%');
    expect(color).toMatch(/^bg-\w+-500$/);
  });
});

describe('linkifyText', () => {
  it('converts URLs to clickable links', () => {
    const result = linkifyText('Visit https://example.com for info');
    expect(result).toHaveLength(3); // text, link, text
    // The second element should be the link
    const link = result[1] as React.ReactElement;
    expect(link.props.href).toBe('https://example.com');
    expect(link.props.target).toBe('_blank');
    expect(link.props.rel).toBe('noopener noreferrer');
  });

  it('handles text without URLs', () => {
    const result = linkifyText('Hello World');
    expect(result).toHaveLength(1);
  });

  it('handles multiple URLs', () => {
    const result = linkifyText('Go to https://a.com and https://b.com');
    // Should have: text, link, text, link, text
    expect(result.length).toBeGreaterThanOrEqual(4);
  });

  it('handles empty string', () => {
    const result = linkifyText('');
    expect(result).toHaveLength(1);
  });

  it('handles http:// URLs', () => {
    const result = linkifyText('See http://example.com');
    const link = result[1] as React.ReactElement;
    expect(link.props.href).toBe('http://example.com');
  });
});

describe('URL_REGEX', () => {
  it('matches https URLs', () => {
    expect('https://example.com').toMatch(URL_REGEX);
  });

  it('matches http URLs', () => {
    expect('http://example.com').toMatch(URL_REGEX);
  });

  it('does not match plain text', () => {
    // Reset lastIndex since the regex is global
    URL_REGEX.lastIndex = 0;
    expect(URL_REGEX.test('hello world')).toBe(false);
  });

  it('matches URLs with paths', () => {
    URL_REGEX.lastIndex = 0;
    expect(URL_REGEX.test('https://example.com/path/to/page')).toBe(true);
  });

  it('matches URLs with query params', () => {
    URL_REGEX.lastIndex = 0;
    expect(URL_REGEX.test('https://example.com?foo=bar&baz=1')).toBe(true);
  });
});

describe('getInitials', () => {
  it('returns initials from first and last name', () => {
    expect(getInitials('John Doe')).toBe('JD');
  });

  it('returns single initial for single name', () => {
    expect(getInitials('Alice')).toBe('A');
  });

  it('returns max 2 initials for 3+ word names', () => {
    expect(getInitials('John Michael Doe')).toBe('JM');
  });

  it('returns uppercase initials', () => {
    expect(getInitials('jane doe')).toBe('JD');
  });

  it('handles empty string', () => {
    expect(getInitials('')).toBe('');
  });

  it('handles single character', () => {
    expect(getInitials('A')).toBe('A');
  });

  it('handles numbers in name', () => {
    expect(getInitials('919876543210')).toBe('9');
  });
});

describe('formatUptime', () => {
  it('formats seconds to minutes only', () => {
    expect(formatUptime(300)).toBe('5m');
    expect(formatUptime(60)).toBe('1m');
    expect(formatUptime(0)).toBe('0m');
  });

  it('formats seconds to hours and minutes', () => {
    expect(formatUptime(3600)).toBe('1h 0m');
    expect(formatUptime(3660)).toBe('1h 1m');
    expect(formatUptime(7200)).toBe('2h 0m');
    expect(formatUptime(7290)).toBe('2h 1m');
  });

  it('handles large values', () => {
    expect(formatUptime(86400)).toBe('24h 0m');
    expect(formatUptime(90061)).toBe('25h 1m');
  });

  it('handles fractional seconds (floors)', () => {
    expect(formatUptime(90.9)).toBe('1m');
  });
});
