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
      <main className="min-h-screen pt-20 bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between gap-4">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900">Community Feed</h1>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => router.push(`/community/${communityId}/create`)}
                className="rounded-lg bg-green-600 text-white px-4 py-2 text-sm font-bold hover:bg-green-700"
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
                className="rounded-lg bg-gray-100 text-gray-900 px-4 py-2 text-sm font-bold hover:bg-gray-200"
              >
                Refresh
              </button>
            </div>
          </div>

          {loading && <p className="mt-6 text-sm text-gray-600">Loading...</p>}

          {!loading && error && (
            <div className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          )}

          {!loading && !error && posts.length === 0 && (
            <div className="mt-6 rounded-lg border border-gray-200 bg-white px-4 py-6">
              <p className="text-sm text-gray-800">No posts yet</p>
            </div>
          )}

          {!loading && !error && posts.length > 0 && (
            <div className="mt-6 space-y-3">
              {posts.map((p) => (
                <div key={p.id} className="rounded-lg border border-gray-200 bg-white px-4 py-4">
                  <div className="text-sm text-gray-900 whitespace-pre-wrap">{p.content}</div>
                  <div className="mt-2 flex items-center justify-between gap-4">
                    <div className="text-xs text-gray-500">{p.createdAt ? new Date(p.createdAt).toLocaleString() : ''}</div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onToggleLike(p.id)}
                        className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-bold text-gray-900 hover:bg-gray-200"
                      >
                        {p.likedByMe ? 'Unlike' : 'Like'}
                      </button>
                      <div className="text-xs text-gray-600">Likes: {p.likesCount}</div>
                      <button
                        type="button"
                        onClick={() => router.push(`/community/post/${p.id}`)}
                        className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-bold text-gray-900 hover:bg-gray-200"
                      >
                        Open
                      </button>
                    </div>
                  </div>
                  {p.comments?.length > 0 && (
                    <div className="mt-3 text-xs text-gray-600">Comments: {p.comments.length}</div>
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
