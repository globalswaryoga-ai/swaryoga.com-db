export type WorkshopAutosaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export function createWorkshopAutosave<T>(
  send: (snapshot: T) => Promise<void>,
  onStatus?: (status: WorkshopAutosaveStatus, error?: string) => void,
  delayMs = 650,
) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let latestSnapshot: T | undefined;
  let scheduledVersion = 0;
  let savedVersion = 0;
  let queue: Promise<void> = Promise.resolve();

  const clearTimer = () => {
    if (timer) clearTimeout(timer);
    timer = undefined;
  };

  const flush = () => {
    clearTimer();
    const targetVersion = scheduledVersion;
    if (!targetVersion || targetVersion <= savedVersion) return Promise.resolve();

    const job = queue.catch(() => undefined).then(async () => {
      while (savedVersion < targetVersion) {
        const version = scheduledVersion;
        const snapshot = latestSnapshot;
        if (snapshot === undefined) return;
        onStatus?.('saving');
        try {
          await send(snapshot);
          savedVersion = version;
          if (version === scheduledVersion) onStatus?.('saved');
        } catch (error) {
          if (version === scheduledVersion) {
            onStatus?.('error', error instanceof Error ? error.message : 'Changes could not be saved.');
          }
          throw error;
        }
      }
    });
    queue = job;
    return job;
  };

  return {
    schedule(snapshot: T) {
      latestSnapshot = snapshot;
      scheduledVersion += 1;
      onStatus?.('saving');
      clearTimer();
      timer = setTimeout(() => { void flush().catch(() => undefined); }, delayMs);
    },
    flush,
    retry: flush,
    cancel() {
      clearTimer();
    },
  };
}
