'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Question {
  _id: string;
  userName: string;
  question: string;
  answer?: string;
  category: string;
  featured: boolean;
  answeredAt?: string;
  createdAt: string;
}

const categories = [
  { id: 'all', name: 'All Questions', icon: '📋' },
  { id: 'general', name: 'General', icon: '💭' },
  { id: 'yoga', name: 'Yoga', icon: '🧘' },
  { id: 'pranayama', name: 'Pranayama', icon: '🌬️' },
  { id: 'health', name: 'Health', icon: '❤️' },
  { id: 'lifestyle', name: 'Lifestyle', icon: '🌿' },
];

export default function QuestionsPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  
  const [form, setForm] = useState({
    userName: '',
    question: '',
    category: 'general',
    userPhone: '',
    userEmail: '',
  });

  useEffect(() => {
    fetchQuestions();
  }, [selectedCategory, searchTerm]);

  async function fetchQuestions() {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedCategory !== 'all') params.set('category', selectedCategory);
      if (searchTerm) params.set('search', searchTerm);
      
      const res = await fetch(`/api/community/questions?${params}`);
      const data = await res.json();
      if (data.success) {
        setQuestions(data.questions || []);
      }
    } catch (error) {
      console.error('Failed to fetch questions:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.userName.trim() || !form.question.trim()) {
      setMessage({ type: 'error', text: 'Please fill in all required fields' });
      return;
    }

    setSubmitting(true);
    setMessage(null);

    try {
      const res = await fetch('/api/community/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      
      if (data.success) {
        setMessage({ type: 'success', text: data.message });
        setForm({ userName: '', question: '', category: 'general', userPhone: '', userEmail: '' });
        setShowForm(false);
      } else {
        setMessage({ type: 'error', text: data.error });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to submit question' });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Header */}
      <div className="bg-gradient-to-br from-blue-600 to-blue-700 text-white py-8 sm:py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <Link href="/community" className="text-blue-100 hover:text-white mb-4 inline-flex items-center gap-2 text-sm sm:text-base active:scale-95 transition-transform">
            ← Back to Community
          </Link>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mt-4">❓ Questions & Answers</h1>
          <p className="text-blue-100 mt-2 text-sm sm:text-base">Get your yoga and wellness questions answered by experts</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Search & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 mb-6">
          <div className="flex-1">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search questions..."
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base"
            />
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-blue-700 transition-all whitespace-nowrap active:scale-95 shadow-md"
          >
            {showForm ? '✕ Close' : '❓ Ask a Question'}
          </button>
        </div>

        {/* Categories - Horizontal scroll on mobile */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-6 -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap scrollbar-hide">
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCategory(c.id)}
              className={`shrink-0 px-4 py-2.5 rounded-xl text-sm font-medium transition-all active:scale-95 ${
                selectedCategory === c.id
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-white text-gray-600 hover:bg-blue-50 border border-gray-200'
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
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-8 border border-blue-100">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Ask Your Question</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Your Name *</label>
                  <input
                    type="text"
                    value={form.userName}
                    onChange={(e) => setForm({ ...form, userName: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter your name"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {categories.slice(1).map((c) => (
                      <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Your Question *</label>
                <textarea
                  value={form.question}
                  onChange={(e) => setForm({ ...form, question: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  placeholder="What would you like to know about yoga, pranayama, or wellness?"
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
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="you@email.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone (optional)</label>
                  <input
                    type="tel"
                    value={form.userPhone}
                    onChange={(e) => setForm({ ...form, userPhone: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                  className="px-6 py-2 bg-blue-600 text-white rounded-full font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  {submitting ? 'Submitting...' : 'Submit Question'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Questions List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin text-4xl">🌀</div>
            <p className="text-gray-500 mt-2">Loading questions...</p>
          </div>
        ) : questions.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
            <div className="text-5xl sm:text-6xl mb-4">🤔</div>
            <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">No questions yet</h3>
            <p className="text-gray-500 mb-4 text-sm sm:text-base">Be the first to ask a question!</p>
            <button
              onClick={() => setShowForm(true)}
              className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-medium hover:bg-blue-700 active:scale-95 transition-all"
            >
              Ask a Question
            </button>
          </div>
        ) : (
          <div className="space-y-3 sm:space-y-4">
            {questions.map((q) => (
              <div
                key={q._id}
                className={`bg-white rounded-xl sm:rounded-2xl border ${q.featured ? 'border-amber-300 ring-2 ring-amber-100' : 'border-gray-100'} overflow-hidden transition-shadow hover:shadow-md`}
              >
                <div
                  className="p-4 sm:p-5 cursor-pointer hover:bg-gray-50 transition-colors active:bg-gray-100"
                  onClick={() => setExpandedId(expandedId === q._id ? null : q._id)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap gap-2 mb-2">
                        {q.featured && (
                          <span className="bg-amber-100 text-amber-700 text-xs font-medium px-2 py-1 rounded-lg">
                            ⭐ Featured
                          </span>
                        )}
                        <span className="bg-blue-100 text-blue-700 text-xs font-medium px-2 py-1 rounded-lg">
                          {categories.find(c => c.id === q.category)?.icon} {q.category}
                        </span>
                      </div>
                      <h3 className="text-base sm:text-lg font-semibold text-gray-900 line-clamp-2">{q.question}</h3>
                      <p className="text-xs sm:text-sm text-gray-500 mt-1">Asked by {q.userName}</p>
                    </div>
                    <div className="text-xl sm:text-2xl text-gray-400 shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-gray-50">
                      {expandedId === q._id ? '−' : '+'}
                    </div>
                  </div>
                </div>
                
                {expandedId === q._id && q.answer && (
                  <div className="px-4 sm:px-5 pb-4 sm:pb-5 border-t border-gray-100 bg-gradient-to-b from-blue-50 to-white">
                    <div className="pt-4">
                      <div className="flex items-center gap-2 text-blue-700 font-medium mb-2 text-sm sm:text-base">
                        <span className="text-lg sm:text-xl">💡</span> Expert Answer
                      </div>
                      <p className="text-gray-700 leading-relaxed whitespace-pre-wrap text-sm sm:text-base">{q.answer}</p>
                      {q.answeredAt && (
                        <p className="text-xs sm:text-sm text-gray-500 mt-3">
                          Answered on {new Date(q.answeredAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
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
