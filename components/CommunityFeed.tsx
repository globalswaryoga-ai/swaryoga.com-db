'use client';

import React, { useState } from 'react';

interface Post {
  id: string;
  author: string;
  avatar: string;
  timestamp: string;
  content: string;
  image?: string;
  likes: number;
  comments: number;
  userLiked: boolean;
  type: 'announcement' | 'post' | 'event';
}

interface CommunityFeedProps {
  posts?: Post[];
  onLike?: (postId: string) => void;
  onComment?: (postId: string, comment: string) => void;
  onShare?: (postId: string) => void;
}

export default function CommunityFeed({
  posts = [
    {
      id: '1',
      author: 'Admin',
      avatar: '👤',
      timestamp: '2 hours ago',
      content: '🎉 Exciting news! Join us for the New Year Yoga Challenge. 30 days, all levels welcome. Register now to get 30% discount!',
      likes: 42,
      comments: 8,
      userLiked: true,
      type: 'announcement',
    },
    {
      id: '2',
      author: 'Priya Singh',
      avatar: '👩',
      timestamp: '4 hours ago',
      content: 'Just completed my first prenatal yoga session! Feeling so energized and calm. Thank you for the amazing guidance! 🧘‍♀️',
      image: 'https://via.placeholder.com/400x300?text=Yoga+Session',
      likes: 28,
      comments: 5,
      userLiked: false,
      type: 'post',
    },
    {
      id: '3',
      author: 'Yoga Team',
      avatar: '🏢',
      timestamp: '1 day ago',
      content: '📅 Remember: Power Yoga Class every Monday & Thursday at 6 PM. All materials provided. Bring your water bottle!',
      likes: 15,
      comments: 3,
      userLiked: false,
      type: 'event',
    },
    {
      id: '4',
      author: 'Rajesh Kumar',
      avatar: '👨',
      timestamp: '1 day ago',
      content: 'The meditation sessions have transformed my sleep quality. Never thought yoga could help so much with stress. Highly recommended!',
      likes: 35,
      comments: 7,
      userLiked: true,
      type: 'post',
    },
  ],
  onLike,
  onComment,
  onShare,
}: CommunityFeedProps) {
  const [expandedPostId, setExpandedPostId] = useState<string | null>(null);
  const [commentInput, setCommentInput] = useState('');
  const [activeCommentId, setActiveCommentId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'announcement' | 'post' | 'event'>('all');

  const typeColors = {
    announcement: 'bg-blue-50 border-l-4 border-blue-500',
    post: 'bg-white border-l-4 border-yoga-500',
    event: 'bg-purple-50 border-l-4 border-purple-500',
  };

  const typeLabels = {
    announcement: '📢 Announcement',
    post: '💬 Post',
    event: '📅 Event',
  };

  function handleLike(postId: string) {
    onLike?.(postId);
  }

  function handleComment(postId: string) {
    if (!commentInput.trim()) return;
    onComment?.(postId, commentInput);
    setCommentInput('');
    setActiveCommentId(null);
  }

  function handleShare(postId: string) {
    onShare?.(postId);
    alert(`Post shared! (PostID: ${postId})`);
  }

  const filteredPosts = posts.filter((post) => {
    const matchesType = filterType === 'all' || post.type === filterType;
    const matchesSearch = 
      post.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.author.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-1">Community Feed</h2>
        <p className="text-sm text-gray-600">Connect with other community members and stay updated</p>
      </div>

      {/* Search & Filter */}
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search posts..."
          className="flex-1 px-3 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-yoga-500 focus:border-transparent"
        />

        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value as any)}
          className="px-3 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-yoga-500 focus:border-transparent"
        >
          <option value="all">All Posts</option>
          <option value="announcement">Announcements</option>
          <option value="post">Community Posts</option>
          <option value="event">Events</option>
        </select>
      </div>

      {/* Posts */}
      <div className="space-y-4">
        {filteredPosts.length === 0 ? (
          <div className="text-center p-8 text-gray-500">
            <p className="text-lg">No posts found</p>
            <p className="text-sm">Try adjusting your search or filter criteria</p>
          </div>
        ) : (
          filteredPosts.map((post) => (
            <div key={post.id} className={`p-4 rounded-lg shadow-sm ${typeColors[post.type]}`}>
              {/* Post Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3 flex-1">
                  <div className="text-3xl">{post.avatar}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900">{post.author}</p>
                    <p className="text-xs text-gray-500">{post.timestamp}</p>
                  </div>
                </div>
                <span className="text-xs font-semibold px-2 py-1 bg-white rounded-full text-gray-600">
                  {typeLabels[post.type]}
                </span>
              </div>

              {/* Post Content */}
              <p className="text-sm text-gray-800 mb-3 leading-relaxed">{post.content}</p>

              {/* Post Image */}
              {post.image && (
                <div className="mb-3 rounded-lg overflow-hidden bg-gray-200">
                  <img src={post.image} alt="Post" className="w-full h-auto max-h-64 object-cover" />
                </div>
              )}

              {/* Engagement Stats */}
              <div className="flex gap-4 text-xs text-gray-600 mb-3 pb-3 border-b border-gray-200">
                <button className="hover:text-yoga-600 flex items-center gap-1">
                  {post.userLiked ? '❤️' : '🤍'} {post.likes} Likes
                </button>
                <button className="hover:text-yoga-600 flex items-center gap-1">
                  💬 {post.comments} Comments
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 mb-3">
                <button
                  onClick={() => handleLike(post.id)}
                  className={`flex-1 px-3 py-2 rounded-lg font-semibold text-sm transition-colors ${
                    post.userLiked
                      ? 'bg-red-100 text-red-700 hover:bg-red-200'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {post.userLiked ? '❤️' : '🤍'} Like
                </button>

                <button
                  onClick={() => setActiveCommentId(activeCommentId === post.id ? null : post.id)}
                  className="flex-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-semibold text-sm transition-colors"
                >
                  💬 Comment
                </button>

                <button
                  onClick={() => handleShare(post.id)}
                  className="flex-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-semibold text-sm transition-colors"
                >
                  📤 Share
                </button>
              </div>

              {/* Comment Input */}
              {activeCommentId === post.id && (
                <div className="flex gap-2 p-3 bg-gray-50 rounded-lg">
                  <input
                    type="text"
                    value={commentInput}
                    onChange={(e) => setCommentInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleComment(post.id);
                      }
                    }}
                    placeholder="Write a comment..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yoga-500 focus:border-transparent"
                  />
                  <button
                    onClick={() => handleComment(post.id)}
                    disabled={!commentInput.trim()}
                    className="px-4 py-2 bg-yoga-600 hover:bg-yoga-700 text-white rounded-lg font-semibold disabled:opacity-50 transition-colors"
                  >
                    Post
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Load More */}
      {filteredPosts.length > 0 && (
        <button className="w-full px-4 py-3 border-2 border-yoga-600 text-yoga-600 rounded-lg font-bold hover:bg-yoga-50 transition-colors">
          Load More Posts
        </button>
      )}

      {/* Tips */}
      <div className="p-4 bg-yoga-50 rounded-lg border border-yoga-200 mt-6">
        <p className="text-sm font-bold text-yoga-700 mb-2">🌟 Community Guidelines:</p>
        <ul className="text-xs text-yoga-800 space-y-1">
          <li>✓ Share your yoga journey and inspire others</li>
          <li>✓ Be respectful and supportive to all members</li>
          <li>✓ Don't share personal information publicly</li>
          <li>✓ Report inappropriate content to moderators</li>
        </ul>
      </div>
    </div>
  );
}
