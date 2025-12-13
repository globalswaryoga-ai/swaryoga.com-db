'use client';

import { useEffect, useMemo, useState } from 'react';
import { readLifePlannerLocalBackup, clearLifePlannerLocalBackup } from '@/lib/lifePlannerLocalBackup';
import { lifePlannerStorage } from '@/lib/lifePlannerMongoStorage';

/**
 * One-time helper UI to restore legacy localStorage Life Planner data into MongoDB.
 *
 * This solves the "my old data is gone" situation after switching from localStorage to Mongo.
 */
export default function LifePlannerRestoreBackup() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const counts = useMemo(() => {
    const local = readLifePlannerLocalBackup();
    const total =
      local.visions.length +
      local.actionPlans.length +
      local.goals.length +
      local.tasks.length +
      local.todos.length +
      local.words.length +
      local.reminders.length +
      local.healthRoutines.length +
      local.diamondPeople.length;

    return { ...local, total };
  }, []);

  useEffect(() => {
    // Only show the prompt if:
    // - there's something to restore
    // - user is logged in with token
    // - and we haven't already shown it
    if (typeof window === 'undefined') return;

    const hasToken = Boolean(localStorage.getItem('lifePlannerToken'));
    const seen = localStorage.getItem('lifePlannerRestorePromptSeen') === '1';

    if (hasToken && !seen && counts.total > 0) {
      setIsOpen(true);
      localStorage.setItem('lifePlannerRestorePromptSeen', '1');
    }
  }, [counts.total]);

  const onRestore = async () => {
    setError(null);
    setIsMigrating(true);

    try {
      // Read local legacy backup
      const local = readLifePlannerLocalBackup();

      // Merge with existing Mongo data (avoid overwriting other-device updates)
      const [mongoVisions, mongoActionPlans, mongoGoals, mongoTasks, mongoTodos, mongoWords, mongoReminders, mongoHealthRoutines, mongoDiamondPeople] =
        await Promise.all([
          lifePlannerStorage.getVisions(),
          lifePlannerStorage.getActionPlans(),
          lifePlannerStorage.getGoals(),
          lifePlannerStorage.getTasks(),
          lifePlannerStorage.getTodos(),
          lifePlannerStorage.getWords(),
          lifePlannerStorage.getReminders(),
          lifePlannerStorage.getHealthRoutines(),
          lifePlannerStorage.getDiamondPeople(),
        ]);

      const byIdMerge = <T extends { id: string }>(mongo: T[], localArr: T[]) => {
        const map = new Map<string, T>();
        mongo.forEach((x) => map.set(x.id, x));
        localArr.forEach((x) => {
          if (!map.has(x.id)) map.set(x.id, x);
        });
        return Array.from(map.values());
      };

      await Promise.all([
        lifePlannerStorage.saveVisions(byIdMerge(mongoVisions, local.visions)),
        lifePlannerStorage.saveActionPlans(byIdMerge(mongoActionPlans, local.actionPlans)),
        lifePlannerStorage.saveGoals(byIdMerge(mongoGoals, local.goals)),
        lifePlannerStorage.saveTasks(byIdMerge(mongoTasks, local.tasks)),
        lifePlannerStorage.saveTodos(byIdMerge(mongoTodos, local.todos)),
        lifePlannerStorage.saveWords(byIdMerge(mongoWords, local.words)),
        lifePlannerStorage.saveReminders(byIdMerge(mongoReminders, local.reminders)),
        lifePlannerStorage.saveHealthRoutines(byIdMerge(mongoHealthRoutines, local.healthRoutines)),
        lifePlannerStorage.saveDiamondPeople(byIdMerge(mongoDiamondPeople, local.diamondPeople)),
      ]);

      // Clear local backup to avoid re-import duplicates
      clearLifePlannerLocalBackup();

      setDone(true);
      // Refresh current page data
      window.location.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Restore failed');
    } finally {
      setIsMigrating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 w-[min(480px,calc(100vw-2rem))] rounded-2xl border border-pink-200 bg-white p-4 shadow-xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-gray-900">Restore your old Life Planner data?</p>
          <p className="mt-1 text-sm text-gray-600">
            We found older data saved on this browser (before Mongo sync). You can restore it to your account so it’s available on every device.
          </p>
          <p className="mt-2 text-xs text-gray-500">
            Found: {counts.total} items (Visions {counts.visions.length}, Action Plans {counts.actionPlans.length}, Goals {counts.goals.length}, Tasks {counts.tasks.length}, Todos {counts.todos.length})
          </p>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="rounded-lg px-2 py-1 text-gray-500 hover:bg-gray-100"
          aria-label="Close"
        >
          ✕
        </button>
      </div>

      {error ? <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}
      {done ? <div className="mt-3 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">Restored. Reloading…</div> : null}

      <div className="mt-4 flex gap-2">
        <button
          onClick={onRestore}
          disabled={isMigrating}
          className="flex-1 rounded-xl bg-gradient-to-r from-red-500 to-pink-500 px-4 py-2 text-sm font-semibold text-white hover:from-red-600 hover:to-pink-600 disabled:opacity-60"
        >
          {isMigrating ? 'Restoring…' : 'Restore now'}
        </button>
        <button
          onClick={() => {
            // Dismiss forever for this browser
            localStorage.setItem('lifePlannerRestorePromptSeen', '1');
            setIsOpen(false);
          }}
          className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
        >
          Not now
        </button>
      </div>
    </div>
  );
}
