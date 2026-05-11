'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth, getLoginPath } from '@/hooks/useAuth';
import { useCRM } from '@/hooks/useCRM';
import { AlertBox, LoadingSpinner, PageHeader } from '@/components/admin/crm';

type KnowledgeArticle = {
  _id: string;
  title: string;
  content: string;
  shortAnswer?: string;
  category: string;
  subcategory?: string;
  keywords: string[];
  triggerPhrases: string[];
  language: string;
  priority: number;
  usageCount: number;
  helpfulCount: number;
  notHelpfulCount: number;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};

const CATEGORIES = [
  { value: 'general', label: '📋 General' },
  { value: 'workshops', label: '🧘 Workshops' },
  { value: 'pricing', label: '💰 Pricing' },
  { value: 'schedule', label: '📅 Schedule' },
  { value: 'booking', label: '📝 Booking' },
  { value: 'payment', label: '💳 Payment' },
  { value: 'refund', label: '↩️ Refund' },
  { value: 'location', label: '📍 Location' },
  { value: 'other', label: '📦 Other' },
];

const LANGUAGES = [
  { value: 'auto', label: 'Auto-detect' },
  { value: 'en', label: 'English' },
  { value: 'hi', label: 'Hindi' },
  { value: 'mr', label: 'Marathi' },
];

