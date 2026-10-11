/** @jest-environment node */
jest.mock('@/lib/bunnyDatabase', () => ({ bunnyExecute: jest.fn() }));
import { bunnyExecute } from '@/lib/bunnyDatabase';
import { connectedGoogleFormTargets, readGoogleFormConnections } from '@/lib/googleFormConnections';

describe('Existing Google Form connections to background worker', () => {
  it('discovers workshop and offer links without duplicating a form', () => {
    expect(connectedGoogleFormTargets({
      Hindi: { workshop: `https://docs.google.com/forms/d/${'h'.repeat(35)}/edit`, offer: 'o'.repeat(35) },
      English: { workshop: 'h'.repeat(35), offer: '' },
    })).toEqual([
      { formId: 'h'.repeat(35), name: 'Hindi Workshop Form' },
      { formId: 'o'.repeat(35), name: 'Hindi Offer Form' },
    ]);
  });
  it('reports unusable saved links instead of pretending sync succeeded', () => {
    expect(() => connectedGoogleFormTargets({ Hindi: { workshop: 'invalid-link' } })).toThrow('Hindi workshop');
  });
  it('reads the existing Bunny config without changing its selected forms', async () => {
    const config = { Hindi: { workshop: 'h'.repeat(35), offer: '' } };
    jest.mocked(bunnyExecute).mockResolvedValueOnce({ rows: [] } as never)
      .mockResolvedValueOnce({ rows: [{ config_value: JSON.stringify(config) }] } as never);
    expect(await readGoogleFormConnections()).toEqual(config);
    expect(bunnyExecute).toHaveBeenLastCalledWith(expect.objectContaining({ sql: expect.stringContaining("config_key = 'google_form_links'") }));
  });
});
