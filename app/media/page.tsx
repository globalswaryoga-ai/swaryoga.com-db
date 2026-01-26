'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { Instagram, Facebook, Twitter, Youtube, Share2, Globe, ArrowRight } from 'lucide-react';
import Image from 'next/image';

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
                NATUROPATHY • YOGA • WELLNESS
              </div>
              
              <h1 className="text-5xl sm:text-6xl md:text-7xl font-black text-swar-text mb-6 tracking-tighter leading-[0.9]">
                Media &
                <span className="block text-transparent bg-clip-text bg-gradient-to-br from-swar-primary via-swar-primary to-swar-accent">
                  Updates
                </span>
              </h1>
              
              <p className="text-lg sm:text-xl md:text-2xl text-swar-text-secondary max-w-xl leading-relaxed mb-10 font-medium tracking-tight">
                Stories, highlights, and programs from our naturopathy and yoga community—grounded, practical, and uplifting.
              </p>

              {/* Simple platform chips (no fake follower counts) */}
              <div className="flex flex-wrap items-center gap-3">
                {[{ Icon: Instagram, label: 'Instagram' }, { Icon: Facebook, label: 'Facebook' }, { Icon: Youtube, label: 'YouTube' }].map(
                  ({ Icon, label }) => (
                    <div
                      key={label}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-swar-bg border border-swar-primary/10 text-swar-text font-bold"
                    >
                      <Icon size={18} className="text-swar-primary" />
                      <span className="text-sm">{label}</span>
                    </div>
                  )
                )}
              </div>
            </div>

            {/* Visual — calm brand imagery */}
            <div className="relative order-1 lg:order-2">
              <div className="relative rounded-[3rem] overflow-hidden shadow-[0_32px_64px_-16px_rgba(0,0,0,0.25)] border-8 border-white aspect-[4/3] sm:aspect-[16/11]">
                  <Image
                    src="/images/sunset-lake-meditation-hero.svg"
                  alt="Swar Yoga media — natural, calm background"
                  fill
                  priority
                  sizes="(max-width: 1024px) 92vw, 560px"
                  className="object-cover object-center"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-swar-primary/55 via-swar-primary/10 to-transparent opacity-90" />
                <div className="absolute inset-0 bg-black/10" />
              </div>

              {/* Gentle decorative icons */}
              <div className="absolute -bottom-8 -left-6 bg-white/90 backdrop-blur p-5 rounded-2xl shadow-xl border border-swar-primary/10">
                <div className="flex items-center gap-3">
                  <Share2 size={20} className="text-swar-primary" />
                  <div>
                    <div className="text-swar-text font-black leading-none">Learn & Share</div>
                    <div className="text-swar-text-tertiary text-[10px] font-extrabold uppercase tracking-widest mt-1">Natural healing insights</div>
                  </div>
                </div>
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {posts.map((post) => {
              const blocks = safeSort(post.blocks || [], (b) => b.order);
              const firstBlock = blocks[0];
              const mediaUrl = firstBlock?.media?.url || '';

              return (
                <article 
                  key={post._id} 
                  className="bg-white rounded-3xl shadow-sm overflow-hidden border border-swar-primary/5 hover:shadow-xl hover:-translate-y-1 transition-all duration-500 flex flex-col group"
                >
                  {/* Card Image */}
                  <div className="relative aspect-[4/3] overflow-hidden bg-swar-bg">
                    {mediaUrl ? (
                      firstBlock?.media?.type === 'video' ? (
                        <video
                          preload="metadata"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                        >
                          <source src={mediaUrl} />
                        </video>
                      ) : (
                        <img
                          src={mediaUrl}
                          alt={firstBlock?.media?.altText || post.title}
                          loading="lazy"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                        />
                      )
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-swar-primary/5 to-swar-accent/5">
                        <span className="text-6xl opacity-30">🧘</span>
                      </div>
                    )}
                    
                    {/* Category Badge */}
                    {post.category && (
                      <div className="absolute top-4 left-4">
                        <span className="bg-swar-primary/90 text-white px-3 py-1.5 rounded-full text-[10px] font-extrabold uppercase tracking-widest shadow-lg">
                          {post.category}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Card Content */}
                  <div className="p-6 flex-1 flex flex-col">
                    {/* Date */}
                    {post.publishedAt && (
                      <span className="text-swar-text-tertiary text-xs font-bold mb-2">
                        {formatDate(post.publishedAt)}
                      </span>
                    )}
                    
                    {/* Title */}
                    <h2 className="text-xl font-bold text-swar-text tracking-tight mb-3 line-clamp-2 group-hover:text-swar-primary transition-colors">
                      {post.title}
                    </h2>
                    
                    {/* Description */}
                    {post.description && (
                      <p className="text-swar-text-secondary text-sm leading-relaxed mb-4 line-clamp-3 flex-1">
                        {post.description}
                      </p>
                    )}

                    {/* Tags */}
                    {post.tags && post.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-4">
                        {post.tags.slice(0, 3).map((tag, idx) => (
                          <span key={idx} className="bg-swar-bg text-swar-text-tertiary px-2.5 py-1 rounded-lg text-[10px] font-bold">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Social Links */}
                    <div className="flex items-center gap-3 pt-4 border-t border-swar-primary/5 mt-auto">
                      {post.socialMediaLinks?.facebookLink && (
                        <a 
                          href={post.socialMediaLinks.facebookLink} 
                          target="_blank" 
                          rel="noreferrer"
                          className="w-9 h-9 flex items-center justify-center rounded-xl bg-[#1877F2]/10 text-[#1877F2] hover:bg-[#1877F2] hover:text-white transition-all"
                        >
                          <Facebook className="w-4 h-4" />
                        </a>
                      )}
                      {post.socialMediaLinks?.instagramLink && (
                        <a 
                          href={post.socialMediaLinks.instagramLink} 
                          target="_blank" 
                          rel="noreferrer"
                          className="w-9 h-9 flex items-center justify-center rounded-xl bg-[#E4405F]/10 text-[#E4405F] hover:bg-[#E4405F] hover:text-white transition-all"
                        >
                          <Instagram className="w-4 h-4" />
                        </a>
                      )}
                      {post.socialMediaLinks?.twitterLink && (
                        <a 
                          href={post.socialMediaLinks.twitterLink} 
                          target="_blank" 
                          rel="noreferrer"
                          className="w-9 h-9 flex items-center justify-center rounded-xl bg-swar-text/10 text-swar-text hover:bg-black hover:text-white transition-all"
                        >
                          <Twitter className="w-4 h-4" />
                        </a>
                      )}
                      {post.socialMediaLinks?.whatsappLink && (
                        <a 
                          href={post.socialMediaLinks.whatsappLink} 
                          target="_blank" 
                          rel="noreferrer"
                          className="w-9 h-9 flex items-center justify-center rounded-xl bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366] hover:text-white transition-all"
                        >
                          <Globe className="w-4 h-4" />
                        </a>
                      )}
                      
                      {/* Read More Link */}
                      <a 
                        href={`/media/${post._id}`}
                        className="ml-auto flex items-center gap-1.5 text-swar-primary font-bold text-sm hover:gap-2.5 transition-all"
                      >
                        Read More <ArrowRight className="w-4 h-4" />
                      </a>
                    </div>
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
