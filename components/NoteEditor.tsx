'use client';

import { useState, useRef, useEffect } from 'react';
import { Save, X, Pin, Palette, Type, Heart, Link2, Plus } from 'lucide-react';

interface NoteEditorProps {
  initialNote?: any;
  visionId?: string;
  goalId?: string;
  taskId?: string;
  onSave: (note: any) => void;
  onClose: () => void;
}

// Color psychology palette
const COLOR_THEMES = {
  'serenity-blue': { bg: '#EBF4F7', text: '#0B3C5D', accent: '#2E8B9E', label: '🌊 Serenity Blue' },
  'passion-red': { bg: '#FDEAE8', text: '#8B0000', accent: '#E63946', label: '❤️ Passion Red' },
  'growth-green': { bg: '#E8F5E9', text: '#1B5E20', accent: '#4CAF50', label: '🌱 Growth Green' },
  'wisdom-purple': { bg: '#F3E5F5', text: '#4A148C', accent: '#9C27B0', label: '🔮 Wisdom Purple' },
  'energy-orange': { bg: '#FFF3E0', text: '#E65100', accent: '#FF9800', label: '⚡ Energy Orange' },
  'harmony-pink': { bg: '#FCE4EC', text: '#880E4F', accent: '#E91E63', label: '💖 Harmony Pink' },
  'clarity-yellow': { bg: '#FFFDE7', text: '#F57F17', accent: '#FBC02D', label: '✨ Clarity Yellow' },
  'nature-teal': { bg: '#E0F2F1', text: '#004D40', accent: '#009688', label: '🌿 Nature Teal' },
  'calm-lavender': { bg: '#F1E5FE', text: '#4A148C', accent: '#BA68C8', label: '☮️ Calm Lavender' },
  'joy-coral': { bg: '#FFEBEE', text: '#C62828', accent: '#FF5252', label: '🎉 Joy Coral' },
};

// Graphology fonts (handwriting-inspired)
const GRAPHOLOGY_FONTS = {
  poppins: 'font-poppins text-base',
  playfair: 'font-serif text-lg',
  caveat: 'font-handwriting text-xl', // Requires: @import url('https://fonts.googleapis.com/css2?family=Caveat:wght@400;700&display=swap');
  abril: 'font-serif text-lg',
  crimson: 'font-serif text-base',
  lora: 'font-serif text-base',
};

const MOODS = ['happy', 'neutral', 'sad', 'excited', 'calm', 'focused', 'creative', 'confused'];
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

