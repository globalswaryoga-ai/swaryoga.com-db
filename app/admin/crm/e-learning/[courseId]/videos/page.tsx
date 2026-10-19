'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import {
  ArrowLeft, Plus, Edit2, Trash2, Video, Upload, Link as LinkIcon, X, Save, CloudUpload, Loader2,
  ArrowUp, ArrowDown, ChevronDown, MessageCircle, FileText, CheckSquare, HelpCircle, ClipboardList, Camera,
  Video as VideoIcon, Calendar, Clock, Globe, AlertCircle, Layers, Bell, ListTodo
} from 'lucide-react';

type ContentType = 'video' | 'material' | 'assignment' | 'task' | 'question' | 'zoom' | 'level';

interface UnifiedItem {
  _id: string;
  type: ContentType;
  title: string;
  order: number;
  levelNumber?: number;
  bunnyVideoId?: string;
  duration?: number;
  thumbnail?: string;
  isFree?: boolean;
  fileUrl?: string;
  materialType?: string;
  downloadable?: boolean;
  subType?: string;
  totalPoints?: number;
  isRequired?: boolean;
  description?: string;
  transcript?: string;
  aiSummary?: string;
  ragEnabled?: boolean;
  meetingDate?: string;
  meetingTime?: string;
  meetingUrl?: string;
  meetingId?: string;
  meetingPassword?: string;
  slots?: Array<{ date: string; time: string; joinUrl?: string; meetingId?: string; password?: string }>;
  checklist?: Array<{ id: string; text: string; hint?: string; required?: boolean }>;
  countdownHours?: number;
  reminderType?: string;
  reminderNote?: string;
  isRecurring?: boolean;
  questions?: any[];
}

interface VideoItem {
  _id: string;
  title: string;
  description?: string;
  bunnyVideoId?: string;
  duration: number;
  thumbnail?: string;
  order: number;
  sectionId?: string;
  isFree: boolean;
  isActive: boolean;
  hoursGap?: number;
  transcript?: string;
  aiSummary?: string;
  ragEnabled?: boolean;
}

interface CourseWithCommunity {
  _id: string;
  slug: string;
  content: { en: { title: string } };
  accessSettings?: {
    communityWhatsapp?: string;
    communityLink?: string;
  };
}

