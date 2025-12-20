'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Rnd } from 'react-rnd';
import { Save, X, Pin, Palette, Type, Heart, Link2, Plus, Trash2, Image as ImageIcon, Youtube } from 'lucide-react';

interface NoteEditorProps {
  initialNote?: any;
  visionId?: string;
  goalId?: string;
  taskId?: string;
  onSave: (note: any) => void | Promise<void>;
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

  type CanvasItem = {
    id: string;
    kind: 'image' | 'youtube';
    url: string;
    x: number;
    y: number;
    width: number;
    height: number;
    zIndex: number;
  };

  const [imageUrlInput, setImageUrlInput] = useState('');
  const [youtubeUrlInput, setYoutubeUrlInput] = useState('');
  const [selectedCanvasItemId, setSelectedCanvasItemId] = useState<string | null>(null);
  const [selectedUrlInput, setSelectedUrlInput] = useState('');
  const [canvasItems, setCanvasItems] = useState<CanvasItem[]>(() => {
    const raw = initialNote?.canvasItems;
    return Array.isArray(raw) ? raw : [];
  });

  const bringToFront = (id: string) => {
    setCanvasItems((prev) => {
      const maxZ = prev.reduce((m, it) => Math.max(m, Number.isFinite(it.zIndex) ? it.zIndex : 0), 0);
      return prev.map((it) => (it.id === id ? { ...it, zIndex: maxZ + 1 } : it));
    });
  };

  const updateCanvasItem = (id: string, patch: Partial<CanvasItem>) => {
    setCanvasItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  };

  const deleteCanvasItem = (id: string) => {
    setCanvasItems((prev) => prev.filter((it) => it.id !== id));
  };

  const isAllowedImageUrl = (url: string) => {
    const u = url.trim();
    if (!u) return false;
    if (u.startsWith('data:image/')) return true;
    return /\.(png|jpg|jpeg)(\?.*)?$/i.test(u);
  };

  const getYouTubeId = (url: string): string | null => {
    const raw = (url || '').trim();
    if (!raw) return null;

    try {
      // Handle naked IDs
      if (/^[a-zA-Z0-9_-]{11}$/.test(raw)) return raw;

      const u = new URL(raw);
      const host = u.hostname.replace('www.', '');

      if (host === 'youtu.be') {
        const id = u.pathname.split('/').filter(Boolean)[0];
        return id && /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
      }

      if (host.endsWith('youtube.com')) {
        const v = u.searchParams.get('v');
        if (v && /^[a-zA-Z0-9_-]{11}$/.test(v)) return v;

        const parts = u.pathname.split('/').filter(Boolean);
        // /embed/{id}
        if (parts[0] === 'embed' && parts[1] && /^[a-zA-Z0-9_-]{11}$/.test(parts[1])) return parts[1];
        // /shorts/{id}
        if (parts[0] === 'shorts' && parts[1] && /^[a-zA-Z0-9_-]{11}$/.test(parts[1])) return parts[1];
      }
    } catch {
      // ignore
    }

    return null;
  };

  const toYouTubeEmbedUrl = (url: string): string | null => {
    const id = getYouTubeId(url);
    if (!id) return null;
    return `https://www.youtube.com/embed/${id}`;
  };

  const maxZIndex = useMemo(() => canvasItems.reduce((m, it) => Math.max(m, it.zIndex || 0), 0), [canvasItems]);

  const selectedCanvasItem = useMemo(() => {
    if (!selectedCanvasItemId) return null;
    return canvasItems.find((it) => it.id === selectedCanvasItemId) || null;
  }, [canvasItems, selectedCanvasItemId]);

  useEffect(() => {
    if (!selectedCanvasItem) {
      setSelectedUrlInput('');
      return;
    }
    setSelectedUrlInput(selectedCanvasItem.url || '');
  }, [selectedCanvasItem]);

  const currentTheme = COLOR_THEMES[colorTheme as keyof typeof COLOR_THEMES];
  const wordCount = content.split(/\s+/).filter(w => w.length > 0).length;
  const readingTime = Math.ceil(wordCount / 200);

