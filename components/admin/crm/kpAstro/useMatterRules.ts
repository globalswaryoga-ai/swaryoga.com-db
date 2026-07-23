'use client';

import { useCallback, useEffect, useState } from 'react';
import type { MatterRule } from './bhavAutoFill';

// Loads the astrologer's Matter -> Rule library once per workspace page and
// exposes a refresh() so the Matter Rule Library modal can trigger a reload
// right after an add/edit/delete, without a full page refresh.
export function useMatterRules(token: string | null) {
  const [rules, setRules] = useState<MatterRule[]>([]);

  const refresh = useCallback(() => {
    if (!token) return;
    fetch('/api/admin/crm/kp-astro/matter-rules', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((j) => setRules(Array.isArray(j.data) ? j.data.map((r: any) => ({ _id: r._id, keyword: r.keyword, ruleText: r.ruleText })) : []))
      .catch(() => {});
  }, [token]);

  useEffect(() => { refresh(); }, [refresh]);

  return { rules, refresh };
}