export default function VideosPage({ params }: { params: { courseId: string } }) {
  const router = useRouter();
  const token = useAuth();
  const { courseId } = params;

  const [course, setCourse] = useState<CourseWithCommunity | null>(null);
  const [unifiedList, setUnifiedList] = useState<UnifiedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [addModalType, setAddModalType] = useState<ContentType | null>(null);
  const [insertAfterOrder, setInsertAfterOrder] = useState<number>(0);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editingItem, setEditingItem] = useState<UnifiedItem | null>(null);

  const [showAddLevelModal, setShowAddLevelModal] = useState(false);
  const [editingLevel, setEditingLevel] = useState<UnifiedItem | null>(null);

  const [reordering, setReordering] = useState<string | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  const [communityWhatsapp, setCommunityWhatsapp] = useState('');
  const [communityLink, setCommunityLink] = useState('');
  const [communityExpanded, setCommunityExpanded] = useState(false);
  const [savingCommunity, setSavingCommunity] = useState(false);

  // Auth check
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const userStr = localStorage.getItem('admin_user');
    let resolvedUserId = localStorage.getItem('adminUser') || '';
    let legacyPerms: string[] = [];
    let pv2: any = null;
    if (userStr) {
      try {
        const u = JSON.parse(userStr);
        resolvedUserId = (u?.userId as string) || resolvedUserId;
        legacyPerms = Array.isArray(u?.permissions) ? u.permissions : [];
        pv2 = u?.permissionsV2 || null;
      } catch {
        // ignore
      }
    }
    const superAdmin =
      resolvedUserId === 'admin' ||
      resolvedUserId === 'admincrm' ||
      legacyPerms.includes('all') ||
      pv2?.isSuperAdmin === true;
    setIsSuperAdmin(superAdmin);
    setAuthChecked(true);
  }, [router]);

  // Fetch all content - videos, materials, assignments, levels
  const fetchData = useCallback(async () => {
    if (!token || !courseId) return;

    try {
      setLoading(true);
      setError(null);

      const [coursesRes, videosRes, materialsRes, assignmentsRes, sectionsRes] = await Promise.all([
        fetch('/api/admin/recorded-courses', { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/admin/recorded-courses/videos?courseId=${courseId}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/admin/e-learning/materials?courseId=${courseId}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/admin/e-learning/assignments?courseId=${courseId}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/admin/recorded-courses/sections?courseId=${courseId}`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      const [coursesData, videosData, materialsData, assignmentsData, sectionsData] = await Promise.all([
        coursesRes.json(),
        videosRes.json(),
        materialsRes.json(),
        assignmentsRes.json(),
        sectionsRes.json(),
      ]);

      // Build unified list
      const items: UnifiedItem[] = [];

      if (videosData.success && videosData.videos) {
        videosData.videos.forEach((v: any) => {
          items.push({
            _id: v._id,
            type: 'video',
            title: v.title,
            order: v.order,
            bunnyVideoId: v.bunnyVideoId,
            duration: v.duration,
            thumbnail: v.thumbnail,
            isFree: v.isFree,
            description: v.description,
            transcript: v.transcript,
            aiSummary: v.aiSummary,
            ragEnabled: v.ragEnabled,
          });
        });
      }

      if (materialsData.success && materialsData.materials) {
        materialsData.materials.forEach((m: any) => {
          const isZoom = m.type === 'zoom' || m.materialType === 'zoom' || m.fileType === 'zoom';
          const contentObj = m.content?.en || m.content || {};
          items.push({
            _id: m._id,
            type: isZoom ? 'zoom' : 'material',
            title: contentObj.title || m.title || 'Untitled Material',
            order: m.order,
            fileUrl: m.fileUrl,
            materialType: m.type,
            downloadable: m.downloadable,
            description: contentObj.description || m.description,
            meetingDate: contentObj.meetingDate || m.meetingDate,
            meetingTime: contentObj.meetingTime || m.meetingTime,
            meetingUrl: m.fileUrl || contentObj.meetingUrl,
            meetingId: contentObj.meetingId,
            meetingPassword: contentObj.meetingPassword,
            slots: contentObj.slots || [],
          });
        });
      }

      if (assignmentsData.success && assignmentsData.assignments) {
        assignmentsData.assignments.forEach((a: any) => {
          const contentObj = a.content?.en || a.content || {};
          const subType = a.subType || contentObj.subType || 'assignment';
          const mappedType: ContentType = subType === 'task' ? 'task'
            : subType === 'question' ? 'question'
            : 'assignment';

          items.push({
            _id: a._id,
            type: mappedType,
            title: contentObj.title || a.title || 'Untitled',
            order: a.order !== undefined && a.order !== null ? Number(a.order) : 1,
            subType,
            totalPoints: a.totalPoints,
            isRequired: a.isRequired ?? contentObj.isRequired,
            description: contentObj.description || a.description,
            checklist: a.checklist || contentObj.checklist || [],
            countdownHours: a.countdownHours ?? contentObj.countdownHours,
            reminderType: a.reminderType || contentObj.reminderType,
            reminderNote: a.reminderNote || contentObj.reminderNote,
            isRecurring: a.isRecurring ?? contentObj.isRecurring,
            questions: a.questions || contentObj.questions || [],
          });
        });
      }

      if (sectionsData.success && sectionsData.sections) {
        sectionsData.sections.forEach((s: any) => {
          const contentObj = s.content?.en || s.content || {};
          items.push({
            _id: s._id || s.id,
            type: 'level',
            title: contentObj.title || s.title || `Level ${s.order || 1}`,
            levelNumber: Number(contentObj.levelNumber || s.order || 1),
            order: s.order !== undefined && s.order !== null ? Number(s.order) : 0,
            description: contentObj.description || s.description || '',
          });
        });
      }

      items.sort((a, b) => a.order - b.order);
      setUnifiedList(items);

      // Get course data
      if (coursesData.success) {
        const found = coursesData.courses?.find((c: any) => c._id === courseId);
        if (found) {
          setCourse(found);
          setCommunityWhatsapp(found.accessSettings?.communityWhatsapp || '');
          setCommunityLink(found.accessSettings?.communityLink || '');
        }
      }

      setLoading(false);
    } catch (err) {
      console.error('Fetch error:', err);
      setError('Failed to load content');
      setLoading(false);
    }
  }, [token, courseId]);

  useEffect(() => {
    if (token && courseId) {
      fetchData();
    }
  }, [token, courseId, fetchData]);

  // Move item up/down
  const moveItem = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= unifiedList.length) return;

    const movingItem = unifiedList[index];

    // Splice and move to new position in array
    const newList = [...unifiedList];
    const [moved] = newList.splice(index, 1);
    newList.splice(targetIndex, 0, moved);

    // Reassign normalized orders (0, 10, 20, 30...)
    const reorderedList = newList.map((item, idx) => ({
      ...item,
      order: idx * 10,
    }));

    setUnifiedList(reorderedList);
    setReordering(movingItem._id);

    try {
      // Patch items whose order changed
      await Promise.all(
        reorderedList
          .filter((item, idx) => unifiedList[idx]?._id !== item._id || unifiedList[idx]?.order !== item.order)
          .map(item => patchOrder(item, item.order))
      );
    } catch (err) {
      console.error('Reorder error:', err);
      setError('Failed to reorder');
      fetchData();
    } finally {
      setReordering(null);
    }
  };

  const patchOrder = async (item: UnifiedItem, newOrder: number) => {
    const url = item.type === 'video' ? '/api/admin/recorded-courses/videos'
      : item.type === 'material' || item.type === 'zoom' ? '/api/admin/e-learning/materials'
      : item.type === 'level' ? '/api/admin/recorded-courses/sections'
      : '/api/admin/e-learning/assignments';

    const key = item.type === 'video' ? 'videoId'
      : item.type === 'material' || item.type === 'zoom' ? 'materialId'
      : item.type === 'level' ? 'sectionId'
      : 'assignmentId';

    const res = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ [key]: item._id, order: newOrder }),
    });

    if (!res.ok) throw new Error('Reorder failed');
  };

  // Delete item
  const deleteItem = async (item: UnifiedItem) => {
    if (!confirm('Delete this item?')) return;

    try {
      const url = item.type === 'video' ? `/api/admin/recorded-courses/videos?id=${item._id}`
        : item.type === 'material' || item.type === 'zoom' ? `/api/admin/e-learning/materials?id=${item._id}`
        : item.type === 'level' ? `/api/admin/recorded-courses/sections?id=${item._id}`
        : `/api/admin/e-learning/assignments?id=${item._id}`;

      const res = await fetch(url, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        setUnifiedList(prev => prev.filter(i => i._id !== item._id));
      }
    } catch (err) {
      setError('Failed to delete item');
    }
  };

  // Save community links
  const saveCommunityLinks = async () => {
    setSavingCommunity(true);
    try {
      const res = await fetch('/api/admin/recorded-courses', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          courseId,
          accessSettings: { communityWhatsapp, communityLink },
        }),
      });

      if (res.ok) {
        setError(null);
      } else {
        setError('Failed to save community links');
      }
    } catch (err) {
      setError('Failed to save');
    } finally {
      setSavingCommunity(false);
    }
  };

  if (!authChecked || loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-green-500" />
      </div>
    );
  }

  const levelCount = unifiedList.filter(i => i.type === 'level').length;
  const videoCount = unifiedList.filter(i => i.type === 'video').length;
  const materialCount = unifiedList.filter(i => i.type === 'material').length;
  const taskCount = unifiedList.filter(i => i.type === 'task' || i.type === 'question' || i.type === 'assignment').length;

  return (
    <div className="min-h-screen bg-black p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          <Link href={`/admin/crm/e-learning`} className="p-2 hover:bg-gray-800 rounded-lg text-gray-400">
            <ArrowLeft size={24} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">Course Content</h1>
            <p className="text-sm text-gray-400">
              {unifiedList.length} items — {levelCount} levels, {videoCount} videos, {materialCount} PDFs, {taskCount} tasks/assignments
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setEditingLevel(null);
              setShowAddLevelModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold rounded-lg shadow-lg shadow-purple-600/20 transition-all"
          >
            <Layers size={18} /> Add Level
          </button>
          <button
            onClick={() => {
              setAddModalType(null);
              setInsertAfterOrder((unifiedList[unifiedList.length - 1]?.order || 0) + 10);
              setShowAddModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-black font-semibold rounded-lg"
          >
            <Plus size={18} /> Add Content
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-lg mb-6">
          {error}
        </div>
      )}

      {/* Community Links Panel */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-xl mb-6 overflow-hidden">
        <button
          onClick={() => setCommunityExpanded(!communityExpanded)}
          className="w-full flex items-center justify-between p-4 hover:bg-gray-800/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <MessageCircle size={20} className="text-green-400" />
            <span className="text-white font-medium">Community Links</span>
            {(communityWhatsapp || communityLink) && (
              <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full">Set</span>
            )}
          </div>
          <ChevronDown
            size={20}
            className={`text-gray-400 transition-transform ${communityExpanded ? 'rotate-180' : ''}`}
          />
        </button>

        {communityExpanded && (
          <div className="px-4 pb-4 space-y-3 border-t border-gray-800 pt-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">WhatsApp Group Link</label>
              <input
                type="url"
                value={communityWhatsapp}
                onChange={(e) => setCommunityWhatsapp(e.target.value)}
                placeholder="https://chat.whatsapp.com/..."
                className="w-full px-4 py-2 bg-black border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-green-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">Community Platform Link</label>
              <input
                type="url"
                value={communityLink}
                onChange={(e) => setCommunityLink(e.target.value)}
                placeholder="Discord, Telegram, or other community link"
                className="w-full px-4 py-2 bg-black border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-green-500 focus:outline-none"
              />
            </div>
            <button
              onClick={saveCommunityLinks}
              disabled={savingCommunity}
              className="w-full px-4 py-2 bg-green-500 hover:bg-green-600 text-black font-semibold rounded-lg disabled:opacity-50"
            >
              {savingCommunity ? 'Saving...' : 'Save Links'}
            </button>
          </div>
        )}
      </div>

      {/* Content List */}
      <div className="space-y-2">
        {/* Top insert zone: beginning of course */}
        {unifiedList.length > 0 && (
          <div className="flex items-center gap-2 mb-3">
            <button
              onClick={() => {
                setEditingLevel(null);
                setInsertAfterOrder(-1);
                setShowAddLevelModal(true);
              }}
              className="flex-1 border-dashed border border-purple-500/50 bg-purple-950/20 text-purple-300 hover:text-white hover:bg-purple-950/40 py-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5"
            >
              <Layers size={14} /> + Add Level Header at top (Beginning of Course)
            </button>
            <button
              onClick={() => {
                setAddModalType(null);
                setInsertAfterOrder(-1);
                setShowAddModal(true);
              }}
              className="border-dashed border border-gray-700 text-gray-400 hover:text-white hover:border-gray-500 px-3 py-2 rounded-lg text-xs transition-all"
            >
              + Add content at top
            </button>
          </div>
        )}

        {unifiedList.length === 0 ? (
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-8 text-center">
            <p className="text-gray-400">No content yet. Click "Add Content" to get started.</p>
          </div>
        ) : (
          unifiedList.map((item, idx) => (
            <div key={`${item.type}-${item._id}`}>
              {/* Insert zone before item */}
              {idx > 0 && (
                <div className="flex items-center gap-2 py-1 my-1">
                  <button
                    onClick={() => {
                      setAddModalType(null);
                      setInsertAfterOrder((unifiedList[idx - 1].order + item.order) / 2);
                      setShowAddModal(true);
                    }}
                    className="flex-1 border-dashed border border-gray-800 text-gray-500 hover:border-gray-600 hover:text-gray-300 py-1 rounded text-xs transition-colors"
                  >
                    + Add content here
                  </button>
                  <button
                    onClick={() => {
                      setEditingLevel(null);
                      setInsertAfterOrder((unifiedList[idx - 1].order + item.order) / 2);
                      setShowAddLevelModal(true);
                    }}
                    className="border-dashed border border-purple-500/30 text-purple-400/70 hover:border-purple-400 hover:text-purple-300 px-2.5 py-1 rounded text-xs transition-colors flex items-center gap-1"
                  >
                    <Layers size={12} /> + Add Level here
                  </button>
                </div>
              )}

              {/* Content Row */}
              {item.type === 'level' ? (
                <div className="bg-gradient-to-r from-purple-950/70 via-indigo-950/50 to-gray-900 border-2 border-purple-500/50 rounded-xl p-4 sm:p-5 flex flex-wrap sm:flex-nowrap items-center gap-3 sm:gap-4 shadow-xl shadow-purple-950/30 group">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 text-white flex items-center justify-center font-black text-sm flex-shrink-0 shadow-lg shadow-purple-600/30">
                    L{item.levelNumber || idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-purple-500 text-white tracking-wider shadow">
                        Level {item.levelNumber || 1} Header
                      </span>
                    </div>
                    <h3 className="text-white font-extrabold text-lg truncate">{item.title}</h3>
                    {item.description && (
                      <p className="text-xs text-gray-300 line-clamp-1 mt-0.5">{item.description}</p>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => moveItem(idx, 'up')}
                      disabled={idx === 0 || reordering === item._id}
                      className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Move up"
                    >
                      {reordering === item._id ? <Loader2 size={18} className="animate-spin" /> : <ArrowUp size={18} />}
                    </button>
                    <button
                      onClick={() => moveItem(idx, 'down')}
                      disabled={idx === unifiedList.length - 1 || reordering === item._id}
                      className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Move down"
                    >
                      {reordering === item._id ? <Loader2 size={18} className="animate-spin" /> : <ArrowDown size={18} />}
                    </button>
                    <button
                      onClick={() => { setEditingLevel(item); setShowAddLevelModal(true); }}
                      className="p-2 hover:bg-purple-500/20 text-purple-400 rounded-lg transition-colors"
                      title="Edit level"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button
                      onClick={() => deleteItem(item)}
                      className="p-2 hover:bg-red-500/20 rounded-lg text-red-400 hover:text-red-300 transition-colors"
                      title="Delete level"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4 flex flex-wrap sm:flex-nowrap items-start sm:items-center gap-2 sm:gap-4 group">
                  {/* Position Badge */}
                  <div className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center font-bold text-white flex-shrink-0">
                    {item.type === 'video'
                      ? unifiedList.slice(0, idx + 1).filter(i => i.type === 'video').length
                      : idx + 1}
                  </div>

                  {/* Thumbnail */}
                  {item.type === 'video' && item.thumbnail && (
                    <div className="w-16 h-12 bg-gray-950 rounded-lg flex-shrink-0 overflow-hidden border border-gray-700 flex items-center justify-center">
                      <img
                        src={item.thumbnail}
                        alt={item.title}
                        className="w-full h-full object-contain"
                        onError={(e) => (e.currentTarget.style.display = 'none')}
                      />
                    </div>
                  )}

                  {/* Type Badge */}
                  <div className={`px-3 py-1 rounded-lg text-xs font-semibold flex-shrink-0 ${
                    item.type === 'video' ? 'bg-blue-500/20 text-blue-400'
                    : item.type === 'zoom' ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                    : item.type === 'material' ? 'bg-orange-500/20 text-orange-400'
                    : item.type === 'task' ? 'bg-yellow-500/20 text-yellow-400'
                    : item.type === 'question' ? 'bg-teal-500/20 text-teal-400'
                    : 'bg-purple-500/20 text-purple-400'
                  }`}>
                    {item.type === 'video' && <Camera size={12} className="inline mr-1" />}
                    {item.type === 'zoom' && <VideoIcon size={12} className="inline mr-1 text-indigo-400" />}
                    {item.type === 'material' && <FileText size={12} className="inline mr-1" />}
                    {item.type === 'task' && <CheckSquare size={12} className="inline mr-1" />}
                    {item.type === 'question' && <HelpCircle size={12} className="inline mr-1" />}
                    {item.type === 'assignment' && <ClipboardList size={12} className="inline mr-1" />}
                    {item.type === 'zoom' ? 'Zoom Meeting' : item.type.charAt(0).toUpperCase() + item.type.slice(1)}
                  </div>

                  {/* Content Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-medium truncate">{item.title}</h3>
                    <p className="text-xs text-gray-500">
                      {item.type === 'video' && item.duration ? `${Math.round(item.duration / 60)}min`
                        : item.type === 'zoom' ? `Live Zoom • ${item.meetingDate || 'Scheduled'}${item.meetingTime ? ` at ${item.meetingTime}` : ''}${item.slots?.length ? ` (${item.slots.length} slots)` : ''}`
                        : item.type === 'material' ? `${item.materialType || 'file'}${item.downloadable ? ' • Downloadable' : ''}`
                        : item.type === 'assignment' ? `${item.totalPoints || 0} pts`
                        : item.type === 'task' ? `To-Do Checklist • ${item.checklist?.length || 0} action items${item.countdownHours ? ` • ⏱️ ${item.countdownHours}h countdown` : ''}${item.isRecurring ? ' • 🔄 Daily repeat' : ''}`
                        : item.type === 'question' ? 'Quiz Question'
                        : ''}
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => moveItem(idx, 'up')}
                      disabled={idx === 0 || reordering === item._id}
                      className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      {reordering === item._id ? <Loader2 size={18} className="animate-spin" /> : <ArrowUp size={18} />}
                    </button>
                    <button
                      onClick={() => moveItem(idx, 'down')}
                      disabled={idx === unifiedList.length - 1 || reordering === item._id}
                      className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      {reordering === item._id ? <Loader2 size={18} className="animate-spin" /> : <ArrowDown size={18} />}
                    </button>
                    <button
                      onClick={() => { setEditingItem(item); setShowEditModal(true); }}
                      className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button
                      onClick={() => deleteItem(item)}
                      className="p-2 hover:bg-red-500/20 rounded-lg text-red-400 hover:text-red-300"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}

        {/* Insert zone after last item */}
        {unifiedList.length > 0 && (
          <div className="flex items-center gap-2 mt-4">
            <button
              onClick={() => {
                setAddModalType(null);
                setInsertAfterOrder((unifiedList[unifiedList.length - 1]?.order || 0) + 10);
                setShowAddModal(true);
              }}
              className="flex-1 border-dashed border border-gray-700 text-gray-400 py-2 rounded-lg text-xs hover:border-gray-500 hover:text-white transition-all"
            >
              + Add content at end
            </button>
            <button
              onClick={() => {
                setEditingLevel(null);
                setInsertAfterOrder((unifiedList[unifiedList.length - 1]?.order || 0) + 10);
                setShowAddLevelModal(true);
              }}
              className="border-dashed border border-purple-500/40 text-purple-400 hover:border-purple-400 hover:text-white px-4 py-2 rounded-lg text-xs transition-all flex items-center gap-1.5"
            >
              <Layers size={14} /> + Add Next Level
            </button>
          </div>
        )}
      </div>

      {/* Modals - keep existing ones */}
      {showEditModal && editingItem?.type === 'video' && token && (
        <EditVideoModal
          token={token}
          video={editingItem as unknown as VideoItem}
          onClose={() => { setShowEditModal(false); setEditingItem(null); }}
          onUpdated={() => { setShowEditModal(false); fetchData(); }}
        />
      )}

      {showEditModal && editingItem?.type === 'material' && token && (
        <AddMaterialModal
          token={token}
          courseId={courseId}
          order={editingItem.order || 0}
          existingMaterial={editingItem}
          onClose={() => { setShowEditModal(false); setEditingItem(null); }}
          onAdded={() => { setShowEditModal(false); setEditingItem(null); fetchData(); }}
        />
      )}

      {showEditModal && editingItem?.type === 'task' && token && (
        <AddTaskModal
          token={token}
          courseId={courseId}
          order={editingItem.order || 0}
          existingItem={editingItem}
          onClose={() => { setShowEditModal(false); setEditingItem(null); }}
          onAdded={() => { setShowEditModal(false); setEditingItem(null); fetchData(); }}
        />
      )}

      {showEditModal && editingItem?.type === 'question' && token && (
        <AddQuestionModal
          token={token}
          courseId={courseId}
          order={editingItem.order || 0}
          existingItem={editingItem}
          onClose={() => { setShowEditModal(false); setEditingItem(null); }}
          onAdded={() => { setShowEditModal(false); setEditingItem(null); fetchData(); }}
        />
      )}

      {showEditModal && editingItem?.type === 'assignment' && token && (
        <AddAssignmentModal
          token={token}
          courseId={courseId}
          subType="assignment"
          order={editingItem.order || 0}
          existingItem={editingItem}
          onClose={() => { setShowEditModal(false); setEditingItem(null); }}
          onAdded={() => { setShowEditModal(false); setEditingItem(null); fetchData(); }}
        />
      )}

      {showAddLevelModal && token && (
        <AddLevelModal
          token={token}
          courseId={courseId}
          existingLevel={editingLevel}
          defaultLevelNumber={
            (unifiedList.filter((i) => i.type === 'level').reduce((max, i) => Math.max(max, i.levelNumber || 0), 0) || 0) + 1
          }
          insertOrder={insertAfterOrder}
          onClose={() => {
            setShowAddLevelModal(false);
            setEditingLevel(null);
          }}
          onSaved={() => {
            setShowAddLevelModal(false);
            setEditingLevel(null);
            fetchData();
          }}
        />
      )}

      {showAddModal && !addModalType && (
        <TypeSelectorModal
          onSelect={(type) => {
            if (type === 'level') {
              setShowAddModal(false);
              setEditingLevel(null);
              setShowAddLevelModal(true);
            } else {
              setAddModalType(type);
            }
          }}
          onClose={() => setShowAddModal(false)}
        />
      )}

      {showAddModal && addModalType === 'video' && token && (
        <AddVideoModal
          token={token}
          courseId={courseId}
          onClose={() => { setShowAddModal(false); setAddModalType(null); }}
          onAdded={() => { setShowAddModal(false); setAddModalType(null); fetchData(); }}
        />
      )}

      {showAddModal && addModalType === 'material' && token && (
        <AddMaterialModal
          token={token}
          courseId={courseId}
          order={insertAfterOrder}
          onClose={() => { setShowAddModal(false); setAddModalType(null); }}
          onAdded={() => { setShowAddModal(false); setAddModalType(null); fetchData(); }}
        />
      )}

      {showAddModal && addModalType === 'zoom' && token && (
        <AddZoomMeetingModal
          token={token}
          courseId={courseId}
          order={insertAfterOrder}
          onClose={() => { setShowAddModal(false); setAddModalType(null); }}
          onAdded={() => { setShowAddModal(false); setAddModalType(null); fetchData(); }}
        />
      )}

      {showAddModal && addModalType === 'task' && token && (
        <AddTaskModal
          token={token}
          courseId={courseId}
          order={insertAfterOrder}
          onClose={() => { setShowAddModal(false); setAddModalType(null); }}
          onAdded={() => { setShowAddModal(false); setAddModalType(null); fetchData(); }}
        />
      )}

      {showAddModal && addModalType === 'question' && token && (
        <AddQuestionModal
          token={token}
          courseId={courseId}
          order={insertAfterOrder}
          onClose={() => { setShowAddModal(false); setAddModalType(null); }}
          onAdded={() => { setShowAddModal(false); setAddModalType(null); fetchData(); }}
        />
      )}

      {showAddModal && addModalType === 'assignment' && token && (
        <AddAssignmentModal
          token={token}
          courseId={courseId}
          subType="assignment"
          order={insertAfterOrder}
          onClose={() => { setShowAddModal(false); setAddModalType(null); }}
          onAdded={() => { setShowAddModal(false); setAddModalType(null); fetchData(); }}
        />
      )}
    </div>
  );
}

// Type Selector Modal
function TypeSelectorModal({ onSelect, onClose }: { onSelect: (type: ContentType) => void; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-start sm:items-center justify-center z-50 p-2 sm:p-4 overflow-y-auto">
      <div className="bg-gray-900 rounded-2xl border border-gray-800 w-full max-w-md max-h-[calc(100dvh-2rem)] sm:max-h-[88vh] flex flex-col shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-gray-800 bg-gray-900 shrink-0">
          <h2 className="text-xl font-bold text-white">Add Content Type</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="p-4 sm:p-6 space-y-3 overflow-y-auto flex-1">
          {[
            { type: 'level' as ContentType, label: 'Course Level / Section Header', icon: Layers, color: 'purple' },
            { type: 'video' as ContentType, label: 'Video', icon: Camera, color: 'blue' },
            { type: 'zoom' as ContentType, label: 'Live Zoom Meeting (Slots & Countdown)', icon: VideoIcon, color: 'indigo' },
            { type: 'material' as ContentType, label: 'PDF / Material', icon: FileText, color: 'orange' },
            { type: 'assignment' as ContentType, label: 'Assignment', icon: ClipboardList, color: 'purple' },
            { type: 'task' as ContentType, label: 'Task', icon: CheckSquare, color: 'yellow' },
            { type: 'question' as ContentType, label: 'Question', icon: HelpCircle, color: 'teal' },
          ].map(({ type, label, icon: Icon, color }) => (
            <button
              key={type}
              onClick={() => onSelect(type)}
              className={`w-full flex items-center gap-3 p-4 rounded-lg border-2 transition-all ${
                color === 'blue' ? 'bg-blue-500/10 border-blue-500/50 hover:border-blue-500'
                : color === 'indigo' ? 'bg-indigo-500/10 border-indigo-500/50 hover:border-indigo-500'
                : color === 'orange' ? 'bg-orange-500/10 border-orange-500/50 hover:border-orange-500'
                : color === 'purple' ? 'bg-purple-500/10 border-purple-500/50 hover:border-purple-500'
                : color === 'yellow' ? 'bg-yellow-500/10 border-yellow-500/50 hover:border-yellow-500'
                : 'bg-teal-500/10 border-teal-500/50 hover:border-teal-500'
              }`}
            >
              <Icon size={24} className={
                color === 'blue' ? 'text-blue-400'
                : color === 'indigo' ? 'text-indigo-400'
                : color === 'orange' ? 'text-orange-400'
                : color === 'purple' ? 'text-purple-400'
                : color === 'yellow' ? 'text-yellow-400'
                : 'text-teal-400'
              } />
              <span className="text-white font-medium">{label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// Add Live Zoom Meeting Modal
function AddZoomMeetingModal({ token, courseId, order, onClose, onAdded }: {
  token: string;
  courseId: string;
  order: number;
  onClose: () => void;
  onAdded: () => void;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [meetingUrl, setMeetingUrl] = useState('');
  const [meetingId, setMeetingId] = useState('');
  const [meetingPassword, setMeetingPassword] = useState('');
  const [slots, setSlots] = useState<Array<{ date: string; time: string; joinUrl?: string }>>([
    { date: '', time: '07:00' },
    { date: '', time: '19:00' }
  ]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addSlot = () => {
    setSlots([...slots, { date: '', time: '07:00' }]);
  };

  const removeSlot = (index: number) => {
    setSlots(slots.filter((_, i) => i !== index));
  };

  const updateSlot = (index: number, field: 'date' | 'time' | 'joinUrl', val: string) => {
    const updated = [...slots];
    updated[index] = { ...updated[index], [field]: val };
    setSlots(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !meetingUrl) {
      setError('Meeting Title and Zoom Join URL are required');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const firstSlot = slots.find(s => s.date) || slots[0];
      const res = await fetch('/api/admin/e-learning/materials', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          courseId,
          title,
          fileUrl: meetingUrl,
          fileType: 'zoom',
          order,
          content: {
            en: {
              title,
              description,
              meetingUrl,
              meetingId,
              meetingPassword,
              meetingDate: firstSlot?.date || '',
              meetingTime: firstSlot?.time || '',
              slots: slots.filter(s => s.date || s.time),
            }
          }
        }),
      });

      if (res.ok) {
        onAdded();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to save Zoom meeting');
      }
    } catch (err: any) {
      setError(err.message || 'Error saving Zoom meeting');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-start sm:items-center justify-center z-50 p-2 sm:p-4 overflow-y-auto">
      <div className="bg-gray-900 rounded-2xl border border-gray-800 w-full max-w-xl max-h-[calc(100dvh-2rem)] sm:max-h-[88vh] flex flex-col shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-gray-800 bg-gray-900 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center">
              <VideoIcon className="text-indigo-400" size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Add Live Zoom Meeting</h2>
              <p className="text-xs text-gray-400">Add date/time slots with countdown for students</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-indigo-400 mb-1">Session / Meeting Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Live Q&A & Swar Sadhana Session"
              className="w-full px-4 py-2.5 bg-black border border-gray-700 rounded-lg text-white focus:border-indigo-500 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Description (Optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Instructions or guidelines for students before joining..."
              rows={2}
              className="w-full px-4 py-2 bg-black border border-gray-700 rounded-lg text-white focus:border-indigo-500 focus:outline-none resize-none text-sm"
            />
          </div>

          <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-xl p-4 space-y-3">
            <h3 className="text-sm font-bold text-indigo-300 flex items-center gap-2">
              <LinkIcon size={16} />
              Zoom Connection Details
            </h3>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">Zoom Meeting Join URL *</label>
              <input
                type="url"
                value={meetingUrl}
                onChange={(e) => setMeetingUrl(e.target.value)}
                placeholder="https://us02web.zoom.us/j/1234567890?pwd=..."
                className="w-full px-4 py-2 bg-black border border-gray-700 rounded-lg text-white focus:border-indigo-500 focus:outline-none font-mono text-sm"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Meeting ID</label>
                <input
                  type="text"
                  value={meetingId}
                  onChange={(e) => setMeetingId(e.target.value)}
                  placeholder="892 1234 5678"
                  className="w-full px-3 py-2 bg-black border border-gray-700 rounded-lg text-white focus:border-indigo-500 focus:outline-none text-sm font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Passcode / Password</label>
                <input
                  type="text"
                  value={meetingPassword}
                  onChange={(e) => setMeetingPassword(e.target.value)}
                  placeholder="SWAR2024"
                  className="w-full px-3 py-2 bg-black border border-gray-700 rounded-lg text-white focus:border-indigo-500 focus:outline-none text-sm font-mono"
                />
              </div>
            </div>
          </div>

          {/* Slot Selection */}
          <div className="border border-gray-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Calendar size={16} className="text-green-400" />
                  Available Date & Time Slots
                </h3>
                <p className="text-xs text-gray-500">Students can select a slot and see live countdown</p>
              </div>
              <button
                type="button"
                onClick={addSlot}
                className="px-3 py-1 bg-green-500/20 text-green-400 hover:bg-green-500/30 rounded-lg text-xs font-bold transition-colors flex items-center gap-1"
              >
                <Plus size={14} /> Add Slot
              </button>
            </div>

            <div className="space-y-2">
              {slots.map((slot, idx) => (
                <div key={idx} className="flex items-center gap-2 bg-black/60 p-2.5 rounded-lg border border-gray-800">
                  <div className="flex-1">
                    <label className="block text-[10px] text-gray-400 uppercase font-semibold mb-0.5">Date</label>
                    <input
                      type="date"
                      value={slot.date}
                      onChange={(e) => updateSlot(idx, 'date', e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-gray-900 border border-gray-700 rounded text-white text-xs focus:border-green-500 focus:outline-none"
                    />
                  </div>
                  <div className="w-32">
                    <label className="block text-[10px] text-gray-400 uppercase font-semibold mb-0.5">Time</label>
                    <input
                      type="time"
                      value={slot.time}
                      onChange={(e) => updateSlot(idx, 'time', e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-gray-900 border border-gray-700 rounded text-white text-xs focus:border-green-500 focus:outline-none"
                    />
                  </div>
                  {slots.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeSlot(idx)}
                      className="mt-4 p-1.5 text-gray-500 hover:text-red-400 rounded"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
          </div>

          <div className="flex items-center justify-end gap-3 p-4 sm:p-5 border-t border-gray-800 bg-gray-900 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-gray-400 hover:text-white text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-sm flex items-center gap-2 disabled:opacity-50 transition-colors"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <VideoIcon size={16} />}
              Save Zoom Meeting
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Add Material Modal
function AddMaterialModal({ token, courseId, order, existingMaterial, onClose, onAdded }: {
  token: string;
  courseId: string;
  order: number;
  existingMaterial?: UnifiedItem | null;
  onClose: () => void;
  onAdded: () => void;
}) {
  const [title, setTitle] = useState(existingMaterial?.title || '');
  const [description, setDescription] = useState(existingMaterial?.description || '');
  const [fileUrl, setFileUrl] = useState(existingMaterial?.fileUrl || (existingMaterial as any)?.url || '');
  const [type, setType] = useState<'pdf' | 'notes' | 'other'>((existingMaterial?.materialType as any) || 'pdf');
  const [downloadable, setDownloadable] = useState(existingMaterial?.downloadable !== false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inputMode, setInputMode] = useState<'url' | 'upload'>('url');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleFileUpload = async () => {
    if (!uploadFile) return;

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', uploadFile);

      const res = await fetch('/api/bunny/upload-material', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setFileUrl(data.url);
        setUploadFile(null);
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to upload file');
      }
    } catch (err) {
      setError('Error uploading file to Bunny');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !fileUrl) return;

    setSaving(true);
    setError(null);

    try {
      const isEdit = Boolean(existingMaterial?._id);
      const url = '/api/admin/e-learning/materials';
      const method = isEdit ? 'PUT' : 'POST';
      const payload: any = {
        courseId,
        content: { en: { title, description } },
        type,
        fileUrl,
        downloadable,
        order,
      };
      if (isEdit) {
        payload.materialId = existingMaterial?._id;
      }

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        onAdded();
      } else {
        const data = await res.json();
        setError(data.error || `Failed to ${isEdit ? 'update' : 'add'} material`);
      }
    } catch (err) {
      setError('Error saving material');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-start sm:items-center justify-center z-50 p-2 sm:p-4 overflow-y-auto">
      <div className="bg-gray-900 rounded-2xl border border-gray-800 w-full max-w-lg max-h-[calc(100dvh-2rem)] sm:max-h-[88vh] flex flex-col shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-gray-800 bg-gray-900 shrink-0">
          <h2 className="text-xl font-bold text-white">{existingMaterial ? 'Edit Material / PDF' : 'Add Material / PDF'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-green-400 mb-2">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-3 bg-black border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-green-500 focus:outline-none"
              placeholder="Material title"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-green-400 mb-2">Description (Optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full px-4 py-3 bg-black border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-green-500 focus:outline-none resize-none"
              placeholder="Brief description"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-green-400 mb-3">File Source</label>
            <div className="flex gap-2 mb-4">
              <button
                type="button"
                onClick={() => { setInputMode('url'); setUploadFile(null); }}
                className={`flex-1 py-2 px-3 rounded-lg font-medium transition-colors ${
                  inputMode === 'url'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                Paste URL
              </button>
              <button
                type="button"
                onClick={() => { setInputMode('upload'); setFileUrl(''); }}
                className={`flex-1 py-2 px-3 rounded-lg font-medium transition-colors ${
                  inputMode === 'upload'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                Upload File
              </button>
            </div>

            {inputMode === 'url' ? (
              <div>
                <input
                  type="url"
                  value={fileUrl}
                  onChange={(e) => setFileUrl(e.target.value)}
                  className="w-full px-4 py-3 bg-black border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-green-500 focus:outline-none"
                  placeholder="https://example.com/file.pdf"
                  required={inputMode === 'url'}
                />
                <p className="text-xs text-gray-500 mt-2">Link to Bunny CDN, Google Drive, or external file</p>
              </div>
            ) : (
              <div>
                <div className="border-2 border-dashed border-gray-700 rounded-lg p-4 text-center">
                  <input
                    type="file"
                    id="file-input"
                    onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                    className="hidden"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip"
                  />
                  <label htmlFor="file-input" className="cursor-pointer block">
                    <CloudUpload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-white font-medium">
                      {uploadFile ? uploadFile.name : 'Click to select file or drag & drop'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">PDF, Word, Excel, PowerPoint, or ZIP</p>
                  </label>
                </div>

                {uploadFile && (
                  <div className="mt-3">
                    <button
                      type="button"
                      onClick={handleFileUpload}
                      disabled={uploading || !uploadFile}
                      className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
                    >
                      {uploading ? (
                        <>
                          <Loader2 size={18} className="animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <CloudUpload size={18} />
                          Upload to Bunny
                        </>
                      )}
                    </button>
                    {fileUrl && (
                      <p className="text-xs text-green-400 mt-2 flex items-center gap-1">
                        ✓ Upload complete! Ready to save.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-green-400 mb-2">Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as 'pdf' | 'notes' | 'other')}
                className="w-full px-4 py-3 bg-black border border-gray-700 rounded-lg text-white focus:border-green-500 focus:outline-none"
              >
                <option value="pdf">PDF</option>
                <option value="notes">Notes</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2 text-white cursor-pointer">
                <input
                  type="checkbox"
                  checked={downloadable}
                  onChange={(e) => setDownloadable(e.target.checked)}
                  className="w-5 h-5 rounded border-gray-600 bg-black text-green-500 focus:ring-green-500"
                />
                <span className="text-sm">Downloadable</span>
              </label>
            </div>
          </div>

          </div>

          <div className="flex gap-3 p-4 sm:p-5 border-t border-gray-800 bg-gray-900 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="flex-1 px-4 py-3 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-500 hover:bg-green-600 text-black font-semibold rounded-lg transition-colors disabled:opacity-50"
            >
              {saving ? (existingMaterial ? 'Saving...' : 'Adding...') : (existingMaterial ? 'Save Changes' : 'Add Material')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================
// Add / Edit Task & To-Do Checklist Modal
// ============================================

interface TaskChecklistItem {
  id: string;
  text: string;
  hint?: string;
  required?: boolean;
}

function AddTaskModal({ token, courseId, order, existingItem, onClose, onAdded }: {
  token: string;
  courseId: string;
  order: number;
  existingItem?: UnifiedItem | null;
  onClose: () => void;
  onAdded: () => void;
}) {
  const [title, setTitle] = useState(existingItem?.title || '');
  const [level, setLevel] = useState((existingItem as any)?.level || (existingItem as any)?.content?.en?.level || 'Level 1: Beginner');
  const [description, setDescription] = useState(existingItem?.description || (existingItem as any)?.content?.en?.description || '');

  // Countdown settings
  const initialCountdown = (existingItem as any)?.countdownHours ?? (existingItem as any)?.content?.en?.countdownHours ?? 24;
  const [countdownHours, setCountdownHours] = useState<number>(Number(initialCountdown) || 24);
  const [customCountdown, setCustomCountdown] = useState<string>(
    [0, 12, 24, 48, 72, 168].includes(Number(initialCountdown)) ? '' : String(initialCountdown || '')
  );

  // Reminder settings
  const [reminderType, setReminderType] = useState<string>(
    (existingItem as any)?.reminderType || (existingItem as any)?.content?.en?.reminderType || 'morning'
  );
  const [reminderNote, setReminderNote] = useState<string>(
    (existingItem as any)?.reminderNote || (existingItem as any)?.content?.en?.reminderNote || 'Practice on an empty stomach with relaxed awareness.'
  );

  // Recurring setting
  const [isRecurring, setIsRecurring] = useState<boolean>(
    (existingItem as any)?.isRecurring ?? (existingItem as any)?.content?.en?.isRecurring ?? true
  );

  // Checklist items
  const [checklist, setChecklist] = useState<TaskChecklistItem[]>(() => {
    const rawChecklist = (existingItem as any)?.checklist || (existingItem as any)?.content?.en?.checklist;
    if (Array.isArray(rawChecklist) && rawChecklist.length > 0) {
      return rawChecklist;
    }
    return [
      {
        id: 'chk_1',
        text: 'Morning Swar Observation upon waking (Check active nostril: Surya or Chandra)',
        hint: 'Block one nostril gently and note which side has predominant airflow',
        required: true,
      },
      {
        id: 'chk_2',
        text: 'Practice 10-15 minutes of slow Nadi Shodhana (Alternate Nostril Breathing)',
        hint: 'Maintain steady rhythmic inhalation and exhalation with spine upright',
        required: true,
      },
      {
        id: 'chk_3',
        text: 'Drink 1-2 glasses of warm water during the dominant Surya Nadi (Right Swar)',
        hint: 'Aids natural digestion and activates metabolic fire',
        required: false,
      },
      {
        id: 'chk_4',
        text: 'Record your breath rhythm and energy state in your sadhana journal',
        hint: 'Reflect on focus, tranquility, and calmness observed during practice',
        required: false,
      },
    ];
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addChecklistItem = () => {
    const newItem: TaskChecklistItem = {
      id: `chk_${Date.now()}`,
      text: '',
      hint: '',
      required: true,
    };
    setChecklist([...checklist, newItem]);
  };

  const updateChecklistItem = (id: string, field: keyof TaskChecklistItem, value: any) => {
    setChecklist(checklist.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const removeChecklistItem = (id: string) => {
    setChecklist(checklist.filter(item => item.id !== id));
  };

  const moveChecklistItem = (index: number, direction: 'up' | 'down') => {
    const newIdx = direction === 'up' ? index - 1 : index + 1;
    if (newIdx < 0 || newIdx >= checklist.length) return;
    const items = [...checklist];
    const [moved] = items.splice(index, 1);
    items.splice(newIdx, 0, moved);
    setChecklist(items);
  };

  const loadTemplate = (type: 'sadhana' | 'breath' | 'evening') => {
    if (type === 'sadhana') {
      setTitle('Daily Swar Yoga Morning Sadhana');
      setDescription('Complete this daily morning routine to harmonize solar (Pingala) and lunar (Ida) breath channels.');
      setCountdownHours(24);
      setReminderType('sunrise');
      setReminderNote('Best performed at Brahma Muhurta (sunrise) on an empty stomach.');
      setIsRecurring(true);
      setChecklist([
        { id: `chk_${Date.now()}_1`, text: 'Wake up before sunrise & test dominant nostril airflow', hint: 'Notice whether Ida (left) or Pingala (right) is active', required: true },
        { id: `chk_${Date.now()}_2`, text: 'Step out of bed touching the floor first with the foot matching your active Swar', hint: 'Traditional Swar Shastra alignment practice', required: true },
        { id: `chk_${Date.now()}_3`, text: 'Perform 15 minutes of Pranayama (Anulom Vilom / Nadi Shodhana)', hint: 'Maintain effortless rhythmic breathing', required: true },
        { id: `chk_${Date.now()}_4`, text: '5 minutes of quiet meditation focusing on the Ajna chakra', hint: 'Experience the stillness of Sushumna', required: false },
      ]);
    } else if (type === 'breath') {
      setTitle('Swar Shift & Digestive Energy Check');
      setDescription('Observe and balance your breathing flow before meals and daily activities.');
      setCountdownHours(12);
      setReminderType('afternoon');
      setReminderNote('Check Swar 15 minutes before lunch and evening dinner.');
      setIsRecurring(true);
      setChecklist([
        { id: `chk_${Date.now()}_1`, text: 'Ensure right nostril (Surya Swar) is active before meals', hint: 'If left is active, lie on your left side for 5 mins to switch to Surya', required: true },
        { id: `chk_${Date.now()}_2`, text: 'Eat mindfully without distraction or talking', hint: 'Honor food as sacred nourishment', required: true },
        { id: `chk_${Date.now()}_3`, text: 'Sit in Vajrasana for 10 minutes post meal', hint: 'Stimulates digestion and prana circulation', required: false },
      ]);
    } else {
      setTitle('Evening Chandra Nadi Cooling & Sleep Preparation');
      setDescription('Unwind nervous tension and invite deep restorative rest through left nostril cooling.');
      setCountdownHours(24);
      setReminderType('bedtime');
      setReminderNote('Complete 30 minutes before going to bed in a quiet dimly-lit room.');
      setIsRecurring(true);
      setChecklist([
        { id: `chk_${Date.now()}_1`, text: 'Disconnect from all screens (phone, laptop, TV) 45 min before sleep', hint: 'Promotes natural melatonin production and calms mind', required: true },
        { id: `chk_${Date.now()}_2`, text: 'Practice 10 rounds of Chandra Bhedana (Inhale Left, Exhale Right)', hint: 'Activates parasympathetic rest and digest system', required: true },
        { id: `chk_${Date.now()}_3`, text: 'Express gratitude for 3 positive occurrences of the day in your journal', hint: 'Cultivates peace and contentment', required: false },
      ]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Please provide a title for the task');
      return;
    }
    const cleanChecklist = checklist.filter(c => c.text.trim().length > 0);
    if (cleanChecklist.length === 0) {
      setError('Please add at least one to-do checklist item for students');
      return;
    }

    setSaving(true);
    setError(null);

    const isEdit = Boolean(existingItem?._id);
    const url = '/api/admin/e-learning/assignments';
    const method = isEdit ? 'PUT' : 'POST';

    const finalCountdown = countdownHours === -1 ? Number(customCountdown) || 0 : countdownHours;

    const payload: any = {
      courseId,
      title: title.trim(),
      order: existingItem?.order ?? order,
      subType: 'task',
      taskType: 'todo_checklist',
      level,
      description: description.trim(),
      checklist: cleanChecklist,
      countdownHours: finalCountdown,
      reminderType,
      reminderNote: reminderNote.trim(),
      isRecurring,
      totalPoints: cleanChecklist.length * 10,
      passingPoints: Math.ceil(cleanChecklist.length * 10 * 0.8),
      isRequired: true,
    };

    if (isEdit) {
      payload.assignmentId = existingItem?._id;
    }

    try {
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        onAdded();
      } else {
        const data = await res.json();
        setError(data.error || `Failed to ${isEdit ? 'update' : 'create'} task`);
      }
    } catch (err: any) {
      setError(err.message || 'Error saving task');
    } finally {
      setSaving(false);
    }
  };

  const resolvedCountdown = countdownHours === -1 ? Number(customCountdown) || 0 : countdownHours;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-start sm:items-center justify-center z-50 p-2 sm:p-4 overflow-y-auto">
      <div className="bg-gray-900 rounded-2xl border border-yellow-500/30 w-full max-w-3xl max-h-[calc(100dvh-2rem)] sm:max-h-[90vh] flex flex-col shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-gray-800 bg-gradient-to-r from-gray-900 via-amber-950/30 to-gray-900 sticky top-0 z-10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
              <ListTodo className="text-black" size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold text-white">
                  {existingItem ? 'Edit Practice Task & To-Do' : 'Create Practice Task & To-Do List'}
                </h2>
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  Task / Checklist
                </span>
              </div>
              <p className="text-xs text-gray-400">Add to-do checklists for students to complete, set countdown timers & practice reminders</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-6 overflow-y-auto flex-1 text-left">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3.5 rounded-xl text-sm flex items-center gap-2">
              <AlertCircle size={18} />
              {error}
            </div>
          )}

          {/* Quick Preset Templates */}
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <span className="text-xs font-semibold text-amber-300 flex items-center gap-1.5">
                ⚡ Quick Sadhana Templates:
              </span>
              <span className="text-[11px] text-gray-400">Click to autofill structured to-do items</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => loadTemplate('sadhana')}
                className="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-amber-500/20 border border-gray-700 hover:border-amber-500/40 text-xs font-medium text-gray-200 hover:text-amber-300 transition-colors"
              >
                🌅 Morning Sadhana
              </button>
              <button
                type="button"
                onClick={() => loadTemplate('breath')}
                className="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-amber-500/20 border border-gray-700 hover:border-amber-500/40 text-xs font-medium text-gray-200 hover:text-amber-300 transition-colors"
              >
                🥗 Swar & Digestion
              </button>
              <button
                type="button"
                onClick={() => loadTemplate('evening')}
                className="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-amber-500/20 border border-gray-700 hover:border-amber-500/40 text-xs font-medium text-gray-200 hover:text-amber-300 transition-colors"
              >
                🌙 Evening Rest & Chandra Nadi
              </button>
            </div>
          </div>

          {/* Section 1: Title & Target Level */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-amber-400 uppercase tracking-wider mb-1.5">
                Task Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-2.5 bg-black border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 focus:outline-none"
                placeholder="e.g. Daily 15-Minute Swar Yoga Morning Sadhana"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-amber-400 uppercase tracking-wider mb-1.5">
                Target Level
              </label>
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                className="w-full px-4 py-2.5 bg-black border border-gray-700 rounded-xl text-white focus:border-amber-500 focus:outline-none"
              >
                <option value="Level 1: Beginner">Level 1: Beginner (Prathama)</option>
                <option value="Level 2: Intermediate">Level 2: Intermediate (Madhyama)</option>
                <option value="Level 3: Advanced">Level 3: Advanced (Uttama)</option>
                <option value="Level 4: Master">Level 4: Master / Sadhak</option>
              </select>
            </div>
          </div>

          {/* Description & Practice Instructions */}
          <div>
            <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
              Task Description & Student Instructions
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full px-4 py-2 bg-black border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:border-amber-500 focus:outline-none resize-none text-sm"
              placeholder="Detailed guidelines for students on how to prepare and perform this daily task..."
            />
          </div>

          {/* Section 2: To-Do Checklist Items */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-bold text-white flex items-center gap-2">
                  <CheckSquare size={16} className="text-amber-400" />
                  <span>Student Action Checklist ({checklist.length})</span>
                </label>
                <p className="text-xs text-gray-400 mt-0.5">Students will tick each item off as completed to record their practice</p>
              </div>
              <button
                type="button"
                onClick={addChecklistItem}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-black font-semibold rounded-lg text-xs transition-colors shadow-sm"
              >
                <Plus size={14} />
                <span>Add Item</span>
              </button>
            </div>

            <div className="space-y-3">
              {checklist.map((item, idx) => (
                <div
                  key={item.id}
                  className="p-3.5 bg-black/60 border border-gray-800 rounded-xl hover:border-gray-700 transition-colors space-y-2.5"
                >
                  <div className="flex items-start gap-2.5">
                    <span className="w-6 h-6 rounded-md bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center text-xs font-bold shrink-0 mt-1">
                      {idx + 1}
                    </span>

                    <div className="flex-1 space-y-2">
                      <input
                        type="text"
                        value={item.text}
                        onChange={(e) => updateChecklistItem(item.id, 'text', e.target.value)}
                        placeholder={`e.g. Check active nostril airflow and practice 10 rounds`}
                        className="w-full px-3 py-1.5 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm focus:border-amber-500 focus:outline-none placeholder-gray-500"
                      />
                      <input
                        type="text"
                        value={item.hint || ''}
                        onChange={(e) => updateChecklistItem(item.id, 'hint', e.target.value)}
                        placeholder="Optional tip/hint: e.g. Keep spine upright and breathe gently through nose"
                        className="w-full px-3 py-1 bg-gray-900/50 border border-gray-800 rounded-lg text-xs text-gray-300 focus:border-amber-500 focus:outline-none placeholder-gray-600"
                      />
                    </div>

                    <div className="flex items-center gap-1 shrink-0 pt-1">
                      <button
                        type="button"
                        onClick={() => moveChecklistItem(idx, 'up')}
                        disabled={idx === 0}
                        className="p-1 hover:bg-gray-800 text-gray-400 hover:text-white rounded disabled:opacity-30"
                        title="Move up"
                      >
                        <ArrowUp size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveChecklistItem(idx, 'down')}
                        disabled={idx === checklist.length - 1}
                        className="p-1 hover:bg-gray-800 text-gray-400 hover:text-white rounded disabled:opacity-30"
                        title="Move down"
                      >
                        <ArrowDown size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeChecklistItem(item.id)}
                        className="p-1 hover:bg-red-500/20 text-gray-500 hover:text-red-400 rounded transition-colors"
                        title="Remove item"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1 pl-8">
                    <label className="flex items-center gap-2 cursor-pointer text-gray-400 hover:text-gray-300 select-none">
                      <input
                        type="checkbox"
                        checked={item.required !== false}
                        onChange={(e) => updateChecklistItem(item.id, 'required', e.target.checked)}
                        className="w-3.5 h-3.5 rounded border-gray-700 bg-gray-900 text-amber-500 focus:ring-amber-500"
                      />
                      <span>Mandatory to complete task</span>
                    </label>
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={addChecklistItem}
              className="w-full py-2.5 border-2 border-dashed border-gray-800 hover:border-amber-500/50 rounded-xl text-gray-400 hover:text-amber-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
            >
              <Plus size={14} />
              <span>+ Add Another To-Do Checklist Item</span>
            </button>
          </div>

          {/* Section 3: Countdown Timer & Deadline */}
          <div className="p-4 bg-gray-900/60 border border-gray-800 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <Clock size={15} />
                <span>Task Countdown / Completion Deadline</span>
              </label>
              {resolvedCountdown > 0 && (
                <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                  ⏱️ {resolvedCountdown >= 24 ? `${resolvedCountdown / 24} Day(s) (${resolvedCountdown}h)` : `${resolvedCountdown} Hours`} Countdown
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {[
                { label: '24 Hours (Daily)', val: 24 },
                { label: '48 Hours (2 Days)', val: 48 },
                { label: '72 Hours (3 Days)', val: 72 },
                { label: '7 Days (Weekly)', val: 168 },
                { label: '12 Hours (Half Day)', val: 12 },
                { label: 'No Deadline', val: 0 },
                { label: 'Custom Hours', val: -1 },
              ].map((opt) => (
                <button
                  key={opt.val}
                  type="button"
                  onClick={() => {
                    setCountdownHours(opt.val);
                    if (opt.val !== -1) setCustomCountdown('');
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    countdownHours === opt.val
                      ? 'bg-amber-500 text-black shadow-md shadow-amber-500/30'
                      : 'bg-black/60 border border-gray-800 text-gray-300 hover:border-gray-700'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {countdownHours === -1 && (
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="number"
                  min="1"
                  max="720"
                  value={customCountdown}
                  onChange={(e) => setCustomCountdown(e.target.value)}
                  placeholder="Enter hours (e.g. 36)"
                  className="w-40 px-3 py-1.5 bg-black border border-gray-700 rounded-lg text-sm text-white focus:border-amber-500 focus:outline-none"
                />
                <span className="text-xs text-gray-400">hours countdown after starting task</span>
              </div>
            )}

            <p className="text-[11px] text-gray-400">
              {resolvedCountdown > 0
                ? `⚡ Students will see a live countdown clock ticking down (${resolvedCountdown} hours) to submit their completed checklist.`
                : 'Students can take this task anytime at their own pace without an active countdown.'}
            </p>
          </div>

          {/* Section 4: Practice Reminder & Frequency */}
          <div className="p-4 bg-gray-900/60 border border-gray-800 rounded-xl space-y-3">
            <label className="block text-xs font-semibold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <Bell size={15} />
              <span>Recommended Practice Time & Student Reminder</span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-gray-400 mb-1">Timing Schedule</label>
                <select
                  value={reminderType}
                  onChange={(e) => setReminderType(e.target.value)}
                  className="w-full px-3 py-2 bg-black border border-gray-700 rounded-lg text-white text-xs focus:border-amber-500 focus:outline-none"
                >
                  <option value="sunrise">🌅 Brahma Muhurta / Sunrise (5:00 - 6:30 AM)</option>
                  <option value="morning">☀️ Morning Practice (6:30 - 9:00 AM)</option>
                  <option value="afternoon">🥗 Afternoon / Digestion (12:00 - 2:00 PM)</option>
                  <option value="sunset">🌇 Sunset / Sandhya (5:30 - 7:00 PM)</option>
                  <option value="bedtime">🌙 Night / Pre-Sleep (9:00 - 10:30 PM)</option>
                  <option value="twice_daily">🔄 Twice Daily (Morning & Sunset)</option>
                  <option value="anytime">⏰ Flexible / Anytime Practice</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-gray-400 mb-1">Reminder Note / Instruction</label>
                <input
                  type="text"
                  value={reminderNote}
                  onChange={(e) => setReminderNote(e.target.value)}
                  placeholder="e.g. Best done on an empty stomach facing east"
                  className="w-full px-3 py-2 bg-black border border-gray-700 rounded-lg text-white text-xs focus:border-amber-500 focus:outline-none placeholder-gray-500"
                />
              </div>
            </div>

            {/* Recurring Habit Checkbox */}
            <div className="pt-2 border-t border-gray-800">
              <label className="flex items-center gap-2.5 cursor-pointer text-gray-300 hover:text-white select-none">
                <input
                  type="checkbox"
                  checked={isRecurring}
                  onChange={(e) => setIsRecurring(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-700 bg-gray-900 text-amber-500 focus:ring-amber-500"
                />
                <div className="text-xs">
                  <span className="font-semibold text-white">Daily Recurring Habit:</span>{' '}
                  <span className="text-gray-400">Resets every 24 hours so students build a continuous practice streak</span>
                </div>
              </label>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="flex-1 px-4 py-2.5 border border-gray-700 hover:bg-gray-800 text-gray-300 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black font-bold rounded-xl text-sm transition-all shadow-lg shadow-amber-500/20 disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Saving Task...</span>
                </>
              ) : (
                <>
                  <Save size={16} />
                  <span>{existingItem ? 'Update Task' : 'Save & Publish Task'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================
// Add / Edit Simple Question Modal
// ============================================

interface SimpleQuestionItem {
  id: string;
  prompt: string;
  type: 'single_choice' | 'short_text' | 'paragraph';
  options: string[];
}

function AddQuestionModal({ token, courseId, order, existingItem, onClose, onAdded }: {
  token: string;
  courseId: string;
  order: number;
  existingItem?: UnifiedItem | null;
  onClose: () => void;
  onAdded: () => void;
}) {
  const [title, setTitle] = useState(existingItem?.title || '');
  const [instructions, setInstructions] = useState(
    existingItem?.description || (existingItem as any)?.content?.en?.description || ''
  );

  const [questions, setQuestions] = useState<SimpleQuestionItem[]>(() => {
    const rawQuestions = existingItem?.questions || (existingItem as any)?.content?.en?.questions;
    if (Array.isArray(rawQuestions) && rawQuestions.length > 0) {
      return rawQuestions.map((q: any, idx: number) => ({
        id: q.id || `q_${Date.now()}_${idx}`,
        prompt: q.prompt || q.question || '',
        type: q.type === 'paragraph' ? 'paragraph' : q.type === 'short_text' ? 'short_text' : 'single_choice',
        options: Array.isArray(q.options) && q.options.length > 0 ? q.options : ['Option 1', 'Option 2'],
      }));
    }
    return [
      {
        id: `q_${Date.now()}`,
        prompt: 'Which nostril (Ida / Pingala) is currently active, and what did you observe during practice?',
        type: 'single_choice',
        options: ['Left Nostril (Chandra / Ida)', 'Right Nostril (Surya / Pingala)', 'Both Nostrils Flowing (Sushumna)'],
      },
    ];
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addQuestion = (type: 'single_choice' | 'short_text' | 'paragraph' = 'single_choice') => {
    const newQ: SimpleQuestionItem = {
      id: `q_${Date.now()}_${questions.length + 1}`,
      prompt: '',
      type,
      options: type === 'single_choice' ? ['Option 1', 'Option 2'] : [],
    };
    setQuestions([...questions, newQ]);
  };

  const updateQuestionPrompt = (id: string, prompt: string) => {
    setQuestions(questions.map(q => q.id === id ? { ...q, prompt } : q));
  };

  const updateQuestionType = (id: string, type: 'single_choice' | 'short_text' | 'paragraph') => {
    setQuestions(questions.map(q => {
      if (q.id !== id) return q;
      return {
        ...q,
        type,
        options: type === 'single_choice' && (!q.options || q.options.length === 0) ? ['Option 1', 'Option 2'] : q.options,
      };
    }));
  };

  const removeQuestion = (id: string) => {
    if (questions.length <= 1) {
      setError('Please keep at least one question.');
      return;
    }
    setQuestions(questions.filter(q => q.id !== id));
  };

  const addOption = (qId: string) => {
    setQuestions(questions.map(q => {
      if (q.id !== qId) return q;
      return {
        ...q,
        options: [...q.options, `Option ${q.options.length + 1}`],
      };
    }));
  };

  const updateOption = (qId: string, optIdx: number, val: string) => {
    setQuestions(questions.map(q => {
      if (q.id !== qId) return q;
      const opts = [...q.options];
      opts[optIdx] = val;
      return { ...q, options: opts };
    }));
  };

  const removeOption = (qId: string, optIdx: number) => {
    setQuestions(questions.map(q => {
      if (q.id !== qId) return q;
      if (q.options.length <= 2) return q;
      return {
        ...q,
        options: q.options.filter((_, idx) => idx !== optIdx),
      };
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanQuestions = questions.filter(q => q.prompt.trim().length > 0);
    if (cleanQuestions.length === 0) {
      setError('Please enter at least one question prompt');
      return;
    }

    setSaving(true);
    setError(null);

    const isEdit = Boolean(existingItem?._id);
    const url = '/api/admin/e-learning/assignments';
    const method = isEdit ? 'PUT' : 'POST';

    const resolvedTitle = title.trim() || cleanQuestions[0].prompt.slice(0, 60);

    const payload: any = {
      courseId,
      title: resolvedTitle,
      order: existingItem?.order ?? order,
      subType: 'question',
      taskType: 'question_form',
      description: instructions.trim(),
      questions: cleanQuestions.map(q => ({
        id: q.id,
        prompt: q.prompt.trim(),
        type: q.type,
        options: q.type === 'single_choice' ? q.options.filter(o => o.trim().length > 0) : [],
        points: 0,
      })),
      totalPoints: 0,
      passingPoints: 0,
      isRequired: false,
    };

    if (isEdit) {
      payload.assignmentId = existingItem?._id;
    }

    try {
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        onAdded();
      } else {
        const data = await res.json();
        setError(data.error || `Failed to ${isEdit ? 'update' : 'create'} question`);
      }
    } catch (err: any) {
      setError(err.message || 'Error saving question');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-start sm:items-center justify-center z-50 p-2 sm:p-4 overflow-y-auto">
      <div className="bg-gray-900 rounded-2xl border border-teal-500/30 w-full max-w-2xl max-h-[calc(100dvh-2rem)] sm:max-h-[90vh] flex flex-col shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-gray-800 bg-gradient-to-r from-gray-900 via-teal-950/30 to-gray-900 sticky top-0 z-10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-teal-500/20">
              <HelpCircle className="text-black" size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold text-white">
                  {existingItem ? 'Edit Question(s)' : 'Add Question(s)'}
                </h2>
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-teal-500/20 text-teal-400 border border-teal-500/30">
                  Student Q&A
                </span>
              </div>
              <p className="text-xs text-gray-400">Ask one or multiple questions for students to answer (short answer, paragraph, or select one)</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-5 overflow-y-auto flex-1 text-left">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3.5 rounded-xl text-sm flex items-center gap-2">
              <AlertCircle size={18} />
              {error}
            </div>
          )}

          {/* Question Topic / Title */}
          <div>
            <label className="block text-xs font-semibold text-teal-400 uppercase tracking-wider mb-1.5">
              Question Title / Header (Optional)
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Swar Yoga Breath Observation & Reflection"
              className="w-full px-4 py-2.5 bg-black border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none text-sm"
            />
          </div>

          {/* Student Instructions */}
          <div>
            <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
              Instructions for Students (Optional)
            </label>
            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              rows={2}
              placeholder="e.g. Take a few deep breaths, observe your current breath flow and answer the question(s) below..."
              className="w-full px-4 py-2 bg-black border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:border-teal-500 focus:outline-none resize-none text-xs"
            />
          </div>

          {/* Questions List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-1">
              <label className="text-sm font-bold text-white flex items-center gap-2">
                <HelpCircle size={16} className="text-teal-400" />
                <span>Questions ({questions.length})</span>
              </label>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => addQuestion('single_choice')}
                  className="px-2.5 py-1 bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 border border-teal-500/40 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1"
                >
                  <Plus size={13} />
                  <span>+ Select One</span>
                </button>
                <button
                  type="button"
                  onClick={() => addQuestion('short_text')}
                  className="px-2.5 py-1 bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1"
                >
                  <Plus size={13} />
                  <span>+ Short Ans</span>
                </button>
                <button
                  type="button"
                  onClick={() => addQuestion('paragraph')}
                  className="px-2.5 py-1 bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1"
                >
                  <Plus size={13} />
                  <span>+ Paragraph</span>
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {questions.map((q, idx) => (
                <div
                  key={q.id}
                  className="p-4 bg-black/60 border border-gray-800 rounded-2xl space-y-3 hover:border-gray-700 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2 border-b border-gray-800/80 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-md bg-teal-500/20 text-teal-400 border border-teal-500/30 flex items-center justify-center text-xs font-bold shrink-0">
                        {idx + 1}
                      </span>
                      <span className="text-xs font-bold text-gray-300">Question #{idx + 1}</span>
                    </div>

                    {/* Question Type Switcher */}
                    <div className="flex items-center gap-1 bg-gray-900 p-1 rounded-lg border border-gray-800">
                      <button
                        type="button"
                        onClick={() => updateQuestionType(q.id, 'single_choice')}
                        className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                          q.type === 'single_choice'
                            ? 'bg-teal-500 text-black shadow-sm'
                            : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        Select One Ans
                      </button>
                      <button
                        type="button"
                        onClick={() => updateQuestionType(q.id, 'short_text')}
                        className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                          q.type === 'short_text'
                            ? 'bg-teal-500 text-black shadow-sm'
                            : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        Short Ans
                      </button>
                      <button
                        type="button"
                        onClick={() => updateQuestionType(q.id, 'paragraph')}
                        className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                          q.type === 'paragraph'
                            ? 'bg-teal-500 text-black shadow-sm'
                            : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        Paragraph
                      </button>
                    </div>

                    {questions.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeQuestion(q.id)}
                        className="p-1 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                        title="Delete question"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>

                  {/* Question Prompt */}
                  <div>
                    <input
                      type="text"
                      value={q.prompt}
                      onChange={(e) => updateQuestionPrompt(q.id, e.target.value)}
                      placeholder="e.g. Which nostril is active right now and how is your body feeling?"
                      className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-xl text-white text-sm focus:border-teal-500 focus:outline-none placeholder-gray-500"
                      required
                    />
                  </div>

                  {/* Options if Single Choice */}
                  {q.type === 'single_choice' && (
                    <div className="space-y-2 pt-1 pl-2 border-l-2 border-teal-500/30">
                      <span className="text-[11px] font-semibold text-gray-400 block mb-1">
                        Options (Students will select any one):
                      </span>

                      {q.options.map((opt, optIdx) => (
                        <div key={optIdx} className="flex items-center gap-2">
                          <span className="w-4 h-4 rounded-full border border-gray-600 flex items-center justify-center shrink-0">
                            <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
                          </span>
                          <input
                            type="text"
                            value={opt}
                            onChange={(e) => updateOption(q.id, optIdx, e.target.value)}
                            placeholder={`Option ${optIdx + 1}`}
                            className="flex-1 px-3 py-1.5 bg-gray-900/70 border border-gray-700 rounded-lg text-white text-xs focus:border-teal-500 focus:outline-none"
                          />
                          {q.options.length > 2 && (
                            <button
                              type="button"
                              onClick={() => removeOption(q.id, optIdx)}
                              className="p-1 text-gray-500 hover:text-red-400 rounded"
                            >
                              <X size={13} />
                            </button>
                          )}
                        </div>
                      ))}

                      <button
                        type="button"
                        onClick={() => addOption(q.id)}
                        className="text-xs text-teal-400 hover:text-teal-300 font-semibold flex items-center gap-1 pt-1"
                      >
                        <Plus size={13} />
                        <span>Add Option</span>
                      </button>
                    </div>
                  )}

                  {/* Short text preview */}
                  {q.type === 'short_text' && (
                    <div className="p-2.5 bg-gray-900/40 rounded-xl border border-gray-800 text-xs text-gray-500 italic">
                      Students will type a single-line answer here.
                    </div>
                  )}

                  {/* Paragraph preview */}
                  {q.type === 'paragraph' && (
                    <div className="p-2.5 bg-gray-900/40 rounded-xl border border-gray-800 text-xs text-gray-500 italic">
                      Students will write a multi-line paragraph answer here.
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Bottom Add Question Button */}
            <button
              type="button"
              onClick={() => addQuestion('single_choice')}
              className="w-full py-2.5 border-2 border-dashed border-gray-800 hover:border-teal-500/50 rounded-xl text-gray-400 hover:text-teal-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
            >
              <Plus size={14} />
              <span>+ Add Another Question</span>
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="flex-1 px-4 py-2.5 border border-gray-700 hover:bg-gray-800 text-gray-300 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-black font-bold rounded-xl text-sm transition-all shadow-lg shadow-teal-500/20 disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save size={16} />
                  <span>{existingItem ? 'Update Question(s)' : 'Save Question(s)'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Add Assignment & Form Builder Modal
interface FormQuestion {
  id: string;
  question: string;
  type: 'short_text' | 'paragraph' | 'single_choice' | 'multiple_choice' | 'dropdown';
  options: string[];
  correctAnswer: string; // for auto-checking or single/multiple choice
  marks: number;
}

function AddAssignmentModal({ token, courseId, subType, order, existingItem, onClose, onAdded }: {
  token: string;
  courseId: string;
  subType: 'assignment';
  order: number;
  existingItem?: UnifiedItem | null;
  onClose: () => void;
  onAdded: () => void;
}) {
  const [title, setTitle] = useState(existingItem?.title || '');
  const [level, setLevel] = useState((existingItem as any)?.level || (existingItem as any)?.content?.en?.level || 'Level 1: Beginner');
  const [description, setDescription] = useState(existingItem?.description || (existingItem as any)?.content?.en?.description || '');
  const [totalPoints, setTotalPoints] = useState(String(existingItem?.totalPoints ?? 100));
  const [passingPoints, setPassingPoints] = useState(String((existingItem as any)?.passingPoints ?? 40));
  const [isRequired, setIsRequired] = useState(Boolean((existingItem as any)?.isRequired));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form Builder Questions State
  const [questions, setQuestions] = useState<FormQuestion[]>(() => {
    const rawQuestions = (existingItem as any)?.questions || (existingItem as any)?.content?.en?.questions;
    if (Array.isArray(rawQuestions) && rawQuestions.length > 0) {
      return rawQuestions;
    }
    return [
      {
        id: 'q_1',
        question: 'What is the primary benefit of Surya Nadi (Right Swar) practice?',
        type: 'single_choice',
        options: ['Activates solar energy & digestion', 'Induces deep sleep', 'Cools down body temperature', 'None of the above'],
        correctAnswer: 'Activates solar energy & digestion',
        marks: 10,
      }
    ];
  });

  const addQuestion = (type: FormQuestion['type'] = 'single_choice') => {
    const newQ: FormQuestion = {
      id: `q_${Date.now()}`,
      question: '',
      type,
      options: type === 'single_choice' || type === 'multiple_choice' || type === 'dropdown' ? ['Option 1', 'Option 2'] : [],
      correctAnswer: '',
      marks: 10,
    };
    setQuestions([...questions, newQ]);
  };

  const removeQuestion = (id: string) => {
    setQuestions(questions.filter(q => q.id !== id));
  };

  const updateQuestion = (id: string, field: keyof FormQuestion, val: any) => {
    setQuestions(questions.map(q => {
      if (q.id === id) {
        if (field === 'type') {
          const needsOptions = val === 'single_choice' || val === 'multiple_choice' || val === 'dropdown';
          return {
            ...q,
            type: val,
            options: needsOptions && q.options.length === 0 ? ['Option 1', 'Option 2'] : q.options,
          };
        }
        return { ...q, [field]: val };
      }
      return q;
    }));
  };

  const addOption = (qId: string) => {
    setQuestions(questions.map(q => {
      if (q.id === qId) {
        return { ...q, options: [...q.options, `Option ${q.options.length + 1}`] };
      }
      return q;
    }));
  };

  const removeOption = (qId: string, optIdx: number) => {
    setQuestions(questions.map(q => {
      if (q.id === qId) {
        return { ...q, options: q.options.filter((_, i) => i !== optIdx) };
      }
      return q;
    }));
  };

  const updateOption = (qId: string, optIdx: number, val: string) => {
    setQuestions(questions.map(q => {
      if (q.id === qId) {
        const newOpts = [...q.options];
        newOpts[optIdx] = val;
        return { ...q, options: newOpts };
      }
      return q;
    }));
  };

  const calculatedTotalMarks = questions.reduce((acc, q) => acc + (Number(q.marks) || 0), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) {
      setError('Assignment Title is required');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const isEdit = Boolean(existingItem?._id);
      const url = '/api/admin/e-learning/assignments';
      const method = isEdit ? 'PUT' : 'POST';
      const payload: any = {
        courseId,
        subType,
        title,
        content: {
          en: {
            title,
            level,
            description,
            questions,
          }
        },
        totalPoints: calculatedTotalMarks || parseInt(totalPoints) || 100,
        passingPoints: parseInt(passingPoints) || 40,
        isRequired,
        order,
        questions,
      };
      if (isEdit) {
        payload.assignmentId = existingItem?._id;
      }

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        onAdded();
      } else {
        const data = await res.json();
        setError(data.error || `Failed to ${isEdit ? 'update' : 'add'} assignment`);
      }
    } catch (err: any) {
      setError(err.message || 'Error saving assignment');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-start sm:items-center justify-center z-50 p-2 sm:p-4 overflow-y-auto">
      <div className="bg-gray-900 rounded-2xl border border-gray-800 w-full max-w-3xl max-h-[calc(100dvh-2rem)] sm:max-h-[88vh] flex flex-col shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-800 bg-gray-900/90 backdrop-blur sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center shadow-md">
              <ClipboardList className="text-white" size={20} />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white">
                {existingItem ? 'Edit Assignment' : 'Create Assignment Form'}
              </h2>
              <p className="text-xs text-gray-400">Design levels, passing marks, and customizable question forms</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        {/* Modal Form Content */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-6 overflow-y-auto flex-1">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3.5 rounded-xl text-sm flex items-center gap-2">
              <AlertCircle size={18} />
              {error}
            </div>
          )}

          {/* Section 1: Assignment Basics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-purple-400 uppercase tracking-wider mb-1.5">
                Assignment Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-2.5 bg-black border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 focus:outline-none"
                placeholder="e.g. Swar Yoga Level 1 Mastery Assessment"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-purple-400 uppercase tracking-wider mb-1.5">
                Target Level
              </label>
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                className="w-full px-4 py-2.5 bg-black border border-gray-700 rounded-xl text-white focus:border-purple-500 focus:outline-none"
              >
                <option value="Level 1: Beginner">Level 1: Beginner (Prathama)</option>
                <option value="Level 2: Intermediate">Level 2: Intermediate (Madhyama)</option>
                <option value="Level 3: Advanced">Level 3: Advanced (Uttama)</option>
                <option value="Level 4: Master">Level 4: Master / Sadhak</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
              Description & Instructions
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full px-4 py-2 bg-black border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none resize-none text-sm"
              placeholder="Instructions for students before taking this assessment..."
            />
          </div>

          {/* Scoring Grid */}
          <div className="grid grid-cols-3 gap-3 bg-gray-950/80 p-4 rounded-xl border border-gray-800">
            <div>
              <label className="block text-[11px] font-semibold text-gray-400 uppercase mb-1">Total Marks</label>
              <div className="text-xl font-bold text-white flex items-center gap-1.5">
                <span className="text-purple-400">{calculatedTotalMarks || totalPoints}</span>
                <span className="text-xs text-gray-500 font-normal">pts</span>
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-400 uppercase mb-1">Passing Mark</label>
              <input
                type="number"
                value={passingPoints}
                onChange={(e) => setPassingPoints(e.target.value)}
                className="w-24 px-3 py-1 bg-black border border-gray-700 rounded-lg text-emerald-400 font-bold focus:border-emerald-500 focus:outline-none text-sm"
              />
            </div>
            <div className="flex items-center">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-300 font-medium">
                <input
                  type="checkbox"
                  checked={isRequired}
                  onChange={(e) => setIsRequired(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-600 bg-black text-purple-600 focus:ring-purple-500"
                />
                Mandatory for Passing
              </label>
            </div>
          </div>

          {/* Section 2: Interactive Question Form Builder */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between pb-2 border-b border-gray-800">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <CheckSquare size={16} className="text-emerald-400" />
                  Questions & Assessment Form ({questions.length})
                </h3>
                <p className="text-xs text-gray-400">Short answer, paragraph, single choice, multiple choice, or dropdown</p>
              </div>

              {/* Add Question Dropdown */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => addQuestion('single_choice')}
                  className="px-3 py-1.5 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all"
                >
                  <Plus size={14} /> Single Choice
                </button>
                <button
                  type="button"
                  onClick={() => addQuestion('multiple_choice')}
                  className="px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/40 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all"
                >
                  <Plus size={14} /> Multiple
                </button>
                <button
                  type="button"
                  onClick={() => addQuestion('short_text')}
                  className="px-3 py-1.5 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300 border border-yellow-500/40 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all"
                >
                  <Plus size={14} /> Short Note
                </button>
                <button
                  type="button"
                  onClick={() => addQuestion('dropdown')}
                  className="px-3 py-1.5 bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 border border-teal-500/40 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all"
                >
                  <Plus size={14} /> Dropdown
                </button>
              </div>
            </div>

            {/* Questions List */}
            <div className="space-y-4">
              {questions.map((q, qIndex) => (
                <div
                  key={q.id}
                  className="p-4 rounded-xl border border-gray-800 bg-gray-950/60 space-y-3 relative group hover:border-gray-700 transition-all"
                >
                  {/* Question Header & Controls */}
                  <div className="flex items-center justify-between gap-3">
                    <span className="w-6 h-6 rounded-full bg-purple-600/30 border border-purple-500/50 text-purple-300 font-bold text-xs flex items-center justify-center">
                      {qIndex + 1}
                    </span>

                    <input
                      type="text"
                      value={q.question}
                      onChange={(e) => updateQuestion(q.id, 'question', e.target.value)}
                      placeholder="Enter question title or prompt..."
                      className="flex-1 px-3 py-1.5 bg-black border border-gray-700 rounded-lg text-white text-sm focus:border-purple-500 focus:outline-none"
                      required
                    />

                    {/* Question Type Selector */}
                    <select
                      value={q.type}
                      onChange={(e) => updateQuestion(q.id, 'type', e.target.value as any)}
                      className="px-2.5 py-1.5 bg-gray-900 border border-gray-700 rounded-lg text-xs text-purple-300 font-semibold focus:border-purple-500 focus:outline-none"
                    >
                      <option value="single_choice">Select One (Radio)</option>
                      <option value="multiple_choice">Multiple Choice (Checkboxes)</option>
                      <option value="dropdown">Dropdown Select</option>
                      <option value="short_text">Short Note (1 line)</option>
                      <option value="paragraph">Paragraph Essay</option>
                    </select>

                    {/* Question Marks */}
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min="1"
                        value={q.marks}
                        onChange={(e) => updateQuestion(q.id, 'marks', Number(e.target.value))}
                        className="w-14 px-2 py-1 bg-black border border-gray-700 rounded-lg text-emerald-400 font-bold text-xs text-center focus:border-emerald-500 focus:outline-none"
                      />
                      <span className="text-[11px] text-gray-500 font-semibold">pts</span>
                    </div>

                    {questions.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeQuestion(q.id)}
                        className="p-1.5 text-gray-500 hover:text-red-400 rounded-lg transition-colors"
                        title="Remove Question"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>

                  {/* Options for Choice / Dropdown Types */}
                  {(q.type === 'single_choice' || q.type === 'multiple_choice' || q.type === 'dropdown') && (
                    <div className="pl-9 space-y-2">
                      <div className="space-y-1.5">
                        {q.options.map((opt, optIdx) => (
                          <div key={optIdx} className="flex items-center gap-2">
                            <span className="text-xs text-gray-500 font-bold w-4">
                              {String.fromCharCode(65 + optIdx)}.
                            </span>
                            <input
                              type="text"
                              value={opt}
                              onChange={(e) => updateOption(q.id, optIdx, e.target.value)}
                              className="flex-1 px-3 py-1 bg-black border border-gray-800 rounded-lg text-xs text-gray-300 focus:border-purple-500 focus:outline-none"
                              placeholder={`Option ${optIdx + 1}`}
                            />
                            {q.options.length > 2 && (
                              <button
                                type="button"
                                onClick={() => removeOption(q.id, optIdx)}
                                className="text-gray-600 hover:text-red-400 p-1"
                              >
                                <X size={14} />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <button
                          type="button"
                          onClick={() => addOption(q.id)}
                          className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1 font-medium"
                        >
                          <Plus size={12} /> Add Option
                        </button>

                        {/* Correct Answer Selection */}
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-emerald-400 font-semibold">Correct Answer:</span>
                          <select
                            value={q.correctAnswer}
                            onChange={(e) => updateQuestion(q.id, 'correctAnswer', e.target.value)}
                            className="px-2 py-1 bg-black border border-emerald-500/50 rounded-lg text-xs text-emerald-300 focus:outline-none"
                          >
                            <option value="">Select Correct Option...</option>
                            {q.options.map((opt, i) => (
                              <option key={i} value={opt}>
                                {String.fromCharCode(65 + i)}: {opt || `Option ${i + 1}`}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Text / Paragraph Preview */}
                  {q.type === 'short_text' && (
                    <div className="pl-9">
                      <input
                        type="text"
                        disabled
                        placeholder="Student will enter a short answer here..."
                        className="w-full px-3 py-1.5 bg-black/40 border border-gray-800 border-dashed rounded-lg text-xs text-gray-500 cursor-not-allowed"
                      />
                    </div>
                  )}

                  {q.type === 'paragraph' && (
                    <div className="pl-9">
                      <textarea
                        disabled
                        rows={2}
                        placeholder="Student will write an in-depth paragraph here..."
                        className="w-full px-3 py-1.5 bg-black/40 border border-gray-800 border-dashed rounded-lg text-xs text-gray-500 cursor-not-allowed resize-none"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* + Add New Question Button */}
            <div className="pt-3 flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={() => addQuestion('single_choice')}
                className="flex-1 py-3 px-4 border-2 border-dashed border-purple-500/60 hover:border-purple-400 bg-purple-950/30 hover:bg-purple-900/40 text-purple-200 hover:text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-md group"
              >
                <Plus size={18} className="text-purple-400 group-hover:scale-125 transition-transform" />
                <span>+ Add New Question</span>
              </button>
              <button
                type="button"
                onClick={() => addQuestion('multiple_choice')}
                className="py-2.5 px-3.5 border border-blue-500/40 bg-blue-950/20 hover:bg-blue-900/40 text-blue-300 hover:text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
              >
                <Plus size={14} /> Multi-Choice
              </button>
              <button
                type="button"
                onClick={() => addQuestion('short_text')}
                className="py-2.5 px-3.5 border border-amber-500/40 bg-amber-950/20 hover:bg-amber-900/40 text-amber-300 hover:text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
              >
                <Plus size={14} /> Short Note
              </button>
              <button
                type="button"
                onClick={() => addQuestion('dropdown')}
                className="py-2.5 px-3.5 border border-teal-500/40 bg-teal-950/20 hover:bg-teal-900/40 text-teal-300 hover:text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
              >
                <Plus size={14} /> Dropdown
              </button>
            </div>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3 pt-5 border-t border-gray-800">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-5 py-2.5 border border-gray-700 text-gray-400 hover:text-white rounded-xl text-sm transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-xl text-sm shadow-lg shadow-purple-600/30 flex items-center gap-2 transition-all disabled:opacity-50"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {existingItem ? 'Update Assignment & Quiz Form' : 'Save Assignment & Quiz Form'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// EXISTING MODALS - Keep unchanged

function EditVideoModal({ token, video, onClose, onUpdated }: {
  token: string;
  video: VideoItem;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const [title, setTitle] = useState(video.title);
  const [description, setDescription] = useState(video.description || '');
  const [thumbnail, setThumbnail] = useState(video.thumbnail || '');
  const [duration, setDuration] = useState(video.duration.toString());
  const [hoursGap, setHoursGap] = useState((video.hoursGap || 0).toString());
  const [isFree, setIsFree] = useState(video.isFree);
  const [ragEnabled, setRagEnabled] = useState(video.ragEnabled === true);
  const [aiSummary, setAiSummary] = useState(video.aiSummary || '');
  const [transcript, setTranscript] = useState(video.transcript || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;

    setSaving(true);
    setError(null);

    try {
      const res = await fetch('/api/admin/recorded-courses/videos', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          videoId: video._id,
          title,
          description,
          thumbnail: thumbnail || undefined,
          duration: parseInt(duration) || 0,
          hoursGap: parseInt(hoursGap) || 0,
          isFree,
          ragEnabled,
          aiSummary,
          transcript,
        }),
      });

      if (res.ok) {
        onUpdated();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to update video');
      }
    } catch (err) {
      setError('Error saving video');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-start sm:items-center justify-center z-50 p-2 sm:p-4 overflow-y-auto">
      <div className="bg-gray-900 rounded-2xl border border-gray-800 w-full max-w-lg max-h-[calc(100dvh-2rem)] sm:max-h-[88vh] flex flex-col shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-gray-800 bg-gray-900 shrink-0">
          <h2 className="text-xl font-bold text-white">Edit Video</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-green-400 mb-2">Video Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-3 bg-black border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-green-500 focus:outline-none"
              placeholder="Enter video title"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-green-400 mb-2">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full px-4 py-3 bg-black border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-green-500 focus:outline-none resize-none"
              placeholder="Brief description"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-green-400 mb-2">Thumbnail URL (Optional)</label>
            <input
              type="url"
              value={thumbnail}
              onChange={(e) => setThumbnail(e.target.value)}
              className="w-full px-4 py-3 bg-black border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-green-500 focus:outline-none"
              placeholder="https://example.com/thumbnail.jpg"
            />
            {thumbnail && (
              <div className="mt-2 relative rounded-lg overflow-hidden bg-gray-950 border border-gray-800 max-h-36 flex items-center justify-center p-1">
                <img src={thumbnail} alt="Preview" className="max-h-32 w-auto object-contain rounded" onError={(e) => (e.currentTarget.style.display = 'none')} />
              </div>
            )}
            <p className="text-xs text-gray-500 mt-1">Image URL for video thumbnail</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-green-400 mb-2">Video Duration (minutes)</label>
              <input
                type="number"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="w-full px-4 py-3 bg-black border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-green-500 focus:outline-none"
                placeholder="15"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-green-400 mb-2">Hours Gap Before Next Video</label>
              <input
                type="number"
                value={hoursGap}
                onChange={(e) => setHoursGap(e.target.value)}
                className="w-full px-4 py-3 bg-black border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-green-500 focus:outline-none"
                placeholder="0"
                min="0"
              />
            </div>
          </div>

          <div className="flex items-start pt-2">
            <label className="flex items-center gap-2 text-white cursor-pointer">
              <input
                type="checkbox"
                checked={isFree}
                onChange={(e) => setIsFree(e.target.checked)}
                className="w-5 h-5 rounded border-gray-600 bg-black text-green-500 focus:ring-green-500"
              />
              Free Preview
            </label>
          </div>

          <div className="border border-gray-800 rounded-xl p-4 space-y-4">
            <label className="flex items-center gap-2 text-white cursor-pointer">
              <input
                type="checkbox"
                checked={ragEnabled}
                onChange={(e) => setRagEnabled(e.target.checked)}
                className="w-5 h-5 rounded border-gray-600 bg-black text-green-500 focus:ring-green-500"
              />
              Enable Video RAG Assistant
            </label>
            <div>
              <label className="block text-sm font-medium text-green-400 mb-2">AI Summary / Study Notes</label>
              <textarea
                value={aiSummary}
                onChange={(e) => setAiSummary(e.target.value)}
                rows={3}
                className="w-full px-4 py-3 bg-black border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-green-500 focus:outline-none resize-y"
                placeholder="Short summary of this video for AI answers"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-green-400 mb-2">Transcript / Full Notes</label>
              <textarea
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                rows={6}
                className="w-full px-4 py-3 bg-black border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-green-500 focus:outline-none resize-y"
                placeholder="Paste transcript or detailed notes. The learner assistant will answer only from this context."
              />
            </div>
          </div>

          </div>

          <div className="flex gap-3 p-4 sm:p-5 border-t border-gray-800 bg-gray-900 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="flex-1 px-4 py-3 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-500 hover:bg-green-600 text-black font-semibold rounded-lg transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              {saving ? 'Saving...' : 'Update Video'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AddVideoModal({ token, courseId, onClose, onAdded }: {
  token: string;
  courseId: string;
  onClose: () => void;
  onAdded: () => void;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [bunnyVideoId, setBunnyVideoId] = useState('');
  const [duration, setDuration] = useState('0');
  const [hoursGap, setHoursGap] = useState('0');
  const [thumbnail, setThumbnail] = useState('');
  const [isFree, setIsFree] = useState(false);
  const [ragEnabled, setRagEnabled] = useState(false);
  const [aiSummary, setAiSummary] = useState('');
  const [transcript, setTranscript] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploadMode, setUploadMode] = useState<'bunny' | 'pc' | 'youtube'>('bunny');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const extractVideoIdFromUrl = (input: string): string => {
    if (!input.includes('/')) return input;
    try {
      const url = new URL(input);
      const pathParts = url.pathname.split('/').filter(p => p);
      if (pathParts.length >= 2) {
        return pathParts[pathParts.length - 2];
      }
    } catch (e) {
      // ignore
    }
    return input;
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('video/')) {
        setUploadError('Please select a video file');
        return;
      }
      if (file.size > 2 * 1024 * 1024 * 1024) {
        setUploadError('File size must be less than 2GB');
        return;
      }
      setSelectedFile(file);
      setUploadError(null);

      if (!title) {
        const name = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
        setTitle(name.charAt(0).toUpperCase() + name.slice(1));
      }
    }
  };

  const uploadToBunny = async (): Promise<string | null> => {
    if (!selectedFile) return null;

    setUploading(true);
    setUploadProgress(0);
    setUploadError(null);

    try {
      const initRes = await fetch('/api/admin/bunny/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          filename: selectedFile.name,
          title: title || selectedFile.name,
        }),
      });

      if (!initRes.ok) {
        const errData = await initRes.json();
        throw new Error(errData.error || 'Failed to initialize upload');
      }

      const { videoId, uploadUrl, accessKey } = await initRes.json();

      const xhr = new XMLHttpRequest();

      await new Promise<void>((resolve, reject) => {
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            setUploadProgress(Math.round((e.loaded / e.total) * 100));
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error(`Upload failed: ${xhr.status}`));
          }
        });

        xhr.addEventListener('error', () => reject(new Error('Upload failed')));

        xhr.open('PUT', uploadUrl);
        xhr.setRequestHeader('AccessKey', accessKey);
        xhr.setRequestHeader('Content-Type', 'application/octet-stream');
        xhr.send(selectedFile);
      });

      setUploadProgress(100);
      return videoId;
    } catch (err: any) {
      setUploadError(err.message || 'Upload failed');
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;

    setSaving(true);

    try {
      let finalBunnyId = bunnyVideoId;
      let finalVideoUrl = '';

      if (uploadMode === 'pc' && selectedFile) {
        const uploadedId = await uploadToBunny();
        if (!uploadedId) {
          setSaving(false);
          return;
        }
        finalBunnyId = uploadedId;
      } else if (uploadMode === 'bunny') {
        finalBunnyId = extractVideoIdFromUrl(bunnyVideoId);
      } else if (uploadMode === 'youtube') {
        finalVideoUrl = youtubeUrl;
        finalBunnyId = '';
      }

      const res = await fetch('/api/admin/recorded-courses/videos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          courseId,
          title,
          description,
          bunnyVideoId: finalBunnyId || undefined,
          videoUrl: finalVideoUrl || undefined,
          thumbnail: thumbnail || undefined,
          duration: parseInt(duration) || 0,
          hoursGap: parseInt(hoursGap) || 0,
          isFree,
          ragEnabled,
          aiSummary,
          transcript,
          isActive: true,
        }),
      });

      if (res.ok) {
        onAdded();
      } else {
        const errData = await res.json();
        setUploadError(errData.error || 'Failed to save video');
      }
    } catch (err) {
      setUploadError('Failed to save video');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-start sm:items-center justify-center z-50 p-2 sm:p-4 overflow-y-auto">
      <div className="bg-gray-900 rounded-2xl border border-gray-800 w-full max-w-lg max-h-[calc(100dvh-2rem)] sm:max-h-[88vh] flex flex-col shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-gray-800 bg-gray-900 shrink-0">
          <h2 className="text-xl font-bold text-white">Add New Video</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1">
          <div>
            <label className="block text-sm font-medium text-green-400 mb-3">Video Source</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => { setUploadMode('bunny'); setYoutubeUrl(''); }}
                className={`flex items-center justify-center gap-1 p-3 rounded-xl border-2 transition-all text-xs sm:text-sm ${
                  uploadMode === 'bunny'
                    ? 'bg-green-500/20 border-green-500 text-green-400'
                    : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600'
                }`}
              >
                <LinkIcon size={18} />
                <span className="font-medium">Bunny HLS</span>
              </button>
              <button
                type="button"
                onClick={() => setUploadMode('pc')}
                className={`flex items-center justify-center gap-1 p-3 rounded-xl border-2 transition-all text-xs sm:text-sm ${
                  uploadMode === 'pc'
                    ? 'bg-yellow-500/20 border-yellow-500 text-yellow-400'
                    : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600'
                }`}
              >
                <Upload size={18} />
                <span className="font-medium">Upload</span>
              </button>
              <button
                type="button"
                onClick={() => { setUploadMode('youtube'); setSelectedFile(null); setBunnyVideoId(''); }}
                className={`flex items-center justify-center gap-1 p-3 rounded-xl border-2 transition-all text-xs sm:text-sm ${
                  uploadMode === 'youtube'
                    ? 'bg-red-500/20 border-red-500 text-red-400'
                    : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600'
                }`}
              >
                <LinkIcon size={18} />
                <span className="font-medium">YouTube</span>
              </button>
            </div>
          </div>

          {uploadMode === 'bunny' && (
            <div>
              <label className="block text-sm font-medium text-green-400 mb-2">Bunny HLS URL or Video ID</label>
              <input
                type="text"
                value={bunnyVideoId}
                onChange={(e) => setBunnyVideoId(e.target.value)}
                className="w-full px-4 py-3 bg-black border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-green-500 focus:outline-none font-mono"
                placeholder="https://vz-xxx.b-cdn.net/videoId/playlist.m3u8 or just videoId"
              />
              <p className="text-xs text-gray-500 mt-1">Paste HLS URL from Bunny dashboard or just the video ID</p>
            </div>
          )}

          {uploadMode === 'youtube' && (
            <div>
              <label className="block text-sm font-medium text-red-400 mb-2">YouTube Video URL</label>
              <input
                type="text"
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                className="w-full px-4 py-3 bg-black border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-red-500 focus:outline-none font-mono"
                placeholder="https://youtu.be/VIDEO_ID"
              />
            </div>
          )}

          {uploadMode === 'pc' && (
            <div>
              <label className="block text-sm font-medium text-yellow-400 mb-2">Upload Video File</label>
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                onChange={handleFileSelect}
                className="hidden"
              />

              {selectedFile ? (
                <div className="bg-black border border-gray-700 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                      <Video className="w-6 h-6 text-yellow-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium truncate">{selectedFile.name}</p>
                      <p className="text-sm text-gray-400">
                        {(selectedFile.size / (1024 * 1024)).toFixed(1)} MB
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedFile(null);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      className="p-2 hover:bg-gray-800 text-gray-400 rounded-lg"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  {uploading && (
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-yellow-400">Uploading to Bunny...</span>
                        <span className="text-white">{uploadProgress}%</span>
                      </div>
                      <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-yellow-500 transition-all duration-300"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full p-8 border-2 border-dashed border-gray-700 rounded-xl hover:border-yellow-500/50 hover:bg-yellow-500/5 transition-all group"
                >
                  <CloudUpload className="w-12 h-12 text-gray-600 group-hover:text-yellow-400 mx-auto mb-3 transition-colors" />
                  <p className="text-white font-medium">Click to select video file</p>
                  <p className="text-sm text-gray-500 mt-1">MP4, MOV, WebM • Max 2GB</p>
                </button>
              )}
            </div>
          )}

          {uploadError && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-lg text-sm">
              {uploadError}
            </div>
          )}

          <div className="border-t border-gray-800 pt-5">
            <div>
              <label className="block text-sm font-medium text-green-400 mb-2">Video Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-3 bg-black border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-green-500 focus:outline-none"
                placeholder="Enter video title"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-green-400 mb-2">Description (Optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full px-4 py-3 bg-black border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-green-500 focus:outline-none resize-none"
              placeholder="Brief description"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-green-400 mb-2">Thumbnail URL (Optional)</label>
            <input
              type="url"
              value={thumbnail}
              onChange={(e) => setThumbnail(e.target.value)}
              className="w-full px-4 py-3 bg-black border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-green-500 focus:outline-none"
              placeholder="https://example.com/thumbnail.jpg"
            />
            {thumbnail && (
              <div className="mt-2 relative rounded-lg overflow-hidden bg-gray-950 border border-gray-800 max-h-36 flex items-center justify-center p-1">
                <img src={thumbnail} alt="Preview" className="max-h-32 w-auto object-contain rounded" onError={(e) => (e.currentTarget.style.display = 'none')} />
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-green-400 mb-2">Video Duration (minutes)</label>
              <input
                type="number"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="w-full px-4 py-3 bg-black border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-green-500 focus:outline-none"
                placeholder="15"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-green-400 mb-2">Hours Gap Before Next Video</label>
              <input
                type="number"
                value={hoursGap}
                onChange={(e) => setHoursGap(e.target.value)}
                className="w-full px-4 py-3 bg-black border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-green-500 focus:outline-none"
                placeholder="0"
                min="0"
              />
            </div>
          </div>

          <div className="flex items-start pt-2">
            <label className="flex items-center gap-2 text-white cursor-pointer">
              <input
                type="checkbox"
                checked={isFree}
                onChange={(e) => setIsFree(e.target.checked)}
                className="w-5 h-5 rounded border-gray-600 bg-black text-green-500 focus:ring-green-500"
              />
              Free Preview Video
            </label>
          </div>

          <div className="border border-gray-800 rounded-xl p-4 space-y-4">
            <label className="flex items-center gap-2 text-white cursor-pointer">
              <input
                type="checkbox"
                checked={ragEnabled}
                onChange={(e) => setRagEnabled(e.target.checked)}
                className="w-5 h-5 rounded border-gray-600 bg-black text-green-500 focus:ring-green-500"
              />
              Enable Video RAG Assistant
            </label>
            <div>
              <label className="block text-sm font-medium text-green-400 mb-2">AI Summary / Study Notes</label>
              <textarea
                value={aiSummary}
                onChange={(e) => setAiSummary(e.target.value)}
                rows={3}
                className="w-full px-4 py-3 bg-black border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-green-500 focus:outline-none resize-y"
                placeholder="Short summary of this video for AI answers"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-green-400 mb-2">Transcript / Full Notes</label>
              <textarea
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                rows={6}
                className="w-full px-4 py-3 bg-black border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-green-500 focus:outline-none resize-y"
                placeholder="Paste transcript or detailed notes. The learner assistant will answer only from this context."
              />
            </div>
          </div>

          </div>

          <div className="flex gap-3 p-4 sm:p-5 border-t border-gray-800 bg-gray-900 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={uploading || saving}
              className="flex-1 px-4 py-3 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={uploading || saving || (uploadMode === 'bunny' && !bunnyVideoId) || (uploadMode === 'pc' && !selectedFile) || (uploadMode === 'youtube' && !youtubeUrl)}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-500 hover:bg-green-600 text-black font-semibold rounded-lg transition-colors disabled:opacity-50"
            >
              {(saving || uploading) && <Loader2 size={18} className="animate-spin" />}
              {uploading ? 'Uploading...' : saving ? 'Saving...' : 'Add Video'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Add / Edit Level Modal
function AddLevelModal({
  token,
  courseId,
  existingLevel,
  defaultLevelNumber = 1,
  insertOrder,
  onClose,
  onSaved,
}: {
  token: string;
  courseId: string;
  existingLevel?: UnifiedItem | null;
  defaultLevelNumber?: number;
  insertOrder?: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [levelNumber, setLevelNumber] = useState<number>(existingLevel?.levelNumber || defaultLevelNumber);
  const [name, setName] = useState<string>(existingLevel?.title || '');
  const [description, setDescription] = useState<string>(existingLevel?.description || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter a Level Name');
      return;
    }
    if (!levelNumber || levelNumber < 1) {
      setError('Please enter a valid Level Number (minimum 1)');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const payload = {
        ...(existingLevel ? { sectionId: existingLevel._id, id: existingLevel._id } : {}),
        courseId,
        order: existingLevel ? existingLevel.order : (insertOrder ?? 0),
        content: {
          title: name.trim(),
          levelNumber: Number(levelNumber),
          description: description.trim(),
          en: {
            title: name.trim(),
            description: description.trim(),
          },
        },
      };

      const res = await fetch('/api/admin/recorded-courses/sections', {
        method: existingLevel ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save level');
      }

      onSaved();
    } catch (err: unknown) {
      console.error('Error saving level:', err);
      setError(err instanceof Error ? err.message : 'Failed to save level');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-start sm:items-center justify-center z-50 p-2 sm:p-4 overflow-y-auto">
      <div className="bg-gray-900 border border-purple-500/30 rounded-2xl w-full max-w-lg max-h-[calc(100dvh-2rem)] sm:max-h-[88vh] flex flex-col shadow-2xl shadow-purple-950/40 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-800 bg-gradient-to-r from-purple-900/30 via-indigo-900/20 to-transparent shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
              <Layers size={22} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">
                {existingLevel ? 'Edit Level' : 'Add Level'}
              </h2>
              <p className="text-xs text-purple-300/70">
                Organize your curriculum into progressive stages
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={saving}
            className="p-2 hover:bg-gray-800 text-gray-400 hover:text-white rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="bg-red-500/10 border border-red-500/40 text-red-400 text-sm p-3 rounded-lg flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="sm:col-span-1">
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                Level # <span className="text-purple-400">*</span>
              </label>
              <input
                type="number"
                min="1"
                step="1"
                value={levelNumber}
                onChange={(e) => setLevelNumber(parseInt(e.target.value) || 1)}
                className="w-full px-4 py-2.5 bg-black/60 border border-gray-700 focus:border-purple-500 rounded-lg text-white font-bold text-center focus:outline-none transition-colors"
                required
              />
            </div>
            <div className="sm:col-span-3">
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                Level Name <span className="text-purple-400">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Level 1 - Basic Breathing Techniques"
                className="w-full px-4 py-2.5 bg-black/60 border border-gray-700 focus:border-purple-500 rounded-lg text-white placeholder-gray-500 focus:outline-none transition-colors"
                required
                autoFocus
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-sm font-medium text-gray-300">
                Description <span className="text-xs text-gray-500 font-normal">(Optional)</span>
              </label>
              <span className="text-xs text-gray-500">Brief summary of this level</span>
            </div>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="e.g. Introduction to fundamental breath awareness, Ida and Pingala swaras, and morning routines."
              className="w-full px-4 py-2.5 bg-black/60 border border-gray-700 focus:border-purple-500 rounded-lg text-white placeholder-gray-500 focus:outline-none resize-none transition-colors"
            />
          </div>

          </div>

          <div className="p-4 sm:p-5 flex items-center justify-end gap-3 border-t border-gray-800 bg-gray-900 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2.5 border border-gray-700 hover:bg-gray-800 text-gray-300 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-sm font-semibold rounded-lg shadow-lg shadow-purple-600/30 transition-all disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Layers size={16} />
                  <span>{existingLevel ? 'Update Level' : 'Save Level'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
