'use client';

import React, { useState, useEffect } from 'react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import Link from 'next/link';

interface ForumThread {
  id: string;
  courseId: string;
  courseTitle: string;
  title: string;
  description: string;
  author: string;
  authorId: string;
  createdAt: string;
  replies: number;
  views: number;
  isAnswered: boolean;
  tags: string[];
  lastReplyAt: string;
}

export default function ForumPage() {
  const [threads, setThreads] = useState<ForumThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [token, setToken] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedThread, setSelectedThread] = useState<ForumThread | null>(null);
  const [replyText, setReplyText] = useState('');
  const [newThreadTitle, setNewThreadTitle] = useState('');
  const [newThreadDesc, setNewThreadDesc] = useState('');
  const [showNewThread, setShowNewThread] = useState(false);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (!storedToken) {
      setError('Please log in');
      setLoading(false);
      return;
    }
    setToken(storedToken);
    fetchThreads(storedToken);
  }, []);

  async function fetchThreads(authToken: string) {
    try {
      setLoading(true);
      const response = await fetch('/api/forum/threads', {
        headers: { 'Authorization': `Bearer ${authToken}` },
      });
      if (!response.ok) throw new Error('Failed to load forum');
      const { data } = await response.json();
      setThreads(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const filteredThreads = threads.filter((t) =>
    t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

  return (
    <div className="min-h-screen bg-black flex flex-col">
      <Navigation />
      <div className="bg-black border-b-2 border-green-500 text-white py-12">
        <div className="max-w-7xl mx-auto px-4">
          <h1 className="text-5xl font-bold mb-2 text-yellow-400">💬 Discussion Forum</h1>
          <p className="text-green-400">Ask questions and help fellow students</p>
        </div>
      </div>

      <div className="flex-1 max-w-7xl mx-auto w-full px-4 py-8">
        {error && (
          <div className="bg-red-950 border-2 border-red-500 text-red-200 px-4 py-4 rounded-lg mb-6">
            ❌ {error}
          </div>
        )}

        {/* Search & New Thread */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <input
            type="text"
            placeholder="Search discussions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="md:col-span-2 bg-black border-2 border-green-500 text-white placeholder-green-600 px-4 py-2 rounded-lg"
          />
          <button
            onClick={() => setShowNewThread(!showNewThread)}
            className="bg-green-600 hover:bg-yellow-400 hover:text-black text-white px-4 py-2 rounded font-semibold border-2 border-green-500 transition-all"
          >
            ➕ New Thread
          </button>
        </div>

        {/* New Thread Form */}
        {showNewThread && (
          <div className="bg-black border-2 border-green-500 p-6 rounded-lg mb-8">
            <h3 className="text-yellow-400 font-bold text-lg mb-4">Start New Discussion</h3>
            <input
              type="text"
              placeholder="Thread title..."
              value={newThreadTitle}
              onChange={(e) => setNewThreadTitle(e.target.value)}
              className="w-full bg-black border-2 border-green-500 text-white placeholder-green-600 px-4 py-2 rounded-lg mb-3"
            />
            <textarea
              value={newThreadDesc}
              onChange={(e) => setNewThreadDesc(e.target.value)}
              placeholder="Describe your question or topic..."
              rows={4}
              className="w-full bg-black border-2 border-green-500 text-white placeholder-green-600 px-4 py-2 rounded-lg mb-4"
            />
            <div className="flex gap-3">
              <button className="flex-1 bg-green-600 hover:bg-yellow-400 hover:text-black text-white px-4 py-2 rounded font-semibold border-2 border-green-500 transition-all">
                Post Discussion
              </button>
              <button
                onClick={() => {
                  setShowNewThread(false);
                  setNewThreadTitle('');
                  setNewThreadDesc('');
                }}
                className="flex-1 bg-transparent hover:bg-green-900 text-green-400 px-4 py-2 rounded font-semibold border-2 border-green-500 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Threads List */}
        <div className="space-y-4">
          {filteredThreads.map((thread) => (
            <div
              key={thread.id}
              className="bg-black border-2 border-green-500 rounded-lg p-6 group hover:border-yellow-400 hover:shadow-xl hover:shadow-green-500/50 transition-all cursor-pointer"
              onClick={() => setSelectedThread(thread)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-bold text-yellow-400 text-lg mb-2">
                    {thread.isAnswered && <span className="text-green-400 mr-2">✓</span>}
                    {thread.title}
                  </h3>
                  <p className="text-white mb-3 line-clamp-2">{thread.description}</p>

                  <div className="flex gap-4 text-sm text-green-400">
                    <span>👤 {thread.author}</span>
                    <span>💬 {thread.replies} replies</span>
                    <span>👁️ {thread.views} views</span>
                    <span>📅 {new Date(thread.lastReplyAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Thread Detail Modal */}
      {selectedThread && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-black border-2 border-green-500 rounded-lg max-w-2xl w-full my-8">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-yellow-400">{selectedThread.title}</h2>
                <button onClick={() => setSelectedThread(null)} className="text-green-400 hover:text-yellow-400 text-2xl font-bold">
                  ✕
                </button>
              </div>

              <div className="bg-green-900/20 border border-green-500 p-4 rounded-lg mb-6">
                <p className="text-white mb-2">{selectedThread.description}</p>
                <div className="flex gap-4 text-sm text-green-400">
                  <span>👤 {selectedThread.author}</span>
                  <span>💬 {selectedThread.replies} replies</span>
                  <span>📅 {new Date(selectedThread.createdAt).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Reply Form */}
              <div className="mb-6">
                <h3 className="text-yellow-400 font-bold mb-3">Your Reply</h3>
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Type your reply..."
                  rows={4}
                  className="w-full bg-black border-2 border-green-500 text-white placeholder-green-600 px-4 py-2 rounded-lg"
                />
              </div>

              <div className="flex gap-3">
                <button className="flex-1 bg-green-600 hover:bg-yellow-400 hover:text-black text-white px-4 py-2 rounded font-semibold border-2 border-green-500 transition-all">
                  Post Reply
                </button>
                <button
                  onClick={() => setSelectedThread(null)}
                  className="flex-1 bg-transparent hover:bg-green-900 text-green-400 px-4 py-2 rounded font-semibold border-2 border-green-500 transition-all"
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
