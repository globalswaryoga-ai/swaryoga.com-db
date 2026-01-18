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

  const getToken = () => getSession()?.token || localStorage.getItem('token') || '';

  const load = async () => {
    const token = getToken();
    if (!token) {
      router.push('/signin');
      return;
    }

    const res = await fetch(`/api/community/feed?communityId=${encodeURIComponent(communityId)}` as string, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });

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
      <main className="min-h-screen pt-20 bg-gradient-to-br from-slate-50 via-white to-blue-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h1 className="text-4xl sm:text-5xl font-extrabold bg-gradient-to-r from-blue-600 via-green-500 to-blue-600 bg-clip-text text-transparent">
                  Community Feed
                </h1>
                <p className="text-gray-600 mt-2 text-lg">Connect, share, and grow together</p>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => router.push(`/community/${communityId}/create`)}
                  className="rounded-lg bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-3 text-sm font-bold shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 active:scale-95 whitespace-nowrap"
                >
                  ✏️ Create Post
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
                  className="rounded-lg bg-white border-2 border-blue-500 text-blue-600 px-6 py-3 text-sm font-bold shadow-md hover:shadow-lg hover:bg-blue-50 transition-all duration-300 whitespace-nowrap"
                >
                  🔄 Refresh
                </button>
              </div>
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="flex justify-center items-center py-20">
              <div className="flex flex-col items-center gap-4">
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-200 border-t-green-500"></div>
                <p className="text-gray-600 font-medium">Loading posts...</p>
              </div>
            </div>
          )}

          {/* Error State */}
          {!loading && error && (
            <div className="mt-6 rounded-xl border-l-4 border-red-500 bg-gradient-to-r from-red-50 to-orange-50 px-6 py-5 text-sm shadow-md">
              <p className="font-bold text-red-700 flex items-center gap-2">
                <span className="text-lg">⚠️</span> Error
              </p>
              <p className="text-red-600 mt-2">{error}</p>
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && posts.length === 0 && (
            <div className="mt-8 rounded-2xl border-2 border-dashed border-gray-300 bg-white px-8 py-16 text-center shadow-sm">
              <p className="text-3xl">📭</p>
              <p className="text-xl font-semibold text-gray-700 mt-3">No posts yet</p>
              <p className="text-gray-500 mt-2">Be the first to share something amazing with the community!</p>
            </div>
          )}

          {/* Posts Feed */}
          {!loading && !error && posts.length > 0 && (
            <div className="mt-8 space-y-5">
              {posts.map((p) => (
                <div
                  key={p.id}
                  className="rounded-2xl border border-gray-200 bg-white px-6 py-5 shadow-sm hover:shadow-xl hover:border-blue-300 transition-all duration-300 hover:-translate-y-1"
                >
                  {/* Post Content */}
                  <div className="text-base text-gray-800 whitespace-pre-wrap leading-relaxed font-medium">
                    {p.content}
                  </div>

                  {/* Divider */}
                  <div className="mt-4 pt-4 border-t border-gray-100"></div>

                  {/* Post Actions */}
                  <div className="mt-4 flex items-center justify-between gap-4 flex-wrap">
                    <div className="text-sm text-gray-500 font-semibold flex items-center gap-2">
                      <span>📅</span>
                      {p.createdAt ? new Date(p.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      }) : 'Just now'}
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                      {/* Like Button */}
                      <button
                        type="button"
                        onClick={() => onToggleLike(p.id)}
                        className={`rounded-lg px-4 py-2.5 text-sm font-bold transition-all duration-300 ${
                          p.likedByMe
                            ? 'bg-red-500 text-white shadow-md hover:shadow-lg hover:bg-red-600 hover:scale-105'
                            : 'bg-gray-100 text-gray-700 hover:bg-red-50 hover:text-red-500 border border-gray-200 hover:border-red-200'
                        }`}
                      >
                        {p.likedByMe ? '❤️ Liked' : '🤍 Like'}
                      </button>

                      {/* Likes Count */}
                      <div className="text-sm font-bold text-gray-700 bg-gradient-to-r from-orange-100 to-red-100 px-4 py-2.5 rounded-lg border border-orange-200">
                        {p.likesCount} like{p.likesCount !== 1 ? 's' : ''}
                      </div>

                      {/* View Comments Button */}
                      <button
                        type="button"
                        onClick={() => router.push(`/community/post/${p.id}`)}
                        className="rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-2.5 text-sm font-bold shadow-md hover:shadow-lg hover:scale-105 transition-all duration-300"
                      >
                        💬 View
                      </button>
                    </div>
                  </div>

                  {/* Comments Count */}
                  {p.comments?.length > 0 && (
                    <div className="mt-4 text-sm font-semibold text-gray-700 flex items-center gap-2 bg-blue-50 px-4 py-2.5 rounded-lg w-fit border border-blue-200">
                      <span>💭</span>
                      {p.comments.length} comment{p.comments.length !== 1 ? 's' : ''}
                    </div>
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
