'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { VISION_CATEGORIES } from '@/lib/types/lifePlanner';
import type { Word, VisionCategory, MiniTodo } from '@/lib/types/lifePlanner';
import { lifePlannerStorage } from '@/lib/lifePlannerMongoStorage';
import { getDefaultCategoryImage } from '@/lib/visionCategoryImages';

const DEFAULT_IMAGE = 'https://i.postimg.cc/Y0zjsTd2/image.jpg';

type WordFormState = {
  title: string;
  description: string;
  category: VisionCategory | '';
  imageUrl: string;
  startDate: string;
  endDate: string;
  timeStart: string;
  timeEnd: string;
  priority: 'low' | 'medium' | 'high';
  status: 'active' | 'completed' | 'on-hold';
  repeat: 'once' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';
  customDays: number;
  todos: MiniTodo[];
};

const todayIso = () => new Date().toISOString().split('T')[0];

const emptyWordForm = (): WordFormState => ({
  title: '',
  description: '',
  category: '',
  imageUrl: '',
  startDate: todayIso(),
  endDate: '',
  timeStart: '',
  timeEnd: '',
  priority: 'medium',
  status: 'active',
  repeat: 'once',
  customDays: 1,
  todos: [],
});

function getWordImageUrl(word: Word): string {
  const img = (word as any).imageUrl;
  if (typeof img === 'string' && img.trim()) return img.trim();
  const head = (word as any).category;
  return getDefaultCategoryImage(String(head || 'Life'));
}

function getPriorityBadge(priority: unknown) {
  const p = typeof priority === 'string' ? priority : 'medium';
  if (p === 'high') return { label: 'high', className: 'bg-red-600 text-white' };
  if (p === 'low') return { label: 'low', className: 'bg-emerald-600 text-white' };
  return { label: 'medium', className: 'bg-amber-600 text-white' };
}

function getStatusBadge(status: unknown) {
  const s = typeof status === 'string' ? status : 'active';
  if (s === 'completed') return { label: 'completed', className: 'bg-green-700 text-white' };
  if (s === 'on-hold') return { label: 'on-hold', className: 'bg-gray-700 text-white' };
  return { label: 'active', className: 'bg-blue-700 text-white' };
}

function normalizeRepeatFromFrequency(
  frequency: unknown,
  customDays: unknown
): Pick<WordFormState, 'repeat' | 'customDays'> {
  const freq = typeof frequency === 'string' ? frequency : '';
  if (freq === 'daily') return { repeat: 'daily', customDays: 1 };
  if (freq === 'weekly') return { repeat: 'weekly', customDays: 7 };
  if (freq === 'monthly') return { repeat: 'monthly', customDays: 30 };
  if (freq === 'yearly') return { repeat: 'yearly', customDays: 365 };
  if (freq === 'once') return { repeat: 'once', customDays: 1 };
  if (freq === 'custom') {
    const n = typeof customDays === 'number' ? customDays : Number(customDays);
    return { repeat: 'custom', customDays: Number.isFinite(n) && n > 0 ? n : 1 };
  }
  return { repeat: 'once', customDays: 1 };
}

