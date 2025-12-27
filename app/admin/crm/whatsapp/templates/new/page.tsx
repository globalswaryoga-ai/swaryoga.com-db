'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useCRM } from '@/hooks/useCRM';
import { AlertBox } from '@/components/admin/crm';

export default function CreateTemplatePage() {
  const router = useRouter();
  const token = useAuth();
  const crm = useCRM({ token });
  const crmFetch = crm.fetch;

  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    templateName: '',
    templateContent: '',
    category: 'MARKETING',
    language: 'en',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.templateName || !form.templateContent) {
      setError('Template name and content are required');
      return;
    }

    setSaving(true);
    try {
      await crmFetch('/api/admin/crm/templates', {
        method: 'POST',
        body: form,
      });
      router.push('/admin/crm/whatsapp/templates?success=created');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create template');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="px-8 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Create Template</h1>
            <p className="text-gray-600 mt-1">Add a new WhatsApp message template</p>
          </div>
          <Link
            href="/admin/crm/whatsapp/templates"
            className="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-semibold transition-colors"
          >
            ← Back
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="p-8 max-w-2xl mx-auto">
        {error && <AlertBox type="error" message={error} onClose={() => setError(null)} />}

        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 shadow-md p-8 space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Template Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g., Welcome Message, Order Confirmation"
              value={form.templateName}
              onChange={(e) => setForm({ ...form, templateName: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E7F43] focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">Give your template a clear, descriptive name</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Language
              </label>
              <select
                value={form.language}
                onChange={(e) => setForm({ ...form, language: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E7F43] focus:border-transparent"
              >
                <option value="en">🇬🇧 English</option>
                <option value="hi">🇮🇳 Hindi</option>
                <option value="mr">🇮🇳 Marathi</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Category
              </label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E7F43] focus:border-transparent"
              >
                <option value="MARKETING">📢 Marketing</option>
                <option value="TRANSACTIONAL">💳 Transactional</option>
                <option value="OTP">🔐 OTP</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Message Content *
            </label>
            <textarea
              required
              placeholder="Enter your message template. Example: Hello {{firstName}}, thank you for contacting us!"
              rows={8}
              value={form.templateContent}
              onChange={(e) => setForm({ ...form, templateContent: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E7F43] focus:border-transparent font-mono text-sm"
            />
            <p className="text-xs text-gray-500 mt-2">
              💡 Use variables like {'{{firstName}}, {{phone}}, {{email}}'} for personalization
            </p>
          </div>

          {form.templateContent && (
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <p className="text-xs font-semibold text-blue-900 mb-3">📱 Preview:</p>
              <div className="bg-white rounded-lg p-3 border border-blue-200">
                <p className="text-sm text-gray-800 whitespace-pre-wrap">{form.templateContent}</p>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-6 border-t border-gray-200">
            <Link
              href="/admin/crm/whatsapp/templates"
              className="flex-1 px-6 py-3 border border-gray-300 rounded-lg text-gray-700 font-semibold hover:bg-gray-50 transition-colors text-center"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-6 py-3 bg-[#1E7F43] hover:bg-[#166235] disabled:bg-gray-400 text-white rounded-lg font-semibold transition-colors"
            >
              {saving ? 'Creating...' : '+ Create Template'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
