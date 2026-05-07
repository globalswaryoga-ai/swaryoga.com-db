'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { ArrowLeft, Plus, Edit2, Trash2, FileText, Download, X, Save, Loader, AlertCircle } from 'lucide-react';

interface Material {
  _id: string;
  content: { en: { title: string; description?: string } };
  type: 'pdf' | 'notes' | 'receipt' | 'certificate' | 'other';
  fileUrl: string;
  downloadable: boolean;
  order: number;
}

interface Course {
  _id: string;
  content: { en: { title: string } };
}

export default function MaterialsPage({ params }: { params: { courseId: string } }) {
  const token = useAuth();
  const { courseId } = params;

  const [course, setCourse] = useState<Course | null>(null);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'pdf' | 'notes' | 'receipt' | 'certificate' | 'other'>('pdf');
  const [fileUrl, setFileUrl] = useState('');
  const [downloadable, setDownloadable] = useState(true);

  const fetchData = useCallback(async () => {
    if (!token || !courseId) return;

    try {
      setLoading(true);
      const [courseRes, matRes] = await Promise.all([
        fetch('/api/admin/recorded-courses', { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/admin/e-learning/materials?courseId=${courseId}`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      const [courseData, matData] = await Promise.all([courseRes.json(), matRes.json()]);

      if (courseData.success) {
        const found = courseData.courses?.find((c: Course) => c._id === courseId);
        setCourse(found || null);
      }

      if (matData.success) {
        setMaterials(matData.materials || []);
      }
    } catch (err) {
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [token, courseId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setType('pdf');
    setFileUrl('');
    setDownloadable(true);
    setEditingId(null);
  };

  const handleSave = async () => {
    if (!token || !title || !fileUrl) return;

    try {
      const method = editingId ? 'PUT' : 'POST';
      const body = editingId
        ? {
            materialId: editingId,
            content: { en: { title, description } },
            type,
            fileUrl,
            downloadable,
          }
        : {
            courseId,
            content: { en: { title, description } },
            type,
            fileUrl,
            downloadable,
          };

      const res = await fetch('/api/admin/e-learning/materials', {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        await fetchData();
        resetForm();
        setShowForm(false);
      } else {
        setError('Failed to save material');
      }
    } catch (err) {
      setError('Error saving material');
    }
  };

  const handleDelete = async (id: string) => {
    if (!token || !confirm('Delete this material?')) return;

    try {
      const res = await fetch(`/api/admin/e-learning/materials?id=${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        await fetchData();
      }
    } catch (err) {
      setError('Error deleting material');
    }
  };

  const handleEdit = (material: Material) => {
    setTitle(material.content.en.title);
    setDescription(material.content.en.description || '');
    setType(material.type);
    setFileUrl(material.fileUrl);
    setDownloadable(material.downloadable);
    setEditingId(material._id);
    setShowForm(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader className="w-8 h-8 animate-spin text-green-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black p-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link href={`/admin/crm/e-learning`} className="p-2 hover:bg-gray-800 rounded-lg text-gray-400">
          <ArrowLeft size={24} />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-white">{course?.content.en.title || 'Course'} - Materials</h1>
          <p className="text-sm text-gray-400">{materials.length} materials</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="flex items-center gap-2 px-5 py-2.5 bg-green-500 hover:bg-green-600 text-black font-semibold rounded-lg"
        >
          <Plus size={18} />
          Add Material
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-lg mb-6 flex items-center gap-2">
          <AlertCircle size={20} />
          {error}
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div className="bg-gray-900/50 rounded-xl border border-gray-800 p-6 mb-6">
          <h2 className="text-lg font-bold text-white mb-4">{editingId ? 'Edit' : 'New'} Material</h2>
          <div className="space-y-4">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Material title"
              className="w-full px-4 py-2 bg-black border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-green-500 focus:outline-none"
            />
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description"
              rows={2}
              className="w-full px-4 py-2 bg-black border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-green-500 focus:outline-none resize-none"
            />
            <div className="grid grid-cols-2 gap-4">
              <select
                value={type}
                onChange={(e) => setType(e.target.value as any)}
                className="px-4 py-2 bg-black border border-gray-700 rounded-lg text-white focus:border-green-500 focus:outline-none"
              >
                <option value="pdf">PDF</option>
                <option value="notes">Notes</option>
                <option value="receipt">Receipt</option>
                <option value="certificate">Certificate</option>
                <option value="other">Other</option>
              </select>
              <label className="flex items-center gap-2 text-white">
                <input
                  type="checkbox"
                  checked={downloadable}
                  onChange={(e) => setDownloadable(e.target.checked)}
                  className="w-5 h-5 rounded border-gray-600 bg-black text-green-500"
                />
                Downloadable
              </label>
            </div>
            <input
              type="text"
              value={fileUrl}
              onChange={(e) => setFileUrl(e.target.value)}
              placeholder="File URL (Bunny CDN, Google Drive, etc.)"
              className="w-full px-4 py-2 bg-black border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-green-500 focus:outline-none font-mono text-sm"
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  resetForm();
                  setShowForm(false);
                }}
                className="flex-1 px-4 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!title || !fileUrl}
                className="flex-1 px-4 py-2 bg-green-500 hover:bg-green-600 text-black font-semibold rounded-lg flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Save size={18} />
                {editingId ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* List */}
      <div className="space-y-3">
        {materials.length === 0 ? (
          <div className="text-center py-12 bg-gray-900/50 rounded-xl border border-gray-800">
            <p className="text-gray-400 mb-4">No materials yet</p>
            <button
              onClick={() => {
                resetForm();
                setShowForm(true);
              }}
              className="px-6 py-2 bg-green-500 hover:bg-green-600 text-black font-semibold rounded-lg"
            >
              Add First Material
            </button>
          </div>
        ) : (
          materials.map((material) => (
            <div key={material._id} className="bg-gray-900/50 rounded-xl border border-gray-800 p-4 hover:bg-gray-800/50">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <FileText size={18} className="text-blue-400" />
                    <h3 className="font-medium text-white">{material.content.en.title}</h3>
                    <span className="px-2 py-1 text-xs bg-gray-700 text-gray-300 rounded capitalize">{material.type}</span>
                  </div>
                  {material.content.en.description && (
                    <p className="text-sm text-gray-400 mt-2">{material.content.en.description}</p>
                  )}
                  <div className="flex items-center gap-3 mt-3 text-sm text-gray-400">
                    {material.downloadable && (
                      <span className="flex items-center gap-1 text-green-400">
                        <Download size={14} />
                        Downloadable
                      </span>
                    )}
                    <a
                      href={material.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300"
                    >
                      Open →
                    </a>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => handleEdit(material)}
                    className="p-2 hover:bg-yellow-500/20 text-yellow-400 rounded-lg"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button
                    onClick={() => handleDelete(material._id)}
                    className="p-2 hover:bg-red-500/20 text-red-400 rounded-lg"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
