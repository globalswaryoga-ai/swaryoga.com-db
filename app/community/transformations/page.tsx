'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';

interface Transformation {
  _id: string;
  userName: string;
  title: string;
  story: string;
  beforePhoto?: string;
  afterPhoto?: string;
  duration?: string;
  healthCondition?: string;
  yogaPractice?: string;
  communityId: string;
  featured: boolean;
  createdAt: string;
  // For posts converted to transformations
  isPost?: boolean;
  content?: string;
  images?: string[];
  likes?: string[];
  likesCount?: number;
}

const communities = [
  { id: 'global', name: 'All Communities', icon: '☰', color: '#3B82F6' },
  { id: 'swar-yoga-workshop', name: 'Swar Yoga Workshop', icon: '◎', color: '#8B5CF6' },
  { id: 'swar-yoga-health', name: 'Swar Yoga- Health', icon: '♥', color: '#EF4444' },
  { id: 'weight-loss', name: 'Weight Loss', icon: '⚖', color: '#F59E0B' },
  { id: 'amrut-aahar', name: 'Amrut aahar', icon: '❧', color: '#10B981' },
  { id: 'pre-pregnancy', name: 'Pre Pregnancy', icon: '✿', color: '#EC4899' },
  { id: 'married-life', name: 'Married Life', icon: '♡', color: '#F43F5E' },
  { id: 'yogasana', name: 'Yogasana', icon: '☯', color: '#6366F1' },
  { id: 'business-wealth', name: 'Business & Wealth', icon: '◆', color: '#0EA5E9' },
  { id: 'youth', name: 'Youth', icon: '★', color: '#FBBF24' },
  { id: 'children', name: 'Children', icon: '✦', color: '#A855F7' },
];

