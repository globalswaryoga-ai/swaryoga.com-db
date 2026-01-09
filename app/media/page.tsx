'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { Instagram, Facebook, Twitter, Youtube, Share2, Globe, ArrowRight } from 'lucide-react';

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
    <div className="min-h-screen bg-swar-bg flex flex-col">
      <Navigation />

      {/* NEW: Modern High-Impact Media Hero */}
      <section className="relative pt-32 pb-20 bg-white overflow-hidden">
        {/* Modern Accent Shapes */}
        <div className="absolute top-0 left-0 w-64 h-64 bg-swar-primary/5 rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-swar-accent/5 rounded-full translate-x-1/3 translate-y-1/3 blur-3xl opacity-60" />

        <div className="container mx-auto px-4 max-w-7xl relative z-10">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="animate-fade-in-up order-2 lg:order-1">
              <div className="inline-flex items-center gap-3 py-2 px-6 rounded-2xl bg-gradient-to-r from-swar-primary/10 to-transparent text-swar-primary font-black text-xs mb-8 tracking-[0.25em] uppercase border-l-4 border-swar-primary">
                GLOBAL VIBRATIONS
              </div>
              
              <h1 className="text-7xl md:text-9xl font-black text-swar-text mb-8 tracking-tighter leading-[0.85]">
                Social <br /> 
                <span className="text-transparent bg-clip-text bg-gradient-to-br from-swar-primary via-swar-primary to-swar-accent">
                  Feed
                </span>
              </h1>
              
              <p className="text-2xl md:text-3xl text-swar-text-secondary max-w-xl leading-snug mb-12 font-medium tracking-tight italic">
                "Witness the resonance of breath across the digital universe."
              </p>

              {/* Engagement Stats */}
              <div className="flex items-center gap-8 p-8 bg-swar-bg rounded-[2.5rem] border border-swar-primary/5 shadow-sm inline-flex">
                 <div className="flex -space-x-4">
                    {[1,2,3,4,5].map(i => (
                      <div key={i} className="w-14 h-14 rounded-full border-4 border-white overflow-hidden shadow-xl">
                        <img src={`https://i.pravatar.cc/100?img=${i+30}`} alt="Community" className="w-full h-full object-cover" />
                      </div>
                    ))}
                 </div>
                 <div className="h-12 w-px bg-swar-primary/10" />
                 <div>
                    <div className="text-swar-text font-black text-3xl leading-none">52K+</div>
                    <div className="text-swar-text-tertiary text-[10px] font-extrabold uppercase tracking-[0.2em] mt-1 text-center">Global Followers</div>
                 </div>
              </div>
            </div>

            {/* Visual Feed Preview */}
            <div className="relative order-1 lg:order-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-4">
                  <div className="aspect-square rounded-3xl overflow-hidden shadow-2xl animate-fade-in-up [animation-delay:0.2s]">
                    <img src="https://images.pexels.com/photos/1134295/pexels-photo-1134295.jpeg" className="w-full h-full object-cover" alt="Nature" />
                  </div>
                  <div className="aspect-[3/4] rounded-3xl overflow-hidden shadow-2xl animate-fade-in-up [animation-delay:0.4s]">
                    <img src="https://images.pexels.com/photos/3822622/pexels-photo-3822622.jpeg" className="w-full h-full object-cover" alt="Yoga" />
                  </div>
                </div>
                <div className="space-y-4 pt-12">
                  <div className="aspect-[3/4] rounded-3xl overflow-hidden shadow-2xl animate-fade-in-up [animation-delay:0.6s]">
                    <img src="https://images.pexels.com/photos/3759657/pexels-photo-3759657.jpeg" className="w-full h-full object-cover" alt="Meditation" />
                  </div>
                  <div className="aspect-square rounded-3xl overflow-hidden shadow-2xl animate-fade-in-up [animation-delay:0.8s]">
                    <img src="https://images.pexels.com/photos/3823039/pexels-photo-3823039.jpeg" className="w-full h-full object-cover" alt="Breath" />
                  </div>
                </div>
              </div>
              
              {/* Floating Social Tags */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col gap-4">
                {[Instagram, Facebook, Youtube].map((Icon, idx) => (
                  <div key={idx} className="bg-white/90 backdrop-blur-xl p-4 rounded-2xl shadow-2xl border border-white/50 animate-bounce" style={{ animationDelay: `${idx * 0.3}s` }}>
                    <Icon size={32} className="text-swar-primary" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="flex-1 max-w-7xl mx-auto w-full px-4 py-8">
        {/* Search & Filter - Modernized */}
        <div className="bg-white rounded-3xl shadow-sm border border-swar-primary/5 p-6 md:p-8 mb-12 animate-fade-in-up">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-end">
            <div className="md:col-span-5">
              <label className="block text-xs font-bold text-swar-text-tertiary mb-2 uppercase tracking-wider">Search Media</label>
              <input
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setPage(1);
                }}
                placeholder="Search topics, events, testimonies..."
                className="w-full px-5 py-3 bg-swar-bg border-none rounded-2xl focus:ring-2 focus:ring-swar-primary transition-all text-swar-text"
              />
            </div>

            <div className="md:col-span-4">
              <label className="block text-xs font-bold text-swar-text-tertiary mb-2 uppercase tracking-wider">Category</label>
              <select
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value);
                  setPage(1);
                }}
                className="w-full px-5 py-3 bg-swar-bg border-none rounded-2xl focus:ring-2 focus:ring-swar-primary transition-all text-swar-text appearance-none"
              >
                <option value="">All Categories</option>
                <option value="update">Updates</option>
                <option value="highlight">Highlights</option>
                <option value="testimony">Testimonies</option>
                <option value="program">Programs</option>
                <option value="event">Events</option>
              </select>
            </div>

            <div className="md:col-span-3">
              <button
                onClick={() => {
                  setCategory('');
                  setQ('');
                  setPage(1);
                }}
                className="w-full bg-swar-bg hover:bg-swar-primary-light text-swar-text-secondary px-6 py-3 rounded-2xl font-bold transition-all border border-swar-primary/10"
              >
                Reset Filters
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-100 text-red-600 px-6 py-4 rounded-2xl mb-8 flex items-center gap-3">
            <span className="text-xl">⚠️</span> {error}
          </div>
        )}

        {loading && (
          <div className="flex justify-center py-24">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-swar-primary/20 border-t-swar-primary" />
          </div>
        )}

        {!loading && posts.length === 0 && !error && (
          <div className="text-center py-20 bg-white rounded-[3rem] shadow-sm border border-swar-primary/5">
            <div className="text-6xl mb-6">📂</div>
            <h3 className="text-2xl font-bold text-swar-text mb-2">No results found</h3>
            <p className="text-swar-text-tertiary">Try adjusting your filters or search keywords.</p>
          </div>
        )}

        {!loading && posts.length > 0 && (
          <div className="space-y-16">
            {posts.map((post) => {
              const blocks = safeSort(post.blocks || [], (b) => b.order);
              const leftItems = safeSort(post.leftSidebar?.items || [], (i) => i.order);
              const rightItems = safeSort(post.rightSidebar?.items || [], (i) => i.order);

              return (
                <article key={post._id} className="bg-white rounded-[3rem] shadow-sm overflow-hidden border border-swar-primary/5 hover:shadow-xl transition-all duration-700">
                  <div className="p-8 md:p-12 border-b border-swar-primary/5">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          {post.category && (
                            <span className="bg-swar-primary/10 text-swar-primary px-4 py-1.5 rounded-full text-xs font-extrabold uppercase tracking-widest">
                              {post.category}
                            </span>
                          )}
                          {post.publishedAt && (
                            <span className="text-swar-text-tertiary text-sm font-bold">
                              {formatDate(post.publishedAt)}
                            </span>
                          )}
                        </div>
                        <h2 className="text-3xl md:text-4xl font-bold text-swar-text tracking-tight">{post.title}</h2>
                      </div>

                      <div className="flex gap-4 flex-wrap">
                        {post.socialMediaLinks?.facebookLink && (
                          <a className="bg-[#1877F2]/10 text-[#1877F2] p-3 rounded-2xl hover:bg-[#1877F2] hover:text-white transition-all font-bold text-sm" href={post.socialMediaLinks.facebookLink} target="_blank" rel="noreferrer">
                            <Facebook className="w-5 h-5 inline-block mr-1 -mt-0.5" /> Facebook
                          </a>
                        )}
                        {post.socialMediaLinks?.instagramLink && (
                          <a className="bg-[#E4405F]/10 text-[#E4405F] p-3 rounded-2xl hover:bg-[#E4405F] hover:text-white transition-all font-bold text-sm" href={post.socialMediaLinks.instagramLink} target="_blank" rel="noreferrer">
                            <Instagram className="w-5 h-5 inline-block mr-1 -mt-0.5" /> Instagram
                          </a>
                        )}
                        {post.socialMediaLinks?.twitterLink && (
                          <a className="bg-swar-text/10 text-swar-text p-3 rounded-2xl hover:bg-black hover:text-white transition-all font-bold text-sm" href={post.socialMediaLinks.twitterLink} target="_blank" rel="noreferrer">
                            <Twitter className="w-5 h-5 inline-block mr-1 -mt-0.5" /> X
                          </a>
                        )}
                      </div>
                    </div>

                    {post.description && (
                      <p className="text-swar-text-secondary mt-8 text-lg leading-relaxed whitespace-pre-line border-l-4 border-swar-primary/20 pl-6">
                        {post.description}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
                    <aside className="lg:col-span-3 p-8 md:p-10 bg-swar-bg/50 border-b lg:border-b-0 lg:border-r border-swar-primary/5">
                      <h3 className="text-xs font-extrabold text-swar-primary mb-6 uppercase tracking-[0.2em]">
                        {post.leftSidebar?.title || "HIGHLIGHTS"}
                      </h3>
                      {leftItems.length === 0 ? (
                        <p className="text-sm text-swar-text-tertiary italic">No details available</p>
                      ) : (
                        <ul className="space-y-6">
                          {leftItems.map((it, idx) => (
                            <li key={it._id || idx} className="group">
                              <div className="text-sm font-extrabold text-swar-text mb-1 group-hover:text-swar-primary transition-colors">{it.label}</div>
                              {it.content && <div className="text-sm text-swar-text-tertiary leading-relaxed">{it.content}</div>}
                            </li>
                          ))}
                        </ul>
                      )}
                    </aside>

                    <div className="lg:col-span-6 p-8 md:p-12">
                      {blocks.length === 0 ? (
                        <div className="text-center py-10 bg-swar-bg rounded-3xl border border-dashed border-swar-primary/20">
                           <p className="text-swar-text-tertiary font-medium">No additional content blocks</p>
                        </div>
                      ) : (
                        <div className="space-y-12">
                          {blocks.map((b, idx) => {
                            const isTextLeft = b.type === 'left-text-right-image';
                            const mediaUrl = b.media?.url || '';

                            return (
                              <div
                                key={b._id || idx}
                                className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center"
                              >
                                <div className={`${isTextLeft ? '' : 'md:order-2'} space-y-4`}>
                                  {b.heading && <h4 className="text-2xl font-bold text-swar-text leading-tight">{b.heading}</h4>}
                                  {b.text && <p className="text-swar-text-secondary leading-relaxed">{b.text}</p>}
                                </div>

                                <div className={isTextLeft ? '' : 'md:order-1'}>
                                  <div className="rounded-[2rem] overflow-hidden shadow-lg border-4 border-white">
                                    {mediaUrl ? (
                                      b.media?.type === 'video' ? (
                                        <video
                                          controls
                                          preload="metadata"
                                          className="w-full h-full object-cover"
                                        >
                                          <source src={mediaUrl} />
                                        </video>
                                      ) : (
                                        <img
                                          src={mediaUrl}
                                          alt={b.media?.altText || post.title}
                                          loading="lazy"
                                          className="w-full h-full object-cover hover:scale-105 transition-transform duration-700"
                                        />
                                      )
                                    ) : (
                                      <div className="w-full h-48 bg-swar-bg flex items-center justify-center">
                                        <span className="text-swar-primary/10 text-4xl">🧘</span>
                                      </div>
                                    )}
                                  </div>
                                  {b.media?.caption && (
                                    <div className="text-xs font-bold text-swar-text-tertiary mt-4 text-center italic">
                                      {b.media.caption}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <aside className="lg:col-span-3 p-8 md:p-10 bg-swar-bg/50 border-t lg:border-t-0 lg:border-l border-swar-primary/5">
                      <h3 className="text-xs font-extrabold text-swar-primary mb-6 uppercase tracking-[0.2em]">
                        {post.rightSidebar?.title || "CONNECT"}
                      </h3>
                      {rightItems.length === 0 ? (
                        <p className="text-sm text-swar-text-tertiary italic">Join our journey</p>
                      ) : (
                        <ul className="space-y-6">
                          {rightItems.map((it, idx) => (
                            <li key={it._id || idx} className="group">
                              <div className="text-sm font-extrabold text-swar-text mb-1 group-hover:text-swar-primary transition-colors">{it.label}</div>
                              {it.content && <div className="text-sm text-swar-text-tertiary leading-relaxed">{it.content}</div>}
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
          <div className="flex justify-center items-center gap-6 py-16">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="group flex items-center gap-2 px-6 py-3 bg-white border border-swar-primary/10 text-swar-text font-bold rounded-2xl hover:bg-swar-primary hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-lg"
            >
              <span className="group-hover:-translate-x-1 transition-transform">←</span> Previous
            </button>
            <div className="text-swar-text font-bold bg-white px-6 py-3 rounded-2xl border border-swar-primary/5 shadow-inner">
              Page <span className="text-swar-primary">{page}</span> of {totalPages}
            </div>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="group flex items-center gap-2 px-6 py-3 bg-white border border-swar-primary/10 text-swar-text font-bold rounded-2xl hover:bg-swar-primary hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-lg"
            >
              Next <span className="group-hover:translate-x-1 transition-transform">→</span>
            </button>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
