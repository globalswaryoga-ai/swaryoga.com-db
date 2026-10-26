'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { getSession } from '@/lib/sessionManager';

type FeedComment = {
  userId: string;
  text: string;
  createdAt: string;
};

type FeedPost = {
  id: string;
  communityId: string;
  userId: string;
  content: string;
  images: string[];
  likesCount: number;
  likedByMe: boolean;
  comments: FeedComment[];
  createdAt: string;
};

export default function CommunityFeedPage() {
  const params = useParams();
  const router = useRouter();
  const communityId = useMemo(() => String((params as any)?.communityId || ''), [params]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('hindi');

  // Load saved language or detect country default on mount
  useEffect(() => {
    const saved = localStorage.getItem('swar_community_lang');
    if (saved) {
      setSelectedLanguage(saved);
    } else {
      // Auto-detect based on browser timezone/locale
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
      const isIndia = tz.includes('Calcutta') || tz.includes('Kolkata') || navigator.language?.includes('IN');
      const defLang = isIndia ? 'hindi' : 'english';
      setSelectedLanguage(defLang);
      localStorage.setItem('swar_community_lang', defLang);
    }
  }, []);

  const getToken = () => getSession()?.token || localStorage.getItem('token') || '';

  const load = async (lang = selectedLanguage) => {
    const token = getToken();
    if (!token) {
      router.push('/signin');
      return;
    }

    const res = await fetch(
      `/api/community/feed?communityId=${encodeURIComponent(communityId)}&language=${encodeURIComponent(lang)}` as string,
      {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      }
    );

    const json = await res.json().catch(() => null);

    if (res.status === 401) {
      router.push('/signin');
      return;
    }

    if (res.status === 403 || res.status === 404) {
      router.push('/community');
      return;
    }

    if (!res.ok) {
      throw new Error(json?.error || 'Failed to load feed');
    }

    const data = Array.isArray(json?.data) ? (json.data as FeedPost[]) : [];
    setPosts(data);
  };

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        setLoading(true);
        setError('');
        await load();
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    if (communityId) run();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [communityId]);

  const onToggleLike = async (postId: string) => {
    const token = getToken();
    if (!token) {
      router.push('/signin');
      return;
    }

    const res = await fetch('/api/community/post/like', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ postId }),
    });

    const json = await res.json().catch(() => null);

    if (res.status === 401) {
      router.push('/signin');
      return;
    }

    if (res.status === 403) {
      router.push('/community');
      return;
    }

    if (!res.ok) {
      throw new Error(json?.error || 'Failed to like post');
    }

    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? { ...p, likesCount: Number(json?.data?.likesCount || 0), likedByMe: Boolean(json?.data?.likedByMe) }
          : p
      )
    );
  };

  return (
    <>
      <Navigation />
      <main className="min-h-screen pt-20 bg-swar-bg">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-swar-text">Community Feed</h1>
            <div className="flex flex-wrap items-center gap-2">
              {/* Language Selector Dropdown in Upper-Right Corner */}
              <div className="relative">
                <select
                  value={selectedLanguage}
                  onChange={(e) => {
                    const nextLang = e.target.value;
                    setSelectedLanguage(nextLang);
                    localStorage.setItem('swar_community_lang', nextLang);
                    setLoading(true);
                    load(nextLang).finally(() => setLoading(false));
                  }}
                  className="rounded-lg border border-swar-primary/40 bg-white px-3 py-1.5 text-xs sm:text-sm font-bold text-swar-text shadow-sm focus:outline-none focus:ring-2 focus:ring-swar-primary cursor-pointer"
                  title="Select Community Language"
                >
                  <option value="hindi">🇮🇳 हिन्दी (Hindi)</option>
                  <option value="english">🌐 English</option>
                  <option value="marathi">🇮🇳 मराठी (Marathi)</option>
                  <option value="gujarati">🇮🇳 ગુજરાતી (Gujarati)</option>
                </select>
              </div>

              <button
                type="button"
                onClick={() => router.push(`/community/${communityId}/create`)}
                className="rounded-lg bg-swar-primary text-white px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-bold hover:bg-swar-primary cursor-pointer"
              >
                Create Post
              </button>
              <button
                type="button"
                onClick={async () => {
                  try {
                    setLoading(true);
                    setError('');
                    await load();
                  } catch (e) {
                    setError(e instanceof Error ? e.message : String(e));
                  } finally {
                    setLoading(false);
                  }
                }}
                className="rounded-lg bg-swar-primary-light text-swar-text px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-bold hover:bg-swar-primary-light cursor-pointer"
              >
                Refresh
              </button>
            </div>
          </div>

          {loading && <p className="mt-6 text-sm text-swar-text-secondary">Loading...</p>}

          {!loading && error && (
            <div className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-swar-primary">{error}</div>
          )}

          {!loading && !error && posts.length === 0 && (
            <div className="mt-6 rounded-lg border border-swar-border bg-white px-4 py-6">
              <p className="text-sm text-swar-text">No posts yet</p>
            </div>
          )}

          {!loading && !error && posts.length > 0 && (
            <div className="mt-6 space-y-3">
              {posts.map((p) => (
                <div key={p.id} className="rounded-lg border border-swar-border bg-white px-4 py-4">
                  <div className="text-sm text-swar-text whitespace-pre-wrap">{p.content}</div>
                  <div className="mt-2 flex items-center justify-between gap-4">
                    <div className="text-xs text-swar-text-secondary">{p.createdAt ? new Date(p.createdAt).toLocaleString() : ''}</div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onToggleLike(p.id)}
                        className="rounded-lg bg-swar-primary-light px-3 py-1.5 text-xs font-bold text-swar-text hover:bg-swar-primary-light"
                      >
                        {p.likedByMe ? 'Unlike' : 'Like'}
                      </button>
                      <div className="text-xs text-swar-text-secondary">Likes: {p.likesCount}</div>
                      <button
                        type="button"
                        onClick={() => router.push(`/community/post/${p.id}`)}
                        className="rounded-lg bg-swar-primary-light px-3 py-1.5 text-xs font-bold text-swar-text hover:bg-swar-primary-light"
                      >
                        Open
                      </button>
                    </div>
                  </div>
                  {p.comments?.length > 0 && (
                    <div className="mt-3 text-xs text-swar-text-secondary">Comments: {p.comments.length}</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
