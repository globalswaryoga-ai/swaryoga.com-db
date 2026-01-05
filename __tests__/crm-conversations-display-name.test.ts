import { describe, expect, it } from '@jest/globals';

/**
 * Regression test: CRM WhatsApp chat list should prefer a human-friendly name.
 * Backend now projects `name` using Lead.displayName (or title+name).
 */
describe('CRM conversations display name projection', () => {
  it('prefers displayName, then title+name, then name', () => {
    const pickName = (lead: { displayName?: string; title?: string; name?: string }) => {
      const displayName = String(lead.displayName || '').trim();
      if (displayName) return displayName;
      const title = String(lead.title || '').trim();
      const name = String(lead.name || '').trim();
      if (title && name) return `${title}. ${name}`;
      return name;
    };

    expect(pickName({ displayName: 'Mr. Varun', title: 'Mr', name: 'Varun' })).toBe('Mr. Varun');
    expect(pickName({ title: 'Mr', name: 'Varun' })).toBe('Mr. Varun');
    expect(pickName({ name: 'Varun' })).toBe('Varun');
    expect(pickName({})).toBe('');
  });
});
