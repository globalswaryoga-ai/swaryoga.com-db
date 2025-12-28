'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Heart, MessageCircle, Share2, Search, Plus } from 'lucide-react';

interface Post {
  _id: string;
  title: string;
  content: string;
  author: string;
  authorAvatar?: string;
  likes: number;
  comments: number;
  createdAt: string;
  category?: string;
  image?: string;
}

export default function CommunityPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const categories = [
    { id: 'all', label: 'All Posts' },
    { id: 'experience', label: 'Experiences' },
    { id: 'tips', label: 'Tips & Tricks' },
    { id: 'transformation', label: 'Transformation Stories' },
    { id: 'questions', label: 'Questions' },
  ];

  useEffect(() => {
    fetchPosts();
  }, [selectedCategory]);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/community/posts?category=' + selectedCategory);
      if (response.ok) {
        const data = await response.json();
        setPosts(data.posts || []);
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredPosts = posts.filter(post =>
    post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    post.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-swar-bg to-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-swar-primary to-green-700 text-white py-12">
        <div className="container mx-auto px-4 sm:px-6">
          <h1 className="text-4xl sm:text-5xl font-serif mb-4">Swar Yoga Community</h1>
          <p className="text-lg text-swar-primary-light max-w-2xl">
            Connect with fellow yoga practitioners, share experiences, and inspire each other on your wellness journey.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 sm:px-6 py-12">
        <div className="grid lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            {/* New Post Button */}
            <Link
              href="/community/post"
              className="flex items-center justify-center gap-2 w-full bg-swar-primary hover:bg-swar-primary-hover text-white px-6 py-3 rounded-lg transition-colors mb-8 font-medium"
            >
              <Plus size={20} />
              New Post
            </Link>

            {/* Categories */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-swar-text mb-4">Categories</h3>
              <div className="space-y-2">
                {categories.map(category => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                      selectedCategory === category.id
                        ? 'bg-swar-primary text-white'
                        : 'bg-swar-bg hover:bg-swar-primary-light text-swar-text'
                    }`}
                  >
                    {category.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Community Stats */}
            <div className="bg-white rounded-lg shadow-md p-6 mt-6">
              <h3 className="text-lg font-semibold text-swar-text mb-4">Community Stats</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-swar-text-secondary">Total Posts</span>
                  <span className="text-2xl font-bold text-swar-primary">{posts.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-swar-text-secondary">Active Members</span>
                  <span className="text-2xl font-bold text-swar-primary">8,000+</span>
                </div>
              </div>
            </div>
          </div>

          {/* Posts Section */}
          <div className="lg:col-span-3">
            {/* Search Bar */}
            <div className="mb-8">
              <div className="relative">
                <Search className="absolute left-4 top-3 text-swar-text-secondary" size={20} />
                <input
                  type="text"
                  placeholder="Search posts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-swar-primary"
                />
              </div>
            </div>

            {/* Posts List */}
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-swar-primary mx-auto mb-4"></div>
                  <p className="text-swar-text-secondary">Loading posts...</p>
                </div>
              </div>
            ) : filteredPosts.length > 0 ? (
              <div className="space-y-6">
                {filteredPosts.map((post) => (
                  <Link key={post._id} href={`/community/${post._id}`}>
                    <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6 cursor-pointer group">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-4 flex-1">
                          <div className="w-12 h-12 bg-swar-primary-light rounded-full flex items-center justify-center text-white font-semibold">
                            {post.author.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-swar-text group-hover:text-swar-primary transition-colors">
                              {post.title}
                            </h3>
                            <p className="text-sm text-swar-text-secondary">
                              {post.author} • {new Date(post.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        {post.category && (
                          <span className="text-xs bg-swar-primary-light text-swar-primary px-3 py-1 rounded-full">
                            {post.category}
                          </span>
                        )}
                      </div>

                      {post.image && (
                        <div className="mb-4 h-48 overflow-hidden rounded-lg">
                          <img
                            src={post.image}
                            alt={post.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                        </div>
                      )}

                      <p className="text-swar-text mb-4 line-clamp-3">
                        {post.content}
                      </p>

                      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                        <div className="flex items-center gap-6">
                          <button className="flex items-center gap-2 text-swar-text-secondary hover:text-swar-primary transition-colors">
                            <Heart size={18} />
                            <span className="text-sm">{post.likes}</span>
                          </button>
                          <button className="flex items-center gap-2 text-swar-text-secondary hover:text-swar-primary transition-colors">
                            <MessageCircle size={18} />
                            <span className="text-sm">{post.comments}</span>
                          </button>
                        </div>
                        <button className="text-swar-text-secondary hover:text-swar-primary transition-colors">
                          <Share2 size={18} />
                        </button>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <MessageCircle size={48} className="mx-auto text-swar-text-secondary mb-4" />
                <h3 className="text-lg font-semibold text-swar-text mb-2">No posts yet</h3>
                <p className="text-swar-text-secondary mb-6">
                  Be the first to share your yoga journey with the community!
                </p>
                <Link
                  href="/community/post"
                  className="inline-flex items-center gap-2 bg-swar-primary hover:bg-swar-primary-hover text-white px-6 py-3 rounded-lg transition-colors"
                >
                  <Plus size={20} />
                  Create First Post
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
