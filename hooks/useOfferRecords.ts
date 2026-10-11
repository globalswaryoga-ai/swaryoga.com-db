'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { offerJson } from '@/lib/workshopOfferClient';

export function useOfferRecords() {
  const [records, setRecords] = useState<Record<string, Record<string, any>>>({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const queue = useRef(Promise.resolve());
  const reload = useCallback(async () => {
    try { const data = await offerJson<{ data: typeof records }>('records'); setRecords(data.data); setError(''); }
    catch (error) { setError(error instanceof Error ? error.message : 'Could not load offers'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void reload(); }, [reload]);
  const save = (leadId: string, patch: Record<string, unknown>) => {
    const operation = queue.current.then(async () => {
      const response = await offerJson<{ data: Record<string, any> }>('records', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ leadId, patch }) });
      setRecords(previous => ({ ...previous, [leadId]: response.data }));
      setError('');
    });
    queue.current = operation.catch(error => { setError(error instanceof Error ? error.message : 'Offer was not saved'); });
    return operation;
  };
  return { records, error, loading, save, reload };
}
