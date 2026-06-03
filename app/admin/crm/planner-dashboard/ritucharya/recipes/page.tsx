'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Loader, ChefHat } from 'lucide-react';
import { ritucharya_seasons } from '@/lib/ritucharya/seasons';

function TabNav() {
  const base = 'px-4 py-2 rounded-lg text-sm font-medium transition';
  return (
    <div className="flex gap-2 mb-6 flex-wrap">
      <Link href="/admin/crm/planner-dashboard/ritucharya" className={`${base} bg-white text-gray-700 border hover:bg-gray-50`}>📝 Form</Link>
      <Link href="/admin/crm/planner-dashboard/ritucharya/today" className={`${base} bg-white text-gray-700 border hover:bg-gray-50`}>📅 Today</Link>
      <Link href="/admin/crm/planner-dashboard/ritucharya/calendar" className={`${base} bg-white text-gray-700 border hover:bg-gray-50`}>🗓️ Month Calendar</Link>
      <Link href="/admin/crm/planner-dashboard/ritucharya/recipes" className={`${base} bg-emerald-600 text-white`}>🍲 Recipes</Link>
    </div>
  );
}

export default function RitucharyaRecipesPage() {
  const [recipes, setRecipes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [rituFilter, setRituFilter] = useState<string>(''); // '' = all

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/ritucharya/recipes?published=true');
        const data = await res.json();
        setRecipes(data.recipes || []);
      } catch { /* ignore */ }
      finally { setLoading(false); }
    })();
  }, []);

  const filtered = useMemo(() => {
    if (!rituFilter) return recipes;
    return recipes.filter(r => (r.bestForRitus || []).includes(rituFilter));
  }, [recipes, rituFilter]);

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6 bg-gray-50 min-h-screen">
      <TabNav />
      <h1 className="text-2xl font-bold text-gray-900 mb-1 flex items-center gap-2"><ChefHat className="text-emerald-600" /> Ritucharya Recipes</h1>
      <p className="text-gray-500 text-sm mb-5">Seasonal recipes curated for each ritu. Filter by season below.</p>

      {/* Ritu filter */}
      <div className="flex gap-2 flex-wrap mb-5">
        <button onClick={() => setRituFilter('')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium border ${rituFilter === '' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>All</button>
        {ritucharya_seasons.map((r: any) => (
          <button key={r.id} onClick={() => setRituFilter(r.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border ${rituFilter === r.id ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
            {r.emoji} {r.nameEn}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-gray-500"><Loader className="animate-spin" size={18} /> Loading recipes…</div>
      ) : filtered.length === 0 ? (
        <p className="text-gray-400 text-sm">No published recipes{rituFilter ? ' for this ritu' : ''} yet.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map((r: any) => (
            <div key={r._id} className="bg-white border rounded-xl overflow-hidden hover:shadow-md transition">
              {r.images?.[0]?.url ? (
                <img src={r.images[0].url} alt={r.name} className="w-full h-32 object-cover" />
              ) : (
                <div className="w-full h-32 bg-emerald-50 flex items-center justify-center text-3xl">🍲</div>
              )}
              <div className="p-3">
                <div className="font-semibold text-gray-800 text-sm leading-tight">{r.name}</div>
                {r.nameHi && <div className="text-xs text-gray-500">{r.nameHi}</div>}
                <div className="flex flex-wrap gap-1 mt-2">
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 capitalize">{r.category}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">{r.primaryRasa}</span>
                </div>
                {(r.prepTime || r.cookTime) ? (
                  <div className="text-[10px] text-gray-400 mt-2">⏱️ {(r.prepTime || 0) + (r.cookTime || 0)} min · {r.difficulty || 'easy'}</div>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