export default function NoteEditor({ 
  initialNote, 
  visionId, 
  goalId, 
  taskId,
  onSave, 
  onClose 
}: NoteEditorProps) {
  const [title, setTitle] = useState(initialNote?.title || '');
  const [content, setContent] = useState(initialNote?.content || '');
  const [colorTheme, setColorTheme] = useState(initialNote?.colorTheme || 'serenity-blue');
  const [fontFamily, setFontFamily] = useState(initialNote?.fontFamily || 'poppins');
  const [fontSize, setFontSize] = useState(initialNote?.fontSize || 16);
  const [mood, setMood] = useState(initialNote?.mood || 'neutral');
  const [tags, setTags] = useState(initialNote?.tags?.join(', ') || '');
  const [isPinned, setIsPinned] = useState(initialNote?.isPinned || false);
  const [isSaving, setIsSaving] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const contentRef = useRef<HTMLTextAreaElement>(null);

  const currentTheme = COLOR_THEMES[colorTheme as keyof typeof COLOR_THEMES];
  const wordCount = content.split(/\s+/).filter(w => w.length > 0).length;
  const readingTime = Math.ceil(wordCount / 200);

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) {
      alert('Please fill in title and content');
      return;
    }

    setIsSaving(true);
    const noteData = {
      title,
      content,
      colorTheme,
      fontFamily,
      fontSize,
      mood,
      tags: tags.split(',').map(t => t.trim()).filter(t => t.length > 0),
      isPinned,
      linkedTo: {
        visionId: visionId || initialNote?.linkedTo?.visionId,
        goalId: goalId || initialNote?.linkedTo?.goalId,
        taskId: taskId || initialNote?.linkedTo?.taskId,
      },
    };

    onSave(noteData);
    setIsSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div 
        className="w-full max-w-4xl max-h-[90vh] rounded-2xl overflow-hidden shadow-2xl flex flex-col"
        style={{ backgroundColor: currentTheme.bg }}
      >
        {/* Header */}
        <div 
          className="px-6 py-4 flex items-center justify-between border-b-2"
          style={{ borderColor: currentTheme.accent }}
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">{MOOD_EMOJIS[mood as keyof typeof MOOD_EMOJIS]}</span>
            <h1 className="text-xl font-bold" style={{ color: currentTheme.text }}>New Note</h1>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition"
            title="Close"
          >
            <X size={24} style={{ color: currentTheme.text }} />
          </button>
        </div>

        {/* Toolbar */}
        <div className="px-6 py-4 bg-white/30 border-b flex flex-wrap gap-4 items-center overflow-auto">
          {/* Color Theme Selector */}
          <div className="flex gap-2 items-center">
            <Palette size={18} style={{ color: currentTheme.text }} />
            <select
              value={colorTheme}
              onChange={(e) => setColorTheme(e.target.value)}
              className="px-3 py-1 rounded-lg text-sm border"
              style={{ borderColor: currentTheme.accent, color: currentTheme.text }}
            >
              {Object.entries(COLOR_THEMES).map(([key, val]) => (
                <option key={key} value={key}>{val.label}</option>
              ))}
            </select>
          </div>

          {/* Font Selector */}
          <div className="flex gap-2 items-center">
            <Type size={18} style={{ color: currentTheme.text }} />
            <select
              value={fontFamily}
              onChange={(e) => setFontFamily(e.target.value)}
              className="px-3 py-1 rounded-lg text-sm border"
              style={{ borderColor: currentTheme.accent, color: currentTheme.text }}
            >
              {Object.entries(GRAPHOLOGY_FONTS).map(([key, val]) => (
                <option key={key} value={key}>{key}</option>
              ))}
            </select>
          </div>

          {/* Font Size */}
          <div className="flex gap-2 items-center">
            <input
              type="range"
              min="12"
              max="24"
              value={fontSize}
              onChange={(e) => setFontSize(parseInt(e.target.value))}
              className="w-24"
            />
            <span className="text-sm" style={{ color: currentTheme.text }}>{fontSize}px</span>
          </div>

          {/* Mood Selector */}
          <div className="flex gap-2 items-center">
            <Heart size={18} style={{ color: currentTheme.text }} />
            <select
              value={mood}
              onChange={(e) => setMood(e.target.value)}
              className="px-3 py-1 rounded-lg text-sm border"
              style={{ borderColor: currentTheme.accent, color: currentTheme.text }}
            >
              {MOODS.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          {/* Pin Button */}
          <button
            onClick={() => setIsPinned(!isPinned)}
            className={`px-3 py-1 rounded-lg transition flex items-center gap-1 text-sm font-semibold`}
            style={{
              backgroundColor: isPinned ? currentTheme.accent : 'transparent',
              color: isPinned ? 'white' : currentTheme.text,
              border: `2px solid ${currentTheme.accent}`
            }}
          >
            <Pin size={16} />
            {isPinned ? 'Pinned' : 'Pin'}
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto px-6 py-4 space-y-4">
          {/* Title Input */}
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Note Title..."
            className="w-full text-2xl font-bold bg-transparent border-0 focus:outline-none focus:ring-0 placeholder-gray-400"
            style={{ color: currentTheme.text }}
          />

          {/* Content Textarea */}
          <textarea
            ref={contentRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write your thoughts, feelings, ideas, links... Let your handwriting flow..."
            className="w-full h-64 bg-transparent border-0 focus:outline-none focus:ring-0 placeholder-gray-400 resize-none"
            style={{
              color: currentTheme.text,
              fontSize: `${fontSize}px`,
              fontFamily: fontFamily === 'poppins' ? 'var(--font-poppins)' : 'inherit',
              lineHeight: '1.8',
            }}
          />

          {/* Tags Section */}
          <div className="space-y-2">
            <label className="text-sm font-semibold" style={{ color: currentTheme.text }}>
              Tags (comma-separated)
            </label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="e.g., goal, reflection, important"
              className="w-full px-3 py-2 rounded-lg border-2 bg-white/50 focus:outline-none"
              style={{ borderColor: currentTheme.accent, color: currentTheme.text }}
            />
          </div>

          {/* Metadata */}
          <div className="flex justify-between items-center text-xs pt-2" style={{ color: currentTheme.text }}>
            <div>
              <span className="font-semibold">{wordCount}</span> words · <span className="font-semibold">{readingTime}</span> min read
            </div>
            {visionId && <div className="flex items-center gap-1"><Link2 size={14} /> Linked to Vision</div>}
          </div>
        </div>

        {/* Footer */}
        <div 
          className="px-6 py-4 border-t-2 flex justify-end gap-3"
          style={{ borderColor: currentTheme.accent }}
        >
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-lg font-semibold transition hover:opacity-80"
            style={{ backgroundColor: '#e0e0e0', color: '#333' }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-6 py-2 rounded-lg font-semibold text-white transition hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
            style={{ backgroundColor: currentTheme.accent }}
          >
            <Save size={18} />
            {isSaving ? 'Saving...' : 'Save Note'}
          </button>
        </div>
      </div>
    </div>
  );
}
