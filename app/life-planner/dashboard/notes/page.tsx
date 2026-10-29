'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus, Search, Filter, Trash2, Pin, PinOff, Eye } from 'lucide-react';
import NoteEditor from '@/components/NoteEditor';

interface Note {
  _id: string;
  title: string;
  content: string;
  canvasItems?: any[];
  colorTheme: string;
  fontFamily: string;
  fontSize: number;
  mood: string;
  tags: string[];
  isPinned: boolean;
  wordCount: number;
  readingTimeMinutes: number;
  createdAt: string;
  updatedAt: string;
}

const COLOR_THEMES = {
  'serenity-blue': { bg: '#EBF4F7', text: '#0B3C5D', accent: '#2E8B9E' },
  'passion-red': { bg: '#FDEAE8', text: '#8B0000', accent: '#E63946' },
  'growth-green': { bg: '#E8F5E9', text: '#1B5E20', accent: '#4CAF50' },
  'wisdom-purple': { bg: '#F3E5F5', text: '#4A148C', accent: '#9C27B0' },
  'energy-orange': { bg: '#FFF3E0', text: '#E65100', accent: '#FF9800' },
  'harmony-pink': { bg: '#FCE4EC', text: '#880E4F', accent: '#E91E63' },
  'clarity-yellow': { bg: '#FFFDE7', text: '#F57F17', accent: '#FBC02D' },
  'nature-teal': { bg: '#E0F2F1', text: '#004D40', accent: '#009688' },
  'calm-lavender': { bg: '#F1E5FE', text: '#4A148C', accent: '#BA68C8' },
  'joy-coral': { bg: '#FFEBEE', text: '#C62828', accent: '#FF5252' },
};

