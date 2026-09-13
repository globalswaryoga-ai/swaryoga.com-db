'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ChevronUp,
  ChevronDown,
  Layers,
  Save,
  X,
  ListFilter,
  Type,
  AlignLeft,
  CheckSquare,
  Radio,
} from 'lucide-react';

interface OptionItem {
  value: string;
  label: {
    en: string;
    hi?: string;
    mr?: string;
  };
}

interface Question {
  _id: string;
  fieldKey: string;
  formType: string;
  questionType: 'dropdown' | 'text' | 'paragraph' | 'radio' | 'checkbox';
  label: {
    en: string;
    hi?: string;
    mr?: string;
  };
  placeholder?: {
    en?: string;
    hi?: string;
    mr?: string;
  };
  options?: OptionItem[];
  required: boolean;
  order: number;
  isActive: boolean;
  createdAt?: string;
}

const QUESTION_TYPES = [
  { value: 'dropdown', label: 'Dropdown (Select)', icon: ListFilter, desc: 'User picks from a dropdown menu' },
  { value: 'text', label: 'Text Box (Single line)', icon: Type, desc: 'Short text input' },
  { value: 'paragraph', label: 'Paragraph (Multi line)', icon: AlignLeft, desc: 'Large textarea for detailed response' },
  { value: 'radio', label: 'Radio (Single choice)', icon: Radio, desc: 'Choose one of several options' },
  { value: 'checkbox', label: 'Checkbox (Multi choice)', icon: CheckSquare, desc: 'Select multiple items' },
];