  const handleSave = async () => {
    const hasMedia = Array.isArray(canvasItems) && canvasItems.length > 0;
    if (!title.trim() || (!content.trim() && !hasMedia)) {
      alert('Please fill in title and content (or add at least one Image/YouTube item)');
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
      canvasItems,
      linkedTo: {
        visionId: visionId || initialNote?.linkedTo?.visionId,
        goalId: goalId || initialNote?.linkedTo?.goalId,
        taskId: taskId || initialNote?.linkedTo?.taskId,
      },
    };

    await onSave(noteData);
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
            <h1 className="text-xl font-bold" style={{ color: currentTheme.text }}>New Journal</h1>
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

          {/* Media Canvas */}
          <div className="rounded-xl border-2 bg-white/25 p-4" style={{ borderColor: currentTheme.accent }}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-bold" style={{ color: currentTheme.text }}>Media (move + resize)</p>
                <p className="text-xs" style={{ color: currentTheme.text, opacity: 0.8 }}>
                  Add an image (JPG/PNG URL) or a YouTube URL. Then drag & resize anywhere.
                </p>
                <p className="text-[11px] mt-1" style={{ color: currentTheme.text, opacity: 0.7 }}>
                  Tip: click a media item to select it and edit its URL.
                </p>
              </div>
            </div>

            {selectedCanvasItem ? (
              <div className="mt-3 rounded-lg bg-white/40 border p-3" style={{ borderColor: currentTheme.accent }}>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-extrabold" style={{ color: currentTheme.text }}>
                    Selected: {selectedCanvasItem.kind === 'image' ? 'Image' : 'YouTube'}
                  </p>
                  <button
                    type="button"
                    className="text-xs font-bold px-2 py-1 rounded-md bg-white/60 hover:bg-white/80 border"
                    style={{ borderColor: currentTheme.accent, color: currentTheme.text }}
                    onClick={() => setSelectedCanvasItemId(null)}
                    title="Deselect"
                  >
                    Clear
                  </button>
                </div>

                <div className="mt-2 flex flex-col sm:flex-row gap-2">
                  <input
                    value={selectedUrlInput}
                    onChange={(e) => setSelectedUrlInput(e.target.value)}
                    placeholder={
                      selectedCanvasItem.kind === 'image'
                        ? 'https://.../photo.jpg'
                        : 'https://www.youtube.com/watch?v=...'
                    }
                    className="flex-1 px-3 py-2 rounded-lg border bg-white/70 focus:outline-none"
                    style={{ borderColor: currentTheme.accent, color: currentTheme.text }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!selectedCanvasItem) return;

                      const raw = selectedUrlInput.trim();
                      if (selectedCanvasItem.kind === 'image') {
                        if (!isAllowedImageUrl(raw)) {
                          alert('Please enter a valid image URL ending with .jpg, .jpeg, or .png');
                          return;
                        }
                        updateCanvasItem(selectedCanvasItem.id, { url: raw });
                        return;
                      }

                      const embed = toYouTubeEmbedUrl(raw);
                      if (!embed) {
                        alert('Please enter a valid YouTube URL');
                        return;
                      }
                      updateCanvasItem(selectedCanvasItem.id, { url: embed });
                    }}
                    className="px-3 py-2 rounded-lg font-semibold text-white flex items-center justify-center gap-2"
                    style={{ backgroundColor: currentTheme.accent }}
                    title="Update URL"
                  >
                    Update
                  </button>
                </div>
              </div>
            ) : null}

            <div className="mt-3 grid grid-cols-1 lg:grid-cols-2 gap-3">
              {/* Add Image */}
              <div className="rounded-lg bg-white/40 border p-3" style={{ borderColor: currentTheme.accent }}>
                <label className="block text-xs font-bold mb-1" style={{ color: currentTheme.text }}>Image URL (jpg/png)</label>
                <div className="flex gap-2">
                  <input
                    value={imageUrlInput}
                    onChange={(e) => setImageUrlInput(e.target.value)}
                    placeholder="https://.../photo.jpg"
                    className="flex-1 px-3 py-2 rounded-lg border bg-white/70 focus:outline-none"
                    style={{ borderColor: currentTheme.accent, color: currentTheme.text }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const url = imageUrlInput.trim();
                      if (!isAllowedImageUrl(url)) {
                        alert('Please enter a valid image URL ending with .jpg, .jpeg, or .png');
                        return;
                      }
                      const id = `img-${Date.now()}`;
                      const next: CanvasItem = {
                        id,
                        kind: 'image',
                        url,
                        x: 10,
                        y: 10,
                        width: 260,
                        height: 180,
                        zIndex: maxZIndex + 1,
                      };
                      setCanvasItems((prev) => [...prev, next]);
                      setImageUrlInput('');
                    }}
                    className="px-3 py-2 rounded-lg font-semibold text-white flex items-center gap-2"
                    style={{ backgroundColor: currentTheme.accent }}
                    title="Add image"
                  >
                    <ImageIcon size={16} />
                    Add
                  </button>
                </div>
              </div>

              {/* Add YouTube */}
              <div className="rounded-lg bg-white/40 border p-3" style={{ borderColor: currentTheme.accent }}>
                <label className="block text-xs font-bold mb-1" style={{ color: currentTheme.text }}>YouTube URL</label>
                <div className="flex gap-2">
                  <input
                    value={youtubeUrlInput}
                    onChange={(e) => setYoutubeUrlInput(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="flex-1 px-3 py-2 rounded-lg border bg-white/70 focus:outline-none"
                    style={{ borderColor: currentTheme.accent, color: currentTheme.text }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const raw = youtubeUrlInput.trim();
                      const embed = toYouTubeEmbedUrl(raw);
                      if (!embed) {
                        alert('Please enter a valid YouTube URL');
                        return;
                      }
                      const id = `yt-${Date.now()}`;
                      const next: CanvasItem = {
                        id,
                        kind: 'youtube',
                        url: embed,
                        x: 20,
                        y: 20,
                        width: 320,
                        height: 180,
                        zIndex: maxZIndex + 1,
                      };
                      setCanvasItems((prev) => [...prev, next]);
                      setYoutubeUrlInput('');
                    }}
                    className="px-3 py-2 rounded-lg font-semibold text-white flex items-center gap-2"
                    style={{ backgroundColor: currentTheme.accent }}
                    title="Add YouTube"
                  >
                    <Youtube size={16} />
                    Add
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-4 relative w-full h-[420px] rounded-xl overflow-hidden bg-white/40 border" style={{ borderColor: currentTheme.accent }}>
              {canvasItems.length === 0 ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <p className="text-sm" style={{ color: currentTheme.text, opacity: 0.7 }}>No media yet — add an Image or YouTube link above.</p>
                </div>
              ) : null}

              {canvasItems.map((it) => (
                <Rnd
                  key={it.id}
                  bounds="parent"
                  size={{ width: it.width, height: it.height }}
                  position={{ x: it.x, y: it.y }}
                  onDragStart={() => bringToFront(it.id)}
                  onResizeStart={() => bringToFront(it.id)}
                  onDragStop={(_, d) => updateCanvasItem(it.id, { x: d.x, y: d.y })}
                  onResizeStop={(_, __, ref, ___, position) =>
                    updateCanvasItem(it.id, {
                      width: ref.offsetWidth,
                      height: ref.offsetHeight,
                      x: position.x,
                      y: position.y,
                    })
                  }
                  style={{ zIndex: it.zIndex || 0 }}
                  className="group"
                >
                  <div
                    className="h-full w-full rounded-lg border bg-white shadow-sm overflow-hidden relative"
                    style={{
                      borderColor: currentTheme.accent,
                      boxShadow:
                        selectedCanvasItemId === it.id
                          ? `0 0 0 3px ${currentTheme.accent}55, 0 10px 22px rgba(0,0,0,0.12)`
                          : undefined,
                    }}
                    onMouseDown={() => {
                      setSelectedCanvasItemId(it.id);
                      bringToFront(it.id);
                    }}
                  >
                    <div className="absolute top-2 right-2 z-10 flex gap-2 opacity-0 group-hover:opacity-100 transition">
                      <button
                        type="button"
                        onClick={() => deleteCanvasItem(it.id)}
                        className="h-8 w-8 rounded-lg bg-red-600 text-white flex items-center justify-center hover:bg-red-700"
                        title="Remove"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    {it.kind === 'image' ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={it.url}
                        alt="Journal image"
                        className="h-full w-full object-cover"
                        draggable={false}
                      />
                    ) : (
                      <iframe
                        src={it.url}
                        className="h-full w-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                        title="YouTube video"
                      />
                    )}
                  </div>
                </Rnd>
              ))}
            </div>
          </div>

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
