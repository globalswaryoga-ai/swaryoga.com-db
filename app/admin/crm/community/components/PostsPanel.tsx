'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { Edit, Trash2, MessageCircle, Loader, Globe, Search } from 'lucide-react';

interface Post {
  _id: string;
  content?: string;
  userId?: string;
  category?: string;
  status?: 'published' | 'draft';
  isPublic?: boolean;
  images?: any[];
  videos?: any[];
  likes?: any[];
  comments?: any[];
  createdAt: string;
}

interface PostsPanelProps {
  posts: Post[];
  loading: boolean;
  activeTab: string;
  onTogglePublic: (postId: string) => Promise<void>;
  onOpenComments: (post: Post) => void;
  onOpenEdit: (post: Post) => void;
  onDelete: (postId: string) => Promise<void>;
  deletingPostId: string | null;
  totalPosts: number;
  postsPage: number;
  postsLimit: number;
  onFetchPosts: (page: number) => Promise<void>;
}

export const PostsPanel: React.FC<PostsPanelProps> = ({
  posts,
  loading,
  activeTab,
  onTogglePublic,
  onOpenComments,
  onOpenEdit,
  onDelete,
  deletingPostId,
  totalPosts,
  postsPage,
  postsLimit,
  onFetchPosts,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'experiences' | 'tips' | 'transformations' | 'questions'>('all');

  // Memoize filtered posts
  const filteredPosts = useMemo(() => {
    let filtered = posts;

    // Filter by search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(post =>
        post.content?.toLowerCase().includes(query) ||
        post.userId?.toLowerCase().includes(query)
      );
    }

    // Filter by category
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(post => {
        const postCategory = post.category?.toLowerCase() || 'general';
        return postCategory.includes(categoryFilter) ||
               (categoryFilter === 'tips' && postCategory.includes('tip')) ||
               (categoryFilter === 'experiences' && postCategory.includes('experience')) ||
               (categoryFilter === 'transformations' && postCategory.includes('transformation')) ||
               (categoryFilter === 'questions' && postCategory.includes('question'));
      });
    }

    return filtered;
  }, [posts, searchQuery, categoryFilter]);

  // Memoize handlers
  const handleTogglePublic = useCallback((postId: string) => onTogglePublic(postId), [onTogglePublic]);
  const handleOpenComments = useCallback((post: Post) => onOpenComments(post), [onOpenComments]);
  const handleOpenEdit = useCallback((post: Post) => onOpenEdit(post), [onOpenEdit]);
  const handleDelete = useCallback((postId: string) => onDelete(postId), [onDelete]);
  const handleFetchPosts = useCallback((page: number) => onFetchPosts(page), [onFetchPosts]);

  if (activeTab !== 'posts') return null;

  return (
    <div className="flex-1 overflow-auto bg-slate-50/80 p-6">
      {/* Posts Header with Search and Category Tabs */}
      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-6 mb-6">
        {/* Search Bar */}
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="Search posts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 h-12 bg-slate-50 text-slate-900 rounded-xl border border-slate-200 font-medium text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 transition-all"
          />
        </div>

        {/* Category Tabs */}
        <div className="flex flex-wrap gap-2">
          {[
            { key: 'all', label: 'All Posts', icon: '📋' },
            { key: 'experiences', label: 'Experiences', icon: '✨' },
            { key: 'tips', label: 'Tips & Tricks', icon: '💡' },
            { key: 'transformations', label: 'Transformations', icon: '🦋' },
            { key: 'questions', label: 'Questions', icon: '❓' },
          ].map((cat) => (
            <button
              key={cat.key}
              onClick={() => setCategoryFilter(cat.key as any)}
              className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-all flex items-center gap-2 ${
                categoryFilter === cat.key
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span>{cat.icon}</span>
              <span>{cat.label}</span>
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center h-80 space-y-4">
          <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
        </div>
      ) : filteredPosts.length === 0 ? (
        <div className="bg-white rounded-[2.5rem] border border-slate-200/60 h-[400px] flex flex-col items-center justify-center text-center p-20 shadow-sm">
          <MessageCircle size={48} className="text-slate-200 mb-6" />
          <h3 className="text-xl font-bold text-slate-900 mb-2">No Posts Found</h3>
          <p className="text-slate-500 text-sm">
            {searchQuery || categoryFilter !== 'all'
              ? 'Try adjusting your search or category filter.'
              : 'No posts found in this community.'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-[2rem] shadow-xl border border-slate-200/60 overflow-hidden">
          <table className="w-full">
            <thead className="bg-[#fcfdfe] border-b border-slate-100 text-left">
              <tr className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                <th className="pl-10 px-4 py-3">Content</th>
                <th className="px-4 py-3">Author</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Interactions</th>
                <th className="pr-10 px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredPosts.map((post) => (
                <tr key={post._id} className="hover:bg-indigo-50/[0.15] group transition-all">
                  <td className="pl-10 px-4 py-3">
                    <div className="flex flex-col gap-1">
                      <p className="text-sm font-semibold text-slate-900 truncate max-w-[300px]">
                        {post.content?.substring(0, 100)}
                        {(post.content?.length || 0) > 100 ? '...' : ''}
                      </p>
                      {post.images?.length ? (
                        <span className="text-[8px] text-slate-400">📷 {post.images.length} image(s)</span>
                      ) : null}
                      {post.videos?.length ? (
                        <span className="text-[8px] text-slate-400">🎥 {post.videos.length} video(s)</span>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm font-semibold text-slate-700">{post.userId}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 rounded-full text-[9px] font-bold uppercase bg-indigo-50 text-indigo-600">
                      {post.category || 'General'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      <div
                        className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase inline-block w-fit ${
                          post.status === 'published'
                            ? 'bg-emerald-50 text-emerald-700'
                            : post.status === 'draft'
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-indigo-50 text-indigo-700'
                        }`}
                      >
                        {post.status || 'published'}
                      </div>
                      {post.isPublic && (
                        <span className="px-2 py-0.5 rounded-full text-[8px] font-bold uppercase bg-green-100 text-green-700 inline-block w-fit">
                          🌐 Public
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-4">
                      <div className="text-center">
                        <p className="text-xs font-bold text-slate-800">
                          👍 {Array.isArray(post.likes) ? post.likes.length : post.likes || 0}
                        </p>
                        <p className="text-[8px] text-slate-400">Likes</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs font-bold text-slate-800">
                          💬 {Array.isArray(post.comments) ? post.comments.length : post.comments || 0}
                        </p>
                        <p className="text-[8px] text-slate-400">Comments</p>
                      </div>
                    </div>
                  </td>
                  <td className="pr-10 px-4 py-3 text-right opacity-0 group-hover:opacity-100 transition-all">
                    <div className="flex justify-end gap-1.5">
                      <button
                        onClick={() => handleTogglePublic(post._id)}
                        className={`p-2 rounded-lg transition-all border ${
                          post.isPublic
                            ? 'bg-green-500 text-white border-green-500 hover:bg-green-600'
                            : 'text-slate-400 border-slate-200 hover:bg-green-100 hover:text-green-600 hover:border-green-200'
                        }`}
                        title={post.isPublic ? 'Make Private' : 'Make Public'}
                      >
                        <Globe size={16} />
                      </button>
                      <button
                        onClick={() => handleOpenComments(post)}
                        className="p-2 hover:bg-emerald-600 hover:text-white rounded-lg transition-all text-emerald-500 border border-emerald-100"
                        title={`Manage Comments (${Array.isArray(post.comments) ? post.comments.length : 0})`}
                      >
                        <MessageCircle size={16} />
                      </button>
                      <button
                        onClick={() => handleOpenEdit(post)}
                        className="p-2 hover:bg-indigo-600 hover:text-white rounded-lg transition-all text-indigo-500 border border-indigo-100"
                        title="Edit Post"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(post._id)}
                        disabled={deletingPostId === post._id}
                        className="p-2 hover:bg-red-600 hover:text-white rounded-lg transition-all text-red-500 border border-red-100 disabled:opacity-50"
                        title="Delete Post"
                      >
                        {deletingPostId === post._id ? (
                          <Loader size={16} className="animate-spin" />
                        ) : (
                          <Trash2 size={16} />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          {totalPosts > postsLimit && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50">
              <p className="text-sm text-slate-600">
                Showing {(postsPage - 1) * postsLimit + 1} to {Math.min(postsPage * postsLimit, totalPosts)} of{' '}
                {totalPosts} posts
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => handleFetchPosts(postsPage - 1)}
                  disabled={postsPage === 1}
                  className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold hover:bg-slate-50 disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => handleFetchPosts(postsPage + 1)}
                  disabled={postsPage >= Math.ceil(totalPosts / postsLimit)}
                  className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold hover:bg-slate-50 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
