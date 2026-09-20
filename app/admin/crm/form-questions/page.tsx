'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import {
  Plus, Trash2, Edit3, Save, X, Eye, EyeOff, GripVertical,
  Image as ImageIcon, QrCode, Link as LinkIcon, CreditCard,
  ChevronDown, ChevronUp, ArrowUp, ArrowDown, ToggleLeft, ToggleRight,
  Upload, ExternalLink, AlertCircle, CheckCircle
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
type QuestionType = 'text' | 'paragraph' | 'dropdown' | 'radio' | 'checkbox' | 'info' | 'payment';

interface Option {
  value: string;
  label: { en: string; hi?: string; mr?: string };
}

interface PaymentConfig {
  gateway: 'razorpay' | 'custom';
  paymentUrl?: string;
  amount?: number;
  currency?: string;
  buttonLabel?: string;
  razorpayKeyId?: string;
  description?: string;
}

interface Question {
  _id: string;
  fieldKey: string;
  formType: string;
  questionType: QuestionType;
  label: { en: string; hi?: string; mr?: string };
  placeholder?: { en?: string };
  options: Option[];
  imageUrl?: string;
  qrCodeUrl?: string;
  linkUrl?: string;
  linkLabel?: string;
  paymentConfig?: PaymentConfig;
  required: boolean;
  order: number;
  isActive: boolean;
}

const QUESTION_TYPES: { value: QuestionType; label: string; icon: string }[] = [
  { value: 'text', label: 'Short Text', icon: '✏️' },
  { value: 'paragraph', label: 'Long Text', icon: '📝' },
  { value: 'dropdown', label: 'Dropdown', icon: '⬇️' },
  { value: 'radio', label: 'Single Choice', icon: '🔘' },
  { value: 'checkbox', label: 'Multiple Choice', icon: '☑️' },
  { value: 'info', label: 'Info / Display Block', icon: 'ℹ️' },
  { value: 'payment', label: 'Payment Button', icon: '💳' },
];

const FORM_TYPES = ['workshop', 'enquiry', 'lead', 'signup', 'all'];

const HAS_OPTIONS: QuestionType[] = ['dropdown', 'radio', 'checkbox'];

// ─── Empty form state ──────────────────────────────────────────────────────────
function emptyForm(): Partial<Question> {
  return {
    fieldKey: '',
    formType: 'enquiry',
    questionType: 'text',
    label: { en: '', hi: '', mr: '' },
    placeholder: { en: '' },
    options: [],
    imageUrl: '',
    qrCodeUrl: '',
    linkUrl: '',
    linkLabel: '',
    paymentConfig: { gateway: 'custom', paymentUrl: '', amount: 0, currency: 'INR', buttonLabel: 'Pay Now', description: '' },
    required: false,
    order: 0,
    isActive: true,
  };
}

