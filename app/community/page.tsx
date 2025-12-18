'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { getSession } from '@/lib/sessionManager';

type CommunityItem = {
  id: string;
  name: string;
  createdAt: string;
};

export default function CommunityListPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [communities, setCommunities] = useState<CommunityItem[]>([]);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        setLoading(true);
        setError('');

        const token = getSession()?.token || localStorage.getItem('token') || '';
        if (!token) {
          router.push('/signin');
          return;
        }

        const res = await fetch('/api/community/list', {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        });

        const json = await res.json().catch(() => null);
        if (res.status === 401) {
          router.push('/signin');
          return;
        }
        if (!res.ok) {
          throw new Error(json?.error || 'Failed to load communities');
        }

        const data = Array.isArray(json?.data) ? (json.data as CommunityItem[]) : [];
        if (!cancelled) setCommunities(data);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <>
      <Navigation />
      <main className="min-h-screen pt-20 bg-swar-bg">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-swar-text">Community</h1>
          <p className="mt-2 text-sm text-swar-text-secondary">Private communities are invite only.</p>

          {loading && <p className="mt-6 text-sm text-swar-text-secondary">Loading...</p>}

          {!loading && error && (
            <div className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          )}

          {!loading && !error && communities.length === 0 && (
            <div className="mt-6 rounded-lg border border-swar-border bg-white px-4 py-6">
              <p className="text-sm text-swar-text">You are not added to any community yet</p>
            </div>
          )}

          {!loading && !error && communities.length > 0 && (
            <div className="mt-6 space-y-3">
              {communities.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => router.push(`/community/${c.id}`)}
                  className="w-full text-left rounded-lg border border-swar-border bg-white px-4 py-4 hover:bg-swar-bg"
                >
                  <div className="text-base font-bold text-swar-text">{c.name}</div>
                  <div className="mt-1 text-xs text-swar-text-secondary">Open</div>
                </button>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
