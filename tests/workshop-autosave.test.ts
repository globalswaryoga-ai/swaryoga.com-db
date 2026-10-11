import { createWorkshopAutosave, WorkshopAutosaveStatus } from '@/lib/workshopAutosave';

describe('workshop autosave', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  test('debounces edits to the latest snapshot and reports saved', async () => {
    const send = jest.fn().mockResolvedValue(undefined);
    const statuses: WorkshopAutosaveStatus[] = [];
    const autosave = createWorkshopAutosave(send, status => statuses.push(status), 20);

    autosave.schedule({ name: 'Draft' });
    autosave.schedule({ name: 'Final' });
    expect(send).not.toHaveBeenCalled();

    await jest.advanceTimersByTimeAsync(20);
    await autosave.flush();

    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith({ name: 'Final' });
    expect(statuses).toContain('saved');
  });

  test('serializes an in-flight save before persisting a newer edit', async () => {
    let releaseFirst!: () => void;
    const send = jest.fn()
      .mockImplementationOnce(() => new Promise<void>(resolve => { releaseFirst = resolve; }))
      .mockResolvedValue(undefined);
    const autosave = createWorkshopAutosave(send, undefined, 20);

    autosave.schedule('old');
    const firstFlush = autosave.flush();
    await Promise.resolve();
    await Promise.resolve();
    expect(send).toHaveBeenCalledWith('old');

    autosave.schedule('new');
    const secondFlush = autosave.flush();
    releaseFirst();
    await Promise.all([firstFlush, secondFlush]);

    expect(send.mock.calls.map(([value]) => value)).toEqual(['old', 'new']);
  });

  test('retains a failed edit for explicit retry', async () => {
    const send = jest.fn()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValue(undefined);
    const statuses: Array<{ status: WorkshopAutosaveStatus; error?: string }> = [];
    const autosave = createWorkshopAutosave(
      send,
      (status, error) => statuses.push({ status, error }),
      20,
    );

    autosave.schedule({ active: true });
    await expect(autosave.flush()).rejects.toThrow('offline');
    expect(statuses.at(-1)).toEqual({ status: 'error', error: 'offline' });

    await autosave.retry();
    expect(send).toHaveBeenCalledTimes(2);
    expect(send).toHaveBeenLastCalledWith({ active: true });
    expect(statuses.at(-1)?.status).toBe('saved');
  });
});
