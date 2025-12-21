'use client';

import { useCallback, useEffect, useState } from 'react';
import { FileText, Plus, Trash2 } from 'lucide-react';
import NoteEditor from './NoteEditor';

interface NotesWidgetProps {
  visionId: string;
  token: string;
}

interface Note {
  _id: string;
  title: string;
  content: string;
  colorTheme: string;
  mood: string;
  createdAt: string;
  wordCount: number;
}

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

export default function NotesWidget({ visionId, token }: NotesWidgetProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const [expandedNotes, setExpandedNotes] = useState(false);

  const fetchNotes = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/notes?visionId=${visionId}&limit=5`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setNotes(data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch notes:', err);
    } finally {
      setLoading(false);
    }
  }, [token, visionId]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const handleDeleteNote = async (id: string) => {
    if (!confirm('Delete this note?')) return;

    try {
      const res = await fetch(`/api/notes/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        setNotes(notes.filter(n => n._id !== id));
      }
    } catch (err) {
      console.error('Failed to delete note:', err);
    }
  };

  const handleSaveNote = async (noteData: any) => {
    try {
      const res = await fetch('/api/notes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...noteData,
          linkedTo: { visionId },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setNotes([data.data, ...notes]);
        setShowEditor(false);
        fetchNotes();
      }
    } catch (err) {
      alert('Failed to save note');
    }
  };

  if (loading) {
    return <div className="text-center py-4 text-swar-text-secondary">Loading notes...</div>;
  }

  return (
    <div className="bg-gradient-to-br from-swar-primary-light/20 to-swar-accent/10 rounded-2xl p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText size={24} className="text-swar-primary" />
          <h3 className="text-lg font-bold text-swar-text">Linked Notes</h3>
          {notes.length > 0 && (
            <span className="bg-swar-primary text-white text-xs font-bold px-2 py-1 rounded-full">
              {notes.length}
            </span>
          )}
        </div>
        <button
          onClick={() => setShowEditor(true)}
          className="flex items-center gap-1 px-3 py-1 bg-swar-primary text-white rounded-lg text-sm font-semibold hover:bg-swar-primary/90 transition"
        >
          <Plus size={16} />
          Add
        </button>
      </div>

      {/* Notes List */}
      {notes.length === 0 ? (
        <div className="text-center py-6">
          <p className="text-swar-text-secondary text-sm">No notes linked to this vision yet</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-64 overflow-y-auto">
          {(expandedNotes ? notes : notes.slice(0, 2)).map(note => {
            const moodEmoji = MOOD_EMOJIS[note.mood as keyof typeof MOOD_EMOJIS] || '📝';
            
            return (
              <div
                key={note._id}
                className="bg-white rounded-lg p-3 border-l-4 border-swar-primary hover:shadow-md transition group"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">{moodEmoji}</span>
                      <h4 className="font-semibold text-swar-text line-clamp-1">{note.title}</h4>
                      <span className="text-xs text-gray-400 whitespace-nowrap">
                        {new Date(note.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-xs text-swar-text-secondary line-clamp-2 pl-6">
                      {note.content.substring(0, 80)}...
                    </p>
                    <span className="text-xs text-gray-400 pl-6">{note.wordCount} words</span>
                  </div>
                  <button
                    onClick={() => handleDeleteNote(note._id)}
                    className="opacity-0 group-hover:opacity-100 transition p-1 hover:bg-red-50 rounded"
                  >
                    <Trash2 size={16} className="text-red-500" />
                  </button>
                </div>
              </div>
            );
          })}

          {notes.length > 2 && (
            <button
              onClick={() => setExpandedNotes(!expandedNotes)}
              className="w-full text-center text-sm font-semibold text-swar-primary hover:text-swar-primary/80 transition py-2"
            >
              {expandedNotes ? '▼ Show Less' : `▶ Show ${notes.length - 2} More`}
            </button>
          )}
        </div>
      )}

      {/* Editor Modal */}
      {showEditor && (
        <NoteEditor
          visionId={visionId}
          onSave={handleSaveNote}
          onClose={() => setShowEditor(false)}
        />
      )}
    </div>
  );
}
