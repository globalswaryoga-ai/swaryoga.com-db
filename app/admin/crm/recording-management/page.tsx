'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import AdminSidebar from '@/components/AdminSidebar';
import {
  Video, CheckCircle, Loader, Save, AlertCircle, ChevronRight,
  Globe, Music, Heart, Baby, Sparkles, Activity, Sun, Leaf,
  PersonStanding, Eye, Menu, X, CheckSquare, Square, ToggleLeft, ToggleRight,
} from 'lucide-react';

// Community list matching communityColorSystem.ts
const COMMUNITIES = [
  // Common
  { id: 'global', name: 'Global Community', icon: Globe, category: 'Common', color: 'text-teal-500', bg: 'bg-teal-50 border-teal-200' },
  // Health
  { id: 'swar-yoga-l1', name: 'Swar Yoga L-1', icon: Music, category: 'Health', color: 'text-emerald-500', bg: 'bg-emerald-50 border-emerald-200' },
  { id: 'swar-yoga-l2', name: 'Swar Yoga L-2', icon: Music, category: 'Health', color: 'text-green-500', bg: 'bg-green-50 border-green-200' },
  { id: 'swar-yoga-l3', name: 'Swar Yoga L-3', icon: Music, category: 'Health', color: 'text-teal-500', bg: 'bg-teal-50 border-teal-200' },
  { id: 'swar-yoga-l4', name: 'Swar Yoga L-4', icon: Music, category: 'Health', color: 'text-cyan-500', bg: 'bg-cyan-50 border-cyan-200' },
  { id: 'swar-yoga-l5', name: 'Swar Yoga L-5', icon: Music, category: 'Health', color: 'text-sky-500', bg: 'bg-sky-50 border-sky-200' },
  { id: 'aahar', name: 'Aahar (Diet & Nutrition)', icon: Leaf, category: 'Health', color: 'text-lime-500', bg: 'bg-lime-50 border-lime-200' },
  { id: 'i-am-fit', name: 'I am Fit', icon: Activity, category: 'Health', color: 'text-orange-500', bg: 'bg-orange-50 border-orange-200' },
  { id: 'old-sadhak-community', name: 'Swar Yoga Sadhak', icon: Sun, category: 'Health', color: 'text-amber-500', bg: 'bg-amber-50 border-amber-200' },
  // Married Life
  { id: 'pre-planning-garbh-sankar', name: 'Pre Planning Garbh Sankar', icon: Heart, category: 'Married Life', color: 'text-pink-500', bg: 'bg-pink-50 border-pink-200' },
  { id: '9-month-garbha-sanskar', name: '9 Month Garbha Sanskar', icon: Baby, category: 'Married Life', color: 'text-rose-500', bg: 'bg-rose-50 border-rose-200' },
  // Youth & Children
  { id: 'youth', name: 'Youth Swar Yoga', icon: Sparkles, category: 'Youth', color: 'text-violet-500', bg: 'bg-violet-50 border-violet-200' },
  { id: 'children', name: 'Children Yoga', icon: Sun, category: 'Children', color: 'text-amber-500', bg: 'bg-amber-50 border-amber-200' },
  // Yogasana
  { id: 'yogasana', name: 'Yogasana Practice', icon: PersonStanding, category: 'Yogasana', color: 'text-indigo-500', bg: 'bg-indigo-50 border-indigo-200' },
];

// Group communities by category
const CATEGORIES = ['Common', 'Health', 'Married Life', 'Youth', 'Children', 'Yogasana'];

interface Playlist {
  _id: string;
  name: string;
  description?: string;
  type: 'batch' | 'post';
  workshopSlug?: string;
  workshopName?: string;
  batchNumber?: number;
  year?: number;
  month?: number;
  videoCount: number;
  status: string;
}

interface AccessMap {
  [communityId: string]: {
    allAccess: boolean;
    playlistIds: string[];
  };
}