export default function TransformationsPage() {
  const [transformations, setTransformations] = useState<Transformation[]>([]);
  const [stats, setStats] = useState<{ totalCount: number; withPhotos: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCommunity, setSelectedCommunity] = useState('global');
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [selectedStory, setSelectedStory] = useState<Transformation | null>(null);
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});
  const [likingPost, setLikingPost] = useState<string | null>(null);
  
  const [form, setForm] = useState({
    userName: '',
    title: '',
    story: '',
    beforePhoto: '',
    afterPhoto: '',
    duration: '',
    healthCondition: '',
    yogaPractice: '',
    communityId: 'global',
    userPhone: '',
    userEmail: '',
  });

  useEffect(() => {
    fetchTransformations();
  }, [selectedCommunity]);

  async function fetchTransformations() {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedCommunity !== 'global') {
        params.set('communityId', selectedCommunity);
      }
      
      // Fetch both transformations collection AND posts with category='transformations'
      const [transRes, postsRes] = await Promise.all([
        fetch(`/api/community/transformations?${params}`),
        fetch(`/api/community/posts?category=transformations${selectedCommunity !== 'global' ? `&communityId=${selectedCommunity}` : ''}`)
      ]);
      
      const transData = await transRes.json();
      const postsData = await postsRes.json();
      
      // Convert posts to transformation format
      const postsAsTransformations: Transformation[] = (postsData.posts || []).map((post: any) => ({
        _id: post._id,
        userName: post.userName || post.userId || 'Community Member',
        title: post.content?.substring(0, 50) || 'Transformation Story',
        story: post.content,
        content: post.content,
        beforePhoto: post.images?.[0],
        afterPhoto: post.images?.[1],
        communityId: post.communityId || 'global',
        featured: false,
        createdAt: post.createdAt,
        isPost: true,
        images: post.images,
        likes: post.likes || [],
        likesCount: post.likes?.length || 0
      }));
      
      // Initialize like counts from posts
      const counts: Record<string, number> = {};
      postsAsTransformations.forEach(p => {
        counts[p._id] = p.likesCount || 0;
      });
      setLikeCounts(prev => ({ ...prev, ...counts }));
      
      // Merge and sort
      const allTransformations = [...(transData.transformations || []), ...postsAsTransformations]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      if (transData.success) {
        setTransformations(allTransformations);
        setStats(transData.stats);
      }
    } catch (error) {
      console.error('Failed to fetch transformations:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.userName.trim() || !form.title.trim() || !form.story.trim()) {
      setMessage({ type: 'error', text: 'Please fill in all required fields' });
      return;
    }

    setSubmitting(true);
    setMessage(null);

    try {
      const res = await fetch('/api/community/transformations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      
      if (data.success) {
        setMessage({ type: 'success', text: data.message });
        setForm({
          userName: '', title: '', story: '', beforePhoto: '', afterPhoto: '',
          duration: '', healthCondition: '', yogaPractice: '', communityId: 'global',
          userPhone: '', userEmail: '',
        });
        setShowForm(false);
      } else {
        setMessage({ type: 'error', text: data.error });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to submit transformation' });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLike(postId: string, isPost?: boolean) {
    if (!isPost) return;
    
    setLikingPost(postId);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setMessage({ type: 'error', text: 'Please join the community to like posts' });
        return;
      }
      
      const res = await fetch('/api/community/post/like', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ postId }),
      });
      
      const data = await res.json();
      if (data.success) {
        const isLiked = likedPosts.has(postId);
        setLikedPosts(prev => {
          const next = new Set(prev);
          if (isLiked) {
            next.delete(postId);
          } else {
            next.add(postId);
          }
          return next;
        });
        setLikeCounts(prev => ({
          ...prev,
          [postId]: data.data?.likesCount ?? (isLiked ? (prev[postId] || 1) - 1 : (prev[postId] || 0) + 1)
        }));
      }
    } catch (error) {
      console.error('Failed to like post:', error);
    } finally {
      setLikingPost(null);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-500 to-pink-500 text-white py-12">
        <div className="max-w-6xl mx-auto px-4">
          <Link href="/community" className="text-orange-100 hover:text-white mb-4 inline-flex items-center gap-2">
            ← Back to Community
          </Link>
          <h1 className="text-4xl font-bold mt-4">🦋 Transformations</h1>
          <p className="text-orange-100 mt-2">Real transformation stories from our yoga community</p>
          
          {stats && (
            <div className="flex flex-wrap gap-8 mt-6">
              <div className="text-center">
                <div className="text-3xl font-bold">{stats.totalCount || 0}</div>
                <div className="text-orange-200 text-sm">Total Stories</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold">{stats.withPhotos || 0}</div>
                <div className="text-orange-200 text-sm">With Photos</div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Actions Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div className="flex flex-wrap gap-2">
            {communities.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedCommunity(c.id)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  selectedCommunity === c.id
                    ? 'bg-orange-500 text-white'
                    : 'bg-white text-gray-600 hover:bg-orange-50 border border-gray-200'
                }`}
              >
                <span style={{ color: selectedCommunity === c.id ? 'white' : c.color }}>{c.icon}</span> {c.name}
              </button>
            ))}
          </div>
          
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-gradient-to-r from-orange-500 to-pink-500 text-white px-6 py-2 rounded-full font-medium hover:opacity-90 transition-opacity"
          >
            {showForm ? '✕ Close' : '🦋 Share Your Story'}
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
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-8 border border-orange-100">
            <h2 className="text-xl font-bold text-gray-900 mb-2">Share Your Transformation</h2>
            <p className="text-gray-500 text-sm mb-6">Inspire others by sharing how yoga transformed your life!</p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Your Name *</label>
                  <input
                    type="text"
                    value={form.userName}
                    onChange={(e) => setForm({ ...form, userName: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    placeholder="Enter your name"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    placeholder="E.g., From chronic pain to pain-free life"
                    required
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Your Transformation Story *</label>
                <textarea
                  value={form.story}
                  onChange={(e) => setForm({ ...form, story: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  rows={5}
                  placeholder="Share your journey - what was your situation before, how did yoga help, and where are you now..."
                  required
                />
              </div>
              
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Duration</label>
                  <input
                    type="text"
                    value={form.duration}
                    onChange={(e) => setForm({ ...form, duration: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    placeholder="E.g., 6 months"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Health Condition</label>
                  <input
                    type="text"
                    value={form.healthCondition}
                    onChange={(e) => setForm({ ...form, healthCondition: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    placeholder="E.g., Back pain, diabetes"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Yoga Practice</label>
                  <input
                    type="text"
                    value={form.yogaPractice}
                    onChange={(e) => setForm({ ...form, yogaPractice: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    placeholder="E.g., Swar Yoga, Pranayama"
                  />
                </div>
              </div>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Before Photo URL (optional)</label>
                  <input
                    type="url"
                    value={form.beforePhoto}
                    onChange={(e) => setForm({ ...form, beforePhoto: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">After Photo URL (optional)</label>
                  <input
                    type="url"
                    value={form.afterPhoto}
                    onChange={(e) => setForm({ ...form, afterPhoto: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    placeholder="https://..."
                  />
                </div>
              </div>
              
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Community</label>
                  <select
                    value={form.communityId}
                    onChange={(e) => setForm({ ...form, communityId: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  >
                    {communities.slice(1).map((c) => (
                      <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email (optional)</label>
                  <input
                    type="email"
                    value={form.userEmail}
                    onChange={(e) => setForm({ ...form, userEmail: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    placeholder="you@email.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone (optional)</label>
                  <input
                    type="tel"
                    value={form.userPhone}
                    onChange={(e) => setForm({ ...form, userPhone: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
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
                  className="px-6 py-2 bg-gradient-to-r from-orange-500 to-pink-500 text-white rounded-full font-medium hover:opacity-90 disabled:opacity-50"
                >
                  {submitting ? 'Submitting...' : 'Submit Story'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Transformations Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin text-4xl">🌀</div>
            <p className="text-gray-500 mt-2">Loading transformations...</p>
          </div>
        ) : transformations.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
            <div className="text-6xl mb-4">🦋</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No transformations yet</h3>
            <p className="text-gray-500 mb-4">Be the first to share your transformation story!</p>
            <button
              onClick={() => setShowForm(true)}
              className="bg-gradient-to-r from-orange-500 to-pink-500 text-white px-6 py-2 rounded-full font-medium hover:opacity-90"
            >
              Share Your Story
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {transformations.map((t) => (
              <div
                key={t._id}
                onClick={() => setSelectedStory(t)}
                className={`bg-white rounded-2xl overflow-hidden shadow-sm border ${t.featured ? 'border-amber-300 ring-2 ring-amber-100' : 'border-gray-100'} hover:shadow-md transition-shadow cursor-pointer`}
              >
                {/* Before/After Photos */}
                {(t.beforePhoto || t.afterPhoto) && (
                  <div className="grid grid-cols-2 h-40">
                    <div className="bg-gray-100 flex items-center justify-center relative">
                      {t.beforePhoto ? (
                        <Image src={t.beforePhoto} alt="Before" fill className="object-cover" />
                      ) : (
                        <span className="text-gray-400 text-sm">Before</span>
                      )}
                    </div>
                    <div className="bg-orange-100 flex items-center justify-center relative">
                      {t.afterPhoto ? (
                        <Image src={t.afterPhoto} alt="After" fill className="object-cover" />
                      ) : (
                        <span className="text-gray-400 text-sm">After</span>
                      )}
                    </div>
                  </div>
                )}
                
                <div className="p-5">
                  {t.featured && (
                    <div className="bg-amber-100 text-amber-700 text-xs font-medium px-3 py-1 rounded-full inline-block mb-3">
                      ⭐ Featured Story
                    </div>
                  )}
                  
                  <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">{t.title}</h3>
                  <p className="text-gray-600 text-sm line-clamp-3 mb-3">{t.story}</p>
                  
                  <div className="flex flex-wrap gap-2 mb-3">
                    {t.duration && (
                      <span className="bg-blue-50 text-blue-700 text-xs px-2 py-1 rounded-full">
                        ⏱️ {t.duration}
                      </span>
                    )}
                    {t.healthCondition && (
                      <span className="bg-red-50 text-red-700 text-xs px-2 py-1 rounded-full">
                        ❤️ {t.healthCondition}
                      </span>
                    )}
                    {t.yogaPractice && (
                      <span className="bg-green-50 text-green-700 text-xs px-2 py-1 rounded-full">
                        🧘 {t.yogaPractice}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between text-sm text-gray-500 pt-3 border-t border-gray-100">
                    <span className="font-medium text-gray-700">{t.userName}</span>
                    <div className="flex items-center gap-3">
                      {t.isPost && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleLike(t._id, t.isPost); }}
                          disabled={likingPost === t._id}
                          className={`flex items-center gap-1 px-2 py-1 rounded-lg transition-all ${
                            likedPosts.has(t._id) 
                              ? 'text-red-500 bg-red-50' 
                              : 'text-gray-400 hover:text-red-400 hover:bg-red-50'
                          } ${likingPost === t._id ? 'opacity-50' : ''}`}
                        >
                          <span className="text-base">{likedPosts.has(t._id) ? '❤️' : '🤍'}</span>
                          <span className="font-medium">{likeCounts[t._id] || 0}</span>
                        </button>
                      )}
                      <span>{new Date(t.createdAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Story Detail Modal */}
      {selectedStory && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedStory(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Before/After in modal */}
            {(selectedStory.beforePhoto || selectedStory.afterPhoto) && (
              <div className="grid grid-cols-2 h-64">
                <div className="bg-gray-100 flex items-center justify-center relative">
                  {selectedStory.beforePhoto ? (
                    <Image src={selectedStory.beforePhoto} alt="Before" fill className="object-cover" />
                  ) : (
                    <span className="text-gray-400">Before Photo</span>
                  )}
                  <div className="absolute bottom-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded">Before</div>
                </div>
                <div className="bg-orange-100 flex items-center justify-center relative">
                  {selectedStory.afterPhoto ? (
                    <Image src={selectedStory.afterPhoto} alt="After" fill className="object-cover" />
                  ) : (
                    <span className="text-gray-400">After Photo</span>
                  )}
                  <div className="absolute bottom-2 left-2 bg-orange-500 text-white text-xs px-2 py-1 rounded">After</div>
                </div>
              </div>
            )}
            
            <div className="p-6">
              <button
                onClick={() => setSelectedStory(null)}
                className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white shadow flex items-center justify-center text-gray-500 hover:bg-gray-100"
              >
                ✕
              </button>
              
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{selectedStory.title}</h2>
              
              <div className="flex flex-wrap gap-2 mb-4">
                {selectedStory.duration && (
                  <span className="bg-blue-50 text-blue-700 text-sm px-3 py-1 rounded-full">
                    ⏱️ {selectedStory.duration}
                  </span>
                )}
                {selectedStory.healthCondition && (
                  <span className="bg-red-50 text-red-700 text-sm px-3 py-1 rounded-full">
                    ❤️ {selectedStory.healthCondition}
                  </span>
                )}
                {selectedStory.yogaPractice && (
                  <span className="bg-green-50 text-green-700 text-sm px-3 py-1 rounded-full">
                    🧘 {selectedStory.yogaPractice}
                  </span>
                )}
              </div>
              
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{selectedStory.story}</p>
              
              <div className="mt-6 pt-4 border-t border-gray-200 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-gray-900">{selectedStory.userName}</div>
                  <div className="text-sm text-gray-500">
                    {communities.find(c => c.id === selectedStory.communityId)?.name}
                  </div>
                </div>
                <div className="text-sm text-gray-500">
                  {new Date(selectedStory.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
