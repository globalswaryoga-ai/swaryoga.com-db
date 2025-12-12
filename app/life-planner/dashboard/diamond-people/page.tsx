'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, Download, Edit, Trash2, Phone, Mail, MapPin } from 'lucide-react';
import { DiamondPerson } from '@/lib/types/lifePlanner';
import { lifePlannerStorage } from '@/lib/lifePlannerStorage';
import DiamondPersonModal from './DiamondPersonModal';

const DiamondPeoplePage = () => {
  const [people, setPeople] = useState<DiamondPerson[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPerson, setEditingPerson] = useState<DiamondPerson | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [mounted, setMounted] = useState(false);

  const categories = ['all', 'Spiritual Mentor', 'Health Professional', 'Personal Development', 'Family', 'Friends'];

  // Load from localStorage on mount
  useEffect(() => {
    setMounted(true);
    const saved = lifePlannerStorage.getDiamondPeople();
    setPeople(saved.length > 0 ? saved : []);
  }, []);

  // Save to localStorage whenever people changes
  useEffect(() => {
    if (mounted) {
      lifePlannerStorage.saveDiamondPeople(people);
    }
  }, [people, mounted]);

  const handleAddPerson = () => {
    setEditingPerson(null);
    setIsModalOpen(true);
  };

  const handleEditPerson = (person: DiamondPerson) => {
    setEditingPerson(person);
    setIsModalOpen(true);
  };

  const handleDeletePerson = (id: string) => {
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

  const filteredPeople = people.filter(person => {
    const matchesSearch =
      person.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      person.profession.toLowerCase().includes(searchTerm.toLowerCase()) ||
      person.email.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = filterCategory === 'all' || person.category === filterCategory;

    return matchesSearch && matchesCategory;
  });

  const exportToCSV = () => {
    const headers = ['Name', 'Mobile', 'Profession', 'Country', 'State', 'Email', 'Category', 'Relationship', 'Last Contact'];
    const csvContent = [
      headers.join(','),
      ...filteredPeople.map(person =>
        [
          person.name,
          person.mobile,
          person.profession,
          person.country,
          person.state,
          person.email,
          person.category,
          person.relationship,
          person.lastContact,
        ].join(',')
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
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Diamond People</h1>
          <p className="text-gray-600">Manage your most important relationships and connections</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={exportToCSV}
            className="flex items-center space-x-2 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
          >
            <Download className="h-4 w-4" />
            <span>Export</span>
          </button>
          <button
            onClick={handleAddPerson}
            className="flex items-center space-x-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-6 py-3 rounded-lg hover:from-emerald-700 hover:to-teal-700 transition-all shadow-lg hover:shadow-xl"
          >
            <Plus className="h-5 w-5" />
            <span>Add Person</span>
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl p-6 shadow-lg">
          <div className="text-2xl font-bold text-emerald-600 mb-1">{people.length}</div>
          <div className="text-gray-600 text-sm">Total People</div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-lg">
          <div className="text-2xl font-bold text-blue-600 mb-1">
            {people.filter(p => p.relationship === 'professional').length}
          </div>
          <div className="text-gray-600 text-sm">Professional</div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-lg">
          <div className="text-2xl font-bold text-purple-600 mb-1">
            {people.filter(p => p.relationship === 'personal').length}
          </div>
          <div className="text-gray-600 text-sm">Personal</div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-lg">
          <div className="text-2xl font-bold text-orange-600 mb-1">
            {new Set(people.map(p => p.category)).size}
          </div>
          <div className="text-gray-600 text-sm">Categories</div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-xl p-6 shadow-lg mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div className="flex items-center space-x-4">
            <Filter className="h-5 w-5 text-gray-600" />
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            >
              {categories.map(category => (
                <option key={category} value={category}>
                  {category === 'all' ? 'All Categories' : category}
                </option>
              ))}
            </select>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search people..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent w-64"
            />
          </div>
        </div>
      </div>

      {/* People Grid */}
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredPeople.map(person => (
          <div key={person.id} className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-800 mb-1">{person.name}</h3>
                  <p className="text-gray-600 text-sm">{person.profession}</p>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleEditPerson(person)}
                    className="p-2 text-gray-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDeletePerson(person.id)}
                    className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-3 mb-4">
                <div className="flex items-center space-x-3 text-sm text-gray-600">
                  <Phone className="h-4 w-4" />
                  <span>{person.mobile}</span>
                </div>
                <div className="flex items-center space-x-3 text-sm text-gray-600">
                  <Mail className="h-4 w-4" />
                  <span>{person.email}</span>
                </div>
                <div className="flex items-center space-x-3 text-sm text-gray-600">
                  <MapPin className="h-4 w-4" />
                  <span>{person.state}, {person.country}</span>
                </div>
              </div>

              <div className="flex items-center justify-between mb-4">
                <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-medium">
                  {person.category}
                </span>
                <span className="text-xs text-gray-500">
                  Last: {new Date(person.lastContact).toLocaleDateString()}
                </span>
              </div>

              {person.notes && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-sm text-gray-700 line-clamp-3">{person.notes}</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {filteredPeople.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <svg className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No people found</h3>
          <p className="text-gray-600 mb-4">Start by adding your first diamond person.</p>
          <button
            onClick={handleAddPerson}
            className="inline-flex items-center space-x-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors"
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