export default function RecordingManagementPage() {
  const router = useRouter();
  const token = useAuth();
  
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedCommunity, setSelectedCommunity] = useState(COMMUNITIES[0]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [accessMap, setAccessMap] = useState<AccessMap>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Current community access state
  const currentAccess = accessMap[selectedCommunity.id] || { allAccess: false, playlistIds: [] };

  // Fetch playlists and access map
  const fetchData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/admin/crm/community/recording-access', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Failed to fetch');

      setPlaylists(data.playlists || []);
      setAccessMap(data.accessMap || {});
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!token) {
      router.push('/admin/login');
      return;
    }
    fetchData();
  }, [token, router, fetchData]);

  // Toggle allAccess for current community
  const toggleAllAccess = () => {
    const newAllAccess = !currentAccess.allAccess;
    setAccessMap(prev => ({
      ...prev,
      [selectedCommunity.id]: {
        allAccess: newAllAccess,
        playlistIds: newAllAccess ? [] : (prev[selectedCommunity.id]?.playlistIds || []),
      },
    }));
    setHasChanges(true);
  };

  // Toggle a specific playlist for current community
  const togglePlaylist = (playlistId: string) => {
    const current = accessMap[selectedCommunity.id] || { allAccess: false, playlistIds: [] };
    const currentIds = current.playlistIds || [];

    let newIds: string[];
    if (currentIds.includes(playlistId)) {
      newIds = currentIds.filter(id => id !== playlistId);
    } else {
      newIds = [...currentIds, playlistId];
    }

    setAccessMap(prev => ({
      ...prev,
      [selectedCommunity.id]: {
        allAccess: false,
        playlistIds: newIds,
      },
    }));
    setHasChanges(true);
  };

  // Select/deselect all playlists
  const selectAll = () => {
    const allIds = playlists.map(p => p._id);
    setAccessMap(prev => ({
      ...prev,
      [selectedCommunity.id]: {
        allAccess: false,
        playlistIds: allIds,
      },
    }));
    setHasChanges(true);
  };

  const deselectAll = () => {
    setAccessMap(prev => ({
      ...prev,
      [selectedCommunity.id]: {
        allAccess: false,
        playlistIds: [],
      },
    }));
    setHasChanges(true);
  };

  // Save current community access
  const saveAccess = async () => {
    if (!token) return;
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const access = accessMap[selectedCommunity.id] || { allAccess: false, playlistIds: [] };

      const res = await fetch('/api/admin/crm/community/recording-access', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          communityId: selectedCommunity.id,
          communityName: selectedCommunity.name,
          allAccess: access.allAccess,
          playlistIds: access.playlistIds,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save');

      setSuccess(data.message || 'Access saved successfully');
      setHasChanges(false);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  // Check if a playlist is granted
  const isPlaylistGranted = (playlistId: string): boolean => {
    if (currentAccess.allAccess) return true;
    return (currentAccess.playlistIds || []).includes(playlistId);
  };

  // Group playlists by type
  const batchPlaylists = playlists.filter(p => p.type === 'batch');
  const postPlaylists = playlists.filter(p => p.type === 'post');

  const grantedCount = currentAccess.allAccess ? playlists.length : (currentAccess.playlistIds || []).length;

  const Icon = selectedCommunity.icon;

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <AdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-4 lg:px-6 py-3 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="md:hidden p-2 rounded-lg hover:bg-gray-100">
              <Menu className="h-5 w-5 text-gray-600" />
            </button>
            <div className="flex items-center gap-2">
              <Video className="h-5 w-5 text-indigo-600" />
              <h1 className="text-lg font-bold text-gray-900">Community Recording Management</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {hasChanges && (
              <span className="text-xs text-amber-600 font-medium bg-amber-50 px-2 py-1 rounded-full">Unsaved changes</span>
            )}
            <button
              onClick={saveAccess}
              disabled={saving || !hasChanges}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
            >
              {saving ? <Loader className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save
            </button>
          </div>
        </header>

        {/* Messages */}
        {error && (
          <div className="mx-4 lg:mx-6 mt-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            {error}
            <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600"><X className="h-4 w-4" /></button>
          </div>
        )}
        {success && (
          <div className="mx-4 lg:mx-6 mt-3 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-700 text-sm">
            <CheckCircle className="h-4 w-4 flex-shrink-0" />
            {success}
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Community Sidebar (Left) */}
          {/* Mobile toggle */}
          <button
            onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
            className="lg:hidden fixed bottom-4 left-4 z-30 p-3 bg-indigo-600 text-white rounded-full shadow-lg"
          >
            {mobileSidebarOpen ? <X className="h-5 w-5" /> : <Globe className="h-5 w-5" />}
          </button>

          <aside className={`${mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 fixed lg:static inset-y-0 left-0 z-20 w-72 bg-white border-r border-gray-200 flex flex-col overflow-hidden transition-transform duration-300 ease-in-out`}>
            <div className="p-4 border-b border-gray-100 flex-shrink-0">
              <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Communities</h2>
              <p className="text-xs text-gray-400 mt-1">Select community to manage access</p>
            </div>
            <nav className="flex-1 overflow-y-auto p-2">
              {CATEGORIES.map(category => {
                const communitiesInCategory = COMMUNITIES.filter(c => c.category === category);
                if (communitiesInCategory.length === 0) return null;

                return (
                  <div key={category} className="mb-3">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-3 py-1.5">{category}</p>
                    {communitiesInCategory.map(community => {
                      const CIcon = community.icon;
                      const isSelected = selectedCommunity.id === community.id;
                      const access = accessMap[community.id];
                      const count = access?.allAccess ? playlists.length : (access?.playlistIds?.length || 0);

                      return (
                        <button
                          key={community.id}
                          onClick={() => {
                            setSelectedCommunity(community);
                            setMobileSidebarOpen(false);
                            setHasChanges(false);
                          }}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all mb-0.5 ${
                            isSelected
                              ? 'bg-indigo-50 border border-indigo-200 shadow-sm'
                              : 'hover:bg-gray-50 border border-transparent'
                          }`}
                        >
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                            isSelected ? 'bg-indigo-100' : 'bg-gray-100'
                          }`}>
                            <CIcon className={`h-4 w-4 ${isSelected ? 'text-indigo-600' : community.color}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium truncate ${isSelected ? 'text-indigo-900' : 'text-gray-700'}`}>
                              {community.name}
                            </p>
                            {count > 0 && (
                              <p className="text-[10px] text-gray-400">
                                {access?.allAccess ? 'All access' : `${count} playlist${count !== 1 ? 's' : ''}`}
                              </p>
                            )}
                          </div>
                          {count > 0 && (
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                              access?.allAccess ? 'bg-green-100 text-green-700' : 'bg-indigo-100 text-indigo-700'
                            }`}>
                              {access?.allAccess ? 'ALL' : count}
                            </span>
                          )}
                          {isSelected && <ChevronRight className="h-4 w-4 text-indigo-400 flex-shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </nav>
          </aside>

          {/* Working Area (Right) */}
          <main className="flex-1 overflow-y-auto p-4 lg:p-6">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-full">
                <Loader className="h-8 w-8 text-indigo-500 animate-spin mb-3" />
                <p className="text-sm text-gray-500">Loading playlists...</p>
              </div>
            ) : (
              <div>
                {/* Community Header */}
                <div className={`border rounded-xl p-5 mb-6 ${selectedCommunity.bg}`}>
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-white shadow-sm`}>
                        <Icon className={`h-6 w-6 ${selectedCommunity.color}`} />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-gray-900">{selectedCommunity.name}</h2>
                        <p className="text-sm text-gray-500">
                          {grantedCount} of {playlists.length} playlists accessible
                        </p>
                      </div>
                    </div>

                    {/* All Access Toggle */}
                    <button
                      onClick={toggleAllAccess}
                      className={`flex items-center gap-3 px-5 py-3 rounded-xl font-bold text-sm transition-all ${
                        currentAccess.allAccess
                          ? 'bg-green-500 text-white shadow-lg shadow-green-500/25 hover:bg-green-600'
                          : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {currentAccess.allAccess ? (
                        <ToggleRight className="h-5 w-5" />
                      ) : (
                        <ToggleLeft className="h-5 w-5" />
                      )}
                      All Access
                    </button>
                  </div>
                </div>

                {currentAccess.allAccess && (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6 flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-bold text-green-800">All Access Enabled</p>
                      <p className="text-xs text-green-600">This community can access all playlists including future ones.</p>
                    </div>
                  </div>
                )}

                {/* Quick Actions */}
                {!currentAccess.allAccess && playlists.length > 0 && (
                  <div className="flex items-center gap-3 mb-4">
                    <button
                      onClick={selectAll}
                      className="text-xs font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                    >
                      <CheckSquare className="h-3.5 w-3.5" />
                      Select All
                    </button>
                    <span className="text-gray-300">|</span>
                    <button
                      onClick={deselectAll}
                      className="text-xs font-medium text-gray-500 hover:text-gray-700 flex items-center gap-1"
                    >
                      <Square className="h-3.5 w-3.5" />
                      Deselect All
                    </button>
                    <span className="ml-auto text-xs text-gray-400">
                      {grantedCount} selected
                    </span>
                  </div>
                )}

                {/* No Playlists */}
                {playlists.length === 0 && (
                  <div className="text-center py-20">
                    <Video className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-gray-500 mb-2">No Playlists Found</h3>
                    <p className="text-sm text-gray-400">Create playlists in the Community Recordings tab first.</p>
                  </div>
                )}

                {/* Batch Playlists */}
                {batchPlaylists.length > 0 && (
                  <div className="mb-8">
                    <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <Video className="h-4 w-4 text-indigo-500" />
                      Workshop Recordings ({batchPlaylists.length})
                    </h3>
                    <div className="grid gap-2">
                      {batchPlaylists.map(playlist => {
                        const granted = isPlaylistGranted(playlist._id);
                        return (
                          <label
                            key={playlist._id}
                            className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all ${
                              currentAccess.allAccess
                                ? 'bg-green-50/50 border-green-200 opacity-75'
                                : granted
                                  ? 'bg-indigo-50 border-indigo-200 shadow-sm'
                                  : 'bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={granted}
                              onChange={() => togglePlaylist(playlist._id)}
                              disabled={currentAccess.allAccess}
                              className="w-5 h-5 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500 cursor-pointer disabled:opacity-50"
                            />
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-bold ${granted ? 'text-indigo-900' : 'text-gray-800'}`}>
                                {playlist.name}
                              </p>
                              <div className="flex items-center gap-2 mt-0.5">
                                {playlist.workshopName && (
                                  <span className="text-[11px] text-gray-400">{playlist.workshopName}</span>
                                )}
                                {playlist.batchNumber && (
                                  <span className="text-[11px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
                                    Batch {playlist.batchNumber}
                                  </span>
                                )}
                              </div>
                              {playlist.description && (
                                <p className="text-xs text-gray-400 mt-1 line-clamp-1">{playlist.description}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <span className="text-[11px] text-gray-400 bg-gray-100 px-2 py-1 rounded-lg">
                                {playlist.videoCount} video{playlist.videoCount !== 1 ? 's' : ''}
                              </span>
                              {granted && !currentAccess.allAccess && (
                                <CheckCircle className="h-4 w-4 text-indigo-500" />
                              )}
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Post/Monthly Playlists */}
                {postPlaylists.length > 0 && (
                  <div className="mb-8">
                    <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <Eye className="h-4 w-4 text-purple-500" />
                      Monthly Updates ({postPlaylists.length})
                    </h3>
                    <div className="grid gap-2">
                      {postPlaylists.map(playlist => {
                        const granted = isPlaylistGranted(playlist._id);
                        const monthNames = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                        const monthLabel = playlist.month && playlist.year
                          ? `${monthNames[playlist.month]} ${playlist.year}`
                          : '';

                        return (
                          <label
                            key={playlist._id}
                            className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all ${
                              currentAccess.allAccess
                                ? 'bg-green-50/50 border-green-200 opacity-75'
                                : granted
                                  ? 'bg-purple-50 border-purple-200 shadow-sm'
                                  : 'bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={granted}
                              onChange={() => togglePlaylist(playlist._id)}
                              disabled={currentAccess.allAccess}
                              className="w-5 h-5 text-purple-600 rounded border-gray-300 focus:ring-purple-500 cursor-pointer disabled:opacity-50"
                            />
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-bold ${granted ? 'text-purple-900' : 'text-gray-800'}`}>
                                {playlist.name}
                              </p>
                              {monthLabel && (
                                <span className="text-[11px] text-gray-400">{monthLabel}</span>
                              )}
                              {playlist.description && (
                                <p className="text-xs text-gray-400 mt-1 line-clamp-1">{playlist.description}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <span className="text-[11px] text-gray-400 bg-gray-100 px-2 py-1 rounded-lg">
                                {playlist.videoCount} video{playlist.videoCount !== 1 ? 's' : ''}
                              </span>
                              {granted && !currentAccess.allAccess && (
                                <CheckCircle className="h-4 w-4 text-purple-500" />
                              )}
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Summary Footer */}
                {playlists.length > 0 && (
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex items-center justify-between">
                    <p className="text-sm text-gray-600">
                      <span className="font-bold text-gray-800">{selectedCommunity.name}</span>
                      {' '}has access to{' '}
                      <span className="font-bold text-indigo-600">
                        {currentAccess.allAccess ? 'all' : grantedCount}
                      </span>
                      {' '}of {playlists.length} playlists
                    </p>
                    <button
                      onClick={saveAccess}
                      disabled={saving || !hasChanges}
                      className="px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
                    >
                      {saving ? <Loader className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      Save Changes
                    </button>
                  </div>
                )}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