// ─── Preview component ────────────────────────────────────────────────────────
function QuestionPreview({ q }: { q: Partial<Question> }) {
  return (
    <div className="border border-dashed border-slate-300 rounded-2xl p-5 bg-slate-50 space-y-3">
      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Live Preview</p>

      {/* image */}
      {q.imageUrl && (
        <img src={q.imageUrl} alt="question image" className="w-full max-h-48 object-cover rounded-xl" />
      )}

      {/* label */}
      <label className="block text-sm font-semibold text-gray-800">
        {q.label?.en || <span className="text-gray-400 italic">Question label…</span>}
        {q.required && <span className="text-red-500 ml-1">*</span>}
      </label>

      {/* qr + link side by side */}
      {(q.qrCodeUrl || q.linkUrl) && (
        <div className="flex items-center gap-4">
          {q.qrCodeUrl && (
            <img src={q.qrCodeUrl} alt="QR Code" className="w-24 h-24 object-cover rounded-xl border" />
          )}
          {q.linkUrl && (
            <a
              href={q.linkUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#2d6a4f] text-white text-sm font-semibold rounded-xl hover:bg-[#1b4332]"
            >
              <ExternalLink size={14} />
              {q.linkLabel || 'Open Link'}
            </a>
          )}
        </div>
      )}

      {/* input rendering */}
      {q.questionType === 'text' && (
        <input disabled placeholder={q.placeholder?.en || 'Type your answer…'} className="w-full h-11 px-4 border border-gray-200 rounded-xl text-sm bg-white" />
      )}
      {q.questionType === 'paragraph' && (
        <textarea disabled placeholder={q.placeholder?.en || 'Type your answer…'} rows={3} className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm bg-white resize-none" />
      )}
      {q.questionType === 'dropdown' && (
        <select disabled className="w-full h-11 px-4 border border-gray-200 rounded-xl text-sm bg-white appearance-none">
          <option>Choose an option…</option>
          {(q.options || []).map(o => <option key={o.value}>{o.label.en}</option>)}
        </select>
      )}
      {q.questionType === 'radio' && (
        <div className="space-y-2">
          {(q.options || []).map(o => (
            <label key={o.value} className="flex items-center gap-3 cursor-pointer">
              <input type="radio" disabled className="w-4 h-4" />
              <span className="text-sm text-gray-700">{o.label.en}</span>
            </label>
          ))}
          {!(q.options?.length) && <p className="text-gray-400 text-sm italic">Add options below…</p>}
        </div>
      )}
      {q.questionType === 'checkbox' && (
        <div className="space-y-2">
          {(q.options || []).map(o => (
            <label key={o.value} className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" disabled className="w-4 h-4 rounded" />
              <span className="text-sm text-gray-700">{o.label.en}</span>
            </label>
          ))}
          {!(q.options?.length) && <p className="text-gray-400 text-sm italic">Add options below…</p>}
        </div>
      )}
      {q.questionType === 'info' && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
          {q.label?.en || 'Info block content will appear here.'}
        </div>
      )}
      {q.questionType === 'payment' && (
        <button className="w-full h-12 bg-gradient-to-r from-green-600 to-emerald-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 text-sm shadow-lg">
          <CreditCard size={18} />
          {q.paymentConfig?.buttonLabel || 'Pay Now'}
          {q.paymentConfig?.amount ? ` — ₹${q.paymentConfig.amount}` : ''}
        </button>
      )}
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function FormQuestionsBuilderPage() {
  const router = useRouter();
  const token = useAuth();

  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterFormType, setFilterFormType] = useState('enquiry');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<Question>>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [uploadingImage, setUploadingImage] = useState<'image' | 'qr' | null>(null);
  const imageRef = useRef<HTMLInputElement>(null);
  const qrRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const authHeaders = () => ({ Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' });

  // ── Load questions ──
  useEffect(() => {
    if (!token) return;
    setLoading(true);
    fetch(`/api/admin/form-questions?formType=${filterFormType}`, { headers: authHeaders() })
      .then(r => r.json())
      .then(d => setQuestions(d.questions || []))
      .catch(() => showToast('Failed to load questions', 'error'))
      .finally(() => setLoading(false));
  }, [token, filterFormType]);

  // ── Upload image helper ──
  const uploadImage = async (file: File, field: 'imageUrl' | 'qrCodeUrl') => {
    setUploadingImage(field === 'imageUrl' ? 'image' : 'qr');
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = e.target?.result as string;
        const res = await fetch('/api/admin/crm/upload/s3/base64', {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({ base64, fileName: file.name, category: 'form-questions' }),
        });
        const data = await res.json();
        if (data.success) {
          setForm(f => ({ ...f, [field]: data.data.publicUrl }));
          showToast('Image uploaded!');
        } else {
          showToast('Upload failed', 'error');
        }
        setUploadingImage(null);
      };
      reader.readAsDataURL(file);
    } catch {
      showToast('Upload failed', 'error');
      setUploadingImage(null);
    }
  };

  // ── Add / remove options ──
  const addOption = () => {
    const opts = [...(form.options || [])];
    const idx = opts.length + 1;
    opts.push({ value: `option_${idx}`, label: { en: '' } });
    setForm(f => ({ ...f, options: opts }));
  };

  const updateOption = (i: number, en: string) => {
    const opts = [...(form.options || [])];
    opts[i] = { ...opts[i], label: { ...opts[i].label, en }, value: en.toLowerCase().replace(/\s+/g, '_') || `option_${i + 1}` };
    setForm(f => ({ ...f, options: opts }));
  };

  const removeOption = (i: number) => {
    setForm(f => ({ ...f, options: (f.options || []).filter((_, idx) => idx !== i) }));
  };

  // ── Save ──
  const handleSave = async () => {
    if (!form.label?.en?.trim()) return showToast('Please enter a question label (English)', 'error');
    if (!form.fieldKey?.trim()) return showToast('Please enter a field key', 'error');

    setSaving(true);
    try {
      const url = editingId ? `/api/admin/form-questions/${editingId}` : '/api/admin/form-questions';
      const method = editingId ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: authHeaders(), body: JSON.stringify(form) });
      const data = await res.json();

      if (!data.success) throw new Error(data.error || 'Failed to save');

      showToast(editingId ? 'Question updated!' : 'Question created!');
      setShowForm(false);
      setEditingId(null);
      setForm(emptyForm());

      // Refresh list
      const r2 = await fetch(`/api/admin/form-questions?formType=${filterFormType}`, { headers: authHeaders() });
      const d2 = await r2.json();
      setQuestions(d2.questions || []);
    } catch (e: any) {
      showToast(e.message || 'Save failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  // ── Delete ──
  const handleDelete = async (id: string) => {
    if (!confirm('Delete this question?')) return;
    const res = await fetch(`/api/admin/form-questions/${id}`, { method: 'DELETE', headers: authHeaders() });
    const data = await res.json();
    if (data.success) {
      setQuestions(qs => qs.filter(q => q._id !== id));
      showToast('Deleted!');
    } else {
      showToast('Delete failed', 'error');
    }
  };

  // ── Toggle active ──
  const toggleActive = async (q: Question) => {
    const res = await fetch(`/api/admin/form-questions/${q._id}`, {
      method: 'PUT', headers: authHeaders(),
      body: JSON.stringify({ isActive: !q.isActive }),
    });
    const data = await res.json();
    if (data.success) setQuestions(qs => qs.map(x => x._id === q._id ? { ...x, isActive: !x.isActive } : x));
  };

  // ── Reorder ──
  const reorder = async (q: Question, dir: 'up' | 'down') => {
    const newOrder = dir === 'up' ? q.order - 1 : q.order + 1;
    await fetch(`/api/admin/form-questions/${q._id}`, {
      method: 'PUT', headers: authHeaders(),
      body: JSON.stringify({ order: newOrder }),
    });
    setQuestions(qs => qs.map(x => x._id === q._id ? { ...x, order: newOrder } : x).sort((a, b) => a.order - b.order));
  };

  // ── Start edit ──
  const startEdit = (q: Question) => {
    setForm({ ...q });
    setEditingId(q._id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (!token) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin w-8 h-8 border-4 border-green-500/20 border-t-green-500 rounded-full" />
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl shadow-xl text-white text-sm font-bold transition-all ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
          {toast.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
              <span className="text-2xl">📋</span> Form Question Builder
            </h1>
            <p className="text-slate-500 text-sm mt-0.5">Create custom questions for your enquiry &amp; registration forms</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/admin/crm')} className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-200">
              ← Back
            </button>
            <button
              onClick={() => { setForm({ ...emptyForm(), formType: filterFormType }); setEditingId(null); setShowForm(true); }}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#2d6a4f] text-white rounded-xl text-sm font-bold hover:bg-[#1b4332] transition-all shadow-lg"
            >
              <Plus size={16} /> Add Question
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* ── Left: Question list ── */}
        <div>
          {/* Filter */}
          <div className="flex items-center gap-3 mb-6 flex-wrap">
            <span className="text-sm font-bold text-slate-600">Form Type:</span>
            {FORM_TYPES.map(ft => (
              <button
                key={ft}
                onClick={() => setFilterFormType(ft)}
                className={`px-4 py-1.5 rounded-full text-sm font-bold capitalize transition-all ${filterFormType === ft ? 'bg-[#2d6a4f] text-white' : 'bg-white border border-slate-200 text-slate-600 hover:border-[#2d6a4f]/50'}`}
              >
                {ft}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-40">
              <div className="animate-spin w-8 h-8 border-4 border-green-500/20 border-t-green-500 rounded-full" />
            </div>
          ) : questions.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-300">
              <div className="text-5xl mb-4">📭</div>
              <p className="text-slate-500 font-semibold">No questions yet</p>
              <p className="text-slate-400 text-sm mt-1">Click "Add Question" to create your first one</p>
            </div>
          ) : (
            <div className="space-y-3">
              {questions.sort((a, b) => a.order - b.order).map((q) => (
                <div
                  key={q._id}
                  className={`bg-white rounded-2xl border transition-all ${q.isActive ? 'border-slate-200' : 'border-dashed border-slate-300 opacity-60'} p-5`}
                >
                  <div className="flex items-start gap-3">
                    <GripVertical size={16} className="text-slate-300 mt-1 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-base">{QUESTION_TYPES.find(t => t.value === q.questionType)?.icon || '❓'}</span>
                        <span className="font-bold text-slate-800 text-sm truncate">{q.label.en}</span>
                        {q.required && <span className="text-red-500 text-xs font-bold">Required</span>}
                        <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full capitalize">{q.questionType}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-400 flex-wrap mt-1">
                        <span>key: <code className="bg-slate-100 px-1.5 py-0.5 rounded">{q.fieldKey}</code></span>
                        {q.imageUrl && <span className="text-purple-500">🖼 Image</span>}
                        {q.qrCodeUrl && <span className="text-blue-500">📱 QR</span>}
                        {q.linkUrl && <span className="text-green-500">🔗 Link</span>}
                        {q.paymentConfig?.paymentUrl && <span className="text-orange-500">💳 Payment</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => reorder(q, 'up')} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400">
                        <ArrowUp size={13} />
                      </button>
                      <button onClick={() => reorder(q, 'down')} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400">
                        <ArrowDown size={13} />
                      </button>
                      <button onClick={() => toggleActive(q)} className={`w-7 h-7 flex items-center justify-center rounded-lg ${q.isActive ? 'hover:bg-green-50 text-green-600' : 'hover:bg-slate-100 text-slate-400'}`}>
                        {q.isActive ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                      </button>
                      <button onClick={() => startEdit(q)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-blue-50 text-blue-600">
                        <Edit3 size={13} />
                      </button>
                      <button onClick={() => handleDelete(q._id)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50 text-red-400">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Right: Builder Form + Preview ── */}
        <div className="space-y-6">
          {showForm ? (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xl">
              {/* Form header */}
              <div className="bg-gradient-to-r from-[#2d6a4f] to-emerald-500 px-6 py-4 flex items-center justify-between">
                <h2 className="text-white font-bold text-lg">{editingId ? '✏️ Edit Question' : '➕ New Question'}</h2>
                <button onClick={() => { setShowForm(false); setEditingId(null); setForm(emptyForm()); }} className="text-white/80 hover:text-white">
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">

                {/* Form Type */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-2 uppercase tracking-wider">Form Type</label>
                  <select
                    value={form.formType || 'enquiry'}
                    onChange={e => setForm(f => ({ ...f, formType: e.target.value }))}
                    className="w-full h-10 px-3 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#2d6a4f]/30"
                  >
                    {FORM_TYPES.map(ft => <option key={ft} value={ft}>{ft}</option>)}
                  </select>
                </div>

                {/* Question Type */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-2 uppercase tracking-wider">Question Type</label>
                  <div className="grid grid-cols-2 gap-2">
                    {QUESTION_TYPES.map(qt => (
                      <button
                        key={qt.value}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, questionType: qt.value }))}
                        className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all ${form.questionType === qt.value ? 'border-[#2d6a4f] bg-green-50 text-[#2d6a4f]' : 'border-slate-200 hover:border-slate-300 text-slate-600'}`}
                      >
                        <span>{qt.icon}</span> {qt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Label */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-2 uppercase tracking-wider">Question / Label (English) *</label>
                  <input
                    value={form.label?.en || ''}
                    onChange={e => setForm(f => ({ ...f, label: { ...f.label!, en: e.target.value } }))}
                    placeholder="e.g. What is your goal?"
                    className="w-full h-11 px-4 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#2d6a4f]/30"
                  />
                </div>

                {/* Field Key */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-2 uppercase tracking-wider">Field Key *</label>
                  <input
                    value={form.fieldKey || ''}
                    onChange={e => setForm(f => ({ ...f, fieldKey: e.target.value.replace(/[^a-zA-Z0-9_]/g, '') }))}
                    placeholder="e.g. user_goal"
                    className="w-full h-11 px-4 border border-slate-200 rounded-xl text-sm font-mono outline-none focus:ring-2 focus:ring-[#2d6a4f]/30"
                  />
                  <p className="text-xs text-slate-400 mt-1">Letters, numbers, underscores only. Must be unique per form.</p>
                </div>

                {/* Placeholder — only for text types */}
                {(form.questionType === 'text' || form.questionType === 'paragraph') && (
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-2 uppercase tracking-wider">Placeholder Text</label>
                    <input
                      value={form.placeholder?.en || ''}
                      onChange={e => setForm(f => ({ ...f, placeholder: { ...f.placeholder, en: e.target.value } }))}
                      placeholder="e.g. Enter your answer here…"
                      className="w-full h-11 px-4 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#2d6a4f]/30"
                    />
                  </div>
                )}

                {/* Options — for dropdown / radio / checkbox */}
                {HAS_OPTIONS.includes(form.questionType as QuestionType) && (
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-2 uppercase tracking-wider">Options / Answers</label>
                    <div className="space-y-2">
                      {(form.options || []).map((opt, i) => (
                        <div key={i} className="flex gap-2">
                          <input
                            value={opt.label.en}
                            onChange={e => updateOption(i, e.target.value)}
                            placeholder={`Option ${i + 1}`}
                            className="flex-1 h-10 px-3 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#2d6a4f]/30"
                          />
                          <button onClick={() => removeOption(i)} className="w-10 h-10 flex items-center justify-center rounded-xl bg-red-50 text-red-400 hover:bg-red-100">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={addOption}
                        className="w-full h-10 border-2 border-dashed border-slate-300 rounded-xl text-sm font-semibold text-slate-500 hover:border-[#2d6a4f]/50 hover:text-[#2d6a4f] transition-all flex items-center justify-center gap-2"
                      >
                        <Plus size={14} /> Add Option
                      </button>
                    </div>
                  </div>
                )}

                {/* ── Rich Content Section ── */}
                <div className="border-t border-slate-100 pt-5">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Rich Content (Optional)</p>

                  {/* Image */}
                  <div className="mb-4">
                    <label className="block text-xs font-bold text-slate-600 mb-2 flex items-center gap-2">
                      <ImageIcon size={14} /> Question Image
                    </label>
                    {form.imageUrl ? (
                      <div className="relative">
                        <img src={form.imageUrl} alt="" className="w-full max-h-36 object-cover rounded-xl border" />
                        <button onClick={() => setForm(f => ({ ...f, imageUrl: '' }))} className="absolute top-2 right-2 w-7 h-7 bg-red-600 text-white rounded-full flex items-center justify-center">
                          <X size={12} />
                        </button>
                      </div>
                    ) : (
                      <div>
                        <input ref={imageRef} type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && uploadImage(e.target.files[0], 'imageUrl')} />
                        <button
                          type="button"
                          onClick={() => imageRef.current?.click()}
                          disabled={uploadingImage === 'image'}
                          className="w-full h-16 border-2 border-dashed border-slate-300 rounded-xl text-sm text-slate-500 hover:border-[#2d6a4f]/50 flex items-center justify-center gap-2"
                        >
                          {uploadingImage === 'image' ? <div className="animate-spin w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full" /> : <Upload size={16} />}
                          {uploadingImage === 'image' ? 'Uploading…' : 'Upload Image'}
                        </button>
                        <div className="mt-1.5 flex gap-2">
                          <input
                            value={form.imageUrl || ''}
                            onChange={e => setForm(f => ({ ...f, imageUrl: e.target.value }))}
                            placeholder="Or paste image URL"
                            className="flex-1 h-9 px-3 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-[#2d6a4f]/30"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* QR Code */}
                  <div className="mb-4">
                    <label className="block text-xs font-bold text-slate-600 mb-2 flex items-center gap-2">
                      <QrCode size={14} /> QR Code Image
                    </label>
                    {form.qrCodeUrl ? (
                      <div className="relative inline-block">
                        <img src={form.qrCodeUrl} alt="" className="w-32 h-32 object-cover rounded-xl border" />
                        <button onClick={() => setForm(f => ({ ...f, qrCodeUrl: '' }))} className="absolute top-1 right-1 w-6 h-6 bg-red-600 text-white rounded-full flex items-center justify-center">
                          <X size={10} />
                        </button>
                      </div>
                    ) : (
                      <div>
                        <input ref={qrRef} type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && uploadImage(e.target.files[0], 'qrCodeUrl')} />
                        <button
                          type="button"
                          onClick={() => qrRef.current?.click()}
                          disabled={uploadingImage === 'qr'}
                          className="w-full h-12 border-2 border-dashed border-slate-300 rounded-xl text-sm text-slate-500 hover:border-[#2d6a4f]/50 flex items-center justify-center gap-2"
                        >
                          {uploadingImage === 'qr' ? <div className="animate-spin w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full" /> : <QrCode size={16} />}
                          {uploadingImage === 'qr' ? 'Uploading…' : 'Upload QR Code'}
                        </button>
                        <input
                          value={form.qrCodeUrl || ''}
                          onChange={e => setForm(f => ({ ...f, qrCodeUrl: e.target.value }))}
                          placeholder="Or paste QR code image URL"
                          className="mt-1.5 w-full h-9 px-3 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-[#2d6a4f]/30"
                        />
                      </div>
                    )}
                  </div>

                  {/* Link / Payment URL */}
                  <div className="mb-4 grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-2 flex items-center gap-2">
                        <LinkIcon size={14} /> URL / Payment Link
                      </label>
                      <input
                        value={form.linkUrl || ''}
                        onChange={e => setForm(f => ({ ...f, linkUrl: e.target.value }))}
                        placeholder="https://…"
                        className="w-full h-10 px-3 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-[#2d6a4f]/30"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-2">Button Label</label>
                      <input
                        value={form.linkLabel || ''}
                        onChange={e => setForm(f => ({ ...f, linkLabel: e.target.value }))}
                        placeholder="e.g. Pay Here / Register"
                        className="w-full h-10 px-3 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-[#2d6a4f]/30"
                      />
                    </div>
                  </div>

                  {/* Payment Gateway — only for 'payment' type */}
                  {form.questionType === 'payment' && (
                    <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 space-y-3">
                      <p className="text-xs font-bold text-orange-700 flex items-center gap-2"><CreditCard size={14} /> Payment Gateway Config</p>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-slate-600 mb-1 font-semibold">Gateway</label>
                          <select
                            value={form.paymentConfig?.gateway || 'custom'}
                            onChange={e => setForm(f => ({ ...f, paymentConfig: { ...f.paymentConfig!, gateway: e.target.value as 'razorpay' | 'custom' } }))}
                            className="w-full h-9 px-3 border border-slate-200 rounded-xl text-xs outline-none"
                          >
                            <option value="custom">Custom / Direct Link</option>
                            <option value="razorpay">Razorpay</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-slate-600 mb-1 font-semibold">Amount (₹)</label>
                          <input
                            type="number"
                            value={form.paymentConfig?.amount || ''}
                            onChange={e => setForm(f => ({ ...f, paymentConfig: { ...f.paymentConfig!, amount: Number(e.target.value) } }))}
                            placeholder="0"
                            className="w-full h-9 px-3 border border-slate-200 rounded-xl text-xs outline-none"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs text-slate-600 mb-1 font-semibold">Payment URL / Razorpay Link</label>
                        <input
                          value={form.paymentConfig?.paymentUrl || ''}
                          onChange={e => setForm(f => ({ ...f, paymentConfig: { ...f.paymentConfig!, paymentUrl: e.target.value } }))}
                          placeholder="https://rzp.io/… or your payment URL"
                          className="w-full h-9 px-3 border border-slate-200 rounded-xl text-xs outline-none"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-slate-600 mb-1 font-semibold">Button Label</label>
                          <input
                            value={form.paymentConfig?.buttonLabel || 'Pay Now'}
                            onChange={e => setForm(f => ({ ...f, paymentConfig: { ...f.paymentConfig!, buttonLabel: e.target.value } }))}
                            className="w-full h-9 px-3 border border-slate-200 rounded-xl text-xs outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-slate-600 mb-1 font-semibold">Description</label>
                          <input
                            value={form.paymentConfig?.description || ''}
                            onChange={e => setForm(f => ({ ...f, paymentConfig: { ...f.paymentConfig!, description: e.target.value } }))}
                            placeholder="Workshop fee…"
                            className="w-full h-9 px-3 border border-slate-200 rounded-xl text-xs outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Required + Order row */}
                <div className="flex gap-4 pt-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={!!form.required} onChange={e => setForm(f => ({ ...f, required: e.target.checked }))} className="w-4 h-4 rounded" />
                    <span className="text-sm font-semibold text-slate-700">Required</span>
                  </label>
                  <div className="flex items-center gap-2 ml-auto">
                    <span className="text-sm text-slate-500">Order:</span>
                    <input
                      type="number"
                      value={form.order ?? 0}
                      onChange={e => setForm(f => ({ ...f, order: parseInt(e.target.value) || 0 }))}
                      className="w-16 h-9 px-2 border border-slate-200 rounded-xl text-sm text-center outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Save button */}
              <div className="px-6 pb-6">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full h-12 bg-[#2d6a4f] text-white font-bold rounded-xl hover:bg-[#1b4332] transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {saving ? <div className="animate-spin w-5 h-5 border-2 border-white/40 border-t-white rounded-full" /> : <Save size={18} />}
                  {saving ? 'Saving…' : (editingId ? 'Update Question' : 'Create Question')}
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-10 text-center">
              <div className="text-5xl mb-4">🛠️</div>
              <p className="text-slate-500 font-semibold">Click "Add Question" or edit an existing one</p>
              <p className="text-slate-400 text-sm mt-1">The builder will appear here</p>
            </div>
          )}

          {/* Live Preview */}
          {showForm && <QuestionPreview q={form} />}
        </div>
      </div>
    </div>
  );
}
