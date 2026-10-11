'use client';
import { useEffect, useRef, useState } from 'react';
import { offerAutosave } from '@/lib/workshopOfferClient';
import { registrationStoredValuesEqual } from '@/lib/registrationWorkshopMerge';

export function useOfferAutosave(snapshot: Record<string, unknown>, enabled: boolean) {
  const rendered = useRef<Record<string, unknown> | undefined>(undefined);
  const [status, setStatus] = useState(offerAutosave.status);
  useEffect(() => offerAutosave.subscribe(() => setStatus(offerAutosave.status())), []);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (offerAutosave.status().pending) { event.preventDefault(); event.returnValue = ''; }
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, []);
  useEffect(() => {
    if (!enabled) { rendered.current = undefined; return; }
    const previous = rendered.current;
    rendered.current = snapshot;
    if (!previous) return;
    const patch = Object.fromEntries(Object.entries(snapshot).filter(([key, value]) =>
      key in previous && !registrationStoredValuesEqual(value, previous[key])));
    if (Object.keys(patch).length) void offerAutosave.save(patch).catch(() => {});
  }, [snapshot, enabled]);
  return { ...status, retry: () => offerAutosave.retry() };
}
