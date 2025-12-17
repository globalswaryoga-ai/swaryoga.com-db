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
  'Health': { bg: 'bg-green-600', text: 'text-white' },
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
    if (searchParams.get('create') !== '1') return;

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
      setVisions(prev =>
        prev.map(v =>
          v.id === editingVision.id
            ? { ...v, ...visionData, updatedAt: new Date().toISOString() }
            : v
        )
      );
    } else {
      const newVision: Vision = {
        ...visionData,
        id: Date.now().toString(),
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
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">My Vision Plans</h1>
          <p className="text-gray-600">Your long-term projects with milestones and timelines</p>
        </div>
        <button
          onClick={handleAddVision}
          className="flex items-center space-x-2 bg-gradient-to-r from-red-500 to-pink-500 text-white px-6 py-3 rounded-lg hover:from-red-600 hover:to-pink-600 transition-all shadow-lg hover:shadow-xl"
        >
          <Plus className="h-5 w-5" />
          <span>Add Vision Plan</span>
        </button>
      </div>

      {/* Filters */}
      <div className="mb-8 bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Search</label>
            <input
              value={searchText}
              onChange={(e) => {
                setSearchText(e.target.value);
                setSliderIndex(0);
              }}
              placeholder="Search title / description / place"
              className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-pink-200"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Vision Head</label>
            <select
              value={filterCategory}
              onChange={(e) => {
                setFilterCategory(e.target.value);
                setSliderIndex(0);
              }}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-pink-200"
            >
              <option value="all">All</option>
              {uniqueCategories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value);
                setSliderIndex(0);
              }}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-pink-200"
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
            <label className="block text-xs font-bold text-gray-700 mb-1">Month</label>
            <select
              value={filterMonth}
              onChange={(e) => {
                setFilterMonth(e.target.value);
                setSliderIndex(0);
              }}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-pink-200"
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
              className="w-full px-3 py-2 rounded-lg bg-gray-100 text-gray-800 font-bold hover:bg-gray-200 transition"
            >
              Clear Filters
            </button>
          </div>
        </div>

        <p className="mt-3 text-sm text-gray-600">Showing {filteredVisions.length} of {visions.length} vision plans</p>
      </div>

      <div className="mb-12">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-gray-800">Vision Plan Preview Slider</h2>
          <p className="text-sm text-gray-600">Showing {Math.min(3, filteredVisions.length)} of {filteredVisions.length} vision plans</p>
        </div>

        <div className="relative">
          <div className="flex gap-6 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory">
            {filteredVisions.slice(0, 3).length > 0 ? (
              filteredVisions.slice(0, 3).map((vision) => (
              <div key={vision.id} className="flex-shrink-0 w-80 min-w-[300px] max-w-[300px] h-full snap-start">
                {/* Card */}
                <div className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 h-full flex flex-col">
                  <div className="relative h-48 overflow-hidden">
                    <img
                      src={vision.imageUrl || 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=800&q=80'}
                      alt={vision.title}
                      className="w-full h-full object-cover transition-transform duration-300"
                    />
                    <div className="absolute top-3 right-3 flex items-center gap-2">
                      <button
                        onClick={() => handleAddActionPlanForVision(vision)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-full text-xs font-bold transition"
                      >
                        + Action Plan
                      </button>
                      {vision.category && (
                        <div className={`${CATEGORY_COLORS[vision.category]?.bg || 'bg-gray-600'} ${CATEGORY_COLORS[vision.category]?.text || 'text-white'} px-3 py-1 rounded-full text-xs font-bold`}>
                          {vision.category}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="p-5">
                    <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2">{vision.title}</h3>
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">{vision.description}</p>

                    <div className="space-y-2 text-xs text-gray-700">
                      {vision.place && <div className="flex items-center gap-2">📍 {vision.place}</div>}
                      {vision.endDate && (
                        <div className="flex items-center gap-2">
                          📅 {new Date(vision.endDate).toLocaleDateString()}
                          {vision.time && ` @ ${vision.time}`}
                        </div>
                      )}
                      {vision.budget && <div className="flex items-center gap-2">💰 Rs. {vision.budget}</div>}
                    </div>

                    <div className="mt-4 flex gap-2">
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
                        onClick={() => handleDeleteVision(vision.id)}
                        className="flex-1 px-3 py-2 bg-red-100 text-red-600 text-xs font-bold rounded-lg hover:bg-red-200 transition"
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
                    <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2">{card.title}</h3>
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">{card.description}</p>
                    <div className="space-y-1 text-xs text-gray-600">
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
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
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
          <div className="text-gray-400 mb-4">
            <svg className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No vision plans found</h3>
          <p className="text-gray-600 mb-4">Try adjusting your filters or create a new vision plan.</p>
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
          <div className="text-gray-400 mb-4">
            <svg className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No vision plans yet</h3>
          <p className="text-gray-600 mb-4">Start by creating your first vision plan.</p>
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
