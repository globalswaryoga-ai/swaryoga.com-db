'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';

type MediaSidebarItem = {
  _id?: string;
  label: string;
  content?: string;
  icon?: string;
  order?: number;
};

type MediaSidebar = {
  title?: string;
  items?: MediaSidebarItem[];
};

type MediaBlock = {
  _id?: string;
  type: 'left-text-right-image' | 'left-image-right-text';
  text?: string;
  heading?: string;
  media?: {
    url?: string;
    type: 'image' | 'video';
    altText?: string;
    caption?: string;
  };
  order?: number;
};

type MediaPost = {
  _id: string;
  title: string;
  description?: string;
  blocks?: MediaBlock[];
  leftSidebar?: MediaSidebar;
  rightSidebar?: MediaSidebar;
  category?: 'update' | 'highlight' | 'testimony' | 'program' | 'event';
  tags?: string[];
  featured?: boolean;
  publishedAt?: string;
  socialMediaLinks?: {
    whatsappLink?: string;
    facebookLink?: string;
    instagramLink?: string;
    twitterLink?: string;
  };
};

function safeSort<T>(arr: T[], selector: (x: T) => number | undefined) {
  return [...arr].sort((a, b) => (selector(a) ?? 0) - (selector(b) ?? 0));
}

function formatDate(iso?: string) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function MediaPage() {
  const [posts, setPosts] = useState<MediaPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [category, setCategory] = useState<string>('');
  const [q, setQ] = useState<string>('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const limit = 10;

  const fetchPosts = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const params = new URLSearchParams();
      params.set('limit', String(limit));
      params.set('skip', String((page - 1) * limit));
      if (category) params.set('category', category);
      if (q.trim()) params.set('q', q.trim());

      const res = await fetch(`/api/media?${params.toString()}`, {
        headers: { 'Cache-Control': 'no-cache' },
      });

      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload?.error || 'Failed to load media');

      setPosts(payload?.data?.posts || []);
      setTotal(payload?.data?.total || 0);
    } catch (e) {
      setPosts([]);
      setTotal(0);
      setError(e instanceof Error ? e.message : 'Failed to load media');
    } finally {
      setLoading(false);
    }
  }, [category, limit, page, q]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / limit)), [limit, total]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navigation />

      <div className="bg-gradient-to-r from-yoga-600 to-yoga-800 text-white py-12">
        <div className="max-w-7xl mx-auto px-4">
          <h1 className="text-4xl font-bold mb-3">Media</h1>
          <p className="text-yoga-100 text-lg">Updates, highlights, testimonies, and program announcements — published by the Swar Yoga team.</p>
        </div>
      </div>

      <div className="flex-1 max-w-7xl mx-auto w-full px-4 py-8">
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Search</label>
              <input
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setPage(1);
                }}
                placeholder="Search posts…"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yoga-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Category</label>
              <select
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value);
                  setPage(1);
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yoga-500 focus:border-transparent"
              >
                <option value="">All</option>
                <option value="update">Update</option>
                <option value="highlight">Highlight</option>
                <option value="testimony">Testimony</option>
                <option value="program">Program</option>
                <option value="event">Event</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={() => {
                  setCategory('');
                  setQ('');
                  setPage(1);
                }}
                className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg font-semibold transition-colors"
              >
                Reset
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-4 rounded-lg mb-6">
            ❌ {error}
          </div>
        )}

        {loading && (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-yoga-200 border-t-yoga-600" />
          </div>
        )}

        {!loading && posts.length === 0 && !error && (
          <div className="text-center py-12">
            <span className="text-6xl mb-4 block">🗂️</span>
            <p className="text-xl text-gray-600">No media posts yet</p>
            <p className="text-gray-500 mt-2">Once an admin publishes a social media post, it will appear here.</p>
          </div>
        )}

        {!loading && posts.length > 0 && (
          <div className="space-y-10">
            {posts.map((post) => {
              const blocks = safeSort(post.blocks || [], (b) => b.order);
              const leftItems = safeSort(post.leftSidebar?.items || [], (i) => i.order);
              const rightItems = safeSort(post.rightSidebar?.items || [], (i) => i.order);

              return (
                <article key={post._id} className="bg-white rounded-xl shadow-md overflow-hidden">
                  <div className="p-6 border-b">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                      <div>
                        <h2 className="text-2xl font-bold text-gray-900">{post.title}</h2>
                        <div className="text-sm text-gray-500 mt-1">
                          {post.category ? <span className="capitalize">{post.category}</span> : null}
                          {post.publishedAt ? <span> • {formatDate(post.publishedAt)}</span> : null}
                        </div>
                      </div>

                      <div className="flex gap-2 flex-wrap">
                        {post.socialMediaLinks?.facebookLink ? (
                          <a className="text-sm text-blue-700 hover:underline" href={post.socialMediaLinks.facebookLink} target="_blank" rel="noreferrer">
                            Facebook
                          </a>
                        ) : null}
                        {post.socialMediaLinks?.instagramLink ? (
                          <a className="text-sm text-pink-700 hover:underline" href={post.socialMediaLinks.instagramLink} target="_blank" rel="noreferrer">
                            Instagram
                          </a>
                        ) : null}
                        {post.socialMediaLinks?.twitterLink ? (
                          <a className="text-sm text-gray-800 hover:underline" href={post.socialMediaLinks.twitterLink} target="_blank" rel="noreferrer">
                            X
                          </a>
                        ) : null}
                      </div>
                    </div>

                    {post.description ? <p className="text-gray-700 mt-4 whitespace-pre-line">{post.description}</p> : null}
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
                    <aside className="lg:col-span-3 border-b lg:border-b-0 lg:border-r p-6 bg-gray-50">
                      {post.leftSidebar?.title ? (
                        <h3 className="font-bold text-gray-900 mb-3">{post.leftSidebar.title}</h3>
                      ) : (
                        <h3 className="font-bold text-gray-900 mb-3">Info</h3>
                      )}
                      {leftItems.length === 0 ? (
                        <p className="text-sm text-gray-500">No items</p>
                      ) : (
                        <ul className="space-y-3">
                          {leftItems.map((it, idx) => (
                            <li key={it._id || idx}>
                              <div className="text-sm font-semibold text-gray-800">{it.label}</div>
                              {it.content ? <div className="text-sm text-gray-600 whitespace-pre-line">{it.content}</div> : null}
                            </li>
                          ))}
                        </ul>
                      )}
                    </aside>

                    <div className="lg:col-span-6 p-6">
                      {blocks.length === 0 ? (
                        <p className="text-gray-500">No content blocks</p>
                      ) : (
                        <div className="space-y-8">
                          {blocks.map((b, idx) => {
                            const isTextLeft = b.type === 'left-text-right-image';
                            const mediaUrl = b.media?.url || '';

                            return (
                              <div
                                key={b._id || idx}
                                className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center"
                              >
                                <div className={isTextLeft ? '' : 'md:order-2'}>
                                  {b.heading ? <h4 className="text-xl font-bold text-gray-900 mb-2">{b.heading}</h4> : null}
                                  {b.text ? <p className="text-gray-700 whitespace-pre-line">{b.text}</p> : null}
                                </div>

                                <div className={isTextLeft ? '' : 'md:order-1'}>
                                  {mediaUrl ? (
                                    b.media?.type === 'video' ? (
                                      <video
                                        controls
                                        preload="metadata"
                                        className="w-full rounded-lg shadow"
                                      >
                                        <source src={mediaUrl} />
                                      </video>
                                    ) : (
                                      // eslint-disable-next-line @next/next/no-img-element
                                      <img
                                        src={mediaUrl}
                                        alt={b.media?.altText || post.title}
                                        loading="lazy"
                                        className="w-full rounded-lg shadow"
                                      />
                                    )
                                  ) : (
                                    <div className="w-full h-48 bg-gray-100 rounded-lg" />
                                  )}
                                  {b.media?.caption ? (
                                    <div className="text-sm text-gray-500 mt-2">{b.media.caption}</div>
                                  ) : null}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <aside className="lg:col-span-3 p-6 bg-gray-50 border-t lg:border-t-0 lg:border-l">
                      {post.rightSidebar?.title ? (
                        <h3 className="font-bold text-gray-900 mb-3">{post.rightSidebar.title}</h3>
                      ) : (
                        <h3 className="font-bold text-gray-900 mb-3">More</h3>
                      )}
                      {rightItems.length === 0 ? (
                        <p className="text-sm text-gray-500">No items</p>
                      ) : (
                        <ul className="space-y-3">
                          {rightItems.map((it, idx) => (
                            <li key={it._id || idx}>
                              <div className="text-sm font-semibold text-gray-800">{it.label}</div>
                              {it.content ? <div className="text-sm text-gray-600 whitespace-pre-line">{it.content}</div> : null}
                            </li>
                          ))}
                        </ul>
                      )}
                    </aside>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {!loading && posts.length > 0 && (
          <div className="flex justify-center items-center gap-2 py-10">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="px-4 py-2 border border-yoga-600 text-yoga-600 rounded-lg hover:bg-yoga-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ← Previous
            </button>

            <div className="text-sm text-gray-600 px-3">
              Page <span className="font-semibold">{page}</span> of <span className="font-semibold">{totalPages}</span>
            </div>

            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page >= totalPages}
              className="px-4 py-2 border border-yoga-600 text-yoga-600 rounded-lg hover:bg-yoga-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next →
            </button>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
