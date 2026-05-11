'use client';

import React, { useState, useEffect } from 'react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import Link from 'next/link';

interface Material {
  id: string;
  courseId: string;
  courseTitle: string;
  videoId?: string;
  videoTitle?: string;
  title: string;
  description: string;
  type: 'pdf' | 'note' | 'resource' | 'worksheet';
  fileUrl?: string;
  content?: string;
  uploadedDate: string;
  tags: string[];
}

export default function CourseMaterialsPage() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [token, setToken] = useState('');
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [newNote, setNewNote] = useState('');
  const [showNoteForm, setShowNoteForm] = useState(false);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (!storedToken) {
      setError('Please log in to view materials');
      setLoading(false);
      return;
    }
    setToken(storedToken);
    fetchMaterials(storedToken);
  }, []);

  async function fetchMaterials(authToken: string) {
    try {
      setLoading(true);
      const response = await fetch('/api/user/course-materials', {
        headers: { 'Authorization': `Bearer ${authToken}` },
      });

      if (!response.ok) throw new Error('Failed to load materials');

      const { data } = await response.json();
      setMaterials(data);
      setError('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function addNote() {
    if (!newNote.trim()) return;

    try {
      const response = await fetch('/api/user/course-materials/note', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: 'My Note',
          content: newNote,
          courseId: selectedMaterial?.courseId,
        }),
      });

      if (!response.ok) throw new Error('Failed to save note');

      setNewNote('');
      setShowNoteForm(false);
      await fetchMaterials(token);
    } catch (err) {
      alert('Failed to save note');
    }
  }

  const filteredMaterials = materials.filter((m) => {
    const matchesType = filterType === 'all' || m.type === filterType;
    const matchesSearch = m.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesType && matchesSearch;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex flex-col">
        <Navigation />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-500 border-t-yellow-400"></div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-black flex flex-col">
        <Navigation />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-xl text-white mb-4">Please log in to view course materials</p>
            <Link
              href="/signin"
              className="bg-green-600 hover:bg-yellow-400 hover:text-black text-white px-6 py-3 rounded-lg font-semibold border-2 border-green-500 transition-all duration-300"
            >
              Go to Sign In
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex flex-col">
      <Navigation />

      {/* Hero */}
      <div className="bg-black border-b-2 border-green-500 text-white py-8 sm:py-12">
        <div className="max-w-7xl mx-auto px-4">
          <h1 className="text-2xl sm:text-3xl lg:text-5xl font-bold mb-2 text-yellow-400">📚 Course Materials & Notes</h1>
          <p className="text-green-400">Access and organize your learning resources</p>
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 max-w-7xl mx-auto w-full px-4 py-8">
        {error && (
          <div className="bg-red-950 border-2 border-red-500 text-red-200 px-4 py-4 rounded-lg mb-6">
            ❌ {error}
          </div>
        )}

        {materials.length === 0 ? (
          <div className="text-center py-12">
            <span className="text-6xl mb-4 block">📄</span>
            <p className="text-xl text-white mb-4">No materials yet</p>
            <p className="text-green-400 mb-6">Materials from your courses will appear here</p>
            <Link
              href="/my-sessions"
              className="bg-green-600 hover:bg-yellow-400 hover:text-black text-white px-6 py-3 rounded-lg font-semibold border-2 border-green-500 transition-all duration-300"
            >
              View My Courses
            </Link>
          </div>
        ) : (
          <div>
            {/* Search & Filters */}
            <div className="bg-black border-2 border-green-500 p-6 rounded-lg mb-8">
              <h2 className="text-yellow-400 font-bold text-lg mb-4">Search & Filter</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <input
                  type="text"
                  placeholder="Search materials..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-black border-2 border-green-500 text-white placeholder-green-600 px-4 py-3 rounded-lg focus:outline-none focus:border-yellow-400"
                />
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="bg-black border-2 border-green-500 text-white px-4 py-3 rounded-lg focus:outline-none focus:border-yellow-400"
                >
                  <option value="all">All Types</option>
                  <option value="pdf">PDFs</option>
                  <option value="note">Notes</option>
                  <option value="resource">Resources</option>
                  <option value="worksheet">Worksheets</option>
                </select>
              </div>
              <button
                onClick={() => setShowNoteForm(!showNoteForm)}
                className="bg-green-600 hover:bg-yellow-400 hover:text-black text-white px-4 py-3 rounded font-semibold border-2 border-green-500 transition-all"
              >
                ✏️ Add Note
              </button>
            </div>

            {/* Note Form */}
            {showNoteForm && (
              <div className="bg-black border-2 border-green-500 p-6 rounded-lg mb-8">
                <h3 className="text-yellow-400 font-bold mb-4">Create New Note</h3>
                <textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Write your notes here..."
                  className="w-full bg-black border-2 border-green-500 text-white placeholder-green-600 px-4 py-3 rounded-lg focus:outline-none focus:border-yellow-400 h-32 resize-none"
                />
                <div className="flex gap-3 mt-4">
                  <button
                    onClick={addNote}
                    className="flex-1 bg-green-600 hover:bg-yellow-400 hover:text-black text-white px-4 py-3 rounded font-semibold border-2 border-green-500 transition-all"
                  >
                    Save Note
                  </button>
                  <button
                    onClick={() => {
                      setShowNoteForm(false);
                      setNewNote('');
                    }}
                    className="flex-1 bg-transparent hover:bg-green-900 text-green-400 px-4 py-3 rounded font-semibold border-2 border-green-500 transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Materials Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredMaterials.map((material) => (
                <div
                  key={material.id}
                  className="bg-black border-2 border-green-500 rounded-lg overflow-hidden group hover:border-yellow-400 hover:shadow-xl hover:shadow-green-500/50 transition-all cursor-pointer"
                  onClick={() => setSelectedMaterial(material)}
                >
                  {/* Icon */}
                  <div className="h-32 bg-gradient-to-br from-green-900 to-black flex items-center justify-center text-5xl">
                    {material.type === 'pdf' && '📄'}
                    {material.type === 'note' && '📝'}
                    {material.type === 'resource' && '🔗'}
                    {material.type === 'worksheet' && '✍️'}
                  </div>

                  {/* Content */}
                  <div className="p-4">
                    <h3 className="font-bold text-yellow-400 mb-2 line-clamp-2">
                      {material.title}
                    </h3>
                    <p className="text-green-400 text-sm mb-3 line-clamp-2">
                      {material.description}
                    </p>

                    <div className="space-y-2 text-xs mb-4 pb-4 border-b border-green-500">
                      <p className="text-white">📚 {material.courseTitle}</p>
                      {material.videoTitle && (
                        <p className="text-white">🎬 {material.videoTitle}</p>
                      )}
                      <p className="text-green-400">
                        📅 {new Date(material.uploadedDate).toLocaleDateString()}
                      </p>
                    </div>

                    {/* Tags */}
                    {material.tags.length > 0 && (
                      <div className="flex gap-2 flex-wrap mb-4">
                        {material.tags.map((tag, idx) => (
                          <span
                            key={idx}
                            className="bg-green-900 text-green-300 text-xs px-2 py-1 rounded-full"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Action Button */}
                    {material.fileUrl ? (
                      <a
                        href={material.fileUrl}
                        download
                        className="w-full block text-center bg-green-600 hover:bg-yellow-400 hover:text-black text-white px-4 py-3 rounded font-semibold border-2 border-green-500 transition-all"
                      >
                        📥 Download
                      </a>
                    ) : (
                      <button
                        className="w-full bg-green-600 hover:bg-yellow-400 hover:text-black text-white px-4 py-3 rounded font-semibold border-2 border-green-500 transition-all"
                      >
                        👁️ View
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {filteredMaterials.length === 0 && (
              <div className="text-center py-12">
                <p className="text-white mb-2">No materials found</p>
                <p className="text-green-400">Try adjusting your search or filters</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Material Detail Modal */}
      {selectedMaterial && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-black border-2 border-green-500 rounded-lg max-w-2xl w-full my-8">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-yellow-400">{selectedMaterial.title}</h2>
                <button
                  onClick={() => setSelectedMaterial(null)}
                  className="p-2 -mr-2 text-green-400 hover:text-yellow-400 text-2xl font-bold"
                >
                  ✕
                </button>
              </div>

              <p className="text-white mb-4">{selectedMaterial.description}</p>

              <div className="bg-green-900/20 border border-green-500 p-4 rounded-lg mb-6 space-y-2">
                <p className="text-green-400"><strong>Course:</strong> {selectedMaterial.courseTitle}</p>
                {selectedMaterial.videoTitle && (
                  <p className="text-green-400"><strong>Video:</strong> {selectedMaterial.videoTitle}</p>
                )}
                <p className="text-green-400"><strong>Type:</strong> {selectedMaterial.type.toUpperCase()}</p>
                <p className="text-green-400">
                  <strong>Date:</strong> {new Date(selectedMaterial.uploadedDate).toLocaleDateString()}
                </p>
              </div>

              {selectedMaterial.content && (
                <div className="bg-black border-2 border-green-500 p-4 rounded-lg mb-6 max-h-64 overflow-y-auto">
                  <p className="text-white whitespace-pre-wrap text-sm">{selectedMaterial.content}</p>
                </div>
              )}

              <div className="flex gap-3">
                {selectedMaterial.fileUrl && (
                  <a
                    href={selectedMaterial.fileUrl}
                    download
                    className="flex-1 text-center bg-green-600 hover:bg-yellow-400 hover:text-black text-white px-4 py-3 rounded font-semibold border-2 border-green-500 transition-all"
                  >
                    📥 Download
                  </a>
                )}
                <button
                  onClick={() => setSelectedMaterial(null)}
                  className="flex-1 bg-transparent hover:bg-green-900 text-green-400 px-4 py-3 rounded font-semibold border-2 border-green-500 transition-all"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
