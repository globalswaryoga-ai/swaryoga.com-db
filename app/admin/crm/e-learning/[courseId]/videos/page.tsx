'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import {
  ArrowLeft, Plus, Edit2, Trash2, Video, Upload, Link as LinkIcon, X, Save, CloudUpload, Loader2,
  ArrowUp, ArrowDown, ChevronDown, MessageCircle, FileText, CheckSquare, HelpCircle, ClipboardList, Camera
} from 'lucide-react';

type ContentType = 'video' | 'material' | 'assignment' | 'task' | 'question';

interface UnifiedItem {
  _id: string;
  type: ContentType;
  title: string;
  order: number;
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

  // Fetch all content - videos, materials, assignments
  const fetchData = useCallback(async () => {
    if (!token || !courseId) return;

    try {
      setLoading(true);
      setError(null);

      const [coursesRes, videosRes, materialsRes, assignmentsRes] = await Promise.all([
        fetch('/api/admin/recorded-courses', { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/admin/recorded-courses/videos?courseId=${courseId}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/admin/e-learning/materials?courseId=${courseId}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/admin/e-learning/assignments?courseId=${courseId}`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      const [coursesData, videosData, materialsData, assignmentsData] = await Promise.all([
        coursesRes.json(),
        videosRes.json(),
        materialsRes.json(),
        assignmentsRes.json(),
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
          });
        });
      }

      if (materialsData.success && materialsData.materials) {
        materialsData.materials.forEach((m: any) => {
          items.push({
            _id: m._id,
            type: 'material',
            title: m.content?.en?.title || 'Untitled Material',
            order: m.order,
            fileUrl: m.fileUrl,
            materialType: m.type,
            downloadable: m.downloadable,
            description: m.content?.en?.description,
          });
        });
      }

      if (assignmentsData.success && assignmentsData.assignments) {
        assignmentsData.assignments.forEach((a: any) => {
          const subType = a.subType || 'assignment';
          const mappedType: ContentType = subType === 'task' ? 'task'
            : subType === 'question' ? 'question'
            : 'assignment';

          items.push({
            _id: a._id,
            type: mappedType,
            title: a.content?.en?.title || 'Untitled',
            order: a.order,
            subType,
            totalPoints: a.totalPoints,
            isRequired: a.isRequired,
            description: a.content?.en?.description,
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

    const itemA = unifiedList[index];
    const itemB = unifiedList[targetIndex];

    // Optimistic update
    const newList = [...unifiedList];
    newList[index] = { ...itemA, order: itemB.order };
    newList[targetIndex] = { ...itemB, order: itemA.order };
    setUnifiedList(newList.sort((a, b) => a.order - b.order));

    setReordering(itemA._id);

    try {
      await Promise.all([patchOrder(itemA, itemB.order), patchOrder(itemB, itemA.order)]);
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
      : item.type === 'material' ? '/api/admin/e-learning/materials'
      : '/api/admin/e-learning/assignments';

    const key = item.type === 'video' ? 'videoId'
      : item.type === 'material' ? 'materialId'
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
        : item.type === 'material' ? `/api/admin/e-learning/materials?id=${item._id}`
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

  const videoCount = unifiedList.filter(i => i.type === 'video').length;
  const materialCount = unifiedList.filter(i => i.type === 'material').length;
  const taskCount = unifiedList.filter(i => i.type === 'task' || i.type === 'question' || i.type === 'assignment').length;

  return (
    <div className="min-h-screen bg-black p-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link href={`/admin/crm/e-learning`} className="p-2 hover:bg-gray-800 rounded-lg text-gray-400">
          <ArrowLeft size={24} />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-white">Course Content</h1>
          <p className="text-sm text-gray-400">
            {unifiedList.length} items — {videoCount} videos, {materialCount} PDFs, {taskCount} tasks/assignments
          </p>
        </div>
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
        {unifiedList.length === 0 ? (
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-8 text-center">
            <p className="text-gray-400">No content yet. Click "Add Content" to get started.</p>
          </div>
        ) : (
          unifiedList.map((item, idx) => (
            <div key={`${item.type}-${item._id}`}>
              {/* Insert zone before item */}
              {idx > 0 && (
                <button
                  onClick={() => {
                    setAddModalType(null);
                    setInsertAfterOrder(unifiedList[idx - 1].order + 0.5);
                    setShowAddModal(true);
                  }}
                  className="w-full border-dashed border border-gray-700 text-gray-600 py-1 rounded text-sm hover:border-gray-500 hover:text-gray-400 mb-2"
                >
                  + Add content here
                </button>
              )}

              {/* Content Row */}
              <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4 flex items-center gap-4 group">
                {/* Position Badge */}
                <div className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center font-bold text-white flex-shrink-0">
                  {idx + 1}
                </div>

                {/* Thumbnail */}
                {item.type === 'video' && item.thumbnail && (
                  <div className="w-16 h-12 bg-gray-800 rounded-lg flex-shrink-0 overflow-hidden">
                    <img
                      src={item.thumbnail}
                      alt={item.title}
                      className="w-full h-full object-cover"
                      onError={(e) => (e.currentTarget.style.display = 'none')}
                    />
                  </div>
                )}

                {/* Type Badge */}
                <div className={`px-3 py-1 rounded-lg text-xs font-semibold flex-shrink-0 ${
                  item.type === 'video' ? 'bg-blue-500/20 text-blue-400'
                  : item.type === 'material' ? 'bg-orange-500/20 text-orange-400'
                  : item.type === 'task' ? 'bg-yellow-500/20 text-yellow-400'
                  : item.type === 'question' ? 'bg-teal-500/20 text-teal-400'
                  : 'bg-purple-500/20 text-purple-400'
                }`}>
                  {item.type === 'video' && <Camera size={12} className="inline mr-1" />}
                  {item.type === 'material' && <FileText size={12} className="inline mr-1" />}
                  {item.type === 'task' && <CheckSquare size={12} className="inline mr-1" />}
                  {item.type === 'question' && <HelpCircle size={12} className="inline mr-1" />}
                  {item.type === 'assignment' && <ClipboardList size={12} className="inline mr-1" />}
                  {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
                </div>

                {/* Content Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-white font-medium truncate">{item.title}</h3>
                  <p className="text-xs text-gray-500">
                    {item.type === 'video' && item.duration ? `${Math.round(item.duration / 60)}min`
                      : item.type === 'material' ? `${item.materialType || 'file'}${item.downloadable ? ' • Downloadable' : ''}`
                      : item.type === 'assignment' ? `${item.totalPoints || 0} pts`
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
            </div>
          ))
        )}

        {/* Insert zone after last item */}
        {unifiedList.length > 0 && (
          <button
            onClick={() => {
              setAddModalType(null);
              setInsertAfterOrder((unifiedList[unifiedList.length - 1]?.order || 0) + 0.5);
              setShowAddModal(true);
            }}
            className="w-full border-dashed border border-gray-700 text-gray-600 py-2 rounded text-sm hover:border-gray-500 hover:text-gray-400 mt-4"
          >
            + Add content at end
          </button>
        )}
      </div>

      {/* Modals - keep existing ones */}
      {showEditModal && editingItem?.type === 'video' && (
        <EditVideoModal
          token={token}
          video={editingItem as VideoItem}
          onClose={() => { setShowEditModal(false); setEditingItem(null); }}
          onUpdated={() => { setShowEditModal(false); fetchData(); }}
        />
      )}

      {showAddModal && !addModalType && (
        <TypeSelectorModal
          onSelect={(type) => setAddModalType(type)}
          onClose={() => setShowAddModal(false)}
        />
      )}

      {showAddModal && addModalType === 'video' && (
        <AddVideoModal
          token={token}
          courseId={courseId}
          onClose={() => { setShowAddModal(false); setAddModalType(null); }}
          onAdded={() => { setShowAddModal(false); setAddModalType(null); fetchData(); }}
        />
      )}

      {showAddModal && addModalType === 'material' && (
        <AddMaterialModal
          token={token}
          courseId={courseId}
          order={insertAfterOrder}
          onClose={() => { setShowAddModal(false); setAddModalType(null); }}
          onAdded={() => { setShowAddModal(false); setAddModalType(null); fetchData(); }}
        />
      )}

      {showAddModal && (addModalType === 'assignment' || addModalType === 'task' || addModalType === 'question') && (
        <AddAssignmentModal
          token={token}
          courseId={courseId}
          subType={addModalType as 'assignment' | 'task' | 'question'}
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
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-2xl border border-gray-800 w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <h2 className="text-xl font-bold text-white">Add Content Type</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-lg text-gray-400">
            <X size={20} />
          </button>
        </div>
        <div className="p-6 space-y-3">
          {[
            { type: 'video' as ContentType, label: 'Video', icon: Camera, color: 'blue' },
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
                : color === 'orange' ? 'bg-orange-500/10 border-orange-500/50 hover:border-orange-500'
                : color === 'purple' ? 'bg-purple-500/10 border-purple-500/50 hover:border-purple-500'
                : color === 'yellow' ? 'bg-yellow-500/10 border-yellow-500/50 hover:border-yellow-500'
                : 'bg-teal-500/10 border-teal-500/50 hover:border-teal-500'
              }`}
            >
              <Icon size={24} className={
                color === 'blue' ? 'text-blue-400'
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

// Add Material Modal
function AddMaterialModal({ token, courseId, order, onClose, onAdded }: {
  token: string;
  courseId: string;
  order: number;
  onClose: () => void;
  onAdded: () => void;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [type, setType] = useState<'pdf' | 'notes' | 'other'>('pdf');
  const [downloadable, setDownloadable] = useState(true);
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
      const res = await fetch('/api/admin/e-learning/materials', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          courseId,
          content: { en: { title, description } },
          type,
          fileUrl,
          downloadable,
          order,
        }),
      });

      if (res.ok) {
        onAdded();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to add material');
      }
    } catch (err) {
      setError('Error saving material');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-2xl border border-gray-800 w-full max-w-lg">
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <h2 className="text-xl font-bold text-white">Add Material / PDF</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-lg text-gray-400">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
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

          <div className="grid grid-cols-2 gap-4">
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

          <div className="flex gap-3 pt-4">
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
              {saving ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
              {saving ? 'Adding...' : 'Add Material'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Add Assignment Modal
function AddAssignmentModal({ token, courseId, subType, order, onClose, onAdded }: {
  token: string;
  courseId: string;
  subType: 'assignment' | 'task' | 'question';
  order: number;
  onClose: () => void;
  onAdded: () => void;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [totalPoints, setTotalPoints] = useState('100');
  const [passingPoints, setPassingPoints] = useState('60');
  const [isRequired, setIsRequired] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;

    setSaving(true);
    setError(null);

    try {
      const res = await fetch('/api/admin/e-learning/assignments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          courseId,
          subType,
          content: { en: { title, description } },
          totalPoints: parseInt(totalPoints) || 100,
          passingPoints: parseInt(passingPoints) || 60,
          isRequired,
          order,
        }),
      });

      if (res.ok) {
        onAdded();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to add assignment');
      }
    } catch (err) {
      setError('Error saving assignment');
    } finally {
      setSaving(false);
    }
  };

  const isSimpleType = subType === 'task' || subType === 'question';

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-2xl border border-gray-800 w-full max-w-lg">
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <h2 className="text-xl font-bold text-white">
            {subType === 'task' ? 'Add Task' : subType === 'question' ? 'Add Question' : 'Add Assignment'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-lg text-gray-400">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
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
              placeholder={subType === 'task' ? 'Task title' : subType === 'question' ? 'Question text' : 'Assignment title'}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-green-400 mb-2">Description / Instructions</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-4 py-3 bg-black border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-green-500 focus:outline-none resize-none"
              placeholder={subType === 'task' ? 'Task instructions' : 'Description'}
            />
          </div>

          {!isSimpleType && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-green-400 mb-2">Total Points</label>
                  <input
                    type="number"
                    value={totalPoints}
                    onChange={(e) => setTotalPoints(e.target.value)}
                    className="w-full px-4 py-3 bg-black border border-gray-700 rounded-lg text-white focus:border-green-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-green-400 mb-2">Passing Points</label>
                  <input
                    type="number"
                    value={passingPoints}
                    onChange={(e) => setPassingPoints(e.target.value)}
                    className="w-full px-4 py-3 bg-black border border-gray-700 rounded-lg text-white focus:border-green-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="required"
                  checked={isRequired}
                  onChange={(e) => setIsRequired(e.target.checked)}
                  className="w-5 h-5 rounded border-gray-600 bg-black text-green-500 focus:ring-green-500"
                />
                <label htmlFor="required" className="text-white cursor-pointer">
                  Required to complete course
                </label>
              </div>
            </>
          )}

          <div className="flex gap-3 pt-4">
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
              {saving ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
              {saving ? 'Adding...' : `Add ${subType.charAt(0).toUpperCase() + subType.slice(1)}`}
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
  const [isFree, setIsFree] = useState(video.isFree);
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
          isFree,
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
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-2xl border border-gray-800 w-full max-w-lg">
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <h2 className="text-xl font-bold text-white">Edit Video</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-lg text-gray-400">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
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
            <p className="text-xs text-gray-500 mt-1">Image URL for video thumbnail</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
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
            <div className="flex items-end pb-1">
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
          </div>

          <div className="flex gap-3 pt-4">
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
  const [thumbnail, setThumbnail] = useState('');
  const [isFree, setIsFree] = useState(false);
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
          isFree,
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
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-gray-900 rounded-2xl border border-gray-800 w-full max-w-lg my-8">
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <h2 className="text-xl font-bold text-white">Add New Video</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-lg text-gray-400">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
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
          </div>

          <div className="grid grid-cols-2 gap-4">
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
            <div className="flex items-end pb-1">
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
          </div>

          <div className="flex gap-3 pt-4">
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
