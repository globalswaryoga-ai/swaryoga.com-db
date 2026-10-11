/** @jest-environment node */
import { createRegistrationAutosave } from '@/lib/registrationAutosave';

describe('Preserve-first browser autosave', () => {
  it('does not send defaults or stale cache during refresh/reopening/deployment hydration', async () => {
    const send = jest.fn(async patch => patch);
    const saver = createRegistrationAutosave(send);
    saver.hydrate({ crm_hindi_workshops: [{ id: 'saved' }], crm_hindi_approved_ids_batch: ['one'] });
    const initial = { crm_hindi_workshops: '[]', crm_hindi_approved_ids_batch: '[]' };
    await saver.save(initial);
    await saver.save(initial);
    expect(send).not.toHaveBeenCalled();
    await saver.save({ ...initial, crm_hindi_google_form_url_Hindi: 'restored-connection' });
    expect(send).not.toHaveBeenCalled();
  });
  it('sends only changed visible fields against their canonical saved values', async () => {
    const send = jest.fn(async patch => patch);
    const saver = createRegistrationAutosave(send);
    saver.hydrate({ crm_hindi_workshops: [{ id: 'saved' }], crm_hindi_ai_worker_active: 'false' });
    const initial = { crm_hindi_workshops: '[{"id":"saved"}]', crm_hindi_ai_worker_active: 'false' };
    await saver.save(initial);
    await saver.save({ ...initial, crm_hindi_ai_worker_active: 'true' });
    expect(send).toHaveBeenCalledWith({ crm_hindi_ai_worker_active: 'true' }, { crm_hindi_ai_worker_active: 'false' });
  });
  it('refuses saving before Bunny state loads and exposes conflicts', async () => {
    const send = jest.fn().mockRejectedValue(new Error('Saved data changed'));
    const saver = createRegistrationAutosave(send);
    await expect(saver.save({ crm_setting: 'edit' })).rejects.toThrow('must load');
    saver.hydrate({ crm_setting: 'before' });
    await saver.save({ crm_setting: 'before' });
    await expect(saver.save({ crm_setting: 'edit' })).rejects.toThrow('Saved data changed');
  });
});
