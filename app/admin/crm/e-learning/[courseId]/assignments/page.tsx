'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import {
  ArrowLeft,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  X,
  Save,
  Loader,
  AlertCircle,
  FileText,
  Award,
  Layers,
  HelpCircle,
} from 'lucide-react';

export type QuestionType =
  | 'short_text'
  | 'paragraph'
  | 'single_choice'
  | 'multiple_choice'
  | 'dropdown';

export interface FormQuestion {
  id: string;
  type: QuestionType;
  prompt: string;
  options: string[];
  correctAnswer: string | string[];
  points: number;
}

interface Assignment {
  _id: string;
  id?: string;
  title?: string;
  content: {
    en?: { title: string; description?: string; instructions?: string };
    title?: string;
    description?: string;
    instructions?: string;
    questions?: FormQuestion[];
    level?: string;
    passingPoints?: number;
    totalPoints?: number;
  };
  totalPoints: number;
  passingPoints: number;
  isRequired: boolean;
  dueAfterDays?: number;
  order: number;
}

interface Course {
  _id: string;
  content: { en: { title: string } };
}

const LEVEL_OPTIONS = [
  { value: 'Level 1: Beginner', label: '🌱 Level 1: Beginner', color: 'from-emerald-500/20 to-teal-500/20 border-emerald-500/40 text-emerald-300' },
  { value: 'Level 2: Intermediate', label: '🔥 Level 2: Intermediate', color: 'from-blue-500/20 to-indigo-500/20 border-blue-500/40 text-blue-300' },
  { value: 'Level 3: Advanced', label: '⚡ Level 3: Advanced', color: 'from-amber-500/20 to-orange-500/20 border-amber-500/40 text-amber-300' },
  { value: 'Level 4: Master / Sadhak', label: '👑 Level 4: Master / Sadhak', color: 'from-purple-500/20 to-pink-500/20 border-purple-500/40 text-purple-300' },
];

