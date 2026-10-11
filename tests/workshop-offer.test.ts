/** @jest-environment node */
jest.mock('@/lib/bunnyDatabase', () => ({ bunnyExecute: jest.fn(), bunnyBatch: jest.fn(), getBunnyDatabase: jest.fn() }));
jest.mock('@/lib/registrationState', () => ({ readRegistrationState: jest.fn() }));

import { createClient, type Client } from '@libsql/client';
import { bunnyExecute, bunnyBatch, getBunnyDatabase } from '@/lib/bunnyDatabase';
import { readRegistrationState } from '@/lib/registrationState';
import { offerAmount, validateOfferTransition } from '@/lib/workshopOfferWorkflow';
import { readOfferState, writeOfferState, listOfferRecords, patchOfferRecord, finalizeOfferDocument, listOfferDesigns, savedOfferGoogleTargets } from '@/lib/workshopOfferRepository';
import { collectGoogleFormTargets } from '@/lib/googleFormsSync';
import { validateOfferDesign } from '@/lib/workshopOfferDesign';

describe('Offer payment validation', () => {
  const confirmed = { amount: '₹1,500.50', status: 'received', date: '2026-10-11', paymentMode: 'upi' };
  it('preserves decimal amounts and rejects ambiguous or nonpositive amounts', () => {
    expect(offerAmount(confirmed.amount)).toBe(1500.5);
    for (const amount of ['', '0', '-100', '12.999', '1e3', 'NaN', '500 paid']) expect(() => offerAmount(amount)).toThrow();
  });
  it('requires an actual payment date and method before confirming or queuing', () => {
    expect(validateOfferTransition({}, confirmed)).toEqual(confirmed);
    for (const date of ['2026-02-30', '', '2026-13-01']) expect(() => validateOfferTransition({}, { ...confirmed, date })).toThrow();
    expect(() => validateOfferTransition({}, { ...confirmed, paymentMode: '' })).toThrow();
    expect(() => validateOfferTransition({}, { pushedToCreateReceipts: true })).toThrow();
    expect(() => validateOfferTransition({}, { status: 'paid-by-ai' })).toThrow();
  });
  it('locks confirmed financial fields once a receipt has been finalized', () => {
    const previous = { ...confirmed, receiptNumber: 'SW-R-1' };
    expect(() => validateOfferTransition(previous, { amount: '999' })).toThrow('locked');
    expect(() => validateOfferTransition(previous, { status: 'pending' })).toThrow();
    expect(validateOfferTransition(previous, { remark: 'Reviewed' }).remark).toBe('Reviewed');
  });
});

describe('Isolated permanent offer SQL data', () => {
  let client: Client;
  beforeEach(() => {
    jest.clearAllMocks();
    client = createClient({ url: ':memory:' });
    jest.mocked(bunnyExecute).mockImplementation(statement => client.execute(statement));
    jest.mocked(bunnyBatch).mockImplementation(statements => client.batch(statements, 'write'));
    jest.mocked(getBunnyDatabase).mockReturnValue(client);
    jest.mocked(readRegistrationState).mockResolvedValue({ crm_offers: '[]', crm_registration_private: 'do not copy' });
  });
  afterEach(() => client.close());
  it('imports only offer settings and does not overwrite registration or another tenant', async () => {
    expect(await readOfferState('shared')).toEqual({ crm_offers: '[]' });
    await writeOfferState('shared', { crm_offer_question: 'Ready?' }, {});
    await writeOfferState('tenant', { crm_offer_question: 'Different?' }, {});
    expect((await readOfferState('shared')).crm_offer_question).toBe('Ready?');
    expect((await readOfferState('tenant')).crm_offer_question).toBe('Different?');
    expect((await readOfferState('shared')).crm_registration_private).toBeUndefined();
  });
  it('keeps recovered legacy payments as reviewable drafts and never overwrites new confirmations', async () => {
    jest.mocked(readRegistrationState).mockResolvedValue({ crm_offer_data: JSON.stringify({ response: { amount: '100.25', status: 'received', pushedToReceipts: true, date: '2026-10-11', paymentMode: 'upi' } }) });
    const legacy = await listOfferRecords('shared');
    expect(legacy.response).toMatchObject({ amount: '100.25', status: 'pending', needsVerification: true, legacyStatus: 'received' });
    await patchOfferRecord('shared', 'response', { status: 'received', needsVerification: false }, legacy.response);
    expect((await listOfferRecords('shared')).response.status).toBe('received');
    expect(await listOfferRecords('tenant')).not.toHaveProperty('shared');
  });
  it('rejects stale payment edits instead of overwriting another admin confirmation', async () => {
    await patchOfferRecord('shared', 'r1', { amount: '10' }, {});
    const current = (await listOfferRecords('shared')).r1;
    await patchOfferRecord('shared', 'r1', { amount: '20' }, current);
    await expect(patchOfferRecord('shared', 'r1', { amount: '30' }, current)).rejects.toThrow('changed');
    expect((await listOfferRecords('shared')).r1.amount).toBe('20');
  });
  it('saves a final document and its payment link atomically, refusing duplicates', async () => {
    await patchOfferRecord('shared', 'r1', { amount: '10', status: 'received' }, {});
    const payment = (await listOfferRecords('shared')).r1;
    await finalizeOfferDocument('shared', 'receipt-1', 'receipt', { id: 'receipt-1', status: 'final' }, 'r1', payment, { receiptNumber: 'SW-R-1' });
    expect((await listOfferDesigns('shared'))[0].status).toBe('final');
    const updated = (await listOfferRecords('shared')).r1;
    expect(updated.receiptNumber).toBe('SW-R-1');
    await expect(finalizeOfferDocument('shared', 'receipt-1', 'receipt', { status: 'final' }, 'r1', updated, { receiptNumber: 'SW-R-2' })).rejects.toThrow('already');
    expect((await listOfferRecords('shared')).r1.receiptNumber).toBe('SW-R-1');
  });
  it('discovers only saved offer forms for the existing background sync worker', async () => {
    await writeOfferState('shared', { crm_offers: JSON.stringify([{ formId: 'o'.repeat(35), name: 'Offer', metadata: { formSource: 'google' } }]) }, {});
    const targets = await savedOfferGoogleTargets();
    expect(collectGoogleFormTargets([], { crm_workshops: targets[0].batches })).toEqual([{ formId: 'o'.repeat(35), name: 'Offer' }]);
  });
});

it('rejects invalid design identity, colors and excessive output dimensions', () => {
  const draft = { id: 'design-1', kind: 'ad', title: 'Ad', headline: 'Title', subtitle: 'Subtitle', footer: 'CTA', accent: '#c8a35e', background: '#152b2a', textColor: '#ffffff', fontFamily: 'sans', width: 1080, height: 1080, status: 'draft' };
  expect(validateOfferDesign(draft)).toEqual(draft);
  expect(() => validateOfferDesign({ ...draft, accent: 'red' })).toThrow();
  expect(() => validateOfferDesign({ ...draft, width: 10000 })).toThrow();
});