const MOOD_EMOJIS = {
  happy: '😊',
  neutral: '😐',
  sad: '😢',
  excited: '🤩',
  calm: '😌',
  focused: '🎯',
  creative: '🎨',
  confused: '🤔',
};

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [filteredNotes, setFilteredNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showEditor, setShowEditor] = useState(false);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [search, setSearch] = useState('');
  const [selectedMood, setSelectedMood] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [token, setToken] = useState('');

  // Fetch notes
  useEffect(() => {
    const storedToken = localStorage.getItem('lifePlannerToken') || localStorage.getItem('token');

    setToken(storedToken || '');

    (async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams({
          limit: '100',
        });

        const res = await fetch(`/api/notes?${params}`, {
          headers: { Authorization: `Bearer ${storedToken}` },
        });

        if (!res.ok) throw new Error('Failed to fetch notes');

        const data = await res.json();
        setNotes(data.data);
        setError('');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load notes');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    let filtered = notes;

    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (n) =>
          String(n.title || '').toLowerCase().includes(q) ||
          String(n.content || '').toLowerCase().includes(q)
      );
    }

    if (selectedMood) {
      filtered = filtered.filter((n) => n.mood === selectedMood);
    }

    if (selectedTag) {
      filtered = filtered.filter((n) => n.tags.includes(selectedTag));
    }

    setFilteredNotes(filtered);
  }, [notes, search, selectedMood, selectedTag]);

  const handleSaveNote = async (noteData: any) => {
    try {
      const method = selectedNote ? 'PUT' : 'POST';
      const url = selectedNote ? `/api/notes/${selectedNote._id}` : '/api/notes';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(noteData),
      });

      if (!res.ok) throw new Error('Failed to save note');

      const savedNote = await res.json();
      
      if (selectedNote) {
        setNotes(notes.map(n => n._id === selectedNote._id ? savedNote.data : n));
      } else {
        setNotes([savedNote.data, ...notes]);
      }

      setShowEditor(false);
      setSelectedNote(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save note');
    }
  };

  const handleDeleteNote = async (id: string) => {
    if (!confirm('Delete this note?')) return;

    try {
      const res = await fetch(`/api/notes/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error('Failed to delete note');

      setNotes(notes.filter(n => n._id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete note');
    }
  };

  const handlePinToggle = async (note: Note) => {
    try {
      const res = await fetch(`/api/notes/${note._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ...note, isPinned: !note.isPinned }),
      });

      if (!res.ok) throw new Error('Failed to update note');

      const updated = await res.json();
      setNotes(notes.map(n => n._id === note._id ? updated.data : n));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update note');
    }
  };

  // Get all unique tags
  const allTags = Array.from(new Set(notes.flatMap(n => n.tags)));
  const allMoods = Array.from(new Set(notes.map(n => n.mood)));

  const formatSubmittedAt = (isoString: string) => {
    const d = new Date(isoString);
    if (!isoString || Number.isNaN(d.getTime())) return '';
    // Show date + submission time (hours/minutes) in user's locale.
    return d.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="bg-gradient-to-br from-swar-bg to-swar-primary/5 rounded-2xl border border-swar-border">
      <div className="container mx-auto max-w-6xl px-3 sm:px-4 py-4 sm:py-6">
        {/* Android Material Top App Bar */}
        <div className="bg-white/90 backdrop-blur-md rounded-2xl border border-white/90 shadow-[0_8px_20px_-4px_rgba(15,23,42,0.06),0_2px_4px_-1px_rgba(15,23,42,0.03),inset_0_1px_1px_rgba(255,255,255,0.9)] ring-1 ring-slate-900/5 p-3.5 sm:p-5 mb-5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <Link
              href="/life-planner/dashboard"
              className="p-2 sm:p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition active:scale-95 shadow-xs flex items-center justify-center shrink-0"
              title="Back to Launchpad"
            >
              <ArrowLeft className="w-5 h-5 stroke-[2.2]" />
            </Link>
            <div className="min-w-0">
              <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-amber-800 bg-amber-50 px-2 sm:px-2.5 py-0.5 rounded-full border border-amber-200 shadow-2xs">
                Reflections & Ideas
              </span>
              <h1 className="text-base sm:text-xl font-bold text-slate-800 tracking-normal mt-0.5 truncate">
                📓 My Journal & Notes
              </h1>
            </div>
          </div>
          <button
            onClick={() => {
              setSelectedNote(null);
              setShowEditor(true);
            }}
            className="px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-bold text-xs sm:text-sm flex items-center gap-1.5 shadow-[0_4px_12px_rgba(217,119,6,0.3)] active:scale-95 shrink-0"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span className="hidden xs:inline">New Journal</span>
            <span className="xs:hidden">New</span>
          </button>
        </div>

        {/* Search & Filters */}
        <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 mb-8 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search notes by title or content..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border-2 border-gray-200 rounded-lg focus:border-swar-primary focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Mood Filter */}
            <div>
              <label className="text-sm font-semibold text-swar-text mb-2 block">Filter by Mood</label>
              <select
                value={selectedMood}
                onChange={(e) => setSelectedMood(e.target.value)}
                className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-swar-primary focus:outline-none"
              >
                <option value="">All Moods</option>
                {allMoods.map(m => (
                  <option key={m} value={m}>{MOOD_EMOJIS[m as keyof typeof MOOD_EMOJIS]} {m}</option>
                ))}
              </select>
            </div>

            {/* Tag Filter */}
            <div>
              <label className="text-sm font-semibold text-swar-text mb-2 block">Filter by Tag</label>
              <select
                value={selectedTag}
                onChange={(e) => setSelectedTag(e.target.value)}
                className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-swar-primary focus:outline-none"
              >
                <option value="">All Tags</option>
                {allTags.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Notes Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-swar-primary"></div>
            <p className="text-swar-text-secondary mt-4">Loading notes...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border-2 border-red-200 rounded-lg p-6 text-center">
            <p className="text-red-700 font-semibold">{error}</p>
          </div>
        ) : filteredNotes.length === 0 ? (
          <div className="bg-swar-primary/10 rounded-xl p-12 text-center">
            <p className="text-2xl mb-2">📭</p>
            <p className="text-swar-text-secondary mb-4">No journal entries yet. Create your first entry!</p>
            <button
              onClick={() => {
                setSelectedNote(null);
                setShowEditor(true);
              }}
              className="bg-swar-primary text-white px-6 py-2 rounded-lg font-semibold hover:bg-swar-primary/90 transition"
            >
              Create Entry
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-[10px] auto-rows-max">
            {filteredNotes.map(note => {
              const theme = COLOR_THEMES[note.colorTheme as keyof typeof COLOR_THEMES];
              const moodEmoji = MOOD_EMOJIS[note.mood as keyof typeof MOOD_EMOJIS];

              return (
                <div
                  key={note._id}
                  className="relative group cursor-pointer rounded-2xl border shadow-sm hover:shadow-lg transition overflow-hidden"
                  style={{ backgroundColor: theme.bg, borderColor: theme.accent + '40' }}
                  onClick={() => {
                    setSelectedNote(note);
                    setShowEditor(true);
                  }}
                >
                  {/* Pinned Badge */}
                  {note.isPinned && (
                    <div className="absolute top-3 right-3 z-10 bg-yellow-400 p-2 rounded-full">
                      <Pin size={16} className="text-yellow-900" />
                    </div>
                  )}

                  {/* Card Content */}
                  <div className="p-6 space-y-4">
                    {/* Header */}
                    <div>
                      <div className="flex items-start justify-between mb-2">
                        <span className="text-3xl">{moodEmoji}</span>
                        <span className="text-xs font-semibold px-2 py-1 rounded-full" style={{ backgroundColor: theme.accent, color: 'white' }}>
                          {note.readingTimeMinutes} min
                        </span>
                      </div>
                      <h3 className="text-lg font-bold line-clamp-2" style={{ color: theme.text }}>
                        {note.title}
                      </h3>
                    </div>

                    {/* Preview */}
                    <p className="text-sm whitespace-pre-wrap break-words" style={{ color: theme.text }}>
                      {note.content}
                    </p>

                    {/* Tags */}
                    {note.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {note.tags.slice(0, 3).map(tag => (
                          <span
                            key={tag}
                            className="text-xs px-2 py-1 rounded-full font-semibold"
                            style={{ backgroundColor: theme.accent, color: 'white' }}
                          >
                            #{tag}
                          </span>
                        ))}
                        {note.tags.length > 3 && (
                          <span className="text-xs px-2 py-1 text-gray-500">+{note.tags.length - 3}</span>
                        )}
                      </div>
                    )}

                    {/* Footer */}
                    <div className="flex items-center justify-between text-xs pt-2 border-t" style={{ borderColor: theme.accent + '40' }}>
                      <span style={{ color: theme.text }}>{note.wordCount} words</span>
                      <span style={{ color: theme.text }}>
                        {formatSubmittedAt(note.createdAt) || new Date(note.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {/* Hover Actions */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-4">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePinToggle(note);
                      }}
                      className="p-3 bg-yellow-500 text-white rounded-full hover:bg-yellow-600 transition"
                      title={note.isPinned ? 'Unpin' : 'Pin'}
                    >
                      {note.isPinned ? <PinOff size={20} /> : <Pin size={20} />}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteNote(note._id);
                      }}
                      className="p-3 bg-red-500 text-white rounded-full hover:bg-red-600 transition"
                      title="Delete"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Note Editor Modal */}
      {showEditor && (
        <NoteEditor
          initialNote={selectedNote}
          onSave={handleSaveNote}
          onClose={() => {
            setShowEditor(false);
            setSelectedNote(null);
          }}
        />
      )}
    </div>
  );
}
