'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import AdminSidebar from '@/components/AdminSidebar';
import {
  Video, CheckCircle, Loader, Save, AlertCircle, ChevronRight,
  Globe, Music, Heart, Baby, Sparkles, Activity, Sun, Leaf,
  PersonStanding, Menu, X, CheckSquare, Square, ToggleLeft, ToggleRight,
  Edit, Search, User, Phone, Eye,
} from 'lucide-react';

// Community list matching communityColorSystem.ts
const COMMUNITIES = [
  { id: 'global', name: 'Global Community', icon: Globe, category: 'Common', color: 'text-teal-500', bg: 'bg-teal-50 border-teal-200' },
  { id: 'swar-yoga-l1', name: 'Swar Yoga L-1', icon: Music, category: 'Health', color: 'text-emerald-500', bg: 'bg-emerald-50 border-emerald-200' },
  { id: 'swar-yoga-l2', name: 'Swar Yoga L-2', icon: Music, category: 'Health', color: 'text-green-500', bg: 'bg-green-50 border-green-200' },
  { id: 'swar-yoga-l3', name: 'Swar Yoga L-3', icon: Music, category: 'Health', color: 'text-teal-500', bg: 'bg-teal-50 border-teal-200' },
  { id: 'swar-yoga-l4', name: 'Swar Yoga L-4', icon: Music, category: 'Health', color: 'text-cyan-500', bg: 'bg-cyan-50 border-cyan-200' },
  { id: 'swar-yoga-l5', name: 'Swar Yoga L-5', icon: Music, category: 'Health', color: 'text-sky-500', bg: 'bg-sky-50 border-sky-200' },
  { id: 'aahar', name: 'Aahar (Diet & Nutrition)', icon: Leaf, category: 'Health', color: 'text-lime-500', bg: 'bg-lime-50 border-lime-200' },
  { id: 'i-am-fit', name: 'I am Fit', icon: Activity, category: 'Health', color: 'text-orange-500', bg: 'bg-orange-50 border-orange-200' },
  { id: 'old-sadhak-community', name: 'Swar Yoga Sadhak', icon: Sun, category: 'Health', color: 'text-amber-500', bg: 'bg-amber-50 border-amber-200' },
  { id: 'pre-planning-garbh-sankar', name: 'Pre Planning Garbh Sankar', icon: Heart, category: 'Married Life', color: 'text-pink-500', bg: 'bg-pink-50 border-pink-200' },
  { id: '9-month-garbha-sanskar', name: '9 Month Garbha Sanskar', icon: Baby, category: 'Married Life', color: 'text-rose-500', bg: 'bg-rose-50 border-rose-200' },
  { id: 'youth', name: 'Youth Swar Yoga', icon: Sparkles, category: 'Youth', color: 'text-violet-500', bg: 'bg-violet-50 border-violet-200' },
  { id: 'children', name: 'Children Yoga', icon: Sun, category: 'Children', color: 'text-amber-500', bg: 'bg-amber-50 border-amber-200' },
  { id: 'yogasana', name: 'Yogasana Practice', icon: PersonStanding, category: 'Yogasana', color: 'text-indigo-500', bg: 'bg-indigo-50 border-indigo-200' },
];

const CATEGORIES = ['Common', 'Health', 'Married Life', 'Youth', 'Children', 'Yogasana'];

interface Member {
  _id: string;
  userId: string;
  name: string;
  email?: string;
  mobile: string;
  status: string;
  joinedAt: string;
  approved?: boolean;
}

interface Playlist {
  _id: string;       // "folder|||playlist" composite key
  name: string;      // "FOLDER > PLAYLIST" display name
  folder: string;
  playlist: string;
  videoCount: number;
}

