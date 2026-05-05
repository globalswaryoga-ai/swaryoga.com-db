'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Search, Plus, Pencil, Trash2, Eye, Loader2, X, ChevronDown, Upload, Image as ImageIcon } from 'lucide-react';

interface Template {
  _id: string;
  templateName: string;
  templateContent: string;
  category?: string;
  language?: string;
  status?: string;
  createdAt?: string;
  headerFormat?: string;
  headerMedia?: { kind: string; url: string };
  footer?: string;
  buttons?: Array<{ kind: string; title: string; url?: string; phoneNumber?: string }>;
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

  // Form state
  const [formData, setFormData] = useState({
    templateName: '',
    language: 'en',
    category: 'MARKETING',
    headerFormat: 'NONE',
    headerMediaUrl: '',
    body: '',
    footer: '',
    buttons: [] as Array<{ kind: string; title: string; url?: string; phoneNumber?: string }>,
  });
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [headerImageFile, setHeaderImageFile] = useState<File | null>(null);

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

  const handleSubmitTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    if (!formData.templateName.trim() || !formData.body.trim()) {
      setError('Template name and body are required');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        templateName: formData.templateName,
        templateContent: formData.body,
        language: formData.language,
        category: formData.category,
        headerFormat: formData.headerFormat,
        footerText: formData.footer,
        buttons: formData.buttons.map(b => ({ ...b, type: b.kind })),
        provider: 'qr',
      };

      if (formData.headerFormat === 'IMAGE' && formData.headerMediaUrl) {
        Object.assign(payload, {
          headerMedia: { kind: 'image', url: formData.headerMediaUrl },
        });
      } else if (formData.headerFormat === 'TEXT') {
        Object.assign(payload, {
          headerText: formData.headerMediaUrl,
        });
      }

      const res = await fetch('/api/admin/crm/templates', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create template');

      setTemplates([data.template || data.data, ...templates]);
      setShowCreate(false);
      setFormData({
        templateName: '',
        language: 'en',
        category: 'MARKETING',
        headerFormat: 'NONE',
        headerMediaUrl: '',
        body: '',
        footer: '',
        buttons: [],
      });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const addButton = () => {
    setFormData({
      ...formData,
      buttons: [...formData.buttons, { kind: 'QUICK_REPLY', title: '' }],
    });
  };

  const removeButton = (index: number) => {
    setFormData({
      ...formData,
      buttons: formData.buttons.filter((_, i) => i !== index),
    });
  };

  const updateButton = (index: number, field: string, value: string) => {
    const newButtons = [...formData.buttons];
    newButtons[index] = { ...newButtons[index], [field]: value };
    setFormData({ ...formData, buttons: newButtons });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (max 10MB)
    const maxSizeMB = 10;
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      setError(`Image must be less than ${maxSizeMB}MB. Current size: ${(file.size / 1024 / 1024).toFixed(2)}MB`);
      return;
    }

    // Validate file type
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
      setError('Image must be JPEG, PNG, WebP, or GIF');
      return;
    }

    setUploading(true);
    setError(null);
    setHeaderImageFile(file);

