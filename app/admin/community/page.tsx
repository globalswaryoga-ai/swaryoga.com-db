'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';

type AdminCommunity = {
  id: string;
  name: string;
  members: string[];
  membersCount: number;
  createdAt: string;
};

type FoundUser = {
  userId: string;
  email: string;
  name: string;
  profileId?: string;
};

export default function AdminCommunityPage() {
  const router = useRouter();

  const [adminToken, setAdminToken] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [communities, setCommunities] = useState<AdminCommunity[]>([]);
  const [query, setQuery] = useState('');
  const [foundUser, setFoundUser] = useState<FoundUser | null>(null);
  const [selectedCommunityId, setSelectedCommunityId] = useState('');

  const selectedCommunity = useMemo(
    () => communities.find((c) => c.id === selectedCommunityId) || null,
    [communities, selectedCommunityId]
  );

  const loadCommunities = useCallback(async (token: string) => {
    const res = await fetch('/api/community/admin/list', {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });

    const json = await res.json().catch(() => null);
    if (res.status === 401) {
      router.push('/admin/login');
      return;
    }

    if (!res.ok) {
      throw new Error(json?.error || 'Failed to load communities');
    }

    const data = Array.isArray(json?.data) ? (json.data as AdminCommunity[]) : [];
    setCommunities(data);
    setSelectedCommunityId((prev) => prev || data[0]?.id || '');
  }, [router]);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        setLoading(true);
        setError('');

        const token = localStorage.getItem('adminToken') || '';
        if (!token) {
          router.push('/admin/login');
          return;
        }

        if (!cancelled) setAdminToken(token);
        await loadCommunities(token);
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
  }, [router, loadCommunities]);

  const onFindUser = async () => {
    try {
      setError('');
      setFoundUser(null);

      const q = query.trim();
      if (!q) {
        setError('Enter email or userId');
        return;
      }

      const res = await fetch(`/api/community/admin/find-user?q=${encodeURIComponent(q)}` as string, {
        headers: { Authorization: `Bearer ${adminToken}` },
        cache: 'no-store',
      });

      const json = await res.json().catch(() => null);
      if (res.status === 401) {
        router.push('/admin/login');
        return;
      }
      if (!res.ok) {
        throw new Error(json?.error || 'User not found');
      }

      setFoundUser(json.data as FoundUser);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const onAddToCommunity = async () => {
    if (!foundUser) {
      setError('Find a user first');
      return;
    }
    if (!selectedCommunityId) {
      setError('Select a community');
      return;
    }

    try {
      setError('');
      const res = await fetch('/api/community/admin/add-member', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ communityId: selectedCommunityId, userId: foundUser.userId }),
      });

      const json = await res.json().catch(() => null);
      if (res.status === 401) {
        router.push('/admin/login');
        return;
      }
      if (!res.ok) {
        throw new Error(json?.error || 'Failed to add member');
      }

      await loadCommunities(adminToken);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const onRemoveFromCommunity = async () => {
    if (!foundUser) {
      setError('Find a user first');
      return;
    }
    if (!selectedCommunityId) {
      setError('Select a community');
      return;
    }

    try {
      setError('');
      const res = await fetch('/api/community/admin/remove-member', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ communityId: selectedCommunityId, userId: foundUser.userId }),
      });

      const json = await res.json().catch(() => null);
      if (res.status === 401) {
        router.push('/admin/login');
        return;
      }
      if (!res.ok) {
        throw new Error(json?.error || 'Failed to remove member');
      }

      await loadCommunities(adminToken);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <>
      <Navigation />
      <main className="min-h-screen pt-20 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900">Admin Community</h1>
          <p className="mt-2 text-sm text-gray-600">Manual membership only</p>

          {loading && <p className="mt-6 text-sm text-gray-600">Loading...</p>}

          {!loading && error && (
            <div className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          )}

          {!loading && (
            <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <div className="text-sm font-bold text-gray-900">Communities</div>
                <div className="mt-3 space-y-2">
                  {communities.map((c) => (
                    <div key={c.id} className="rounded-lg border border-gray-200 px-3 py-3">
                      <div className="text-sm font-bold text-gray-900">{c.name}</div>
                      <div className="mt-1 text-xs text-gray-600">Members: {c.membersCount}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <div className="text-sm font-bold text-gray-900">Add member</div>

                <div className="mt-3">
                  <label className="block text-xs font-bold text-gray-700">Search user by email or userId</label>
                  <div className="mt-2 flex gap-2">
                    <input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      placeholder="email or userId"
                    />
                    <button
                      type="button"
                      onClick={onFindUser}
                      className="rounded-lg bg-gray-100 text-gray-900 px-4 py-2 text-sm font-bold hover:bg-gray-200"
                    >
                      Search
                    </button>
                  </div>
                </div>

                {foundUser && (
                  <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 px-3 py-3">
                    <div className="text-sm font-bold text-gray-900">User</div>
                    <div className="mt-1 text-xs text-gray-700">Name: {foundUser.name}</div>
                    <div className="mt-1 text-xs text-gray-700">Email: {foundUser.email}</div>
                    <div className="mt-1 text-xs text-gray-700">UserId: {foundUser.userId}</div>
                    {foundUser.profileId && <div className="mt-1 text-xs text-gray-700">ProfileId: {foundUser.profileId}</div>}
                  </div>
                )}

                <div className="mt-4">
                  <label className="block text-xs font-bold text-gray-700">Select community</label>
                  <select
                    value={selectedCommunityId}
                    onChange={(e) => setSelectedCommunityId(e.target.value)}
                    className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                  >
                    <option value="">Select</option>
                    {communities.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>

                  {selectedCommunity && (
                    <div className="mt-2 text-xs text-gray-600">Current members: {selectedCommunity.membersCount}</div>
                  )}
                </div>

                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={onAddToCommunity}
                    className="rounded-lg bg-green-600 text-white px-4 py-2 text-sm font-bold hover:bg-green-700"
                  >
                    Add to community
                  </button>
                  <button
                    type="button"
                    onClick={onRemoveFromCommunity}
                    className="rounded-lg bg-gray-100 text-gray-900 px-4 py-2 text-sm font-bold hover:bg-gray-200"
                  >
                    Remove
                  </button>
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