export default function RecordingManagementPage() {
  const router = useRouter();
  const token = useAuth();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedCommunity, setSelectedCommunity] = useState(COMMUNITIES[0]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Edit modal state
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [modalPlaylists, setModalPlaylists] = useState<Playlist[]>([]);
  const [modalUserAccess, setModalUserAccess] = useState<{ allAccess: boolean; playlistIds: string[] } | null>(null);
  const [loadingModal, setLoadingModal] = useState(false);
  const [savingModal, setSavingModal] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [modalSuccess, setModalSuccess] = useState<string | null>(null);

  // Fetch members for the selected community
  const fetchMembers = useCallback(async () => {
    if (!token) return;
    setLoadingMembers(true);
    try {
      const res = await fetch(
        '/api/admin/community/members?communityId=' + selectedCommunity.id + '&status=all',
        { headers: { Authorization: 'Bearer ' + token } }
      );
      if (res.status === 401 || res.status === 403) {
        router.push('/admin/login');
        return;
      }
      const json = await res.json();
      setMembers(Array.isArray(json?.data?.members) ? json.data.members : []);
    } catch (err) {
      console.error('Fetch members error:', err);
      setMembers([]);
    } finally {
      setLoadingMembers(false);
    }
  }, [token, selectedCommunity.id, router]);

  useEffect(() => {
    if (!token) {
      router.push('/admin/login');
      return;
    }
    fetchMembers();
  }, [token, router, fetchMembers]);

  // Open edit modal
  const openEditModal = async (member: Member) => {
    setEditingMember(member);
    setLoadingModal(true);
    setModalError(null);
    setModalSuccess(null);
    setModalUserAccess(null);
    setModalPlaylists([]);

    try {
      const res = await fetch(
        '/api/admin/crm/community/user-playlist-access?communityId=' + selectedCommunity.id + '&userId=' + member.userId,
        { headers: { Authorization: 'Bearer ' + token } }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch');

      setModalPlaylists(data.playlists || []);
      setModalUserAccess(data.userAccess || { allAccess: false, playlistIds: [] });
    } catch (err: any) {
      setModalError(err.message || 'Failed to load playlists');
    } finally {
      setLoadingModal(false);
    }
  };

  const closeModal = () => {
    setEditingMember(null);
    setModalPlaylists([]);
    setModalUserAccess(null);
    setModalError(null);
    setModalSuccess(null);
  };

  const toggleModalAllAccess = () => {
    if (!modalUserAccess) return;
    setModalUserAccess({
      allAccess: !modalUserAccess.allAccess,
      playlistIds: !modalUserAccess.allAccess ? [] : modalUserAccess.playlistIds,
    });
  };

  const toggleModalPlaylist = (playlistId: string) => {
    if (!modalUserAccess) return;
    const current = modalUserAccess.playlistIds || [];
    const newIds = current.includes(playlistId)
      ? current.filter((id: string) => id !== playlistId)
      : [...current, playlistId];
    setModalUserAccess({ allAccess: false, playlistIds: newIds });
  };

  const modalSelectAll = () => {
    setModalUserAccess({ allAccess: false, playlistIds: modalPlaylists.map(p => p._id) });
  };
  const modalDeselectAll = () => {
    setModalUserAccess({ allAccess: false, playlistIds: [] });
  };

  const saveUserAccess = async () => {
    if (!editingMember || !modalUserAccess || !token) return;
    setSavingModal(true);
    setModalError(null);
    setModalSuccess(null);

    try {
      const res = await fetch('/api/admin/crm/community/user-playlist-access', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + token,
        },
        body: JSON.stringify({
          userId: editingMember.userId,
          communityId: selectedCommunity.id,
          userName: editingMember.name,
          mobile: editingMember.mobile,
          allAccess: modalUserAccess.allAccess,
          playlistIds: modalUserAccess.playlistIds,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save');
      setModalSuccess(data.message || 'Saved successfully');
      setTimeout(() => setModalSuccess(null), 3000);
    } catch (err: any) {
      setModalError(err.message || 'Failed to save');
    } finally {
      setSavingModal(false);
    }
  };

  const isModalPlaylistGranted = (playlistId: string): boolean => {
    if (!modalUserAccess) return false;
    if (modalUserAccess.allAccess) return true;
    return (modalUserAccess.playlistIds || []).includes(playlistId);
  };

  const filteredMembers = members.filter(m =>
    (m.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (m.mobile || '').includes(searchQuery) ||
    (m.userId || '').includes(searchQuery)
  );

  const CommunityIcon = selectedCommunity.icon;
  const grantedCount = modalUserAccess?.allAccess ? modalPlaylists.length : (modalUserAccess?.playlistIds || []).length;

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
        </header>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Community Sidebar (Left) */}
          <button
            onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
            className="lg:hidden fixed bottom-4 left-4 z-30 p-3 bg-indigo-600 text-white rounded-full shadow-lg"
          >
            {mobileSidebarOpen ? <X className="h-5 w-5" /> : <Globe className="h-5 w-5" />}
          </button>

          <aside
            className={
              (mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full') +
              ' lg:translate-x-0 fixed lg:static inset-y-0 left-0 z-20 w-72 bg-white border-r border-gray-200 flex flex-col overflow-hidden transition-transform duration-300 ease-in-out'
            }
          >
            <div className="p-4 border-b border-gray-100 flex-shrink-0">
              <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Communities</h2>
              <p className="text-xs text-gray-400 mt-1">Select community to manage users</p>
            </div>
            <nav className="flex-1 overflow-y-auto p-2">
              {CATEGORIES.map(category => {
                const list = COMMUNITIES.filter(c => c.category === category);
                if (list.length === 0) return null;
                return (
                  <div key={category} className="mb-3">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-3 py-1.5">{category}</p>
                    {list.map(community => {
                      const CIcon = community.icon;
                      const isSelected = selectedCommunity.id === community.id;
                      return (
                        <button
                          key={community.id}
                          onClick={() => { setSelectedCommunity(community); setMobileSidebarOpen(false); setSearchQuery(''); }}
                          className={
                            'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all mb-0.5 ' +
                            (isSelected ? 'bg-indigo-50 border border-indigo-200 shadow-sm' : 'hover:bg-gray-50 border border-transparent')
                          }
                        >
                          <div className={'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ' + (isSelected ? 'bg-indigo-100' : 'bg-gray-100')}>
                            <CIcon className={'h-4 w-4 ' + (isSelected ? 'text-indigo-600' : community.color)} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={'text-sm font-medium truncate ' + (isSelected ? 'text-indigo-900' : 'text-gray-700')}>{community.name}</p>
                          </div>
                          {isSelected && <ChevronRight className="h-4 w-4 text-indigo-400 flex-shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </nav>
          </aside>

          {/* Working Area - Members List */}
          <main className="flex-1 overflow-y-auto p-4 lg:p-6">
            {/* Community Header */}
            <div className={'border rounded-xl p-5 mb-5 ' + selectedCommunity.bg}>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-white shadow-sm">
                  <CommunityIcon className={'h-6 w-6 ' + selectedCommunity.color} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{selectedCommunity.name}</h2>
                  <p className="text-sm text-gray-500">{members.length} member{members.length !== 1 ? 's' : ''} — click Edit to manage playlist access</p>
                </div>
              </div>
            </div>

            {/* Search Bar */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, mobile or user ID..."
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-400"
              />
            </div>

            {/* Members Table */}
            {loadingMembers ? (
              <div className="flex flex-col items-center justify-center py-20">
                <Loader className="h-8 w-8 text-indigo-500 animate-spin mb-3" />
                <p className="text-sm text-gray-500">Loading members...</p>
              </div>
            ) : filteredMembers.length === 0 ? (
              <div className="text-center py-20">
                <User className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-gray-500 mb-2">{members.length === 0 ? 'No Members' : 'No matches'}</h3>
                <p className="text-sm text-gray-400">{members.length === 0 ? 'No members found in ' + selectedCommunity.name + '.' : 'Try a different search.'}</p>
              </div>
            ) : (
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-left px-4 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">#</th>
                      <th className="text-left px-4 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Name</th>
                      <th className="text-left px-4 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider hidden sm:table-cell">Mobile</th>
                      <th className="text-left px-4 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider hidden md:table-cell">User ID</th>
                      <th className="text-left px-4 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Joined</th>
                      <th className="text-left px-4 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Status</th>
                      <th className="text-right px-4 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMembers.map((member, idx) => (
                      <tr key={member._id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-xs text-gray-400">{idx + 1}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                              <span className="text-xs font-bold text-indigo-600">{(member.name || '?')[0].toUpperCase()}</span>
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-gray-800 truncate">{member.name}</p>
                              <p className="text-[11px] text-gray-400 sm:hidden">{member.mobile}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 hidden sm:table-cell">
                          <span className="flex items-center gap-1.5"><Phone className="h-3 w-3 text-gray-400" />{member.mobile}</span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500 font-mono hidden md:table-cell">{member.userId}</td>
                        <td className="px-4 py-3 text-xs text-gray-400 hidden lg:table-cell">
                          {member.joinedAt ? new Date(member.joinedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '\u2014'}
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell">
                          <span className={
                            'text-[11px] font-bold px-2 py-1 rounded-full ' +
                            (member.status === 'active' ? 'bg-green-100 text-green-700'
                              : member.status === 'banned' ? 'bg-red-100 text-red-700'
                              : 'bg-gray-100 text-gray-600')
                          }>{member.status}</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => openEditModal(member)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-bold hover:bg-indigo-100 transition-colors"
                          >
                            <Edit className="h-3.5 w-3.5" />
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 text-xs text-gray-500">
                  Showing {filteredMembers.length} of {members.length} members
                </div>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* ========== Edit Playlist Access Modal ========== */}
      {editingMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                  <span className="text-sm font-bold text-indigo-600">{(editingMember.name || '?')[0].toUpperCase()}</span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{editingMember.name}</h3>
                  <p className="text-xs text-gray-500">{editingMember.mobile} &bull; {selectedCommunity.name}</p>
                </div>
              </div>
              <button onClick={closeModal} className="p-2 rounded-lg hover:bg-gray-200 transition-colors">
                <X className="h-5 w-5 text-gray-600" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {loadingModal ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader className="h-8 w-8 text-indigo-500 animate-spin mb-3" />
                  <p className="text-sm text-gray-500">Loading playlists...</p>
                </div>
              ) : (
                <>
                  {modalError && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm">
                      <AlertCircle className="h-4 w-4 flex-shrink-0" />{modalError}
                    </div>
                  )}
                  {modalSuccess && (
                    <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-700 text-sm">
                      <CheckCircle className="h-4 w-4 flex-shrink-0" />{modalSuccess}
                    </div>
                  )}

                  {/* All Access Toggle */}
                  <div className="flex items-center justify-between p-4 mb-4 bg-gray-50 border border-gray-200 rounded-xl">
                    <div>
                      <p className="text-sm font-bold text-gray-800">All Access</p>
                      <p className="text-xs text-gray-500">Grant access to all playlists including future ones</p>
                    </div>
                    <button
                      onClick={toggleModalAllAccess}
                      className={
                        'flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs transition-all ' +
                        (modalUserAccess?.allAccess
                          ? 'bg-green-500 text-white shadow-lg shadow-green-500/25'
                          : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50')
                      }
                    >
                      {modalUserAccess?.allAccess ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
                      {modalUserAccess?.allAccess ? 'ON' : 'OFF'}
                    </button>
                  </div>

                  {modalUserAccess?.allAccess && (
                    <div className="bg-green-50 border border-green-200 rounded-xl p-3 mb-4 flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                      <p className="text-xs text-green-700 font-medium">All playlists are accessible. Individual selections are overridden.</p>
                    </div>
                  )}

                  {/* Quick Actions */}
                  {!modalUserAccess?.allAccess && modalPlaylists.length > 0 && (
                    <div className="flex items-center gap-3 mb-3">
                      <button onClick={modalSelectAll} className="text-xs font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
                        <CheckSquare className="h-3.5 w-3.5" /> Select All
                      </button>
                      <span className="text-gray-300">|</span>
                      <button onClick={modalDeselectAll} className="text-xs font-medium text-gray-500 hover:text-gray-700 flex items-center gap-1">
                        <Square className="h-3.5 w-3.5" /> Deselect All
                      </button>
                      <span className="ml-auto text-xs text-gray-400">
                        {(modalUserAccess?.playlistIds || []).length} of {modalPlaylists.length} selected
                      </span>
                    </div>
                  )}

                  {/* No Playlists */}
                  {modalPlaylists.length === 0 && !loadingModal && (
                    <div className="text-center py-10">
                      <Video className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-sm text-gray-500 font-bold">No Playlists Found</p>
                      <p className="text-xs text-gray-400 mt-1">Create playlists in Community Recordings first.</p>
                    </div>
                  )}

                  {/* Playlist Checkboxes */}
                  <div className="space-y-2">
                    {modalPlaylists.map(playlist => {
                      const granted = isModalPlaylistGranted(playlist._id);

                      return (
                        <label
                          key={playlist._id}
                          className={
                            'flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ' +
                            (modalUserAccess?.allAccess
                              ? 'bg-green-50/50 border-green-200 opacity-75'
                              : granted
                                ? 'bg-indigo-50 border-indigo-200 shadow-sm'
                                : 'bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300')
                          }
                        >
                          <input
                            type="checkbox"
                            checked={granted}
                            onChange={() => toggleModalPlaylist(playlist._id)}
                            disabled={modalUserAccess?.allAccess}
                            className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500 cursor-pointer disabled:opacity-50"
                          />
                          <div className="flex-1 min-w-0">
                            <p className={'text-sm font-bold ' + (granted ? 'text-indigo-900' : 'text-gray-800')}>{playlist.playlist}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">{playlist.folder}</span>
                              <span className="text-[10px] text-gray-400">{playlist.videoCount} video{playlist.videoCount !== 1 ? 's' : ''}</span>
                            </div>
                          </div>
                          {granted && !modalUserAccess?.allAccess && (
                            <CheckCircle className="h-4 w-4 text-indigo-500 flex-shrink-0" />
                          )}
                        </label>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50 flex-shrink-0">
              <button onClick={closeModal} className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors">
                Cancel
              </button>
              <button
                onClick={saveUserAccess}
                disabled={savingModal || loadingModal}
                className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
              >
                {savingModal ? <Loader className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save Access
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