export default function WordsPage() {
  const [words, setWords] = useState<Word[]>([]);
  const [mounted, setMounted] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<WordFormState>(emptyWordForm());

  // Filters
  const [searchText, setSearchText] = useState('');
  const [filterType] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterFrequency] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterMonth, setFilterMonth] = useState<string>('all');

  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  useEffect(() => {
    setMounted(true);
    (async () => {
      try {
        const saved = await lifePlannerStorage.getWords();
        setWords(Array.isArray(saved) ? saved : []);
        setHasLoaded(true);
      } catch (error) {
        console.error('Error loading words:', error);
        setWords([]);
        setHasLoaded(true);
      }
    })();
  }, []);

  useEffect(() => {
    if (!mounted || !hasLoaded) return;
    (async () => {
      try {
        await lifePlannerStorage.saveWords(words);
      } catch (error) {
        console.error('Error saving words:', error);
      }
    })();
  }, [words, mounted, hasLoaded]);

  const uniqueCategories = useMemo(
    () =>
      Array.from(new Set(words.map(w => w.category).filter(Boolean) as string[])).sort((a, b) =>
        a.localeCompare(b)
      ),
    [words]
  );

  const filteredWords = useMemo(() => {
    const normalizedSearch = searchText.trim().toLowerCase();
    return words.filter(word => {
      const haystack = `${word.title || ''} ${word.description || ''} ${word.category || ''}`.toLowerCase();
      const matchesSearch = normalizedSearch.length === 0 || haystack.includes(normalizedSearch);
      const matchesType = filterType === 'all' || (word.type || '') === filterType;
      const matchesCategory = filterCategory === 'all' || (word.category || '') === filterCategory;
      const matchesFrequency = filterFrequency === 'all' || (word.frequency || '') === filterFrequency;
      const matchesStatus = filterStatus === 'all' || (word.status || 'active') === filterStatus;
      
      // Month filter
      const monthIdx = filterMonth === 'all' ? null : MONTHS.indexOf(filterMonth);
      const dateStr = word.startDate || word.endDate || '';
      const date = dateStr ? new Date(dateStr) : null;
      const matchesMonth = monthIdx === null || (date && !Number.isNaN(date.getTime()) && date.getMonth() === monthIdx);

      return matchesSearch && matchesType && matchesCategory && matchesFrequency && matchesStatus && matchesMonth;
    });
  }, [words, searchText, filterType, filterCategory, filterFrequency, filterStatus, filterMonth, MONTHS]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyWordForm());
    setIsFormOpen(true);
  };

  const openEdit = (word: Word) => {
    const { repeat, customDays } = normalizeRepeatFromFrequency(
      word.frequency,
      (word as any).customDays
    );
    setEditingId(word.id);
    setForm({
      title: word.title || '',
      description: word.description || '',
      category: ((word.category as any) || '') as any,
      imageUrl: (word as any).imageUrl || '',
      startDate: (word as any).startDate || todayIso(),
      endDate: (word as any).endDate || '',
      timeStart: (word as any).timeStart || '',
      timeEnd: (word as any).timeEnd || '',
      priority: (((word as any).priority as any) || 'medium') as any,
      status: (((word as any).status as any) || 'active') as any,
      repeat,
      customDays,
      todos: (((word as any).todos as any) || []) as MiniTodo[],
    });
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingId(null);
    setForm(emptyWordForm());
  };

  const handleSave = () => {
    if (!form.title.trim()) {
      alert('Please enter a word title');
      return;
    }
    if (!form.category) {
      alert('Please choose a head (category)');
      return;
    }
    if (!form.startDate || !form.endDate) {
      alert('Please choose start date and end date');
      return;
    }
    if (form.repeat === 'custom' && (!form.customDays || form.customDays < 1)) {
      alert('Custom repeat must be at least 1 day');
      return;
    }

    const next: Word = {
      id: editingId || `word-${Date.now()}`,
      title: form.title,
      description: form.description,
      type: (editingId
        ? (words.find(w => w.id === editingId)?.type || 'affirmation')
        : 'affirmation') as any,
      category: form.category as any,
      frequency: form.repeat as any,
      status: form.status as any,
      createdAt: editingId
        ? words.find(w => w.id === editingId)?.createdAt || new Date().toISOString()
        : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      imageUrl: form.imageUrl,
      startDate: form.startDate,
      endDate: form.endDate,
      timeStart: form.timeStart,
      timeEnd: form.timeEnd,
      priority: form.priority as any,
      customDays: form.repeat === 'custom' ? form.customDays : undefined,
      todos: form.todos,
    } as Word;

    setWords(prev => {
      if (editingId) return prev.map(w => (w.id === editingId ? next : w));
      return [...prev, next];
    });
    closeForm();
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this word?')) {
      setWords(prev => prev.filter(w => w.id !== id));
    }
  };

  const updateWordStatus = (id: string, status: Word['status']) => {
    setWords(prev => prev.map(w => (w.id === id ? ({ ...w, status, updatedAt: new Date().toISOString() } as Word) : w)));
  };

  if (!mounted) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading words...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Words of Inspiration</h1>
          <p className="text-sm text-gray-600">Head → Title → Dates/Time → Priority → Repeat → Todos</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-yellow-500 px-4 py-2 text-white font-semibold hover:from-orange-600 hover:to-yellow-600 transition"
        >
          <Plus className="h-5 w-5" />
          Add Word
        </button>
      </div>

      {/* Filters */}
      <div className="mb-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Search</label>
            <input
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Search word / category / description"
              className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-200"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Category</label>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value as any)}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-orange-200"
            >
              <option value="all">All</option>
              {uniqueCategories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-orange-200"
            >
              <option value="all">All</option>
              <option value="active">active</option>
              <option value="archived">archived</option>
              <option value="completed">completed</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Month</label>
            <select
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-orange-200"
            >
              <option value="all">All</option>
              {MONTHS.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          <div className="flex items-end gap-2">
            <button
              type="button"
              onClick={() => {
                setSearchText('');
                setFilterCategory('all');
                setFilterStatus('all');
                setFilterMonth('all');
              }}
              className="w-full px-3 py-2 rounded-lg bg-gray-100 text-gray-800 font-bold hover:bg-gray-200 transition"
            >
              Clear Filters
            </button>
          </div>
        </div>

        <p className="mt-3 text-sm text-gray-600">Showing {filteredWords.length} of {words.length} words</p>
      </div>

      {filteredWords.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl shadow-sm">
          <p className="text-gray-500 mb-4">No words found.</p>
          <button
            onClick={openCreate}
            className="bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 text-white px-6 py-3 rounded-lg transition font-semibold"
          >
            Create your first word
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-max justify-items-center">
          {filteredWords.map(word => (
            <div key={word.id} className="w-80 bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 flex flex-col h-full">
              {/* Image Header (h-40 - Vision style) */}
              <div 
                className="relative h-40 overflow-hidden bg-orange-600"
                style={{ backgroundImage: `url('${getWordImageUrl(word) || DEFAULT_IMAGE}')`, backgroundSize: 'cover', backgroundPosition: 'center' }}
              >
                {!getWordImageUrl(word) && <div className="w-full h-full flex items-center justify-center text-white text-5xl font-bold opacity-0">✨</div>}
                
                {/* Top-right Badge */}
                <div className="absolute top-3 right-3">
                  <div className={`${getStatusBadge((word as any).status).className} px-3 py-1 rounded-full text-xs font-bold`}>
                    {getStatusBadge((word as any).status).label.toUpperCase()}
                  </div>
                </div>
              </div>

              {/* Card Content */}
              <div className="p-5 flex-1 flex flex-col">
                <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-2">{word.title}</h3>
                <p className="text-sm text-gray-600 mb-4 line-clamp-2">{word.description || 'No description'}</p>

                {/* Metadata (Vision style with icons) */}
                <div className="space-y-2 text-xs text-gray-700 mb-auto">
                  <div className="flex items-center gap-2">
                    🏷️ {(word.category as any) || 'No category'}
                  </div>
                  {(word as any).startDate && (
                    <div className="flex items-center gap-2">
                      📅 {new Date((word as any).startDate).toLocaleDateString()}
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    🔄 {((word.frequency || 'once') as any).toUpperCase()}
                  </div>
                </div>

                {/* Type & Priority Badges */}
                <div className="flex gap-2 mt-3">
                  <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-700">
                    {((word.type || 'affirmation') as string).toUpperCase()}
                  </span>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getPriorityBadge((word as any).priority).className}`}>
                    {getPriorityBadge((word as any).priority).label.toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Action Buttons (Vision style) */}
              <div className="flex gap-2 p-4 border-t border-gray-100">
                <button 
                  onClick={() => updateWordStatus(word.id, 'completed')}
                  className="flex-1 px-3 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition"
                >
                  Done
                </button>
                <button 
                  onClick={() => openEdit(word)}
                  className="flex-1 px-3 py-2 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 transition"
                >
                  Edit
                </button>
                <button 
                  onClick={() => handleDelete(word.id)}
                  className="flex-1 px-3 py-2 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-700 transition"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {isFormOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <WordModal
            editingId={editingId}
            form={form}
            setForm={setForm}
            onSave={handleSave}
            onClose={closeForm}
          />
        </div>
      )}
    </div>
  );
}

function WordModal({
  editingId,
  form,
  setForm,
  onSave,
  onClose,
}: {
  editingId: string | null;
  form: WordFormState;
  setForm: React.Dispatch<React.SetStateAction<WordFormState>>;
  onSave: () => void;
  onClose: () => void;
}) {
  const [showImageEditor, setShowImageEditor] = useState(false);
  const [showTodosEditor, setShowTodosEditor] = useState(false);
  const [newTodoTitle, setNewTodoTitle] = useState('');
  const [newTodoDueDate, setNewTodoDueDate] = useState('');
  const [newTodoDueTime, setNewTodoDueTime] = useState('11:00');

  const computedDefaultImageUrl = useMemo(() => {
    if (form.imageUrl?.trim()) return form.imageUrl.trim();
    if (form.category?.trim()) return getDefaultCategoryImage(String(form.category));
    return getDefaultCategoryImage('Life');
  }, [form.imageUrl, form.category]);

  const addTodo = () => {
    const title = newTodoTitle.trim();
    if (!title) return;

    const fallbackDate = form.endDate || form.startDate || todayIso();
    const dueDate = (newTodoDueDate || fallbackDate).trim();
    const dueTime = (newTodoDueTime || '11:00').trim();

    setForm(prev => ({
      ...prev,
      todos: [
        ...(prev.todos || []),
        { id: `todo-${Date.now()}`, title, dueDate, dueTime, completed: false },
      ],
    }));
    setNewTodoTitle('');
    setNewTodoDueDate('');
    setNewTodoDueTime('11:00');
  };

  const toggleTodo = (id: string) => {
    setForm(prev => ({
      ...prev,
      todos: (prev.todos || []).map(t => (t.id === id ? { ...t, completed: !t.completed } : t)),
    }));
  };

  const updateTodo = (id: string, patch: Partial<Pick<MiniTodo, 'title' | 'dueDate' | 'dueTime'>>) => {
    setForm(prev => ({
      ...prev,
      todos: (prev.todos || []).map(t => (t.id === id ? { ...t, ...patch } : t)),
    }));
  };

  const deleteTodo = (id: string) => {
    setForm(prev => ({
      ...prev,
      todos: (prev.todos || []).filter(t => t.id !== id),
    }));
  };

  return (
    <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
      <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 p-6 text-white flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">{editingId ? 'Edit Word' : 'Create New Word'}</h2>
        <button
          onClick={onClose}
          className="text-2xl font-bold hover:scale-110 transition-transform"
          aria-label="Close"
        >
          ✕
        </button>
      </div>

      <div className="p-6 space-y-5">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Head / Category *</label>
          <select
            value={form.category}
            onChange={(e) => setForm(prev => ({ ...prev, category: e.target.value as any }))}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Select a head...</option>
            {VISION_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Word Title *</label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter word title"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Start Date *</label>
            <input
              type="date"
              value={form.startDate}
              onChange={(e) => setForm(prev => ({ ...prev, startDate: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">End Date (Due) *</label>
            <input
              type="date"
              value={form.endDate}
              onChange={(e) => setForm(prev => ({ ...prev, endDate: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Start Time</label>
            <input
              type="time"
              value={form.timeStart}
              onChange={(e) => setForm(prev => ({ ...prev, timeStart: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">End Time</label>
            <input
              type="time"
              value={form.timeEnd}
              onChange={(e) => setForm(prev => ({ ...prev, timeEnd: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter description"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Priority</label>
            <select
              value={form.priority}
              onChange={(e) => setForm(prev => ({ ...prev, priority: e.target.value as any }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="low">low</option>
              <option value="medium">medium</option>
              <option value="high">high</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Repeat</label>
            <select
              value={form.repeat}
              onChange={(e) => setForm(prev => ({ ...prev, repeat: e.target.value as any }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="once">once</option>
              <option value="daily">daily</option>
              <option value="weekly">weekly</option>
              <option value="monthly">monthly</option>
              <option value="yearly">yearly</option>
              <option value="custom">custom</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Status</label>
          <select
            value={form.status}
            onChange={(e) => setForm(prev => ({ ...prev, status: e.target.value as any }))}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="active">active</option>
            <option value="completed">completed</option>
            <option value="on-hold">on-hold</option>
          </select>
        </div>

        {form.repeat === 'custom' && (
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Custom (days)</label>
            <input
              type="number"
              min={1}
              max={365}
              value={form.customDays}
              onChange={(e) => setForm(prev => ({ ...prev, customDays: Number(e.target.value) || 1 }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        )}

        <div>
          <div className="flex items-center justify-between gap-3 mb-2">
            <label className="block text-sm font-bold text-gray-800">Default Image (Editable)</label>
            <button
              type="button"
              onClick={() => setShowImageEditor(v => !v)}
              className="text-sm font-medium text-emerald-700 hover:text-emerald-800"
            >
              {showImageEditor ? 'Hide' : 'Edit'}
            </button>
          </div>

          <div className="rounded-lg overflow-hidden h-48 border-2 border-gray-200 bg-gray-50">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={computedDefaultImageUrl}
              alt="Word visual"
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src =
                  'https://via.placeholder.com/800x400?text=Image+Not+Found';
              }}
            />
          </div>

          {showImageEditor && (
            <div className="mt-3 rounded-lg border-2 border-emerald-200 bg-emerald-50 p-4">
              <label className="block text-sm font-semibold text-emerald-900 mb-2">
                Custom Image URL (optional)
              </label>
              <input
                type="url"
                value={form.imageUrl}
                onChange={(e) => setForm(prev => ({ ...prev, imageUrl: e.target.value }))}
                className="w-full px-4 py-2 border border-emerald-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white"
                placeholder="https://..."
              />
              <div className="flex items-center gap-2 mt-3">
                <button
                  type="button"
                  onClick={() => setForm(prev => ({ ...prev, imageUrl: '' }))}
                  className="px-4 py-2 rounded-lg border border-emerald-300 bg-white text-emerald-800 hover:bg-emerald-100 transition"
                >
                  Use default
                </button>
                <p className="text-xs text-emerald-800">Default comes from the selected Head image.</p>
              </div>
            </div>
          )}
        </div>

        <div className="rounded-xl border-2 border-blue-200 bg-blue-50 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-blue-900">Todos</h3>
              <p className="text-xs text-blue-800">Title + due date/time (default 11:00) + checkbox.</p>
            </div>
            <button
              type="button"
              onClick={() => setShowTodosEditor(v => !v)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              {showTodosEditor ? 'Hide Todos' : 'Todos'}
            </button>
          </div>

          {showTodosEditor && (
            <div className="mt-4 space-y-3">
              <div className="rounded-xl border border-blue-200 bg-white p-3">
                <input
                  type="text"
                  value={newTodoTitle}
                  onChange={(e) => setNewTodoTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addTodo();
                    }
                  }}
                  className="w-full px-4 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                  placeholder="Todo title"
                />

                <div className="mt-2 flex flex-col md:flex-row gap-2">
                  <input
                    type="date"
                    value={newTodoDueDate || form.endDate || ''}
                    onChange={(e) => setNewTodoDueDate(e.target.value)}
                    className="w-full md:w-auto md:flex-1 px-4 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                    title="Due date"
                  />
                  <input
                    type="time"
                    value={newTodoDueTime}
                    onChange={(e) => setNewTodoDueTime(e.target.value)}
                    className="w-full md:w-44 px-4 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                    title="Due time (default 11:00)"
                  />
                  <button
                    type="button"
                    onClick={addTodo}
                    className="w-full md:w-28 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                  >
                    Add
                  </button>
                </div>
              </div>

              {(form.todos || []).length === 0 ? (
                <div className="text-sm text-blue-800 bg-white border border-blue-200 rounded-lg px-4 py-3">
                  No todos yet.
                </div>
              ) : (
                <div className="space-y-2">
                  {(form.todos || []).map(todo => (
                    <div key={todo.id} className="bg-white border border-blue-200 rounded-xl px-3 py-3">
                      <input
                        type="text"
                        value={todo.title}
                        onChange={(e) => updateTodo(todo.id, { title: e.target.value })}
                        className={`w-full bg-transparent outline-none text-sm px-1 ${todo.completed ? 'text-gray-500 line-through' : 'text-gray-900'}`}
                      />

                      <div className="mt-2 flex flex-col md:flex-row md:items-center gap-2">
                        <label className="inline-flex items-center gap-2 text-sm text-gray-700 md:mr-1">
                          <input
                            type="checkbox"
                            checked={!!todo.completed}
                            onChange={() => toggleTodo(todo.id)}
                            className="rounded border-gray-300"
                          />
                          <span className="text-xs">Done</span>
                        </label>

                        <input
                          type="date"
                          value={todo.dueDate || ''}
                          onChange={(e) => updateTodo(todo.id, { dueDate: e.target.value })}
                          className="w-full md:w-auto md:flex-1 px-3 py-2 text-sm border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />

                        <input
                          type="time"
                          value={todo.dueTime || '11:00'}
                          onChange={(e) => updateTodo(todo.id, { dueTime: e.target.value })}
                          className="w-full md:w-44 px-3 py-2 text-sm border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />

                        <button
                          type="button"
                          onClick={() => deleteTodo(todo.id)}
                          className="w-full md:w-auto px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition inline-flex items-center justify-center"
                          title="Remove"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 px-0 pt-5 pb-5 border-t-2 border-blue-200 bg-gradient-to-r from-blue-50 via-white to-emerald-50 sticky bottom-0">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSave}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            {editingId ? 'Update Word' : 'Create Word'}
          </button>
        </div>
      </div>
    </div>
  );
}
