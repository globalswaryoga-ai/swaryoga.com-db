'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Tip {
  _id: string;
  userName: string;
  issue: string;
  tip?: string;
  category: string;
  featured: boolean;
  answeredAt?: string;
  createdAt: string;
  // For posts converted to tips
  isPost?: boolean;
  content?: string;
  images?: string[];
}

const categories = [
  { id: 'all', name: 'All Tips', icon: '📋' },
  { id: 'health', name: 'Health', icon: '❤️' },
  { id: 'yoga', name: 'Yoga', icon: '🧘' },
  { id: 'pranayama', name: 'Pranayama', icon: '🌬️' },
  { id: 'lifestyle', name: 'Lifestyle', icon: '🌿' },
  { id: 'nutrition', name: 'Nutrition', icon: '🥗' },
];

export default function TipsPage() {
  const [tips, setTips] = useState<Tip[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  
  const [form, setForm] = useState({
    userName: '',
    issue: '',
    category: 'health',
    userPhone: '',
    userEmail: '',
  });

  useEffect(() => {
    fetchTips();
  }, [selectedCategory, searchTerm]);

  async function fetchTips() {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedCategory !== 'all') params.set('category', selectedCategory);
      if (searchTerm) params.set('search', searchTerm);
      
      // Fetch both tips collection AND posts with category='tips'
      const [tipsRes, postsRes] = await Promise.all([
        fetch(`/api/community/tips?${params}`),
        fetch(`/api/community/posts?category=tips`)
      ]);
      
      const tipsData = await tipsRes.json();
      const postsData = await postsRes.json();
      
      // Convert posts to tip format
      const postsAsTips: Tip[] = (postsData.posts || []).map((post: any) => ({
        _id: post._id,
        userName: post.userName || post.userId || 'Swar Yoga',
        issue: post.content?.substring(0, 100) + '...',
        tip: post.content,
        content: post.content,
        category: 'general',
        featured: false,
        createdAt: post.createdAt,
        isPost: true,
        images: post.images
      }));
      
      // Merge and sort
      const allTips = [...(tipsData.tips || []), ...postsAsTips]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      if (tipsData.success) {
        setTips(allTips);
      }
    } catch (error) {
      console.error('Failed to fetch tips:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.userName.trim() || !form.issue.trim()) {
      setMessage({ type: 'error', text: 'Please fill in all required fields' });
      return;
    }

    setSubmitting(true);
    setMessage(null);

    try {
      const res = await fetch('/api/community/tips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      
      if (data.success) {
        setMessage({ type: 'success', text: data.message });
        setForm({ userName: '', issue: '', category: 'health', userPhone: '', userEmail: '' });
        setShowForm(false);
      } else {
        setMessage({ type: 'error', text: data.error });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to submit' });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white">
      {/* Header */}
      <div className="bg-purple-600 text-white py-12">
        <div className="max-w-4xl mx-auto px-4">
          <Link href="/community" className="text-purple-100 hover:text-white mb-4 inline-flex items-center gap-2">
            ← Back to Community
          </Link>
          <h1 className="text-4xl font-bold mt-4">💡 Tips & Tricks</h1>
          <p className="text-purple-100 mt-2">Get expert tips for your health and wellness issues</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Search & Actions */}
        <div className="flex flex-wrap items-center gap-4 mb-6">
          <div className="flex-1 min-w-64">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search tips..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            />
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-purple-600 text-white px-6 py-2 rounded-full font-medium hover:bg-purple-700 transition-colors whitespace-nowrap"
          >
            {showForm ? '✕ Close' : '🙋 Share Your Issue'}
          </button>
        </div>

        {/* Categories */}
        <div className="flex flex-wrap gap-2 mb-6">
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCategory(c.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                selectedCategory === c.id
                  ? 'bg-purple-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-purple-50 border border-gray-200'
              }`}
            >
              {c.icon} {c.name}
            </button>
          ))}
        </div>

        {/* Message */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg ${message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
            {message.text}
          </div>
        )}

        {/* Submit Form */}
        {showForm && (
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-8 border border-purple-100">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Share Your Issue</h2>
            <p className="text-gray-500 text-sm mb-4">Describe your health, yoga, or lifestyle issue and our experts will provide helpful tips!</p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Your Name *</label>
                  <input
                    type="text"
                    value={form.userName}
                    onChange={(e) => setForm({ ...form, userName: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    placeholder="Enter your name"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  >
                    {categories.slice(1).map((c) => (
                      <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Describe Your Issue *</label>
                <textarea
                  value={form.issue}
                  onChange={(e) => setForm({ ...form, issue: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  rows={4}
                  placeholder="E.g., I have lower back pain, what yoga poses can help? Or I feel stressed at work..."
                  required
                />
              </div>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email (for notification)</label>
                  <input
                    type="email"
                    value={form.userEmail}
                    onChange={(e) => setForm({ ...form, userEmail: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    placeholder="you@email.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone (optional)</label>
                  <input
                    type="tel"
                    value={form.userPhone}
                    onChange={(e) => setForm({ ...form, userPhone: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    placeholder="+91 98765 43210"
                  />
                </div>
              </div>
              
              <div className="flex justify-end gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-6 py-2 border border-gray-300 rounded-full text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2 bg-purple-600 text-white rounded-full font-medium hover:bg-purple-700 disabled:opacity-50"
                >
                  {submitting ? 'Submitting...' : 'Submit Issue'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Tips List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin text-4xl">🌀</div>
            <p className="text-gray-500 mt-2">Loading tips...</p>
          </div>
        ) : tips.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
            <div className="text-6xl mb-4">💡</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No tips yet</h3>
            <p className="text-gray-500 mb-4">Share your issue and get expert tips!</p>
            <button
              onClick={() => setShowForm(true)}
              className="bg-purple-600 text-white px-6 py-2 rounded-full font-medium hover:bg-purple-700"
            >
              Share Your Issue
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {tips.map((t) => (
              <div
                key={t._id}
                className={`bg-white rounded-xl border ${t.featured ? 'border-amber-300 ring-2 ring-amber-100' : 'border-gray-100'} overflow-hidden`}
              >
                <div
                  className="p-5 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => setExpandedId(expandedId === t._id ? null : t._id)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      {t.featured && (
                        <span className="bg-amber-100 text-amber-700 text-xs font-medium px-2 py-1 rounded-full mr-2">
                          ⭐ Featured
                        </span>
                      )}
                      <span className="bg-purple-100 text-purple-700 text-xs font-medium px-2 py-1 rounded-full">
                        {categories.find(c => c.id === t.category)?.icon} {t.category}
                      </span>
                      <h3 className="text-lg font-semibold text-gray-900 mt-2">🙋 Issue: {t.issue}</h3>
                      <p className="text-sm text-gray-500 mt-1">Shared by {t.userName}</p>
                    </div>
                    <div className="text-2xl text-gray-400">
                      {expandedId === t._id ? '−' : '+'}
                    </div>
                  </div>
                </div>
                
                {expandedId === t._id && t.tip && (
                  <div className="px-5 pb-5 border-t border-gray-100 bg-purple-50">
                    <div className="pt-4">
                      <div className="flex items-center gap-2 text-purple-700 font-medium mb-2">
                        <span className="text-xl">💡</span> Expert Tip
                      </div>
                      <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{t.tip}</p>
                      {t.answeredAt && (
                        <p className="text-sm text-gray-500 mt-3">
                          Tip provided on {new Date(t.answeredAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