    try {
      // Generate temporary ID for upload
      const tempId = `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const formDataToSend = new FormData();
      formDataToSend.append('file', file);
      formDataToSend.append('fileType', 'image');
      formDataToSend.append('templateId', tempId);

      const res = await fetch('/api/admin/crm/templates/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formDataToSend,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');

      setFormData({ ...formData, headerMediaUrl: data.data.url });
      setError(null);
    } catch (e: any) {
      setError(`Upload failed: ${e.message}`);
      setHeaderImageFile(null);
    } finally {
      setUploading(false);
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
                  {t.language && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">{t.language}</span>}
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

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Create Template</h2>
              <button onClick={() => setShowCreate(false)} className="text-gray-500 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitTemplate} className="space-y-4">
              {/* Template Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Template Name *</label>
                <input
                  type="text"
                  value={formData.templateName}
                  onChange={(e) => setFormData({ ...formData, templateName: e.target.value })}
                  placeholder="e.g., Welcome Message"
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              {/* Language & Category */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Language</label>
                  <select
                    value={formData.language}
                    onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="en">English</option>
                    <option value="hi">Hindi</option>
                    <option value="es">Spanish</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="MARKETING">Marketing</option>
                    <option value="UTILITY">Utility</option>
                    <option value="OTP">OTP</option>
                    <option value="ACCOUNT_UPDATE">Account Update</option>
                  </select>
                </div>
              </div>

              {/* Header Format */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Header Type</label>
                <div className="flex gap-2">
                  {['NONE', 'TEXT', 'IMAGE'].map(type => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setFormData({ ...formData, headerFormat: type })}
                      className={`px-3 py-1.5 text-sm rounded transition ${
                        formData.headerFormat === type
                          ? 'bg-green-600 text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* Header Media */}
              {formData.headerFormat !== 'NONE' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {formData.headerFormat === 'IMAGE' ? 'Image Upload' : 'Header Text'}
                  </label>
                  {formData.headerFormat === 'IMAGE' ? (
                    <div className="space-y-3">
                      <div className="relative border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-green-500 transition cursor-pointer bg-gray-50">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          disabled={uploading}
                          className="absolute inset-0 w-full h-full cursor-pointer opacity-0"
                        />
                        <div className="flex flex-col items-center gap-2">
                          {uploading ? (
                            <>
                              <Loader2 className="w-5 h-5 text-green-600 animate-spin" />
                              <p className="text-xs text-gray-600">Uploading...</p>
                            </>
                          ) : formData.headerMediaUrl ? (
                            <>
                              <ImageIcon className="w-5 h-5 text-green-600" />
                              <p className="text-xs text-gray-600">Click to replace image</p>
                            </>
                          ) : (
                            <>
                              <Upload className="w-5 h-5 text-gray-400" />
                              <p className="text-xs text-gray-600">Click to upload or drag & drop</p>
                              <p className="text-xs text-gray-500">JPEG, PNG, WebP, GIF (Max 10MB)</p>
                            </>
                          )}
                        </div>
                      </div>
                      {formData.headerMediaUrl && (
                        <div className="relative w-full h-40 border rounded-lg overflow-hidden bg-gray-100">
                          <img
                            src={formData.headerMediaUrl}
                            alt="Header preview"
                            className="w-full h-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => setFormData({ ...formData, headerMediaUrl: '' })}
                            className="absolute top-1 right-1 bg-red-600 hover:bg-red-700 text-white p-1 rounded"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <input
                      type="text"
                      value={formData.headerMediaUrl}
                      onChange={(e) => setFormData({ ...formData, headerMediaUrl: e.target.value })}
                      placeholder="Header text"
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  )}
                </div>
              )}

              {/* Body */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Message Body *</label>
                <textarea
                  value={formData.body}
                  onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                  placeholder="Your message here..."
                  rows={4}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                />
              </div>

              {/* Footer */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Footer (Optional)</label>
                <input
                  type="text"
                  value={formData.footer}
                  onChange={(e) => setFormData({ ...formData, footer: e.target.value })}
                  placeholder="e.g., Company name or signature"
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              {/* Buttons */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">Buttons (Optional)</label>
                  <button
                    type="button"
                    onClick={addButton}
                    className="text-xs text-green-600 hover:text-green-700 font-medium"
                  >
                    + Add Button
                  </button>
                </div>
                <div className="space-y-2">
                  {formData.buttons.map((btn, idx) => (
                    <div key={idx} className="flex gap-2">
                      <select
                        value={btn.kind}
                        onChange={(e) => updateButton(idx, 'kind', e.target.value)}
                        className="px-2 py-1 border rounded text-xs focus:outline-none focus:ring-2 focus:ring-green-500"
                      >
                        <option value="QUICK_REPLY">Quick Reply</option>
                        <option value="URL">URL Button</option>
                        <option value="PHONE">Call Button</option>
                      </select>
                      <input
                        type="text"
                        placeholder="Button text"
                        value={btn.title}
                        onChange={(e) => updateButton(idx, 'title', e.target.value)}
                        className="flex-1 px-2 py-1 border rounded text-xs focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                      {btn.kind === 'URL' && (
                        <input
                          type="text"
                          placeholder="URL"
                          onChange={(e) => updateButton(idx, 'url', e.target.value)}
                          className="flex-1 px-2 py-1 border rounded text-xs focus:outline-none focus:ring-2 focus:ring-green-500"
                        />
                      )}
                      {btn.kind === 'PHONE' && (
                        <input
                          type="text"
                          placeholder="Phone"
                          onChange={(e) => updateButton(idx, 'phoneNumber', e.target.value)}
                          className="flex-1 px-2 py-1 border rounded text-xs focus:outline-none focus:ring-2 focus:ring-green-500"
                        />
                      )}
                      <button
                        type="button"
                        onClick={() => removeButton(idx)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* WhatsApp-style Preview */}
              <div className="p-3 bg-[#e5ddd5] rounded-lg border">
                <p className="text-xs font-medium text-gray-600 mb-2">Preview</p>
                <div className="flex justify-end">
                  <div className="max-w-xs w-full bg-white rounded-lg shadow-sm overflow-hidden relative">
                    {/* Tail */}
                    <div className="absolute top-0 right-[-8px] w-0 h-0 border-l-[8px] border-l-white border-t-[8px] border-t-transparent" />

                    {/* Image Header */}
                    {formData.headerFormat === 'IMAGE' && (
                      formData.headerMediaUrl ? (
                        <img
                          src={formData.headerMediaUrl}
                          alt="Template header"
                          className="w-full h-40 object-cover"
                        />
                      ) : (
                        <div className="w-full h-32 bg-gray-200 flex items-center justify-center">
                          <span className="text-gray-400 text-xs">Image header</span>
                        </div>
                      )
                    )}

                    {/* Text Header */}
                    {formData.headerFormat === 'TEXT' && formData.headerMediaUrl && (
                      <div className="px-3 pt-3">
                        <p className="font-semibold text-sm text-gray-900">{formData.headerMediaUrl}</p>
                      </div>
                    )}

                    {/* Body */}
                    <div className="px-3 py-2">
                      <p className="text-sm text-gray-800 whitespace-pre-wrap">
                        {formData.body || <span className="text-gray-400 italic">Message body...</span>}
                      </p>
                    </div>

                    {/* Footer */}
                    {formData.footer && (
                      <div className="px-3 pb-2">
                        <p className="text-xs text-gray-400">{formData.footer}</p>
                      </div>
                    )}

                    {/* Timestamp */}
                    <div className="flex justify-end px-3 pb-1">
                      <span className="text-[10px] text-gray-400">10:30 AM ✓✓</span>
                    </div>

                    {/* Buttons */}
                    {formData.buttons.length > 0 && (
                      <div className="border-t border-gray-100">
                        {formData.buttons.map((btn, idx) => (
                          <button
                            key={idx}
                            type="button"
                            className="w-full py-2 text-sm text-[#00a5f4] font-medium hover:bg-gray-50 border-b border-gray-100 last:border-b-0 flex items-center justify-center gap-1"
                          >
                            {btn.kind === 'URL' ? '🔗' : btn.kind === 'PHONE_NUMBER' ? '📞' : '↩'}
                            {btn.title || 'Button'}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-4">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition font-medium text-sm"
                >
                  {submitting ? 'Creating...' : 'Create Template'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-medium text-sm"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
