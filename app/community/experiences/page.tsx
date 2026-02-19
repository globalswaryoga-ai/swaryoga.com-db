'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Experience {
  _id: string;
  userName: string;
  content: string;
  rating: number;
  photoUrl?: string;
  communityId: string;
  featured: boolean;
  createdAt: string;
  // For posts converted to experiences
  isPost?: boolean;
  images?: string[];
  userId?: string;
}

interface Stats {
  avgRating: number;
  totalCount: number;
  fiveStars: number;
}

const communities = [
  { id: 'global', name: 'All Communities' },
  { id: 'swar-yoga', name: 'Swar Yoga' },
  { id: 'pranayama', name: 'Pranayama' },
  { id: 'meditation', name: 'Meditation' },
  { id: 'youth', name: 'Youth Program' },
];

export default function ExperiencesPage() {
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCommunity, setSelectedCommunity] = useState('global');
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  const [form, setForm] = useState({
    userName: '',
    content: '',
    rating: 5,
    userPhone: '',
    userEmail: '',
    photoUrl: '',
    communityId: 'global',
  });

  useEffect(() => {
    fetchExperiences();
  }, [selectedCommunity]);

  async function fetchExperiences() {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedCommunity !== 'global') {
        params.set('communityId', selectedCommunity);
      }
      
      // Fetch both experiences collection AND posts with category='experiences'
      const [expRes, postsRes] = await Promise.all([
        fetch(`/api/community/experiences?${params}`),
        fetch(`/api/community/posts?category=experiences${selectedCommunity !== 'global' ? `&communityId=${selectedCommunity}` : ''}`)
      ]);
      
      const expData = await expRes.json();
      const postsData = await postsRes.json();
      
      // Convert posts to experience format
      const postsAsExperiences: Experience[] = (postsData.posts || []).map((post: any) => ({
        _id: post._id,
        userName: post.userName || post.userId || 'Community Member',
        content: post.content,
        rating: 5, // Default rating for posts
        photoUrl: post.images?.[0],
        images: post.images,
        communityId: post.communityId || 'global',
        featured: false,
        createdAt: post.createdAt,
        isPost: true,
        userId: post.userId
      }));
      
      // Merge and sort by date
      const allExperiences = [...(expData.experiences || []), ...postsAsExperiences]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      if (expData.success) {
        setExperiences(allExperiences);
        setStats(expData.stats);
      }
    } catch (error) {
      console.error('Failed to fetch experiences:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.userName.trim() || !form.content.trim()) {
      setMessage({ type: 'error', text: 'Please fill in all required fields' });
      return;
    }

    setSubmitting(true);
    setMessage(null);

    try {
      const res = await fetch('/api/community/experiences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      
      if (data.success) {
        setMessage({ type: 'success', text: data.message });
        setForm({ userName: '', content: '', rating: 5, userPhone: '', userEmail: '', photoUrl: '', communityId: 'global' });
        setShowForm(false);
      } else {
        setMessage({ type: 'error', text: data.error });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to submit experience' });
    } finally {
      setSubmitting(false);
    }
  }

  const renderStars = (rating: number, interactive = false, onChange?: (r: number) => void) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type={interactive ? 'button' : undefined}
            onClick={interactive && onChange ? () => onChange(star) : undefined}
            className={`text-2xl ${interactive ? 'cursor-pointer hover:scale-110 transition-transform' : ''}`}
            disabled={!interactive}
          >
            {star <= rating ? '⭐' : '☆'}
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white">
      {/* Header */}
      <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 text-white py-8 sm:py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <Link href="/community" className="text-emerald-100 hover:text-white mb-4 inline-flex items-center gap-2 text-sm sm:text-base active:scale-95 transition-transform">
            ← Back to Community
          </Link>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mt-4">⭐ Community Experiences</h1>
          <p className="text-emerald-100 mt-2 text-sm sm:text-base">Real stories from our yoga community members</p>
          
          {stats && (
            <div className="flex flex-wrap gap-4 sm:gap-8 mt-6">
              <div className="text-center bg-white/10 rounded-xl px-4 py-3 backdrop-blur-sm">
                <div className="text-2xl sm:text-3xl font-bold">{stats.avgRating?.toFixed(1) || '0.0'}</div>
                <div className="text-emerald-200 text-xs sm:text-sm">Average Rating</div>
              </div>
              <div className="text-center bg-white/10 rounded-xl px-4 py-3 backdrop-blur-sm">
                <div className="text-2xl sm:text-3xl font-bold">{stats.totalCount || 0}</div>
                <div className="text-emerald-200 text-xs sm:text-sm">Total Reviews</div>
              </div>
              <div className="text-center bg-white/10 rounded-xl px-4 py-3 backdrop-blur-sm">
                <div className="text-2xl sm:text-3xl font-bold">{stats.fiveStars || 0}</div>
                <div className="text-emerald-200 text-xs sm:text-sm">5-Star Reviews</div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
          <div className="flex flex-nowrap gap-2 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap scrollbar-hide">
            {communities.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedCommunity(c.id)}
                className={`shrink-0 px-4 py-2.5 rounded-xl text-sm font-medium transition-all active:scale-95 ${
                  selectedCommunity === c.id
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'bg-white text-gray-600 hover:bg-emerald-50 border border-gray-200'
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
          
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-emerald-700 transition-all active:scale-95 shadow-md whitespace-nowrap"
          >
            {showForm ? '✕ Close' : '✍️ Share Experience'}
          </button>
        </div>

        {/* Message */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg ${message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
            {message.text}
          </div>
        )}

        {/* Submit Form */}
        {showForm && (
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-8 border border-emerald-100">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Share Your Yoga Experience</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Your Name *</label>
                  <input
                    type="text"
                    value={form.userName}
                    onChange={(e) => setForm({ ...form, userName: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    placeholder="Enter your name"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Community</label>
                  <select
                    value={form.communityId}
                    onChange={(e) => setForm({ ...form, communityId: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  >
                    {communities.slice(1).map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Your Rating *</label>
                {renderStars(form.rating, true, (r) => setForm({ ...form, rating: r }))}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Your Experience *</label>
                <textarea
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  rows={4}
                  placeholder="Share how yoga has helped you..."
                  required
                />
              </div>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone (Optional)</label>
                  <input
                    type="tel"
                    value={form.userPhone}
                    onChange={(e) => setForm({ ...form, userPhone: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    placeholder="+91 98765 43210"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email (Optional)</label>
                  <input
                    type="email"
                    value={form.userEmail}
                    onChange={(e) => setForm({ ...form, userEmail: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    placeholder="you@email.com"
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
                  className="px-6 py-2 bg-emerald-600 text-white rounded-full font-medium hover:bg-emerald-700 disabled:opacity-50"
                >
                  {submitting ? 'Submitting...' : 'Submit Experience'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Experiences Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin text-4xl">🌀</div>
            <p className="text-gray-500 mt-2">Loading experiences...</p>
          </div>
        ) : experiences.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
            <div className="text-5xl sm:text-6xl mb-4">🌟</div>
            <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">No experiences yet</h3>
            <p className="text-gray-500 mb-4 text-sm sm:text-base">Be the first to share your yoga journey!</p>
            <button
              onClick={() => setShowForm(true)}
              className="bg-emerald-600 text-white px-6 py-2.5 rounded-xl font-medium hover:bg-emerald-700 active:scale-95 transition-all"
            >
              Share Your Experience
            </button>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {experiences.map((exp) => (
              <div
                key={exp._id}
                className={`bg-white rounded-2xl p-5 sm:p-6 shadow-sm border ${exp.featured ? 'border-amber-300 ring-2 ring-amber-100' : 'border-gray-100'} hover:shadow-md transition-all active:scale-[0.99]`}
              >
                {exp.featured && (
                  <div className="bg-amber-100 text-amber-700 text-xs font-medium px-3 py-1 rounded-full inline-block mb-3">
                    ⭐ Featured
                  </div>
                )}
                
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-emerald-100 rounded-full flex items-center justify-center text-lg sm:text-xl font-semibold text-emerald-600">
                    {exp.userName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900 text-sm sm:text-base">{exp.userName}</div>
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <span key={star} className="text-xs sm:text-sm">
                          {star <= exp.rating ? '⭐' : '☆'}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                
                <p className="text-gray-700 leading-relaxed text-sm sm:text-base line-clamp-4">{exp.content}</p>
                
                <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between text-xs sm:text-sm text-gray-500">
                  <span className="bg-emerald-50 px-2 py-1 rounded-lg">{communities.find(c => c.id === exp.communityId)?.name || 'Community'}</span>
                  <span>{new Date(exp.createdAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
