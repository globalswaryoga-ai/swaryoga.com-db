'use client';

import { useMemo, useState } from 'react';

function toISODate(d: Date) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function PlannerCalendarPage() {
  const [selected, setSelected] = useState(() => toISODate(new Date()));

  const label = useMemo(() => {
    const d = new Date(selected + 'T00:00:00');
    return d.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  }, [selected]);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Calendar</h2>
            <p className="text-gray-600">Select a date to see that day’s tasks/todos/reminders.</p>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="date"
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              className="rounded-lg border border-gray-300 px-4 py-2"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-800">Selected date</h3>
          <p className="text-gray-600 mt-2">{label}</p>
          <p className="text-xs text-gray-400 mt-1">(Data integration coming next)</p>
        </section>

        <section className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-800">Tasks</h3>
          <p className="text-gray-600 mt-2">No tasks wired yet.</p>
        </section>

        <section className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-800">Todos & reminders</h3>
          <p className="text-gray-600 mt-2">No todos/reminders wired yet.</p>
        </section>
      </div>
    </div>
  );
}
