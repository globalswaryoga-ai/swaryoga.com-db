/** @jest-environment node */

import { assembleRegistrationLeads } from '@/lib/registrationLeads';
import { registrationPage } from '@/lib/registrationPagination';

describe('Registration large-data performance without data loss', () => {
  it('indexes contacts once rather than scanning every contact for every response', () => {
    let contactReads = 0;
    const leads = Array.from({ length: 5000 }, (_, index) => ({
      _id: `lead-${index}`, source: 'google_forms',
      get phoneNumber() { contactReads++; return `919${String(index).padStart(9, '0')}`; },
      get email() { contactReads++; return `student-${index}@example.test`; },
    }));
    const submissions = Array.from({ length: 700 }, (_, index) => ({
      id: `response-${index}`, formId: 'form', email: `student-${index + 4000}@example.test`,
    }));
    const rows = assembleRegistrationLeads(leads, submissions, [{ formId: 'form', workshopName: 'Hindi' }]);
    expect(rows).toHaveLength(5000);
    expect(rows[0].leadId).toBe('lead-4000');
    expect(rows[699].leadId).toBe('lead-4699');
    expect(contactReads).toBeLessThan(5000 * 6);
  });

  it('preserves first-match semantics when a phone and email refer to different contacts', () => {
    const rows = assembleRegistrationLeads([
      { _id: 'first-email', email: 'student@example.test' },
      { _id: 'second-phone', phoneNumber: '+91 99999 99999' },
    ], [{ id: 'response', email: 'student@example.test', mobile: '919999999999' }], []);
    expect(rows[0].leadId).toBe('first-email');
  });

  it('benchmarks the former scan against indexed matching on a representative dataset', () => {
    const leads = Array.from({ length: 5000 }, (_, index) => ({
      _id: `lead-${index}`, email: `student-${index}@example.test`, phoneNumber: `919${String(index).padStart(9, '0')}`,
    }));
    const submissions = Array.from({ length: 727 }, (_, index) => ({
      id: `response-${index}`, email: `student-${index + 4000}@example.test`, formId: 'form',
    }));
    const scanStart = performance.now();
    const previous = submissions.map(submission => leads.find(lead =>
      String(lead.email || '').trim().toLowerCase() === String(submission.email).trim().toLowerCase())?._id);
    const scanMs = performance.now() - scanStart;
    const indexStart = performance.now();
    const rows = assembleRegistrationLeads(leads, submissions, []);
    const indexMs = performance.now() - indexStart;
    expect(rows.map(row => row.leadId)).toEqual(previous);
    console.info(`Local contact matching benchmark: scan=${scanMs.toFixed(1)}ms indexed=${indexMs.toFixed(1)}ms (5000 leads, 727 responses)`);
  });

  it('keeps every record reachable while rendering at most 50 rows at a time', () => {
    const rows = Array.from({ length: 727 }, (_, id) => id);
    const rendered: number[] = [];
    for (let page = 1; page <= 15; page++) {
      const range = registrationPage(rows.length, page);
      const visible = rows.slice(range.offset, range.end);
      expect(visible.length).toBeLessThanOrEqual(50);
      rendered.push(...visible);
    }
    expect(rendered).toEqual(rows);
    expect(registrationPage(0, 5)).toMatchObject({ page: 1, offset: 0, end: 0 });
    expect(registrationPage(12, 15)).toMatchObject({ page: 1, end: 12 });
  });
});