export default function AssignmentsPage({ params }: { params: { courseId: string } }) {
  const token = useAuth();
  const { courseId } = params;

  const [course, setCourse] = useState<Course | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [level, setLevel] = useState('Level 1: Beginner');
  const [description, setDescription] = useState('');
  const [instructions, setInstructions] = useState('');
  const [passingPoints, setPassingPoints] = useState('60');
  const [isRequired, setIsRequired] = useState(false);
  const [dueAfterDays, setDueAfterDays] = useState('');
  const [questions, setQuestions] = useState<FormQuestion[]>([
    {
      id: 'q_1',
      type: 'single_choice',
      prompt: 'Sample Question: Which nostril represents Pingala (Sun / Surya) energy?',
      options: ['Right Nostril', 'Left Nostril', 'Both Simultaneously', 'None'],
      correctAnswer: 'Right Nostril',
      points: 10,
    },
  ]);

  const totalCalculatedPoints = questions.reduce((sum, q) => sum + (Number(q.points) || 0), 0) || 100;

  const fetchData = useCallback(async () => {
    if (!token || !courseId) return;

    try {
      setLoading(true);
      const [courseRes, assignRes] = await Promise.all([
        fetch('/api/admin/recorded-courses', { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/admin/e-learning/assignments?courseId=${courseId}`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      const [courseData, assignData] = await Promise.all([courseRes.json(), assignRes.json()]);

      if (courseData.success) {
        const found = courseData.courses?.find((c: Course) => c._id === courseId);
        setCourse(found || null);
      }

      if (assignData.success) {
        setAssignments(assignData.assignments || []);
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
    setLevel('Level 1: Beginner');
    setDescription('');
    setInstructions('');
    setPassingPoints('60');
    setIsRequired(false);
    setDueAfterDays('');
    setQuestions([
      {
        id: 'q_' + Date.now(),
        type: 'single_choice',
        prompt: '',
        options: ['Option A', 'Option B', 'Option C', 'Option D'],
        correctAnswer: 'Option A',
        points: 10,
      },
    ]);
    setEditingId(null);
  };

  const handleAddQuestion = () => {
    setQuestions((prev) => [
      ...prev,
      {
        id: 'q_' + Date.now() + '_' + Math.random().toString(36).substring(2, 5),
        type: 'single_choice',
        prompt: '',
        options: ['Option A', 'Option B'],
        correctAnswer: 'Option A',
        points: 10,
      },
    ]);
  };

  const handleUpdateQuestion = (index: number, patch: Partial<FormQuestion>) => {
    setQuestions((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], ...patch };
      return copy;
    });
  };

  const handleDeleteQuestion = (index: number) => {
    setQuestions((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleAddOption = (qIdx: number) => {
    setQuestions((prev) => {
      const copy = [...prev];
      const q = copy[qIdx];
      const letter = String.fromCharCode(65 + q.options.length);
      q.options = [...q.options, `Option ${letter}`];
      return copy;
    });
  };

  const handleRemoveOption = (qIdx: number, optIdx: number) => {
    setQuestions((prev) => {
      const copy = [...prev];
      const q = copy[qIdx];
      q.options = q.options.filter((_, idx) => idx !== optIdx);
      return copy;
    });
  };

  const handleSave = async () => {
    if (!token || !title.trim()) {
      alert('Please enter an assignment title');
      return;
    }

    try {
      const method = editingId ? 'PUT' : 'POST';
      const url = '/api/admin/e-learning/assignments';

      const payload = {
        ...(editingId ? { assignmentId: editingId } : { courseId }),
        title: title.trim(),
        content: {
          en: {
            title: title.trim(),
            description: description.trim(),
            instructions: instructions.trim(),
          },
          level,
          questions,
          totalPoints: totalCalculatedPoints,
          passingPoints: parseInt(passingPoints) || 60,
        },
        totalPoints: totalCalculatedPoints,
        passingPoints: parseInt(passingPoints) || 60,
        isRequired,
        dueAfterDays: dueAfterDays ? parseInt(dueAfterDays) : undefined,
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        await fetchData();
        resetForm();
        setShowForm(false);
      } else {
        const errData = await res.json().catch(() => ({}));
        setError(errData.error || 'Failed to save assignment');
      }
    } catch (err) {
      setError('Error saving assignment');
    }
  };

  const handleDelete = async (id: string) => {
    if (!token || !confirm('Delete this assignment?')) return;

    try {
      const res = await fetch(`/api/admin/e-learning/assignments?id=${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        await fetchData();
      }
    } catch (err) {
      setError('Error deleting assignment');
    }
  };

  const handleEdit = (assignment: Assignment) => {
    const c = assignment.content || {};
    const resolvedTitle = assignment.title || c.en?.title || c.title || '';
    setTitle(resolvedTitle);
    setLevel(c.level || 'Level 1: Beginner');
    setDescription(c.en?.description || c.description || '');
    setInstructions(c.en?.instructions || c.instructions || '');
    setPassingPoints((c.passingPoints || assignment.passingPoints || 60).toString());
    setIsRequired(Boolean(assignment.isRequired));
    setDueAfterDays(assignment.dueAfterDays?.toString() || '');
    setQuestions(
      c.questions && c.questions.length > 0
        ? c.questions
        : [
            {
              id: 'q_' + Date.now(),
              type: 'single_choice',
              prompt: resolvedTitle,
              options: ['Option A', 'Option B'],
              correctAnswer: 'Option A',
              points: 10,
            },
          ]
    );
    setEditingId(assignment._id || assignment.id || null);
    setShowForm(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-black to-gray-950 p-4 sm:p-8 text-white">
      {/* Header */}
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 pb-6 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <Link
            href={`/admin/crm/e-learning`}
            className="p-2.5 bg-gray-900 hover:bg-gray-800 rounded-xl text-gray-400 hover:text-white border border-gray-800 transition-all"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-gradient-to-r from-purple-500 to-indigo-500 text-white uppercase tracking-wider">
                Assignments & Quizzes
              </span>
              <span className="text-xs text-gray-400">
                {assignments.length} total
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white mt-1">
              {course?.content.en.title || 'Course'}
            </h1>
          </div>
        </div>

        <button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold rounded-xl shadow-lg shadow-purple-600/30 transition-all"
        >
          <Plus size={18} />
          Add Assignment / Quiz
        </button>
      </div>

      <div className="max-w-5xl mx-auto">
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-xl mb-6 flex items-center gap-3">
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        )}

        {/* Builder Modal / Form */}
        {showForm && (
          <div className="bg-gray-900/90 rounded-2xl border border-purple-500/40 p-6 sm:p-8 mb-8 shadow-2xl backdrop-blur-xl">
            <div className="flex items-center justify-between pb-4 mb-6 border-b border-gray-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-400">
                  <Award size={22} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">
                    {editingId ? 'Edit Assignment / Quiz' : 'Create New Assignment / Quiz'}
                  </h2>
                  <p className="text-xs text-gray-400">Configure level, passing marks, and question builder</p>
                </div>
              </div>
              <button
                onClick={() => { resetForm(); setShowForm(false); }}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-6">
              {/* Level Selector */}
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                  Select Workshop / Course Level:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
                  {LEVEL_OPTIONS.map((lvl) => (
                    <button
                      key={lvl.value}
                      type="button"
                      onClick={() => setLevel(lvl.value)}
                      className={`p-3 rounded-xl border text-left font-semibold text-xs transition-all ${
                        level === lvl.value
                          ? `bg-gradient-to-br ${lvl.color} ring-2 ring-purple-500 text-white font-bold`
                          : 'bg-black/50 border-gray-800 text-gray-400 hover:border-gray-700'
                      }`}
                    >
                      {lvl.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Title & Passing Marks */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-gray-400 mb-1">
                    Assignment / Level Name *
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Swar Sadhana Level-1 Assessment"
                    className="w-full px-4 py-2.5 bg-black border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1">
                    Passing Marks (Min Required)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={passingPoints}
                      onChange={(e) => setPassingPoints(e.target.value)}
                      placeholder="60"
                      className="w-full px-4 py-2.5 bg-black border border-gray-700 rounded-xl text-white focus:border-purple-500 focus:outline-none"
                    />
                    <span className="text-xs text-gray-500">/ {totalCalculatedPoints} pts</span>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">
                  Description / Overview
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Overview of this assignment / level assessment..."
                  rows={2}
                  className="w-full px-4 py-2.5 bg-black border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none resize-none"
                />
              </div>

              {/* Question Form Builder */}
              <div className="pt-4 border-t border-gray-800">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                    <h3 className="font-bold text-white text-sm">
                      Questions Form Builder ({questions.length} Questions • {totalCalculatedPoints} Total Marks)
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddQuestion}
                    className="px-3 py-1.5 bg-purple-600/30 hover:bg-purple-600/50 text-purple-300 border border-purple-500/40 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all"
                  >
                    <Plus size={14} /> Add Question
                  </button>
                </div>

                <div className="space-y-4">
                  {questions.map((q, qIdx) => (
                    <div
                      key={q.id}
                      className="bg-black/60 border border-gray-800 rounded-xl p-4 sm:p-5 relative transition-all hover:border-gray-700"
                    >
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-lg bg-purple-500/30 text-purple-300 text-xs font-bold flex items-center justify-center">
                            #{qIdx + 1}
                          </span>
                          <span className="text-xs text-gray-400 font-semibold">Question Type:</span>
                          <select
                            value={q.type}
                            onChange={(e) => handleUpdateQuestion(qIdx, { type: e.target.value as QuestionType })}
                            className="bg-gray-800 border border-gray-700 text-white rounded-lg text-xs px-2.5 py-1.5 focus:border-purple-500 focus:outline-none"
                          >
                            <option value="short_text">📝 Short Note</option>
                            <option value="paragraph">📄 Paragraph</option>
                            <option value="single_choice">🔘 Select One (Single Choice)</option>
                            <option value="multiple_choice">☑️ Multiple Choice</option>
                            <option value="dropdown">🔽 Dropdown</option>
                          </select>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs text-gray-400">Marks:</span>
                            <input
                              type="number"
                              min="1"
                              value={q.points}
                              onChange={(e) => handleUpdateQuestion(qIdx, { points: parseInt(e.target.value) || 0 })}
                              className="w-14 px-2 py-1 bg-gray-900 border border-gray-700 text-white rounded text-xs text-center focus:border-purple-500 focus:outline-none"
                            />
                          </div>
                          {questions.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleDeleteQuestion(qIdx)}
                              className="p-1 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Question Prompt */}
                      <input
                        type="text"
                        value={q.prompt}
                        onChange={(e) => handleUpdateQuestion(qIdx, { prompt: e.target.value })}
                        placeholder={`Enter question #${qIdx + 1} here...`}
                        className="w-full px-3.5 py-2 bg-gray-950 border border-gray-800 rounded-lg text-sm text-white placeholder-gray-600 focus:border-purple-500 focus:outline-none mb-3"
                      />

                      {/* Options Builder for Choice/Dropdown */}
                      {['single_choice', 'multiple_choice', 'dropdown'].includes(q.type) && (
                        <div className="pl-3 border-l-2 border-purple-500/30 space-y-2 mt-2">
                          <p className="text-[11px] text-gray-400 font-semibold uppercase tracking-wider">
                            Options & Correct Answer:
                          </p>
                          {q.options.map((opt, optIdx) => {
                            const isCorrect = Array.isArray(q.correctAnswer)
                              ? q.correctAnswer.includes(opt)
                              : q.correctAnswer === opt;
                            return (
                              <div key={optIdx} className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (q.type === 'multiple_choice') {
                                      const currentArr = Array.isArray(q.correctAnswer) ? q.correctAnswer : [q.correctAnswer];
                                      const next = currentArr.includes(opt)
                                        ? currentArr.filter((x) => x !== opt)
                                        : [...currentArr, opt];
                                      handleUpdateQuestion(qIdx, { correctAnswer: next });
                                    } else {
                                      handleUpdateQuestion(qIdx, { correctAnswer: opt });
                                    }
                                  }}
                                  className={`px-2.5 py-1 rounded text-xs font-bold transition-all ${
                                    isCorrect
                                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                      : 'bg-gray-800 text-gray-500 hover:text-gray-300'
                                  }`}
                                  title="Click to toggle as correct answer"
                                >
                                  {isCorrect ? '✓ Correct' : 'Mark Correct'}
                                </button>
                                <input
                                  type="text"
                                  value={opt}
                                  onChange={(e) => {
                                    const nextOptions = [...q.options];
                                    const oldVal = nextOptions[optIdx];
                                    nextOptions[optIdx] = e.target.value;
                                    let nextCorrect = q.correctAnswer;
                                    if (q.correctAnswer === oldVal) nextCorrect = e.target.value;
                                    handleUpdateQuestion(qIdx, { options: nextOptions, correctAnswer: nextCorrect });
                                  }}
                                  className="flex-1 px-3 py-1.5 bg-gray-900 border border-gray-800 rounded-lg text-xs text-white placeholder-gray-600 focus:border-purple-500 focus:outline-none"
                                />
                                {q.options.length > 2 && (
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveOption(qIdx, optIdx)}
                                    className="p-1 text-gray-500 hover:text-red-400"
                                  >
                                    <X size={14} />
                                  </button>
                                )}
                              </div>
                            );
                          })}
                          <button
                            type="button"
                            onClick={() => handleAddOption(qIdx)}
                            className="text-xs text-purple-400 hover:text-purple-300 font-semibold flex items-center gap-1 mt-1"
                          >
                            <Plus size={12} /> Add Option
                          </button>
                        </div>
                      )}

                      {/* Correct answer input for short text */}
                      {q.type === 'short_text' && (
                        <div className="mt-2">
                          <label className="block text-[11px] text-gray-400 font-semibold mb-1">
                            Expected Correct Answer / Keyword:
                          </label>
                          <input
                            type="text"
                            value={typeof q.correctAnswer === 'string' ? q.correctAnswer : ''}
                            onChange={(e) => handleUpdateQuestion(qIdx, { correctAnswer: e.target.value })}
                            placeholder="e.g. Pingala"
                            className="w-full px-3 py-1.5 bg-gray-900 border border-gray-800 rounded-lg text-xs text-white placeholder-gray-600 focus:border-purple-500 focus:outline-none"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t border-gray-800">
                <button
                  type="button"
                  onClick={() => { resetForm(); setShowForm(false); }}
                  className="flex-1 px-4 py-2.5 border border-gray-700 text-gray-400 hover:text-white rounded-xl text-sm"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="flex-1 px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-xl text-sm shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2"
                >
                  <Save size={16} />
                  {editingId ? 'Update Assignment' : 'Save Assignment & Questions'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Existing Assignments List */}
        <div className="space-y-4">
          {assignments.length === 0 ? (
            <div className="text-center py-16 bg-gray-900/40 rounded-2xl border border-gray-800/80">
              <div className="w-16 h-16 rounded-2xl bg-purple-500/10 text-purple-400 flex items-center justify-center mx-auto mb-4">
                <FileText size={32} />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">No Assignments Created Yet</h3>
              <p className="text-gray-400 text-sm max-w-md mx-auto mb-6">
                Create level-based quizzes with questions, passing marks, and options to test students.
              </p>
              <button
                onClick={() => { resetForm(); setShowForm(true); }}
                className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold rounded-xl text-sm shadow-lg shadow-purple-600/30"
              >
                Create First Assignment
              </button>
            </div>
          ) : (
            assignments.map((assignment) => {
              const c = assignment.content || {};
              const titleText = assignment.title || c.en?.title || c.title || 'Assignment';
              const lvl = c.level || 'Level 1: Beginner';
              const qCount = c.questions?.length || 0;
              const passing = c.passingPoints || assignment.passingPoints || 60;
              const total = c.totalPoints || assignment.totalPoints || 100;

              return (
                <div
                  key={assignment._id || assignment.id}
                  className="bg-gray-900/60 border border-gray-800 hover:border-purple-500/40 rounded-2xl p-5 sm:p-6 transition-all shadow-lg"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                          {lvl}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          🎯 Passing: {passing} / {total} pts
                        </span>
                        {qCount > 0 && (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-800 text-gray-300">
                            {qCount} Questions
                          </span>
                        )}
                      </div>

                      <h3 className="font-bold text-lg text-white">{titleText}</h3>
                      {(c.en?.description || c.description) && (
                        <p className="text-sm text-gray-400 mt-1 line-clamp-2">
                          {c.en?.description || c.description}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEdit(assignment)}
                        className="px-3.5 py-2 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all"
                      >
                        <Edit2 size={14} /> Edit Questions
                      </button>
                      <button
                        onClick={() => handleDelete(assignment._id || assignment.id || '')}
                        className="p-2 hover:bg-red-500/20 text-red-400 rounded-xl transition-all"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
