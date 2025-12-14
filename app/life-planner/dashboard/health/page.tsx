"use client";

import React, { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { lifePlannerStorage } from '@/lib/lifePlannerMongoStorage';
import type { HealthRoutine } from '@/lib/types/lifePlanner';

const DEFAULT_IMAGE = 'https://i.postimg.cc/Y0zjsTd2/image.jpg';

export default function HealthPage() {
  const [routines, setRoutines] = useState<HealthRoutine[]>([]);
  const [mounted, setMounted] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: '',
    time: '',
    repeat: 'daily',
    imageUrl: DEFAULT_IMAGE,
  });

  // Load health routines from MongoDB on mount
  useEffect(() => {
    setMounted(true);
    loadRoutines();
  }, []);

  const loadRoutines = async () => {
    setLoading(true);
    setError(null);
    try {
      const saved = await lifePlannerStorage.getHealthRoutines();
      if (Array.isArray(saved)) {
        setRoutines(saved);
      } else {
        setRoutines([]);
      }
    } catch (err) {
      console.error('Error loading health routines:', err);
      setError('Failed to load routines. Please refresh.');
    } finally {
      setLoading(false);
    }
  };

  // Save to MongoDB whenever routines change
  useEffect(() => {
    if (!mounted || loading) return;
    const saveToMongo = async () => {
      try {
        await lifePlannerStorage.saveHealthRoutines(routines);
      } catch (err) {
        console.error('Error saving health routines:', err);
        setError('Failed to save changes to database');
      }
    };
    saveToMongo();
  }, [routines, mounted, loading]);

  const openCreate = () => {
    setEditingId(null);
    setForm({ title: '', time: '', repeat: 'daily', imageUrl: DEFAULT_IMAGE });
    setIsFormOpen(true);
  };

  const openEdit = (r: HealthRoutine) => {
    setEditingId(r.id);
    setForm({ title: r.title || '', time: r.time || '', repeat: r.repeat || 'daily', imageUrl: r.imageUrl || DEFAULT_IMAGE });
    setIsFormOpen(true);
  };

  const saveRoutine = () => {
    if (!form.title.trim()) return alert('Please enter a title');
    if (editingId) {
      setRoutines(prev => prev.map(r => r.id === editingId ? { ...r, ...form, updatedAt: new Date().toISOString() } as HealthRoutine : r));
    } else {
      const newR: HealthRoutine = { id: `hr-${Date.now()}`, title: form.title, time: form.time, repeat: form.repeat as any, imageUrl: form.imageUrl, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() } as HealthRoutine;
      setRoutines(prev => [...prev, newR]);
    }
    setIsFormOpen(false);
  };

  const deleteRoutine = (id: string) => {
    if (!confirm('Delete this routine?')) return;
    setRoutines(prev => prev.filter(r => r.id !== id));
  };

  if (!mounted) return null;

  return (
    <div className="max-w-7xl mx-auto">
      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
          {error}
          <button 
            onClick={loadRoutines}
            className="ml-4 px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      )}
      
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Health Routines</h1>
          <p className="text-sm text-gray-600">Add and manage your daily health routines</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:from-emerald-700 shadow">
          <Plus className="h-4 w-4" /> New Routine
        </button>
      </div>

      {/* Form */}
      {isFormOpen && (
        <div className="mb-6 bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Title</label>
              <input value={form.title} onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-gray-200" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Time</label>
              <input type="time" value={form.time} onChange={e => setForm(prev => ({ ...prev, time: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-gray-200" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Repeat</label>
              <select value={form.repeat} onChange={e => setForm(prev => ({ ...prev, repeat: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white">
                <option value="daily">daily</option>
                <option value="weekly">weekly</option>
                <option value="monthly">monthly</option>
                <option value="yearly">yearly</option>
                <option value="custom">custom</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Image URL (editable)</label>
              <input value={form.imageUrl} onChange={e => setForm(prev => ({ ...prev, imageUrl: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-gray-200" />
            </div>
          </div>

          <div className="mt-4 flex justify-end gap-3">
            <button onClick={() => setIsFormOpen(false)} className="px-4 py-2 border rounded-lg">Cancel</button>
            <button onClick={saveRoutine} className="px-4 py-2 bg-emerald-600 text-white rounded-lg">{editingId ? 'Update' : 'Create'}</button>
          </div>
        </div>
      )}

      {/* Routines Grid */}
      {loading ? (
        <div className="text-center py-8">
          <p className="text-gray-600">Loading routines...</p>
        </div>
      ) : routines.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <p className="text-gray-600">No routines yet. Create your first one!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[10px] auto-rows-max justify-items-center">
          {routines.map(r => (
            <div key={r.id} className="w-80 bg-white rounded-2xl shadow-lg overflow-hidden h-full flex flex-col">
              <div className="relative h-48 overflow-hidden bg-emerald-600" style={{ backgroundImage: `url('${r.imageUrl || DEFAULT_IMAGE}')`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
                <div className="absolute top-3 left-3 w-6 h-6 rounded-full border-2 border-white bg-white/20 flex items-center justify-center cursor-pointer hover:bg-white/40 transition">
                  <input type="checkbox" className="w-4 h-4 rounded-full cursor-pointer" />
                </div>
              </div>

              <div className="p-5 flex-1 flex flex-col">
                <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2">{r.title}</h3>
                <div className="space-y-2 text-sm text-gray-700 mb-auto">
                  {r.time && <div className="flex items-center gap-2">🕐 {r.time}</div>}
                  <div className="flex items-center gap-2">🔁 {(r.repeat || 'daily').toUpperCase()}</div>
                </div>
              </div>

              <div className="flex gap-2 p-4 border-t border-gray-100">
                <button onClick={() => openEdit(r)} className="flex-1 px-3 py-2 bg-emerald-600 text-white text-xs font-bold rounded-lg">Edit</button>
                <button onClick={() => deleteRoutine(r.id)} className="flex-1 px-3 py-2 bg-red-600 text-white text-xs font-bold rounded-lg">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
