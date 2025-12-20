'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Plus } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Vision } from '@/lib/types/lifePlanner';
import { lifePlannerStorage } from '@/lib/lifePlannerMongoStorage';
import VisionModal from './VisionModal';
import ActionPlanModal from '@/components/ActionPlanModal';

// Category Color Mapping - 10 colors for 10 vision heads
const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  'Life': { bg: 'bg-purple-600', text: 'text-white' },
  'Health': { bg: 'bg-swar-primary', text: 'text-white' },
  'Wealth': { bg: 'bg-red-600', text: 'text-white' },
  'Success': { bg: 'bg-blue-600', text: 'text-white' },
  'Respect': { bg: 'bg-orange-600', text: 'text-white' },
  'Pleasure': { bg: 'bg-pink-600', text: 'text-white' },
  'Prosperity': { bg: 'bg-indigo-600', text: 'text-white' },
  'Luxurious': { bg: 'bg-yellow-600', text: 'text-white' },
  'Good Habits': { bg: 'bg-teal-600', text: 'text-white' },
  'Sadhana': { bg: 'bg-cyan-600', text: 'text-white' },
};

type SliderCard = {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  badge?: string;
  metadata: string[];
  vision?: Vision;
};

const PLACEHOLDER_VISION_CARDS: SliderCard[] = [
  {
    id: 'placeholder-1',
    title: 'Swar Yoga Children Program',
    description: 'Yoga training for children and teenagers with gentle guidance.',
    imageUrl: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=900&q=80',
    badge: 'Beginner',
    metadata: ['Duration: 10 days', 'Language: English', 'Mode: Studio + Online'],
  },
  {
    id: 'placeholder-2',
    title: 'Complete Health Program',
    description: 'Holistic cure for BP, diabetes, heart, liver, kidney, migraine & hormonal balance.',
    imageUrl: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=900&q=80',
    badge: 'All Levels',
    metadata: ['Duration: 45 days', 'Language: English', 'Mode: Retreat + Online'],
  },
  {
    id: 'placeholder-3',
    title: 'Business Swar Yoga',
    description: 'Business opportunity and personal development for conscious leaders.',
    imageUrl: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=900&q=80',
    badge: 'Intermediate',
    metadata: ['Duration: 60 days', 'Language: Multilingual', 'Mode: Hybrid'],
  },
];

