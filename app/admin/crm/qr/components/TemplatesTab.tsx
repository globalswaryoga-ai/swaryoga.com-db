'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Search, Plus, Pencil, Trash2, Eye, Loader2 } from 'lucide-react';

interface Template {
  _id: string;
  templateName: string;
  templateContent: string;
  category?: string;
  language?: string;
  status?: string;
  createdAt?: string;
}

interface TemplatesTabProps {
  token: string | null;
}

export function TemplatesTab({ token }: TemplatesTabProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  const fetchTemplates = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch('/api/admin/crm/templates?provider=qr&limit=200', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to load templates');
      const data = await res.json();
      setTemplates(data?.templates ?? []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { if (token) fetchTemplates(); }, [token, fetchTemplates]);

  const filtered = templates.filter(t =>
    !searchQuery || t.templateName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.templateContent.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this template?') || !token) return;
    try {
      const res = await fetch(`/api/admin/crm/templates/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) {
        setTemplates(templates.filter(t => t._id !== id));
      }
    } catch (e: any) {
      setError(e.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm font-medium"
        >
          <Plus className="w-4 h-4" /> New
        </button>
      </div>

      {error && (
        <div className="mx-4 mt-3 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">{error}</div>
      )}

      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-4">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500">
            <p className="text-sm">No templates yet</p>
            <button onClick={() => setShowCreate(true)} className="text-green-600 text-sm font-medium mt-2">
              Create your first template →
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map(t => (
              <div key={t._id} className="p-3 border rounded-lg bg-white hover:shadow-md transition">
                <h3 className="font-medium text-sm truncate">{t.templateName}</h3>
                <p className="text-xs text-gray-500 line-clamp-2 mt-1">{t.templateContent}</p>
                <div className="flex items-center gap-1 mt-2">
                  {t.category && <span className="text-xs bg-gray-100 px-2 py-1 rounded">{t.category}</span>}
                </div>
                <div className="flex items-center gap-1 mt-3">
                  <button className="flex items-center gap-1 text-xs text-gray-600 hover:text-green-600">
                    <Eye className="w-3 h-3" /> View
                  </button>
                  <button className="flex items-center gap-1 text-xs text-gray-600 hover:text-blue-600">
                    <Pencil className="w-3 h-3" /> Edit
                  </button>
                  <button
                    onClick={() => handleDelete(t._id)}
                    className="flex items-center gap-1 text-xs text-gray-600 hover:text-red-600 ml-auto"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Modal Placeholder */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h2 className="text-lg font-bold mb-4">Create Template</h2>
            <p className="text-sm text-gray-500 mb-4">Template creation form coming soon - use the main templates page for now</p>
            <button
              onClick={() => setShowCreate(false)}
              className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-medium text-sm"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
