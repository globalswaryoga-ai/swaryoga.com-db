'use client';

import React, { useEffect, useState } from 'react';

// Registration closes at the end of 15 Nov 2026 (IST)
export const REGISTRATION_CLOSES_AT = new Date('2026-11-15T23:59:59+05:30');

function split(ms: number) {
  const total = Math.max(Math.floor(ms / 1000), 0);
  return {
    days: Math.floor(total / 86400),
    hours: Math.floor((total % 86400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
  };
}

export default function RegistrationCountdown() {
  // null on the server and first render, so the countdown never mismatches hydration
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const remaining = now === null ? null : REGISTRATION_CLOSES_AT.getTime() - now;
  const closed = remaining !== null && remaining <= 0;
  const t = remaining !== null && !closed ? split(remaining) : null;

  return (
    <div className="rounded-3xl p-6 md:p-8 bg-gradient-to-br from-emerald-800 via-green-700 to-teal-700 shadow-xl ring-1 ring-emerald-900/20">
      <span className="inline-block rounded-full bg-yellow-300 px-3 py-1 text-xs font-black uppercase tracking-widest text-emerald-900">
        Registration closes 15 November 2026
      </span>
      {closed ? (
        <p className="mt-4 text-2xl font-black text-white">Registration is closed</p>
      ) : (
        <div className="mt-5 grid grid-cols-4 gap-3 text-center">
          {(['days', 'hours', 'minutes', 'seconds'] as const).map((unit) => (
            <div key={unit} className="rounded-2xl bg-white py-4 shadow-md">
              <div className={`text-3xl md:text-4xl font-black tabular-nums ${unit === 'seconds' ? 'text-red-600' : 'text-emerald-900'}`}>
                {t ? String(t[unit]).padStart(unit === 'days' ? 1 : 2, '0') : '--'}
              </div>
              <div className={`mt-1 text-[10px] font-extrabold uppercase tracking-widest ${unit === 'seconds' ? 'text-red-600' : 'text-green-700'}`}>{unit}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
