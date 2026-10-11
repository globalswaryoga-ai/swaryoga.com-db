import { registrationStoredValuesEqual } from '@/lib/registrationWorkshopMerge';

type State = Record<string, unknown>;

export function createOfferAutosave(send: (patch: State, previous: State) => Promise<State>) {
  let saved: State | undefined;
  let pending: State = {};
  let queue = Promise.resolve();
  let error = '';
  let saving = false;
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach(listener => listener());
  const flush = () => {
    const operation = queue.then(async () => {
      if (!saved) throw new Error('Load saved offer settings before editing.');
      if (error) throw new Error(error);
      const patch = Object.fromEntries(Object.entries(pending).filter(([key, value]) =>
        !Object.prototype.hasOwnProperty.call(saved, key) || !registrationStoredValuesEqual(value, saved![key])));
      if (!Object.keys(patch).length) { pending = {}; notify(); return; }
      const previous = Object.fromEntries(Object.keys(patch).filter(key => key in saved!).map(key => [key, saved![key]]));
      saving = true;
      notify();
      try {
        const confirmed = await send(patch, previous);
        if (!confirmed || Object.keys(patch).some(key => !(key in confirmed))) throw new Error('Offer save was not confirmed. Retry before leaving.');
        saved = { ...saved, ...confirmed };
        for (const [key, value] of Object.entries(patch)) {
          if (registrationStoredValuesEqual(pending[key], value)) delete pending[key];
        }
      } catch (failure) {
        error = failure instanceof Error ? failure.message : 'Offer changes were not saved.';
        throw failure;
      } finally { saving = false; notify(); }
    });
    queue = operation.catch(() => {});
    return operation;
  };
  return {
    hydrate(state: State) { saved = { ...state }; notify(); },
    save(patch: State) { pending = { ...pending, ...patch }; return flush(); },
    retry() { error = ''; notify(); return flush(); },
    status() { return { loaded: !!saved, saving, error, pending: Object.keys(pending).length > 0 }; },
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
  };
}
