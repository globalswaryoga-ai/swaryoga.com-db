import { registrationStoredValuesEqual } from '@/lib/registrationWorkshopMerge';

type State = Record<string, unknown>;
export function createRegistrationAutosave(send: (patch: State, previous: State) => Promise<State>) {
  let saved: State | undefined;
  let rendered: State | undefined;
  let queue = Promise.resolve();
  return {
    hydrate(state: State) { saved = { ...state }; },
    save(snapshot: State) {
      if (!saved) return Promise.reject(new Error('Saved registration data must load before autosaving.'));
      if (!rendered) {
        rendered = { ...snapshot };
        return Promise.resolve();
      }
      const patch = Object.fromEntries(Object.entries(snapshot).filter(([key, value]) =>
        Object.prototype.hasOwnProperty.call(rendered, key) &&
        !registrationStoredValuesEqual(value, rendered?.[key])));
      rendered = { ...snapshot };
      if (!Object.keys(patch).length) return Promise.resolve();
      const job = queue.then(async () => {
        const previous = Object.fromEntries(Object.keys(patch).filter(key => key in saved!).map(key => [key, saved![key]]));
        const persisted = await send(patch, previous);
        saved = { ...saved, ...persisted };
      });
      queue = job.catch(() => {});
      return job;
    },
  };
}
