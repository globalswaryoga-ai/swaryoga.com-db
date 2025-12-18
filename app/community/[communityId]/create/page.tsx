'use client';

import { useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { getSession } from '@/lib/sessionManager';

export default function CommunityCreatePostPage() {
  const params = useParams();
  const router = useRouter();
  const communityId = useMemo(() => String((params as any)?.communityId || ''), [params]);

  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const getToken = () => getSession()?.token || localStorage.getItem('token') || '';

  const onSubmit = async () => {
    const token = getToken();
    if (!token) {
      router.push('/signin');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/community/post/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ communityId, content }),
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
        throw new Error(json?.error || 'Failed to create post');
      }

      router.push(`/community/${communityId}`);
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
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-2xl font-extrabold text-swar-text">Create Post</h1>
          <p className="mt-2 text-sm text-swar-text-secondary">Posts are visible only to members.</p>

          {error && (
            <div className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-swar-primary">{error}</div>
          )}

          <div className="mt-6 rounded-lg border border-swar-border bg-white p-4">
            <label className="block text-sm font-bold text-swar-text">Message</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={6}
              className="mt-2 w-full rounded-lg border border-swar-border px-3 py-2 text-sm"
              placeholder="Write your message"
            />

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                disabled={submitting}
                onClick={onSubmit}
                className="rounded-lg bg-swar-primary text-white px-4 py-2 text-sm font-bold hover:bg-swar-primary disabled:opacity-60"
              >
                {submitting ? 'Posting...' : 'Post'}
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => router.push(`/community/${communityId}`)}
                className="rounded-lg bg-swar-primary-light text-swar-text px-4 py-2 text-sm font-bold hover:bg-swar-primary-light disabled:opacity-60"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