export default function VisionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const didAutoOpen = useRef(false);

  const [visions, setVisions] = useState<Vision[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVision, setEditingVision] = useState<Vision | null>(null);
  const [mounted, setMounted] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [sliderIndex, setSliderIndex] = useState(0);
  const [isActionPlanModalOpen, setIsActionPlanModalOpen] = useState(false);
  const [selectedVisionForActionPlan, setSelectedVisionForActionPlan] = useState<Vision | null>(null);

  // Filters (UI-only; never persisted)
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterMonth, setFilterMonth] = useState<string>('all');
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    setMounted(true);
    (async () => {
      const saved = await lifePlannerStorage.getVisions();
      setVisions(saved.length > 0 ? saved : []);
      setHasLoaded(true);
    })();
  }, []);

  useEffect(() => {
    if (!mounted || !hasLoaded) return;
    // Prevent overwriting Mongo data with empty array due to any transient state.
    if (visions.length === 0) return;
    (async () => {
      await lifePlannerStorage.saveVisions(visions);
    })();
  }, [visions, mounted, hasLoaded]);

  const handleAddVision = () => {
    setEditingVision(null);
    setIsModalOpen(true);
  };

  useEffect(() => {
    if (!mounted) return;
    if (didAutoOpen.current) return;
    if (searchParams?.get('create') !== '1') return;

    didAutoOpen.current = true;
    handleAddVision();
    router.replace('/life-planner/dashboard/vision');
  }, [mounted, searchParams, router]);

  const handleEditVision = (vision: Vision) => {
    setEditingVision(vision);
    setIsModalOpen(true);
  };

  const handleDeleteVision = (id: string) => {
    setVisions(prev => prev.filter(v => v.id !== id));
  };

  const uniqueCategories = Array.from(
    new Set(visions.map(v => v.category).filter(Boolean) as string[])
  ).sort((a, b) => a.localeCompare(b));

  const uniqueStatuses = Array.from(
    new Set(visions.map(v => v.status).filter(Boolean) as string[])
  ).sort((a, b) => a.localeCompare(b));

  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

  const normalizedSearch = searchText.trim().toLowerCase();

  const filteredVisions = visions
    .filter(v => {
      const matchesCategory = filterCategory === 'all' || v.category === filterCategory;
      const matchesStatus = filterStatus === 'all' || (v.status || 'not-started') === filterStatus;

      const monthIdx = filterMonth === 'all' ? null : MONTHS.indexOf(filterMonth as any);
      const dateStr = v.endDate || v.startDate;
      const date = dateStr ? new Date(dateStr) : null;
      const matchesMonth = monthIdx === null || (date && !Number.isNaN(date.getTime()) && date.getMonth() === monthIdx);

      const haystack = `${v.title || ''} ${v.description || ''} ${v.place || ''}`.toLowerCase();
      const matchesSearch = normalizedSearch.length === 0 || haystack.includes(normalizedSearch);

      return matchesCategory && matchesStatus && matchesMonth && matchesSearch;
    })
    .sort((a, b) => {
      // Sort by due date (endDate) in ascending order
      const dateA = a.endDate ? new Date(a.endDate).getTime() : Number.MAX_VALUE;
      const dateB = b.endDate ? new Date(b.endDate).getTime() : Number.MAX_VALUE;
      return dateA - dateB;
    });

  const handleSaveVision = (visionData: Omit<Vision, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (editingVision) {
      const visionId = editingVision.id;
      const fixedVisionData: Omit<Vision, 'id' | 'createdAt' | 'updatedAt'> = {
        ...visionData,
        goals: Array.isArray((visionData as any).goals)
          ? (visionData as any).goals.map((g: any) => ({ ...g, visionId }))
          : (visionData as any).goals,
      };
      setVisions(prev =>
        prev.map(v =>
          v.id === editingVision.id
            ? { ...v, ...fixedVisionData, updatedAt: new Date().toISOString() }
            : v
        )
      );
    } else {
      const newId = Date.now().toString();
      const fixedVisionData: Omit<Vision, 'id' | 'createdAt' | 'updatedAt'> = {
        ...visionData,
        goals: Array.isArray((visionData as any).goals)
          ? (visionData as any).goals.map((g: any) => ({ ...g, visionId: g?.visionId || newId }))
          : (visionData as any).goals,
      };

      const newVision: Vision = {
        ...fixedVisionData,
        id: newId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setVisions(prev => [...prev, newVision]);
    }
    setIsModalOpen(false);
  };

  const handleAddActionPlanForVision = (vision: Vision) => {
    setSelectedVisionForActionPlan(vision);
    setIsActionPlanModalOpen(true);
  };

  const handleSaveActionPlan = async (actionPlan: any) => {
    const actionPlans = await lifePlannerStorage.getActionPlans();
    actionPlans.push(actionPlan);
    await lifePlannerStorage.saveActionPlans(actionPlans);
    setIsActionPlanModalOpen(false);
    setSelectedVisionForActionPlan(null);
    alert('Action Plan created successfully!');
  };

  if (!mounted) return null;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Report-style header */}
      <div className="rounded-3xl border border-slate-200 bg-white overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200" style={{ background: 'linear-gradient(90deg, rgba(16,185,129,0.12) 0%, rgba(99,102,241,0.10) 45%, rgba(236,72,153,0.10) 100%)' }}>
          <div className="flex items-end justify-between gap-4 flex-wrap">
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-[0.18em] font-extrabold text-slate-600">Vision Project Report</p>
              <h1 className="mt-1 text-2xl sm:text-3xl font-black tracking-tight text-slate-900">My Vision Plans</h1>
              <p className="mt-1 text-sm text-slate-600">Your long-term projects with milestones and timelines.</p>
            </div>
            <button
              onClick={handleAddVision}
              className="inline-flex items-center gap-2 rounded-2xl bg-swar-primary px-5 py-2.5 text-white font-extrabold hover:bg-swar-primary-dark transition shadow-sm"
            >
              <Plus className="h-5 w-5" />
              Add Vision
            </button>
          </div>
        </div>

        <div className="px-6 py-5">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-[11px] uppercase tracking-[0.14em] font-extrabold text-emerald-700">Total visions</p>
              <p className="mt-1 text-2xl font-black text-slate-900">{visions.length}</p>
            </div>
            <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-4">
              <p className="text-[11px] uppercase tracking-[0.14em] font-extrabold text-indigo-700">Shown</p>
              <p className="mt-1 text-2xl font-black text-slate-900">{filteredVisions.length}</p>
            </div>
            <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4">
              <p className="text-[11px] uppercase tracking-[0.14em] font-extrabold text-orange-700">Vision Heads</p>
              <p className="mt-1 text-2xl font-black text-slate-900">{uniqueCategories.length}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-[11px] uppercase tracking-[0.14em] font-extrabold text-slate-600">Statuses</p>
              <p className="mt-1 text-2xl font-black text-slate-900">{uniqueStatuses.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-3xl border border-slate-200 p-4 sm:p-5">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <div>
            <label className="block text-xs font-bold text-swar-text mb-1">Search</label>
            <input
              value={searchText}
              onChange={(e) => {
                setSearchText(e.target.value);
                setSliderIndex(0);
              }}
              placeholder="Search title / description / place"
              className="w-full px-3 py-2 rounded-lg border border-swar-border focus:outline-none focus:ring-2 focus:ring-pink-200"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-swar-text mb-1">Vision Head</label>
            <select
              value={filterCategory}
              onChange={(e) => {
                setFilterCategory(e.target.value);
                setSliderIndex(0);
              }}
              className="w-full px-3 py-2 rounded-lg border border-swar-border bg-white focus:outline-none focus:ring-2 focus:ring-pink-200"
            >
              <option value="all">All</option>
              {uniqueCategories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-swar-text mb-1">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value);
                setSliderIndex(0);
              }}
              className="w-full px-3 py-2 rounded-lg border border-swar-border bg-white focus:outline-none focus:ring-2 focus:ring-pink-200"
            >
              <option value="all">All</option>
              {/* common values first */}
              <option value="not-started">not-started</option>
              <option value="in-progress">in-progress</option>
              <option value="completed">completed</option>
              <option value="on-hold">on-hold</option>
              {/* any custom values from data */}
              {uniqueStatuses
                .filter(s => !['not-started', 'in-progress', 'completed', 'on-hold'].includes(s))
                .map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-swar-text mb-1">Month</label>
            <select
              value={filterMonth}
              onChange={(e) => {
                setFilterMonth(e.target.value);
                setSliderIndex(0);
              }}
              className="w-full px-3 py-2 rounded-lg border border-swar-border bg-white focus:outline-none focus:ring-2 focus:ring-pink-200"
            >
              <option value="all">All</option>
              {MONTHS.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          <div className="flex items-end gap-2">
            <button
              onClick={() => {
                setSearchText('');
                setFilterCategory('all');
                setFilterStatus('all');
                setFilterMonth('all');
                setSliderIndex(0);
              }}
              className="w-full px-3 py-2 rounded-lg bg-swar-primary-light text-swar-text font-bold hover:bg-swar-primary-light transition"
            >
              Clear Filters
            </button>
          </div>
        </div>

        <p className="mt-3 text-sm text-slate-600">Showing {filteredVisions.length} of {visions.length} vision plans</p>
      </div>

      <div>
        <div className="flex items-end justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">Preview</h2>
            <p className="text-sm text-slate-600">Open PDF to see the full A4 report.</p>
          </div>
          <p className="text-sm text-slate-600">
            Showing {filteredVisions.slice(sliderIndex, sliderIndex + 3).length} of {filteredVisions.length}
          </p>
        </div>

        <div className="relative">
          <div className="flex gap-6 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory">
            {filteredVisions.slice(sliderIndex, sliderIndex + 3).length > 0 ? (
              filteredVisions.slice(sliderIndex, sliderIndex + 3).map((vision) => (
              <div key={vision.id} className="flex-shrink-0 w-80 min-w-[300px] max-w-[300px] h-full snap-start">
                {/* Card */}
                <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden hover:shadow-lg transition-all duration-300 h-full flex flex-col">
                  <div className="relative h-48 overflow-hidden">
                    <img
                      src={vision.imageUrl || 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=800&q=80'}
                      alt={vision.title}
                      className="w-full h-full object-cover transition-transform duration-300"
                    />
                    <div className="absolute top-3 right-3 flex items-center gap-2">
                      <button
                        onClick={() => handleAddActionPlanForVision(vision)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 rounded-full text-xs font-extrabold transition shadow-sm"
                      >
                        + Action Plan
                      </button>
                      {vision.category && (
                        <div className={`${CATEGORY_COLORS[vision.category]?.bg || 'bg-slate-600'} ${CATEGORY_COLORS[vision.category]?.text || 'text-white'} px-3 py-1 rounded-full text-xs font-extrabold shadow-sm`}>
                          {vision.category}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="p-5">
                    <h3 className="text-lg font-black tracking-tight text-slate-900 mb-1 line-clamp-2">{vision.title}</h3>
                    <p className="text-sm text-slate-600 mb-4 line-clamp-2">{vision.description}</p>

                    <div className="space-y-2 text-xs text-swar-text">
                      {vision.place && <div className="flex items-center gap-2">📍 {vision.place}</div>}
                      {vision.endDate && (
                        <div className="flex items-center gap-2">
                          📅 {new Date(vision.endDate).toLocaleDateString()}
                          {vision.time && ` @ ${vision.time}`}
                        </div>
                      )}
                      {vision.budget && <div className="flex items-center gap-2">💰 Rs. {vision.budget}</div>}
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        className="flex-1 px-3 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition"
                      >
                        Done
                      </button>
                      <button
                        onClick={() => handleEditVision(vision)}
                        className="flex-1 px-3 py-2 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 transition"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => router.push(`/life-planner/dashboard/vision/print?visionId=${encodeURIComponent(vision.id)}`)}
                        className="flex-1 px-3 py-2 bg-slate-900 text-white text-xs font-extrabold rounded-lg hover:bg-slate-800 transition"
                      >
                        PDF
                      </button>
                      <button
                        onClick={() => handleDeleteVision(vision.id)}
                        className="flex-1 px-3 py-2 bg-swar-primary-light text-red-600 text-xs font-bold rounded-lg hover:bg-red-200 transition"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            PLACEHOLDER_VISION_CARDS.map(card => (
              <div key={card.id} className="flex-shrink-0 w-80 h-full">
                {/* Placeholder Card */}
                <div className="bg-white rounded-2xl shadow-lg overflow-hidden opacity-60 h-full flex flex-col">
                  <div className="relative h-48 overflow-hidden">
                    <img src={card.imageUrl} alt={card.title} className="w-full h-full object-cover" />
                    {card.badge && (
                      <div className="absolute top-3 right-3 bg-purple-600 text-white px-3 py-1 rounded-full text-xs font-bold">
                        {card.badge}
                      </div>
                    )}
                  </div>

                  <div className="p-5">
                    <h3 className="text-lg font-bold text-swar-text mb-2 line-clamp-2">{card.title}</h3>
                    <p className="text-sm text-swar-text-secondary mb-4 line-clamp-2">{card.description}</p>
                    <div className="space-y-1 text-xs text-swar-text-secondary">
                      {card.metadata.map((item, i) => (
                        <div key={i}>{item}</div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
          </div>

        {/* Navigation Buttons */}
        {filteredVisions.length > 3 && (
          <div className="flex justify-center items-center gap-2 mt-8">
            {/* Previous Button */}
            <button
              onClick={() => setSliderIndex(Math.max(0, sliderIndex - 3))}
              disabled={sliderIndex === 0}
              className="px-4 py-2 text-emerald-600 font-semibold hover:text-emerald-700 disabled:text-gray-300 disabled:cursor-not-allowed transition"
            >
              Previous
            </button>

            {/* Page Numbers */}
            <div className="flex gap-2">
              {Array.from({ length: Math.ceil(filteredVisions.length / 3) }).map((_, pageIndex) => (
                <button
                  key={pageIndex}
                  onClick={() => setSliderIndex(pageIndex * 3)}
                  className={`w-10 h-10 rounded-lg font-semibold transition ${
                    Math.floor(sliderIndex / 3) === pageIndex
                      ? 'bg-emerald-600 text-white shadow-lg'
                      : 'bg-swar-primary-light text-swar-text hover:bg-gray-300'
                  }`}
                >
                  {pageIndex + 1}
                </button>
              ))}
            </div>

            {/* Next Button */}
            <button
              onClick={() => setSliderIndex(Math.min(filteredVisions.length - 3, sliderIndex + 3))}
              disabled={sliderIndex + 3 >= filteredVisions.length}
              className="px-4 py-2 text-emerald-600 font-semibold hover:text-emerald-700 disabled:text-gray-300 disabled:cursor-not-allowed transition"
            >
              Next
            </button>
          </div>
        )}
        </div>
      </div>

      {filteredVisions.length === 0 && (
        <div className="text-center py-12">
          <div className="text-swar-text-secondary mb-4">
            <svg className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-swar-text mb-2">No vision plans found</h3>
          <p className="text-swar-text-secondary mb-4">Try adjusting your filters or create a new vision plan.</p>
          <button
            onClick={handleAddVision}
            className="inline-flex items-center space-x-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Add Vision Plan</span>
          </button>
        </div>
      )}

      {visions.length === 0 && filteredVisions.length === 0 && (
        <div className="text-center py-12">
          <div className="text-swar-text-secondary mb-4">
            <svg className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-swar-text mb-2">No vision plans yet</h3>
          <p className="text-swar-text-secondary mb-4">Start by creating your first vision plan.</p>
          <button
            onClick={handleAddVision}
            className="inline-flex items-center space-x-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Add Vision Plan</span>
          </button>
        </div>
      )}

      {isModalOpen && (
        <VisionModal
          vision={editingVision}
          onSave={handleSaveVision}
          onClose={() => setIsModalOpen(false)}
        />
      )}

      {isActionPlanModalOpen && selectedVisionForActionPlan && (
        <ActionPlanModal
          isOpen={isActionPlanModalOpen}
          onClose={() => {
            setIsActionPlanModalOpen(false);
            setSelectedVisionForActionPlan(null);
          }}
          onSave={handleSaveActionPlan}
          visions={visions}
          editingPlan={undefined}
        />
      )}
    </div>
  );
}
