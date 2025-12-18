"use client";

import React, { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { lifePlannerStorage } from '@/lib/lifePlannerMongoStorage';
import type { HealthRoutine } from '@/lib/types/lifePlanner';

export default function HealthPage() {
  const [routines, setRoutines] = useState<HealthRoutine[]>([]);
  const [mounted, setMounted] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterFrequency, setFilterFrequency] = useState('All');
  const [filterMonth, setFilterMonth] = useState('All');

  // Categories management
  const [categories, setCategories] = useState<string[]>(['exercise', 'meditation', 'nutrition', 'sleep', 'other']);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [showCategoryInput, setShowCategoryInput] = useState(false);

  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'exercise',
    frequency: 'daily',
    time: '09:00',
  });

  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  // Load health routines from MongoDB on mount
  useEffect(() => {
    setMounted(true);
    loadRoutines();
  }, []);

  const loadRoutines = async () => {
    setLoading(true);
    setError(null);
    try {
      const userSession = localStorage.getItem('lifePlannerUser');
      const token = localStorage.getItem('lifePlannerToken');
      
      if (!userSession || !token) {
        setError('Please log in to access health routines');
        setLoading(false);
        return;
      }

      const saved = await lifePlannerStorage.getHealthRoutines();
      if (Array.isArray(saved)) {
        setRoutines(saved);
      } else {
        setRoutines([]);
      }
    } catch (err) {
      console.error('Error loading health routines:', err);
      setError('Failed to load routines. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  // Save to MongoDB whenever routines change
  useEffect(() => {
    if (!mounted || loading) return;
    
    const saveToMongo = async () => {
      try {
        const userSession = localStorage.getItem('lifePlannerUser');
        const token = localStorage.getItem('lifePlannerToken');
        
        if (!userSession || !token) {
          console.warn('Not authenticated - cannot save routines');
          return;
        }

        await lifePlannerStorage.saveHealthRoutines(routines);
        console.log('✅ Health routines saved successfully');
      } catch (err) {
        console.error('Error saving health routines:', err);
        setError('Failed to save changes to database');
      }
    };
    
    // Debounce saves to avoid too many requests
    const timer = setTimeout(saveToMongo, 500);
    return () => clearTimeout(timer);
  }, [routines, mounted, loading]);

  const openCreate = () => {
    setEditingId(null);
    setForm({ title: '', description: '', category: 'exercise', frequency: 'daily', time: '09:00' });
    setIsFormOpen(true);
  };

  const openEdit = (r: HealthRoutine) => {
    setEditingId(r.id);
    setForm({ 
      title: r.title || '', 
      description: r.description || '', 
      category: r.category || 'exercise', 
      frequency: r.frequency || 'daily',
      time: (r as any).time || '09:00'
    });
    setIsFormOpen(true);
  };

  const saveRoutine = () => {
    if (!form.title.trim()) return alert('Please enter a title');
    if (editingId) {
      setRoutines(prev => prev.map(r => r.id === editingId ? { 
        ...r, 
        title: form.title,
        description: form.description,
        category: form.category,
        frequency: form.frequency as any,
        time: form.time,
        updatedAt: new Date().toISOString() 
      } : r));
    } else {
      const newR: HealthRoutine = { 
        id: `hr-${Date.now()}`, 
        title: form.title, 
        description: form.description,
        category: form.category,
        frequency: form.frequency as any,
        time: form.time,
        completedDates: [],
        streak: 0,
        createdAt: new Date().toISOString(), 
        updatedAt: new Date().toISOString() 
      } as HealthRoutine;
      setRoutines(prev => [...prev, newR]);
    }
    setIsFormOpen(false);
  };

  const deleteRoutine = (id: string) => {
    if (!confirm('Delete this routine?')) return;
    setRoutines(prev => prev.filter(r => r.id !== id));
  };

  // Filter routines
  const filteredRoutines = routines.filter(r => {
    const matchesSearch = !searchQuery.trim() || 
      r.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      r.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = filterCategory === 'All' || r.category === filterCategory;
    const matchesFrequency = filterFrequency === 'All' || r.frequency === filterFrequency;
    
    const matchesMonth = filterMonth === 'All' || 
      (r.createdAt && new Date(r.createdAt).toLocaleString('default', { month: 'long' }) === filterMonth);
    
    return matchesSearch && matchesCategory && matchesFrequency && matchesMonth;
  });

  const clearFilters = () => {
    setSearchQuery('');
    setFilterCategory('All');
    setFilterFrequency('All');
    setFilterMonth('All');
  };

  const addCategory = () => {
    const trimmed = newCategoryName.trim().toLowerCase();
    if (!trimmed) return alert('Category name cannot be empty');
    if (categories.includes(trimmed)) return alert('Category already exists');
    setCategories(prev => [...prev, trimmed]);
    setNewCategoryName('');
    setShowCategoryInput(false);
  };

  const removeCategory = (cat: string) => {
    if (!confirm(`Remove category "${cat}"?`)) return;
    setCategories(prev => prev.filter(c => c !== cat));
    if (filterCategory === cat) setFilterCategory('All');
    if (form.category === cat) setForm(prev => ({ ...prev, category: categories[0] || 'exercise' }));
  };

  if (!mounted) return null;

  return (
    <div className="max-w-7xl mx-auto">
      {error && (
        <div className="mb-4 p-4 bg-swar-primary-light border border-red-400 text-swar-primary rounded-lg">
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
          <h1 className="text-3xl font-bold text-swar-text">Health Routines</h1>
          <p className="text-sm text-swar-text-secondary">Add and manage your daily health routines</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-2 text-white font-semibold hover:from-emerald-600 hover:to-teal-600 transition">
          <Plus className="h-5 w-5" /> New Routine
        </button>
      </div>

      {/* Filters */}
      <div className="mb-6 bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
          <div>
            <label className="block text-xs font-bold text-swar-text mb-2">Search</label>
            <input 
              type="text" 
              placeholder="Search title / description..." 
              value={searchQuery} 
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-swar-border focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-swar-text mb-2">Category</label>
            <select 
              value={filterCategory} 
              onChange={e => setFilterCategory(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-swar-border bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option>All</option>
              {categories.map(cat => (
                <option key={cat}>{cat}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-swar-text mb-2">Frequency</label>
            <select 
              value={filterFrequency} 
              onChange={e => setFilterFrequency(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-swar-border bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option>All</option>
              <option>daily</option>
              <option>weekly</option>
              <option>monthly</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-swar-text mb-2">Month</label>
            <select 
              value={filterMonth} 
              onChange={e => setFilterMonth(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-swar-border bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option>All</option>
              {MONTHS.map(m => <option key={m}>{m}</option>)}
            </select>
          </div>
          <button 
            onClick={clearFilters}
            className="px-4 py-2 bg-swar-primary-light text-swar-text rounded-lg font-semibold hover:bg-gray-300 transition text-sm"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Category Management */}
      <div className="mb-6 bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-swar-text">Manage Categories</h3>
          <button 
            onClick={() => setShowCategoryInput(!showCategoryInput)}
            className="px-3 py-1 bg-emerald-500 text-white text-xs font-bold rounded-lg hover:bg-emerald-600 transition"
          >
            + Add Category
          </button>
        </div>
        
        {showCategoryInput && (
          <div className="flex gap-2 mb-3">
            <input 
              type="text" 
              value={newCategoryName} 
              onChange={e => setNewCategoryName(e.target.value)}
              placeholder="New category name..."
              className="flex-1 px-3 py-2 rounded-lg border border-swar-border text-sm"
              onKeyPress={e => e.key === 'Enter' && addCategory()}
            />
            <button 
              onClick={addCategory}
              className="px-4 py-2 bg-emerald-500 text-white text-sm font-bold rounded-lg hover:bg-emerald-600 transition"
            >
              Add
            </button>
            <button 
              onClick={() => { setShowCategoryInput(false); setNewCategoryName(''); }}
              className="px-4 py-2 bg-gray-300 text-swar-text text-sm font-bold rounded-lg hover:bg-gray-400 transition"
            >
              Cancel
            </button>
          </div>
        )}

        <div className="flex flex-wrap gap-1.5">
          {categories.map(cat => (
            <div 
              key={cat}
              className="flex items-center gap-1 bg-gradient-to-r from-emerald-100 to-teal-100 px-2 py-1 rounded-md border border-emerald-200"
            >
              <span className="text-xs font-medium text-swar-text">✓ {cat}</span>
              <button 
                onClick={() => removeCategory(cat)}
                className="text-red-500 hover:text-swar-primary font-bold text-base leading-none"
                title="Remove category"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </div>
      {isFormOpen && (
        <div className="mb-6 bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-bold text-swar-text mb-1">Title</label>
              <input value={form.title} onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-swar-border" />
            </div>
            <div>
              <label className="block text-xs font-bold text-swar-text mb-1">Category</label>
              <select value={form.category} onChange={e => setForm(prev => ({ ...prev, category: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-swar-border bg-white">
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-swar-text mb-1">Frequency</label>
              <select value={form.frequency} onChange={e => setForm(prev => ({ ...prev, frequency: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-swar-border bg-white">
                <option value="daily">daily</option>
                <option value="weekly">weekly</option>
                <option value="monthly">monthly</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-swar-text mb-1">Time</label>
              <input type="time" value={form.time} onChange={e => setForm(prev => ({ ...prev, time: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-swar-border" />
            </div>
          </div>
          <div className="mt-3">
            <label className="block text-xs font-bold text-swar-text mb-1">Description</label>
            <textarea value={form.description} onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-swar-border" rows={2} />
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
          <p className="text-swar-text-secondary">Loading routines...</p>
        </div>
      ) : filteredRoutines.length === 0 ? (
        <div className="text-center py-8 bg-swar-bg rounded-lg">
          <p className="text-swar-text-secondary">{routines.length === 0 ? 'No routines yet. Create your first one!' : 'No routines match your filters.'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[10px] auto-rows-max justify-items-center">
          {filteredRoutines.map(r => (
            <div key={r.id} className="w-80 bg-white rounded-2xl shadow-lg overflow-hidden h-full flex flex-col">
              <div className="relative h-48 overflow-hidden bg-emerald-600" style={{ backgroundImage: `url('https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=600&q=80')`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
                <div className="absolute top-3 left-3 w-6 h-6 rounded-full border-2 border-white bg-white/20 flex items-center justify-center cursor-pointer hover:bg-white/40 transition">
                  <input type="checkbox" className="w-4 h-4 rounded-full cursor-pointer" />
                </div>
              </div>

              <div className="p-5 flex-1 flex flex-col">
                <h3 className="text-lg font-bold text-swar-text mb-2 line-clamp-2">{r.title}</h3>
                <p className="text-sm text-swar-text-secondary mb-4 line-clamp-2">{r.description}</p>
                <div className="space-y-2 text-xs text-swar-text mb-auto">
                  {r.category && <div className="flex items-center gap-2">📂 {r.category}</div>}
                  <div className="flex items-center gap-2">🔁 {(r.frequency || 'daily').toUpperCase()}</div>
                  {r.streak > 0 && <div className="flex items-center gap-2">🔥 {r.streak} day streak</div>}
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
