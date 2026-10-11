/** @jest-environment node */
import { formatLeadDate, leadDateIso, leadDateMs } from '@/lib/leadDate';

describe('lead date normalization', () => {
  it('parses Mongo extended JSON dates from archived leads', () => {
    expect(leadDateIso({ $date: { $numberLong: '1767559901959' } })).toBe('2026-01-04T20:51:41.959Z');
    expect(leadDateIso({ $date: '2026-01-04T20:51:41.959Z' })).toBe('2026-01-04T20:51:41.959Z');
  });

  it('parses ISO strings and epoch values', () => {
    expect(leadDateMs('2026-10-04T18:19:33.074Z')).toBe(Date.parse('2026-10-04T18:19:33.074Z'));
    expect(leadDateMs(1767559901959)).toBe(1767559901959);
    expect(leadDateMs('1767559901959')).toBe(1767559901959);
  });

  it('never renders Invalid Date', () => {
    expect(formatLeadDate(undefined, 'garbage', {})).toBe('Not recorded');
    expect(formatLeadDate(undefined, '2026-10-04T18:19:33.074Z')).not.toBe('Not recorded');
    expect(formatLeadDate({ $date: { $numberLong: '1767559901959' } })).not.toContain('Invalid');
  });
});
