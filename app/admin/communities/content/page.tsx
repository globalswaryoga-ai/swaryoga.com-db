'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus, Edit2, Trash2, Loader2, Search, X, Check, Star, MessageCircle, Lightbulb, Sparkles, HelpCircle, Video, FileText } from 'lucide-react';

// Content categories matching the community page
const contentCategories = [
  { id: 'experiences', label: 'Experiences', icon: Sparkles, emoji: '✨', color: 'emerald' },
  { id: 'tips', label: 'Tips & Tricks', icon: Lightbulb, emoji: '💡', color: 'amber' },
  { id: 'transformations', label: 'Transformations', icon: Star, emoji: '🦋', color: 'purple' },
  { id: 'questions', label: 'Questions', icon: HelpCircle, emoji: '❓', color: 'blue' },
];

interface ContentItem {
  _id: string;
  userName: string;
  content?: string;
  question?: string;
  answer?: string;
  rating?: number;
  category?: string;
  communityId?: string;
  featured: boolean;
  status?: string;
  createdAt: string;
  beforePhoto?: string;
  afterPhoto?: string;
  beforeDescription?: string;
  afterDescription?: string;
  timeframe?: string;
}

export default function AdminCommunityContentPage() {
  const [activeTab, setActiveTab] = useState('experiences');
  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<ContentItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  
  // Form state - flexible for all content types
  const [form, setForm] = useState({
    userName: '',
    content: '',
    question: '',
    answer: '',
    rating: 5,
    category: 'general',
    communityId: 'global',
    featured: false,
    userEmail: '',
    userPhone: '',
    beforePhoto: '',
    afterPhoto: '',
    beforeDescription: '',
    afterDescription: '',
    timeframe: '',
  });

  useEffect(() => {
    fetchContent();
  }, [activeTab]);

  async function fetchContent() {
    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('token');
      
      const res = await fetch(`/api/community/${activeTab}?limit=100`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      
      if (data.success) {
        setItems(data[activeTab] || data.experiences || data.questions || data.tips || data.transformations || []);
      } else {
        setError(data.error || 'Failed to fetch content');
      }
    } catch (err) {
      setError('Failed to fetch content');
    } finally {
      setLoading(false);
    }
  }

  function openCreateModal() {
    setEditingItem(null);
    setForm({
      userName: '',
      content: '',
      question: '',
      answer: '',
      rating: 5,
      category: 'general',
      communityId: 'global',
      featured: false,
      userEmail: '',
      userPhone: '',
      beforePhoto: '',
      afterPhoto: '',
      beforeDescription: '',
      afterDescription: '',
      timeframe: '',
    });
    setShowModal(true);
  }

  function openEditModal(item: ContentItem) {
    setEditingItem(item);
    setForm({
      userName: item.userName || '',
      content: item.content || '',
      question: item.question || '',
      answer: item.answer || '',
      rating: item.rating || 5,
      category: item.category || 'general',
      communityId: item.communityId || 'global',
      featured: item.featured || false,
      userEmail: '',
      userPhone: '',
      beforePhoto: item.beforePhoto || '',
      afterPhoto: item.afterPhoto || '',
      beforeDescription: item.beforeDescription || '',
      afterDescription: item.afterDescription || '',
      timeframe: item.timeframe || '',
    });
    setShowModal(true);
  }

  async function handleSave() {
    if (!form.userName.trim()) {
      alert('Please enter a name');
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const url = `/api/community/${activeTab}`;
      const method = editingItem ? 'PUT' : 'POST';
      
      const body: any = { ...form };
      if (editingItem) {
        body.id = editingItem._id;
      }

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (data.success) {
        setShowModal(false);
        fetchContent();
      } else {
        alert(data.error || 'Failed to save');
      }
    } catch (err) {
      alert('Failed to save');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this?')) return;

    setDeleting(id);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/community/${activeTab}?id=${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (data.success) {
        fetchContent();
      } else {
        alert(data.error || 'Failed to delete');
      }
    } catch (err) {
      alert('Failed to delete');
    } finally {
      setDeleting(null);
    }
  }

  async function toggleFeatured(item: ContentItem) {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/community/${activeTab}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          id: item._id,
          featured: !item.featured,
        }),
      });

      const data = await res.json();
      if (data.success) {
        fetchContent();
      }
    } catch (err) {
      console.error('Failed to toggle featured');
    }
  }

  const filteredItems = items.filter(item => {
    const searchStr = searchTerm.toLowerCase();
    return (
      item.userName?.toLowerCase().includes(searchStr) ||
      item.content?.toLowerCase().includes(searchStr) ||
      item.question?.toLowerCase().includes(searchStr)
    );
  });

  const activeCategory = contentCategories.find(c => c.id === activeTab);

  const renderStars = (rating: number, interactive = false, onChange?: (r: number) => void) => (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={interactive && onChange ? () => onChange(star) : undefined}
          className={`text-xl ${interactive ? 'cursor-pointer hover:scale-110 transition-transform' : ''}`}
          disabled={!interactive}
        >
          {star <= rating ? '⭐' : '☆'}
        </button>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link 
                href="/admin/communities" 
                className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
              >
                <ArrowLeft className="h-5 w-5 text-gray-600" />
              </Link>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Community Content</h1>
                <p className="text-sm text-gray-500">Manage experiences, tips, questions & more</p>
              </div>
            </div>
            <button
              onClick={openCreateModal}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-xl font-medium transition-all active:scale-95 shadow-md"
            >
              <Plus className="h-5 w-5" />
              <span className="hidden sm:inline">Add {activeCategory?.label}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Category Tabs - Same style as community page */}
        <div className="flex gap-2 overflow-x-auto pb-4 mb-6 scrollbar-hide">
          {contentCategories.map((cat) => {
            const Icon = cat.icon;
            const isActive = activeTab === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveTab(cat.id)}
                className={`shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95 ${
                  isActive
                    ? 'bg-gradient-to-r from-green-600 to-green-700 text-white shadow-md'
                    : 'bg-white text-gray-700 border border-gray-200 hover:border-green-500 hover:bg-green-50'
                }`}
              >
                <span>{cat.emoji}</span>
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder={`Search ${activeCategory?.label}...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500"
          />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 border border-gray-100">
            <p className="text-2xl font-bold text-gray-900">{items.length}</p>
            <p className="text-sm text-gray-500">Total {activeCategory?.label}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100">
            <p className="text-2xl font-bold text-amber-600">{items.filter(i => i.featured).length}</p>
            <p className="text-sm text-gray-500">Featured</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100">
            <p className="text-2xl font-bold text-green-600">
              {activeTab === 'questions' 
                ? items.filter(i => i.answer).length 
                : items.filter(i => i.status === 'approved').length}
            </p>
            <p className="text-sm text-gray-500">{activeTab === 'questions' ? 'Answered' : 'Approved'}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100">
            <p className="text-2xl font-bold text-blue-600">
              {new Date().toLocaleDateString('en-IN', { month: 'short' })}
            </p>
            <p className="text-sm text-gray-500">This Month</p>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 text-red-700 p-4 rounded-xl mb-6 border border-red-200">
            {error}
          </div>
        )}

        {/* Loading */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-green-600" />
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
            <div className="text-5xl mb-4">{activeCategory?.emoji}</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No {activeCategory?.label} yet</h3>
            <p className="text-gray-500 mb-4">Add your first {activeCategory?.label.toLowerCase()}</p>
            <button
              onClick={openCreateModal}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-2.5 rounded-xl font-medium"
            >
              Add {activeCategory?.label}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredItems.map((item) => (
              <div
                key={item._id}
                className={`bg-white rounded-xl border p-5 transition-all hover:shadow-md ${
                  item.featured ? 'border-amber-300 ring-2 ring-amber-100' : 'border-gray-100'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-green-600 font-bold">
                        {item.userName?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{item.userName}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(item.createdAt).toLocaleDateString('en-IN', { 
                            day: 'numeric', month: 'short', year: 'numeric' 
                          })}
                        </p>
                      </div>
                      {item.featured && (
                        <span className="bg-amber-100 text-amber-700 text-xs font-medium px-2 py-1 rounded-full">
                          ⭐ Featured
                        </span>
                      )}
                    </div>
                    
                    {/* Content based on type */}
                    {activeTab === 'experiences' && (
                      <>
                        <div className="mb-2">{renderStars(item.rating || 5)}</div>
                        <p className="text-gray-700 line-clamp-3">{item.content}</p>
                      </>
                    )}
                    
                    {activeTab === 'questions' && (
                      <>
                        <p className="font-medium text-gray-900 mb-2">Q: {item.question}</p>
                        {item.answer ? (
                          <div className="bg-blue-50 rounded-lg p-3 mt-2">
                            <p className="text-sm text-blue-700">💡 {item.answer}</p>
                          </div>
                        ) : (
                          <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full">
                            Pending Answer
                          </span>
                        )}
                      </>
                    )}
                    
                    {activeTab === 'tips' && (
                      <p className="text-gray-700 line-clamp-3">{item.content}</p>
                    )}
                    
                    {activeTab === 'transformations' && (
                      <div className="space-y-2">
                        {item.timeframe && (
                          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                            ⏱️ {item.timeframe}
                          </span>
                        )}
                        <p className="text-gray-700 line-clamp-2">{item.content}</p>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => toggleFeatured(item)}
                      className={`p-2 rounded-lg transition-colors ${
                        item.featured 
                          ? 'text-amber-600 bg-amber-50 hover:bg-amber-100' 
                          : 'text-gray-400 hover:text-amber-600 hover:bg-amber-50'
                      }`}
                      title={item.featured ? 'Remove from featured' : 'Mark as featured'}
                    >
                      <Star className="h-4 w-4" fill={item.featured ? 'currentColor' : 'none'} />
                    </button>
                    <button
                      onClick={() => openEditModal(item)}
                      className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(item._id)}
                      disabled={deleting === item._id}
                      className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                      title="Delete"
                    >
                      {deleting === item._id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">
                {editingItem ? 'Edit' : 'Add'} {activeCategory?.label}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input
                  type="text"
                  value={form.userName}
                  onChange={(e) => setForm({ ...form, userName: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500"
                  placeholder="User name"
                />
              </div>

              {activeTab === 'experiences' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Rating</label>
                    {renderStars(form.rating, true, (r) => setForm({ ...form, rating: r }))}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Experience *</label>
                    <textarea
                      value={form.content}
                      onChange={(e) => setForm({ ...form, content: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500"
                      rows={4}
                      placeholder="Share the experience..."
                    />
                  </div>
                </>
              )}

              {activeTab === 'questions' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Question *</label>
                    <textarea
                      value={form.question}
                      onChange={(e) => setForm({ ...form, question: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500"
                      rows={3}
                      placeholder="The question..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Answer</label>
                    <textarea
                      value={form.answer}
                      onChange={(e) => setForm({ ...form, answer: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500"
                      rows={4}
                      placeholder="Expert answer..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                    <select
                      value={form.category}
                      onChange={(e) => setForm({ ...form, category: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500"
                    >
                      <option value="general">General</option>
                      <option value="yoga">Yoga</option>
                      <option value="pranayama">Pranayama</option>
                      <option value="health">Health</option>
                      <option value="lifestyle">Lifestyle</option>
                    </select>
                  </div>
                </>
              )}

              {activeTab === 'tips' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tip/Trick *</label>
                    <textarea
                      value={form.content}
                      onChange={(e) => setForm({ ...form, content: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500"
                      rows={4}
                      placeholder="Share a helpful tip..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                    <select
                      value={form.category}
                      onChange={(e) => setForm({ ...form, category: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500"
                    >
                      <option value="general">General</option>
                      <option value="breathing">Breathing</option>
                      <option value="postures">Postures</option>
                      <option value="lifestyle">Lifestyle</option>
                      <option value="nutrition">Nutrition</option>
                    </select>
                  </div>
                </>
              )}

              {activeTab === 'transformations' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Transformation Story *</label>
                    <textarea
                      value={form.content}
                      onChange={(e) => setForm({ ...form, content: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500"
                      rows={4}
                      placeholder="Share the transformation journey..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Timeframe</label>
                    <input
                      type="text"
                      value={form.timeframe}
                      onChange={(e) => setForm({ ...form, timeframe: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500"
                      placeholder="e.g., 3 months, 1 year"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Before Description</label>
                      <input
                        type="text"
                        value={form.beforeDescription}
                        onChange={(e) => setForm({ ...form, beforeDescription: e.target.value })}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500"
                        placeholder="Before state"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">After Description</label>
                      <input
                        type="text"
                        value={form.afterDescription}
                        onChange={(e) => setForm({ ...form, afterDescription: e.target.value })}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500"
                        placeholder="After state"
                      />
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Community</label>
                <select
                  value={form.communityId}
                  onChange={(e) => setForm({ ...form, communityId: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500"
                >
                  <option value="global">Global Community</option>
                  <option value="swar-yoga">Swar Yoga</option>
                  <option value="pranayama">Pranayama</option>
                  <option value="meditation">Meditation</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="featured"
                  checked={form.featured}
                  onChange={(e) => setForm({ ...form, featured: e.target.checked })}
                  className="rounded text-green-600 focus:ring-green-500"
                />
                <label htmlFor="featured" className="text-sm font-medium text-gray-700">
                  ⭐ Mark as Featured
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-100">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2.5 text-gray-700 hover:bg-gray-100 rounded-xl font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl font-medium transition-all disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                {editingItem ? 'Save Changes' : 'Add ' + activeCategory?.label}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
