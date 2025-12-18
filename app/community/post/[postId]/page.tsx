'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { getSession } from '@/lib/sessionManager';

type PostComment = {
  userId: string;
  text: string;
  createdAt: string;
};

type PostData = {
  id: string;
  communityId: string;
  userId: string;
  content: string;
  images: string[];
  likesCount: number;
  likedByMe: boolean;
  comments: PostComment[];
  createdAt: string;
};

export default function CommunityPostPage() {
  const params = useParams();
  const router = useRouter();
  const postId = useMemo(() => String((params as any)?.postId || ''), [params]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [post, setPost] = useState<PostData | null>(null);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const getToken = () => getSession()?.token || localStorage.getItem('token') || '';

  const load = async () => {
    const token = getToken();
    if (!token) {
      router.push('/signin');
      return;
    }

    const res = await fetch(`/api/community/post?postId=${encodeURIComponent(postId)}` as string, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
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

    if (res.status === 404) {
      router.push('/community');
      return;
    }

    if (!res.ok) {
      throw new Error(json?.error || 'Failed to load post');
    }

    setPost(json.data as PostData);
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

    if (postId) run();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId]);

  const onToggleLike = async () => {
    if (!post) return;

    const token = getToken();
    if (!token) {
      router.push('/signin');
      return;
    }

    const res = await fetch('/api/community/post/like', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ postId: post.id }),
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

    setPost((prev) =>
      prev
        ? {
            ...prev,
            likesCount: Number(json?.data?.likesCount || 0),
            likedByMe: Boolean(json?.data?.likedByMe),
          }
        : prev
    );
  };

  const onAddComment = async () => {
    if (!post) return;

    const text = commentText.trim();
    if (!text) return;

    const token = getToken();
    if (!token) {
      router.push('/signin');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/community/post/comment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ postId: post.id, text }),
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
        throw new Error(json?.error || 'Failed to add comment');
      }

      setCommentText('');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Navigation />
      <main className="min-h-screen pt-20 bg-swar-bg">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between gap-4">
            <h1 className="text-2xl font-extrabold text-swar-text">Post</h1>
            <button
              type="button"
              onClick={() => router.push('/community')}
              className="rounded-lg bg-swar-primary-light text-swar-text px-4 py-2 text-sm font-bold hover:bg-swar-primary-light"
            >
              Back
            </button>
          </div>

          {loading && <p className="mt-6 text-sm text-swar-text-secondary">Loading...</p>}

          {!loading && error && (
            <div className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-swar-primary">{error}</div>
          )}

          {!loading && !error && post && (
            <div className="mt-6 space-y-4">
              <div className="rounded-lg border border-swar-border bg-white px-4 py-4">
                <div className="text-sm text-swar-text whitespace-pre-wrap">{post.content}</div>
                <div className="mt-3 flex items-center justify-between gap-4">
                  <div className="text-xs text-swar-text-secondary">{post.createdAt ? new Date(post.createdAt).toLocaleString() : ''}</div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={onToggleLike}
                      className="rounded-lg bg-swar-primary-light px-3 py-1.5 text-xs font-bold text-swar-text hover:bg-swar-primary-light"
                    >
                      {post.likedByMe ? 'Unlike' : 'Like'}
                    </button>
                    <div className="text-xs text-swar-text-secondary">Likes: {post.likesCount}</div>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-swar-border bg-white px-4 py-4">
                <div className="text-sm font-bold text-swar-text">Comments</div>

                {post.comments.length === 0 && <p className="mt-3 text-sm text-swar-text-secondary">No comments yet</p>}

                {post.comments.length > 0 && (
                  <div className="mt-3 space-y-3">
                    {post.comments
                      .slice()
                      .reverse()
                      .map((c, idx) => (
                        <div key={`${c.createdAt}-${idx}`} className="rounded-lg bg-swar-bg px-3 py-2">
                          <div className="text-sm text-swar-text whitespace-pre-wrap">{c.text}</div>
                          <div className="mt-1 text-xs text-swar-text-secondary">{c.createdAt ? new Date(c.createdAt).toLocaleString() : ''}</div>
                        </div>
                      ))}
                  </div>
                )}

                <div className="mt-4">
                  <label className="block text-sm font-bold text-swar-text">Add comment</label>
                  <textarea
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    rows={3}
                    className="mt-2 w-full rounded-lg border border-swar-border px-3 py-2 text-sm"
                    placeholder="Write a comment"
                  />
                  <div className="mt-3">
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={onAddComment}
                      className="rounded-lg bg-swar-primary text-white px-4 py-2 text-sm font-bold hover:bg-swar-primary disabled:opacity-60"
                    >
                      {submitting ? 'Submitting...' : 'Submit'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
