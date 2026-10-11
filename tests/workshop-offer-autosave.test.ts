/** @jest-environment node */
jest.mock('@/lib/bunnyDatabase', () => ({ bunnyExecute: jest.fn(), bunnyBatch: jest.fn(), getBunnyDatabase: jest.fn() }));
jest.mock('@/lib/registrationState', () => ({ readRegistrationState: jest.fn() }));
import { createClient, type Client } from '@libsql/client';
import { unlinkSync } from 'node:fs';
import { bunnyExecute, bunnyBatch, getBunnyDatabase } from '@/lib/bunnyDatabase';
import { readRegistrationState } from '@/lib/registrationState';
import { readOfferState, writeOfferState, saveOfferDesign, listOfferDesigns } from '@/lib/workshopOfferRepository';
import { createOfferAutosave } from '@/lib/workshopOfferAutosave';

describe('Durable offer autosave against real SQL', () => {
  let client: Client;
  const file = `.workshop-offer-autosave-${process.pid}.db`;
  const connect = () => {
    client = createClient({ url: `file:${file}` });
    jest.mocked(bunnyExecute).mockImplementation(statement => client.execute(statement));
    jest.mocked(bunnyBatch).mockImplementation(statements => client.batch(statements, 'write'));
    jest.mocked(getBunnyDatabase).mockReturnValue(client);
  };
  beforeEach(() => {
    jest.clearAllMocks();
    connect();
    jest.mocked(readRegistrationState).mockResolvedValue({ crm_offers: [{ id: 'b1', name: 'Original' }] });
  });
  afterEach(() => { client.close(); for (const suffix of ['', '-wal', '-shm']) { try { unlinkSync(file + suffix); } catch {} } });
  it('keeps batch edits, My Data, category changes and large draft edits after SQL reopening', async () => {
    const initial = await readOfferState('tenant');
    const send = jest.fn((patch, previous) => writeOfferState('tenant', patch, previous));
    const tab = createOfferAutosave(send);
    tab.hydrate(initial);
    expect(send).not.toHaveBeenCalled();
    const updates = {
      crm_offers: [{ id: 'b1', name: 'Edited', metadata: { venue: 'Room 2' } }],
      crm_offer_lead_edits: { response1: { 'Question 1': 'Corrected answer' } },
      crm_custom_categories: [{ id: 'custom', label: 'Reviewed' }],
      crm_offer_payment_drafts: { response1: { remark: 'large '.repeat(2000), amount: '200.50', status: 'pending' } },
    };
    await tab.save(updates);
    client.close();
    connect();
    expect(await readOfferState('tenant')).toMatchObject(updates);
    expect((await readOfferState('other')).crm_offers).toEqual(initial.crm_offers);
  });
  it('rolls back an entire stale multi-key patch and never rebases it onto newer values', async () => {
    const initial = await readOfferState('tenant');
    const makeTab = () => { const tab = createOfferAutosave((patch, previous) => writeOfferState('tenant', patch, previous)); tab.hydrate(initial); return tab; };
    const first = makeTab(), stale = makeTab();
    await first.save({ crm_offers: [{ id: 'b1', name: 'Newest' }] });
    await expect(stale.save({ crm_offers: [{ id: 'b1', name: 'Stale' }], crm_custom_categories: ['must rollback'] })).rejects.toThrow('another tab');
    await expect(stale.retry()).rejects.toThrow('another tab');
    expect(await readOfferState('tenant')).toEqual({ crm_offers: [{ id: 'b1', name: 'Newest' }] });
  });
  it('retains failed edits including later changes and retries without a success-shaped response', async () => {
    const initial = await readOfferState('tenant');
    let unavailable = true;
    const tab = createOfferAutosave(async (patch, previous) => {
      if (unavailable) throw new Error('SQL unavailable');
      return writeOfferState('tenant', patch, previous);
    });
    tab.hydrate(initial);
    await expect(tab.save({ crm_offer_lead_edits: { response1: { answer: 'first' } } })).rejects.toThrow('unavailable');
    await expect(tab.save({ crm_offer_lead_edits: { response1: { answer: 'latest' } } })).rejects.toThrow('unavailable');
    expect(tab.status()).toMatchObject({ error: 'SQL unavailable', pending: true });
    unavailable = false;
    await tab.retry();
    expect(tab.status()).toMatchObject({ error: '', pending: false });
    expect((await readOfferState('tenant')).crm_offer_lead_edits).toEqual({ response1: { answer: 'latest' } });
  });
  it('serializes rapid edits and preserves the most recent final value', async () => {
    const initial = await readOfferState('tenant');
    const tab = createOfferAutosave((patch, previous) => writeOfferState('tenant', patch, previous));
    tab.hydrate(initial);
    await Promise.all(Array.from({ length: 10 }, (_, index) => tab.save({ crm_offers: [{ id: 'b1', name: `Edit ${index}` }] })));
    expect((await readOfferState('tenant')).crm_offers).toEqual([{ id: 'b1', name: 'Edit 9' }]);
  });
  it('rejects stale explicit studio saves atomically', async () => {
    await saveOfferDesign('tenant', 'ad1', 'ad', { headline: 'Saved original', status: 'draft' }, {});
    const original = (await listOfferDesigns('tenant'))[0];
    await saveOfferDesign('tenant', 'ad1', 'ad', { headline: 'Newest headline', status: 'draft' }, original);
    await expect(saveOfferDesign('tenant', 'ad1', 'ad', { headline: 'Stale overwrite', status: 'draft' }, original)).rejects.toThrow('another tab');
    expect((await listOfferDesigns('tenant'))[0].headline).toBe('Newest headline');
  });
});
