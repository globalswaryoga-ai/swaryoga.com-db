import { registrationStoredValuesEqual } from '@/lib/registrationWorkshopMerge';

type State = Record<string, unknown>;
export type RegistrationSaveStatus = 'idle' | 'saving' | 'saved' | 'error';
export function createRegistrationAutosave(send: (patch: State, previous: State) => Promise<State>,
  onStatus?: (status: RegistrationSaveStatus, error?: string) => void) {
  let saved: State | undefined;
  let rendered: State | undefined;
  let pending: State = {};
  let queue = Promise.resolve();
  const persist = () => {
    const job = queue.then(async () => {
      const patch = { ...pending };
      if (!Object.keys(patch).length) return;
      onStatus?.('saving');
      try {
        const previous = Object.fromEntries(Object.keys(patch).filter(key => key in saved!).map(key => [key, saved![key]]));
        const persisted = await send(patch, previous);
        saved = { ...saved, ...persisted };
        for (const key of Object.keys(patch)) {
          if (registrationStoredValuesEqual(pending[key], patch[key])) delete pending[key];
        }
        if (!Object.keys(pending).length) onStatus?.('saved');
      } catch (error) {
        onStatus?.('error', error instanceof Error ? error.message : 'Registration changes were not saved.');
        throw error;
      }
    });
    queue = job.catch(() => {});
    return job;
  };
  return {
    hydrate(state: State) { saved = { ...state }; },
    retry() {
      if (!saved) return Promise.reject(new Error('Saved registration data must load before autosaving.'));
      return persist();
    },
    save(snapshot: State) {
      if (!saved) return Promise.reject(new Error('Saved registration data must load before autosaving.'));
      if (!rendered) {
        rendered = { ...snapshot };
        return Promise.resolve();
      }
      const changed = Object.fromEntries(Object.entries(snapshot).filter(([key, value]) =>
        Object.prototype.hasOwnProperty.call(rendered, key) &&
        !registrationStoredValuesEqual(value, rendered?.[key])));
      rendered = { ...snapshot };
      pending = { ...pending, ...changed };
      if (!Object.keys(pending).length) return Promise.resolve();
      return persist();
    },
  };
}
