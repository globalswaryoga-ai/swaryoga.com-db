'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { Word } from '@/lib/types/lifePlanner';
import { lifePlannerStorage } from '@/lib/lifePlannerStorage';
import WordModal from './WordModal';

export default function WordsPage() {
  const [words, setWords] = useState<Word[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingWord, setEditingWord] = useState<Word | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = lifePlannerStorage.getWords();
    setWords(saved.length > 0 ? saved : []);
  }, []);

  useEffect(() => {
    if (mounted) {
      lifePlannerStorage.saveWords(words);
    }
  }, [words, mounted]);

  const handleAddWord = () => {
    setEditingWord(null);
    setIsModalOpen(true);
  };

  const handleEditWord = (word: Word) => {
    setEditingWord(word);
    setIsModalOpen(true);
  };

  const handleDeleteWord = (id: string) => {
    setWords(prev => prev.filter(w => w.id !== id));
  };

  const handleSaveWord = (wordData: Omit<Word, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (editingWord) {
      setWords(prev =>
        prev.map(w =>
          w.id === editingWord.id
            ? { ...w, ...wordData, updatedAt: new Date().toISOString() }
            : w
        )
      );
    } else {
      const newWord: Word = {
        ...wordData,
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setWords(prev => [...prev, newWord]);
    }
    setIsModalOpen(false);
  };

  const categories = [...new Set(words.map(w => w.category))];

  if (!mounted) return null;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">My Words</h1>
          <p className="text-gray-600">Personal commitments, rules, and affirmations</p>
        </div>
        <button
          onClick={handleAddWord}
          className="flex items-center space-x-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-6 py-3 rounded-lg hover:from-emerald-700 hover:to-teal-700 transition-all shadow-lg"
        >
          <Plus className="h-5 w-5" />
          <span>Add Word</span>
        </button>
      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-xl p-6 shadow-lg">
          <div className="text-2xl font-bold text-emerald-600 mb-1">{words.length}</div>
          <div className="text-gray-600 text-sm">Total Words</div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-lg">
          <div className="text-2xl font-bold text-blue-600 mb-1">{categories.length}</div>
          <div className="text-gray-600 text-sm">Categories</div>
        </div>
      </div>

      {/* Words Grid */}
      <div className="grid gap-6">
        {words.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl">
            <h3 className="text-lg font-medium text-gray-900 mb-2">No words yet</h3>
            <p className="text-gray-600 mb-4">Add your first commitment, rule, or affirmation.</p>
            <button
              onClick={handleAddWord}
              className="inline-flex items-center space-x-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700"
            >
              <Plus className="h-4 w-4" />
              <span>Add Word</span>
            </button>
          </div>
        ) : (
          words.map(word => (
            <div key={word.id} className="bg-white rounded-xl p-6 shadow hover:shadow-lg transition-all" style={{ borderLeft: `4px solid ${word.color || '#10b981'}` }}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-800 mb-2">{word.title}</h3>
                  <p className="text-gray-600 mb-4 whitespace-pre-wrap">{word.content}</p>
                  <span className="inline-block px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-medium">
                    {word.category}
                  </span>
                </div>
                <div className="flex gap-2 flex-shrink-0 ml-4">
                  <button
                    onClick={() => handleEditWord(word)}
                    className="p-2 text-gray-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteWord(word.id)}
                    className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {isModalOpen && (
        <WordModal
          word={editingWord}
          onSave={handleSaveWord}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </div>
  );
}