export default function KnowledgeBasePage() {
  const router = useRouter();
  const token = useAuth();
  const crm = useCRM({ token });
  const crmFetch = crm.fetch;

  const [articles, setArticles] = useState<KnowledgeArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Filters
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterEnabled, setFilterEnabled] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Editor state
  const [isEditing, setIsEditing] = useState(false);
  const [editingArticle, setEditingArticle] = useState<KnowledgeArticle | null>(null);

  // Form state
  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formShortAnswer, setFormShortAnswer] = useState('');
  const [formCategory, setFormCategory] = useState('general');
  const [formSubcategory, setFormSubcategory] = useState('');
  const [formKeywords, setFormKeywords] = useState('');
  const [formTriggerPhrases, setFormTriggerPhrases] = useState('');
  const [formLanguage, setFormLanguage] = useState('auto');
  const [formPriority, setFormPriority] = useState('0');
  const [formEnabled, setFormEnabled] = useState(true);

  const fetchArticles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: any = { limit: 200 };
      if (filterCategory !== 'all') params.category = filterCategory;
      if (filterEnabled !== 'all') params.enabled = filterEnabled;
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const res = await crmFetch('/api/admin/crm/knowledge-base', { params });
      setArticles(Array.isArray(res?.articles) ? res.articles : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load articles');
    } finally {
      setLoading(false);
    }
  }, [crmFetch, filterCategory, filterEnabled, searchQuery]);

  useEffect(() => {
    if (!token) {
      router.push(getLoginPath());
      return;
    }
    fetchArticles();
  }, [token, router, fetchArticles]);

  const resetForm = () => {
    setFormTitle('');
    setFormContent('');
    setFormShortAnswer('');
    setFormCategory('general');
    setFormSubcategory('');
    setFormKeywords('');
    setFormTriggerPhrases('');
    setFormLanguage('auto');
    setFormPriority('0');
    setFormEnabled(true);
    setEditingArticle(null);
  };

  const startEdit = (article: KnowledgeArticle) => {
    setEditingArticle(article);
    setFormTitle(article.title);
    setFormContent(article.content);
    setFormShortAnswer(article.shortAnswer || '');
    setFormCategory(article.category);
    setFormSubcategory(article.subcategory || '');
    setFormKeywords(article.keywords.join(', '));
    setFormTriggerPhrases(article.triggerPhrases.join('\n'));
    setFormLanguage(article.language);
    setFormPriority(String(article.priority));
    setFormEnabled(article.enabled);
    setIsEditing(true);
  };

  const saveArticle = async () => {
    if (!formTitle.trim() || !formContent.trim()) {
      setError('Title and content are required');
      return;
    }

    try {
      setError(null);
      const payload = {
        title: formTitle.trim(),
        content: formContent.trim(),
        shortAnswer: formShortAnswer.trim() || null,
        category: formCategory,
        subcategory: formSubcategory.trim() || null,
        keywords: formKeywords.split(',').map(k => k.trim()).filter(Boolean),
        triggerPhrases: formTriggerPhrases.split('\n').map(p => p.trim()).filter(Boolean),
        language: formLanguage,
        priority: Number(formPriority) || 0,
        enabled: formEnabled,
      };

      if (editingArticle) {
        // Update
        const updated = await crmFetch(`/api/admin/crm/knowledge-base/${editingArticle._id}`, {
          method: 'PUT',
          body: payload,
        });
        setArticles(prev => prev.map(a => a._id === editingArticle._id ? updated : a));
        setSuccess('Article updated!');
      } else {
        // Create
        const created = await crmFetch('/api/admin/crm/knowledge-base', {
          method: 'POST',
          body: payload,
        });
        setArticles(prev => [created, ...prev]);
        setSuccess('Article created!');
      }

      resetForm();
      setIsEditing(false);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save article');
    }
  };

  const deleteArticle = async (id: string) => {
    if (!confirm('Delete this article?')) return;
    try {
      await crmFetch(`/api/admin/crm/knowledge-base/${id}`, { method: 'DELETE' });
      setArticles(prev => prev.filter(a => a._id !== id));
      setSuccess('Article deleted!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete article');
    }
  };

  const toggleEnabled = async (article: KnowledgeArticle) => {
    try {
      const updated = await crmFetch(`/api/admin/crm/knowledge-base/${article._id}`, {
        method: 'PUT',
        body: { enabled: !article.enabled },
      });
      setArticles(prev => prev.map(a => a._id === article._id ? updated : a));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle status');
    }
  };

  return (
    <div className="min-h-screen bg-white p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <PageHeader
          title="📚 Knowledge Base"
          subtitle="Add FAQ articles for the chatbot to use when answering questions"
          action={
            <div className="flex gap-2">
              <Link
                href="/admin/crm/chatbots"
                className="px-4 py-2 rounded-lg bg-gray-600 hover:bg-gray-700 text-white font-semibold"
              >
                ← Chatbots
              </Link>
              <button
                onClick={() => {
                  resetForm();
                  setIsEditing(!isEditing);
                }}
                className="px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-black font-semibold"
              >
                {isEditing ? 'Cancel' : '+ New Article'}
              </button>
            </div>
          }
        />

        {error && <AlertBox type="error" message={error} onClose={() => setError(null)} />}
        {success && <AlertBox type="success" message={success} onClose={() => setSuccess(null)} />}

        {/* Editor Panel */}
        {isEditing && (
          <div className="bg-gradient-to-r from-emerald-900 to-teal-900 border border-emerald-700 rounded-xl p-6">
            <h2 className="font-extrabold text-white mb-4">
              {editingArticle ? '✏️ Edit Article' : '➕ New Article'}
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-bold text-emerald-100 mb-1">Title *</label>
                <input
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. What are the workshop timings?"
                  className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-bold text-emerald-100 mb-1">Content (Full Answer) *</label>
                <textarea
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  rows={4}
                  placeholder="The detailed answer that will be shown to users..."
                  className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-bold text-emerald-100 mb-1">Short Answer (WhatsApp)</label>
                <textarea
                  value={formShortAnswer}
                  onChange={(e) => setFormShortAnswer(e.target.value)}
                  rows={2}
                  placeholder="Shorter version for WhatsApp replies (optional)"
                  className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-emerald-100 mb-1">Category</label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white"
                >
                  {CATEGORIES.map(c => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-emerald-100 mb-1">Subcategory</label>
                <input
                  value={formSubcategory}
                  onChange={(e) => setFormSubcategory(e.target.value)}
                  placeholder="e.g. Online Classes"
                  className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-emerald-100 mb-1">Keywords (comma-separated)</label>
                <input
                  value={formKeywords}
                  onChange={(e) => setFormKeywords(e.target.value)}
                  placeholder="timing, schedule, batch, class"
                  className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400"
                />
                <p className="text-xs text-emerald-300 mt-1">Words that help match this article to questions</p>
              </div>

              <div>
                <label className="block text-sm font-bold text-emerald-100 mb-1">Trigger Phrases (one per line)</label>
                <textarea
                  value={formTriggerPhrases}
                  onChange={(e) => setFormTriggerPhrases(e.target.value)}
                  rows={2}
                  placeholder="what is the timing&#10;when are classes"
                  className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 text-sm"
                />
                <p className="text-xs text-emerald-300 mt-1">Exact phrases that trigger this answer</p>
              </div>

              <div>
                <label className="block text-sm font-bold text-emerald-100 mb-1">Language</label>
                <select
                  value={formLanguage}
                  onChange={(e) => setFormLanguage(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white"
                >
                  {LANGUAGES.map(l => (
                    <option key={l.value} value={l.value}>{l.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-emerald-100 mb-1">Priority (higher = more important)</label>
                <input
                  type="number"
                  value={formPriority}
                  onChange={(e) => setFormPriority(e.target.value)}
                  min="0"
                  max="100"
                  className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white"
                />
              </div>

              <div className="col-span-2 flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formEnabled}
                    onChange={(e) => setFormEnabled(e.target.checked)}
                    className="w-5 h-5"
                  />
                  <span className="text-emerald-100 font-bold">Enabled</span>
                </label>
              </div>

              <div className="col-span-2 flex gap-3">
                <button
                  onClick={saveArticle}
                  className="flex-1 px-4 py-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                >
                  {editingArticle ? 'Update Article' : 'Create Article'}
                </button>
                <button
                  onClick={() => {
                    resetForm();
                    setIsEditing(false);
                  }}
                  className="px-4 py-3 rounded-lg bg-gray-600 hover:bg-gray-700 text-white font-bold"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-4 items-center">
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="🔍 Search articles..."
            className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-900 w-64"
          />

          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-3 py-2 rounded-lg border border-gray-300 bg-white text-gray-900"
          >
            <option value="all">All Categories</option>
            {CATEGORIES.map(c => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>

          <select
            value={filterEnabled}
            onChange={(e) => setFilterEnabled(e.target.value)}
            className="px-3 py-2 rounded-lg border border-gray-300 bg-white text-gray-900"
          >
            <option value="all">All Status</option>
            <option value="true">✅ Enabled</option>
            <option value="false">❌ Disabled</option>
          </select>

          <span className="text-gray-600 text-sm">
            {articles.length} articles
          </span>
        </div>

        {/* Articles Grid */}
        {loading ? (
          <LoadingSpinner />
        ) : articles.length === 0 ? (
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-12 text-center">
            <div className="text-6xl mb-4">📚</div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">No articles yet</h3>
            <p className="text-gray-600 mb-4">Add FAQ articles so the chatbot can answer customer questions automatically.</p>
            <button
              onClick={() => {
                resetForm();
                setIsEditing(true);
              }}
              className="px-6 py-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
            >
              + Add First Article
            </button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {articles.map((article) => (
              <div
                key={article._id}
                className={`rounded-xl border p-4 ${
                  article.enabled 
                    ? 'bg-white border-gray-200 hover:border-emerald-400' 
                    : 'bg-gray-100 border-gray-300 opacity-60'
                } transition-all`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-bold text-gray-900 line-clamp-2">{article.title}</h3>
                  <button
                    onClick={() => toggleEnabled(article)}
                    className={`px-2 py-1 rounded text-xs font-bold ${
                      article.enabled 
                        ? 'bg-emerald-100 text-emerald-700' 
                        : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {article.enabled ? 'ON' : 'OFF'}
                  </button>
                </div>

                <p className="text-gray-600 text-sm line-clamp-3 mb-3">
                  {article.shortAnswer || article.content}
                </p>

                <div className="flex flex-wrap gap-1 mb-3">
                  <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-medium">
                    {CATEGORIES.find(c => c.value === article.category)?.label || article.category}
                  </span>
                  {article.keywords.slice(0, 3).map((kw, i) => (
                    <span key={i} className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-xs">
                      {kw}
                    </span>
                  ))}
                  {article.keywords.length > 3 && (
                    <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 text-xs">
                      +{article.keywords.length - 3}
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between text-xs text-gray-500 border-t border-gray-100 pt-2">
                  <span>Used {article.usageCount}x</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => startEdit(article)}
                      className="text-indigo-600 hover:text-indigo-800 font-medium"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteArticle(article._id)}
                      className="text-red-600 hover:text-red-800 font-medium"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