export default function AdminFormQuestionsPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [activeFormType, setActiveFormType] = useState('workshop');

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [fieldKey, setFieldKey] = useState('');
  const [questionType, setQuestionType] = useState<'dropdown' | 'text' | 'paragraph' | 'radio' | 'checkbox'>('dropdown');
  const [labelEn, setLabelEn] = useState('');
  const [labelHi, setLabelHi] = useState('');
  const [labelMr, setLabelMr] = useState('');
  const [placeholderEn, setPlaceholderEn] = useState('');
  const [placeholderHi, setPlaceholderHi] = useState('');
  const [placeholderMr, setPlaceholderMr] = useState('');
  const [required, setRequired] = useState(false);
  const [order, setOrder] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [options, setOptions] = useState<OptionItem[]>([
    { value: 'Option 1', label: { en: 'Option 1' } },
    { value: 'Option 2', label: { en: 'Option 2' } },
  ]);

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('token') || localStorage.getItem('admin_token') || '';
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`/api/admin/form-questions?formType=${activeFormType}`, { headers });
      const data = await res.json();
      if (data.success) {
        setQuestions(data.questions || []);
      } else {
        setError(data.error || 'Failed to load questions');
      }
    } catch (err: any) {
      setError(err.message || 'Error connecting to server');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestions();
  }, [activeFormType]);

  const openNewModal = () => {
    setEditingId(null);
    setFieldKey('');
    setQuestionType('dropdown');
    setLabelEn('');
    setLabelHi('');
    setLabelMr('');
    setPlaceholderEn('');
    setPlaceholderHi('');
    setPlaceholderMr('');
    setRequired(false);
    setOrder(questions.length);
    setIsActive(true);
    setOptions([
      { value: 'Option 1', label: { en: 'Option 1' } },
      { value: 'Option 2', label: { en: 'Option 2' } },
    ]);
    setIsModalOpen(true);
  };

  const openEditModal = (q: Question) => {
    setEditingId(q._id);
    setFieldKey(q.fieldKey);
    setQuestionType(q.questionType);
    setLabelEn(q.label?.en || '');
    setLabelHi(q.label?.hi || '');
    setLabelMr(q.label?.mr || '');
    setPlaceholderEn(q.placeholder?.en || '');
    setPlaceholderHi(q.placeholder?.hi || '');
    setPlaceholderMr(q.placeholder?.mr || '');
    setRequired(q.required);
    setOrder(q.order);
    setIsActive(q.isActive);
    setOptions(q.options && q.options.length > 0 ? q.options : [{ value: '', label: { en: '' } }]);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!labelEn.trim()) {
      alert('Question English label is required');
      return;
    }

    if (!editingId && !fieldKey.trim()) {
      alert('Field Key is required');
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('admin_token') || '';
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const payload: any = {
        formType: activeFormType,
        questionType,
        label: {
          en: labelEn.trim(),
          hi: labelHi.trim(),
          mr: labelMr.trim(),
        },
        placeholder: {
          en: placeholderEn.trim(),
          hi: placeholderHi.trim(),
          mr: placeholderMr.trim(),
        },
        required,
        order: Number(order) || 0,
        isActive,
      };

      if (['dropdown', 'radio', 'checkbox'].includes(questionType)) {
        payload.options = options
          .filter((opt) => opt.value.trim() || opt.label.en.trim())
          .map((opt) => ({
            value: opt.value.trim() || opt.label.en.trim(),
            label: {
              en: opt.label.en.trim() || opt.value.trim(),
              hi: opt.label.hi?.trim() || '',
              mr: opt.label.mr?.trim() || '',
            },
          }));
      }

      let res;
      if (editingId) {
        res = await fetch(`/api/admin/form-questions/${editingId}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify(payload),
        });
      } else {
        payload.fieldKey = fieldKey.trim().replace(/[^a-zA-Z0-9_]/g, '');
        res = await fetch('/api/admin/form-questions', {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
        });
      }

      const data = await res.json();
      if (data.success) {
        setIsModalOpen(false);
        setSuccessMsg(editingId ? 'Question updated successfully!' : 'New question added successfully!');
        setTimeout(() => setSuccessMsg(''), 3000);
        fetchQuestions();
      } else {
        alert(data.error || 'Failed to save question');
      }
    } catch (err: any) {
      alert(err.message || 'Error saving question');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, label: string) => {
    if (!confirm(`Are you sure you want to delete question "${label}"?`)) return;

    try {
      const token = localStorage.getItem('token') || localStorage.getItem('admin_token') || '';
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`/api/admin/form-questions/${id}`, {
        method: 'DELETE',
        headers,
      });
      const data = await res.json();
      if (data.success) {
        setQuestions((prev) => prev.filter((q) => q._id !== id));
        setSuccessMsg('Question deleted');
        setTimeout(() => setSuccessMsg(''), 3000);
      } else {
        alert(data.error || 'Failed to delete');
      }
    } catch (err: any) {
      alert(err.message || 'Error deleting question');
    }
  };

  const handleToggleActive = async (q: Question) => {
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('admin_token') || '';
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`/api/admin/form-questions/${q._id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ isActive: !q.isActive }),
      });
      const data = await res.json();
      if (data.success) {
        setQuestions((prev) =>
          prev.map((item) => (item._id === q._id ? { ...item, isActive: !item.isActive } : item))
        );
      }
    } catch (err: any) {
      alert('Error updating status');
    }
  };

  const addOption = () => {
    const nextIdx = options.length + 1;
    setOptions([...options, { value: `Option ${nextIdx}`, label: { en: `Option ${nextIdx}` } }]);
  };

  const removeOption = (idx: number) => {
    setOptions(options.filter((_, i) => i !== idx));
  };

  const updateOption = (idx: number, field: string, val: string) => {
    const next = [...options];
    if (field === 'value') {
      next[idx].value = val;
    } else if (field === 'en') {
      next[idx].label.en = val;
      if (!next[idx].value || next[idx].value.startsWith('Option ')) {
        next[idx].value = val;
      }
    } else if (field === 'hi') {
      next[idx].label.hi = val;
    } else if (field === 'mr') {
      next[idx].label.mr = val;
    }
    setOptions(next);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Top bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <Link
              href="/admin"
              className="p-2 bg-white rounded-xl border border-gray-200 shadow-sm hover:bg-gray-100 transition-colors"
            >
              <ArrowLeft size={20} className="text-gray-600" />
            </Link>
            <div>
              <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
                <Layers className="text-purple-600" size={26} />
                Dynamic Form Questions
              </h1>
              <p className="text-sm text-gray-500">
                Add and manage custom questions (Dropdowns, Text Boxes, Paragraphs) on public forms.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={activeFormType}
              onChange={(e) => setActiveFormType(e.target.value)}
              className="h-11 px-3 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 shadow-sm outline-none focus:ring-2 focus:ring-purple-300"
            >
              <option value="workshop">Workshop Form</option>
              <option value="retreat">Retreat Form</option>
              <option value="consultation">Consultation Form</option>
            </select>

            <button
              onClick={openNewModal}
              className="h-11 px-4 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-md flex items-center gap-2 transition-all hover:scale-[1.02]"
            >
              <Plus size={18} />
              Add Question
            </button>
          </div>
        </div>

        {/* Notifications */}
        {successMsg && (
          <div className="mb-4 p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center gap-2 text-sm font-semibold">
            <CheckCircle2 size={18} className="text-emerald-600" />
            {successMsg}
          </div>
        )}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-800 rounded-xl flex items-center gap-2 text-sm font-semibold">
            <XCircle size={18} className="text-red-600" />
            {error}
          </div>
        )}

        {/* Question List */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4 sm:p-6 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-800">
              Active Questions for <span className="capitalize text-purple-600 font-black">{activeFormType}</span> Form ({questions.length})
            </h2>
            <span className="text-xs text-gray-400">Questions appear on the registration form automatically</span>
          </div>

          {loading ? (
            <div className="p-12 text-center text-gray-500 font-medium">Loading form questions...</div>
          ) : questions.length === 0 ? (
            <div className="p-12 text-center">
              <HelpCircle size={40} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-600 font-bold text-base">No custom questions added yet</p>
              <p className="text-gray-400 text-sm mt-1 mb-4">
                You can add dropdown questions, text inputs, or paragraph fields to your workshop form.
              </p>
              <button
                onClick={openNewModal}
                className="px-4 py-2 bg-purple-600 text-white text-sm font-bold rounded-xl shadow hover:bg-purple-700"
              >
                + Add First Question
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {questions.map((q, idx) => (
                <div
                  key={q._id}
                  className={`p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${
                    q.isActive ? 'hover:bg-purple-50/30' : 'bg-gray-50/80 opacity-60'
                  }`}
                >
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="mt-1 flex flex-col items-center justify-center w-8 h-8 rounded-lg bg-gray-100 text-gray-600 font-bold text-xs">
                      #{q.order !== undefined ? q.order : idx + 1}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="font-bold text-gray-900 text-base">{q.label?.en}</span>
                        {q.required && (
                          <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-bold rounded-md">
                            Required
                          </span>
                        )}
                        <span className="px-2.5 py-0.5 bg-purple-100 text-purple-700 text-xs font-semibold rounded-md capitalize">
                          {q.questionType}
                        </span>
                        <code className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                          {q.fieldKey}
                        </code>
                      </div>

                      {/* Multi-language label preview */}
                      {(q.label?.hi || q.label?.mr) && (
                        <div className="text-xs text-gray-500 flex flex-wrap gap-3 mt-1">
                          {q.label?.hi && <span>🇮🇳 Hindi: <strong>{q.label.hi}</strong></span>}
                          {q.label?.mr && <span>🇮🇳 Marathi: <strong>{q.label.mr}</strong></span>}
                        </div>
                      )}

                      {/* Options preview for dropdowns/radio/checkbox */}
                      {['dropdown', 'radio', 'checkbox'].includes(q.questionType) && q.options && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {q.options.map((opt, oIdx) => (
                            <span
                              key={oIdx}
                              className="text-[11px] bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full border border-gray-200"
                            >
                              {opt.label?.en || opt.value}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <button
                      onClick={() => handleToggleActive(q)}
                      title={q.isActive ? 'Active - click to deactivate' : 'Inactive - click to activate'}
                      className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors ${
                        q.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-600'
                      }`}
                    >
                      {q.isActive ? 'Active' : 'Inactive'}
                    </button>

                    <button
                      onClick={() => openEditModal(q)}
                      className="p-2 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                      title="Edit Question"
                    >
                      <Edit2 size={16} />
                    </button>

                    <button
                      onClick={() => handleDelete(q._id, q.label?.en)}
                      className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete Question"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add / Edit Question Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-100 p-6">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-6">
              <h3 className="text-xl font-black text-gray-900">
                {editingId ? 'Edit Question' : 'Add New Question'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-700 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-5">
              {/* Question Type */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Question Type *</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {QUESTION_TYPES.map((t) => {
                    const Icon = t.icon;
                    const isSelected = questionType === t.value;
                    return (
                      <button
                        key={t.value}
                        type="button"
                        onClick={() => setQuestionType(t.value as any)}
                        className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                          isSelected
                            ? 'border-purple-600 bg-purple-50/50 text-purple-900 ring-2 ring-purple-400'
                            : 'border-gray-200 hover:border-gray-300 text-gray-700'
                        }`}
                      >
                        <div className="flex items-center gap-2 font-bold text-xs">
                          <Icon size={16} className={isSelected ? 'text-purple-600' : 'text-gray-500'} />
                          {t.label}
                        </div>
                        <span className="text-[10px] text-gray-400 leading-tight">{t.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Field Key */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  Field Key (Internal Identifier) *
                </label>
                <input
                  type="text"
                  value={fieldKey}
                  onChange={(e) => setFieldKey(e.target.value.replace(/\s+/g, '_'))}
                  disabled={!!editingId}
                  placeholder="e.g. heard_from, yoga_goal, food_preference"
                  className="w-full h-11 px-3 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-purple-300 disabled:bg-gray-100"
                  required
                />
                <p className="text-xs text-gray-400 mt-1">Unique key used in reports and database export.</p>
              </div>

              {/* Labels (EN / HI / MR) */}
              <div className="space-y-3">
                <label className="block text-sm font-bold text-gray-700">Question Label / Title *</label>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">🇬🇧 English *</label>
                  <input
                    type="text"
                    value={labelEn}
                    onChange={(e) => setLabelEn(e.target.value)}
                    placeholder="e.g. Where did you hear about us?"
                    className="w-full h-11 px-3 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-purple-300"
                    required
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">🇮🇳 Hindi (Optional)</label>
                    <input
                      type="text"
                      value={labelHi}
                      onChange={(e) => setLabelHi(e.target.value)}
                      placeholder="e.g. आपने हमारे बारे में कहाँ सुना?"
                      className="w-full h-11 px-3 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-purple-300"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">🇮🇳 Marathi (Optional)</label>
                    <input
                      type="text"
                      value={labelMr}
                      onChange={(e) => setLabelMr(e.target.value)}
                      placeholder="e.g. तुम्हाला आमच्याबद्दल कुठून समजले?"
                      className="w-full h-11 px-3 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-purple-300"
                    />
                  </div>
                </div>
              </div>

              {/* Placeholder */}
              {(questionType === 'text' || questionType === 'paragraph') && (
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Placeholder Text (Optional)</label>
                  <input
                    type="text"
                    value={placeholderEn}
                    onChange={(e) => setPlaceholderEn(e.target.value)}
                    placeholder="e.g. Type your answer here..."
                    className="w-full h-11 px-3 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-purple-300"
                  />
                </div>
              )}

              {/* Options Builder for dropdown, radio, checkbox */}
              {['dropdown', 'radio', 'checkbox'].includes(questionType) && (
                <div className="border border-purple-100 bg-purple-50/20 p-4 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-bold text-gray-800">
                      Dropdown / Selection Options ({options.length})
                    </label>
                    <button
                      type="button"
                      onClick={addOption}
                      className="text-xs px-3 py-1.5 bg-purple-600 text-white font-bold rounded-lg shadow-sm hover:bg-purple-700 flex items-center gap-1"
                    >
                      <Plus size={14} /> Add Option
                    </button>
                  </div>

                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {options.map((opt, idx) => (
                      <div key={idx} className="flex items-center gap-2 bg-white p-2.5 rounded-xl border border-gray-200 shadow-sm">
                        <span className="text-xs font-bold text-gray-400 w-5 text-center">{idx + 1}</span>
                        <input
                          type="text"
                          value={opt.label.en}
                          onChange={(e) => updateOption(idx, 'en', e.target.value)}
                          placeholder="Option text (English)"
                          className="flex-1 h-9 px-2.5 border border-gray-200 rounded-lg text-xs font-medium outline-none focus:ring-2 focus:ring-purple-300"
                          required
                        />
                        <input
                          type="text"
                          value={opt.label.hi || ''}
                          onChange={(e) => updateOption(idx, 'hi', e.target.value)}
                          placeholder="Hindi"
                          className="w-24 h-9 px-2 border border-gray-200 rounded-lg text-xs font-medium outline-none focus:ring-2 focus:ring-purple-300"
                        />
                        <input
                          type="text"
                          value={opt.label.mr || ''}
                          onChange={(e) => updateOption(idx, 'mr', e.target.value)}
                          placeholder="Marathi"
                          className="w-24 h-9 px-2 border border-gray-200 rounded-lg text-xs font-medium outline-none focus:ring-2 focus:ring-purple-300"
                        />
                        {options.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeOption(idx)}
                            className="p-1 text-gray-400 hover:text-red-600 rounded"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Settings row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-gray-100">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="reqCheckbox"
                    checked={required}
                    onChange={(e) => setRequired(e.target.checked)}
                    className="w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500"
                  />
                  <label htmlFor="reqCheckbox" className="text-sm font-bold text-gray-700">
                    Mandatory (Required)
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="activeCheckbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500"
                  />
                  <label htmlFor="activeCheckbox" className="text-sm font-bold text-gray-700">
                    Active on Form
                  </label>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Display Order</label>
                  <input
                    type="number"
                    value={order}
                    onChange={(e) => setOrder(Number(e.target.value))}
                    className="w-full h-9 px-2 border border-gray-200 rounded-lg text-xs font-medium outline-none focus:ring-2 focus:ring-purple-300"
                  />
                </div>
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-bold shadow-md flex items-center gap-2 disabled:opacity-50"
                >
                  <Save size={16} />
                  {saving ? 'Saving...' : editingId ? 'Update Question' : 'Add Question'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
