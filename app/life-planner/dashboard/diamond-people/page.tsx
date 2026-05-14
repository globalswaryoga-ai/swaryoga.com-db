'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Plus, Download } from 'lucide-react';
import { DiamondPerson } from '@/lib/types/lifePlanner';
import { lifePlannerStorage } from '@/lib/lifePlannerMongoStorage';
import { csvEscape } from '@/lib/lifePlannerConstants';
import DiamondPersonModal from './DiamondPersonModal';

const DEFAULT_IMAGE = 'https://i.postimg.cc/Y0zjsTd2/image.jpg';

const DiamondPeoplePage = () => {
  const [people, setPeople] = useState<DiamondPerson[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPerson, setEditingPerson] = useState<DiamondPerson | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterRelationship, setFilterRelationship] = useState('all');
  const [filterMonth, setFilterMonth] = useState('all');
  const [mounted, setMounted] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  const categories = ['all', 'Spiritual Mentor', 'Health Professional', 'Personal Development', 'Family', 'Friends'];

  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

  // Load from localStorage on mount
  useEffect(() => {
    setMounted(true);
    (async () => {
      try {
        const saved = await lifePlannerStorage.getDiamondPeople();
        setPeople(saved.length > 0 ? saved : []);
      } finally {
        setHasLoaded(true);
      }
    })();
  }, []);

  // Save to localStorage whenever people changes
  const skipNextSave = useRef(true);
  useEffect(() => {
    if (!mounted || !hasLoaded) return;
    if (skipNextSave.current) { skipNextSave.current = false; return; }
    (async () => {
      await lifePlannerStorage.saveDiamondPeople(people);
    })();
  }, [people, mounted, hasLoaded]);

  const handleAddPerson = () => {
    setEditingPerson(null);
    setIsModalOpen(true);
  };

  const handleEditPerson = (person: DiamondPerson) => {
    setEditingPerson(person);
    setIsModalOpen(true);
  };

  const handleDeletePerson = (id: string) => {
    if (!window.confirm('Are you sure you want to delete this person?')) return;
    setPeople(prev => prev.filter(p => p.id !== id));
  };

  const handleSavePerson = (personData: Omit<DiamondPerson, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (editingPerson) {
      setPeople(prev =>
        prev.map(p =>
          p.id === editingPerson.id
            ? { ...p, ...personData, updatedAt: new Date().toISOString() }
            : p
        )
      );
    } else {
      const newPerson: DiamondPerson = {
        ...personData,
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setPeople(prev => [...prev, newPerson]);
    }
    setIsModalOpen(false);
  };

  const normalizedSearch = searchTerm.trim().toLowerCase();

  const filteredPeople = people.filter(person => {
    const haystack = `${person.name || ''} ${person.profession || ''} ${person.email || ''} ${person.country || ''} ${person.state || ''}`.toLowerCase();
    const matchesSearch = normalizedSearch.length === 0 || haystack.includes(normalizedSearch);

    const matchesCategory = filterCategory === 'all' || person.category === filterCategory;
    const matchesRelationship = filterRelationship === 'all' || person.relationship === filterRelationship;

    const monthIdx = filterMonth === 'all' ? null : MONTHS.indexOf(filterMonth as any);
    const date = person.lastContact ? new Date(person.lastContact) : null;
    const matchesMonth = monthIdx === null || (date && !Number.isNaN(date.getTime()) && date.getMonth() === monthIdx);

    return matchesSearch && matchesCategory && matchesRelationship && matchesMonth;
  });

  const exportToCSV = () => {
    const headers = ['Name', 'Mobile', 'Profession', 'Country', 'State', 'Email', 'Category', 'Vision Head', 'Relationship', 'Last Contact'];
    const csvContent = [
      headers.map(csvEscape).join(','),
      ...filteredPeople.map(person =>
        [
          person.name,
          person.mobile,
          person.profession,
          person.country,
          person.state,
          person.email,
          person.category,
          person.visionHead,
          person.relationship,
          person.lastContact,
        ].map(csvEscape).join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `diamond-people-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (!mounted) return null;

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-0">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 sm:mb-8 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-swar-text mb-1 sm:mb-2">Diamond People</h1>
          <p className="text-xs sm:text-sm text-swar-text-secondary">Manage your most important relationships and connections</p>
        </div>
        <div className="flex gap-2 sm:gap-3 flex-shrink-0">
          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 sm:gap-2 bg-gray-600 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors text-xs sm:text-sm font-medium"
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Export</span>
          </button>
          <button
            onClick={handleAddPerson}
            className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-3 sm:px-6 py-2 sm:py-3 rounded-lg hover:from-emerald-700 hover:to-teal-700 transition-all shadow-lg hover:shadow-xl text-xs sm:text-sm font-medium"
          >
            <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
            <span>Add</span>
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-8">
        <div className="bg-white rounded-lg sm:rounded-xl p-3 sm:p-6 shadow-lg">
          <div className="text-lg sm:text-2xl font-bold text-emerald-600 mb-0.5 sm:mb-1">{people.length}</div>
          <div className="text-xs sm:text-sm text-swar-text-secondary">Total People</div>
        </div>
        <div className="bg-white rounded-lg sm:rounded-xl p-3 sm:p-6 shadow-lg">
          <div className="text-lg sm:text-2xl font-bold text-blue-600 mb-0.5 sm:mb-1">
            {people.filter(p => p.relationship === 'professional').length}
          </div>
          <div className="text-xs sm:text-sm text-swar-text-secondary">Professional</div>
        </div>
        <div className="bg-white rounded-lg sm:rounded-xl p-3 sm:p-6 shadow-lg">
          <div className="text-lg sm:text-2xl font-bold text-purple-600 mb-0.5 sm:mb-1">
            {people.filter(p => p.relationship === 'personal').length}
          </div>
          <div className="text-xs sm:text-sm text-swar-text-secondary">Personal</div>
        </div>
        <div className="bg-white rounded-lg sm:rounded-xl p-3 sm:p-6 shadow-lg">
          <div className="text-lg sm:text-2xl font-bold text-orange-600 mb-0.5 sm:mb-1">
            {new Set(people.map(p => p.category)).size}
          </div>
          <div className="text-xs sm:text-sm text-swar-text-secondary">Categories</div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 sm:mb-8 bg-white rounded-lg sm:rounded-2xl shadow-sm border border-gray-100 p-3 sm:p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2 sm:gap-3">
          <div className="sm:col-span-2 md:col-span-1">
            <label className="block text-xs font-bold text-swar-text mb-1">Search</label>
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search..."
              className="w-full px-3 py-1.5 sm:py-2 rounded-lg border border-swar-border focus:outline-none focus:ring-2 focus:ring-emerald-200 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-swar-text mb-1">Category</label>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full px-3 py-1.5 sm:py-2 rounded-lg border border-swar-border bg-white focus:outline-none focus:ring-2 focus:ring-emerald-200 text-sm"
            >
              {categories.map(category => (
                <option key={category} value={category}>
                  {category === 'all' ? 'All' : category}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-swar-text mb-1">Relationship</label>
            <select
              value={filterRelationship}
              onChange={(e) => setFilterRelationship(e.target.value)}
              className="w-full px-3 py-1.5 sm:py-2 rounded-lg border border-swar-border bg-white focus:outline-none focus:ring-2 focus:ring-emerald-200 text-sm"
            >
              <option value="all">All</option>
              <option value="professional">Prof</option>
              <option value="personal">Personal</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-swar-text mb-1">Month</label>
            <select
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              className="w-full px-3 py-1.5 sm:py-2 rounded-lg border border-swar-border bg-white focus:outline-none focus:ring-2 focus:ring-emerald-200 text-sm"
            >
              <option value="all">All</option>
              {MONTHS.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setFilterCategory('all');
                setFilterRelationship('all');
                setFilterMonth('all');
              }}
              className="w-full px-3 py-1.5 sm:py-2 rounded-lg bg-swar-primary-light text-swar-text font-bold hover:bg-swar-primary-light transition text-xs sm:text-sm"
            >
              Clear
            </button>
          </div>
        </div>

        <p className="mt-2 sm:mt-3 text-xs sm:text-sm text-swar-text-secondary">Showing {filteredPeople.length} of {people.length} people</p>
      </div>

      {/* People Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 auto-rows-max">
        {filteredPeople.map(person => (
          <div key={person.id} className="w-full bg-white rounded-lg sm:rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 flex flex-col h-full">
            {/* Image header (h-32 mobile, h-40 desktop) */}
            <div
              className="relative h-28 sm:h-40 overflow-hidden bg-emerald-600 flex items-center justify-center"
              style={{ backgroundImage: `url('${person.imageUrl || DEFAULT_IMAGE}')`, backgroundSize: 'cover', backgroundPosition: 'center' }}
            >
              {!person.imageUrl && (
                <div className="w-full h-full flex items-center justify-center text-white text-3xl sm:text-5xl font-bold opacity-0">
                  💎
                </div>
              )}
              {/* Top-right Badge */}
              <div className="absolute top-2 right-2 sm:top-3 sm:right-3">
                <div className="bg-emerald-600 text-white px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-xs font-bold">
                  {person.relationship ? person.relationship.toUpperCase().substring(0, 4) : 'CONT'}
                </div>
              </div>
            </div>

            {/* Card content */}
            <div className="p-3 sm:p-5 flex-1 flex flex-col">
              <h3 className="text-base sm:text-xl font-bold text-swar-text mb-0.5 sm:mb-1 line-clamp-2">{person.name}</h3>
              <p className="text-xs sm:text-sm text-swar-text-secondary mb-2 sm:mb-4 line-clamp-2">{person.profession || 'No profession'}</p>

              {/* Metadata (Vision style with icons) */}
              <div className="space-y-1 sm:space-y-2 text-xs sm:text-sm text-swar-text mb-auto">
                {person.mobile && (
                  <div className="flex items-center gap-2 truncate">
                    📱 <span className="truncate">{person.mobile}</span>
                  </div>
                )}
                {person.state && person.country && (
                  <div className="flex items-center gap-2 truncate">
                    📍 <span className="truncate">{person.state}, {person.country}</span>
                  </div>
                )}
                {person.lastContact && (
                  <div className="flex items-center gap-2">
                    📅 {new Date(person.lastContact).toLocaleDateString()}
                  </div>
                )}
              </div>

              {/* Category Badge */}
              <div className="mt-2 sm:mt-3 flex flex-wrap gap-1">
                {person.category && (
                  <span className="inline-block bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-medium truncate">
                    {person.category.substring(0, 10)}
                  </span>
                )}
                {person.visionHead && (
                  <span className="inline-block bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-xs font-medium truncate">
                    {person.visionHead.substring(0, 10)}
                  </span>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 p-3 sm:p-4 border-t border-gray-100">
              <button
                onClick={() => handleEditPerson(person)}
                className="flex-1 px-3 py-1.5 sm:py-2 bg-emerald-600 text-white text-xs sm:text-sm font-bold rounded-lg hover:bg-emerald-700 transition"
              >
                Edit
              </button>
              <button
                onClick={() => handleDeletePerson(person.id)}
                className="flex-1 px-3 py-1.5 sm:py-2 bg-red-600 text-white text-xs sm:text-sm font-bold rounded-lg hover:bg-red-700 transition"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredPeople.length === 0 && (
        <div className="text-center py-12 sm:py-16">
          <div className="text-swar-text-secondary mb-4">
            <svg className="h-10 sm:h-12 w-10 sm:w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <h3 className="text-base sm:text-lg font-medium text-swar-text mb-2">No people found</h3>
          <p className="text-xs sm:text-sm text-swar-text-secondary mb-4 px-4">Start by adding your first diamond person.</p>
          <button
            onClick={handleAddPerson}
            className="inline-flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors text-xs sm:text-sm font-medium"
          >
            <Plus className="h-4 w-4" />
            <span>Add Person</span>
          </button>
        </div>
      )}

      {/* Person Modal */}
      {isModalOpen && (
        <DiamondPersonModal
          person={editingPerson}
          onSave={handleSavePerson}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </div>
  );
};

export default DiamondPeoplePage;
