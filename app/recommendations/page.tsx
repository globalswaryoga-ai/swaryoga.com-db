'use client';

import React, { useState, useEffect } from 'react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import Link from 'next/link';

interface RecommendedCourse {
  id: string;
  title: string;
  description: string;
  instructor: string;
  difficulty: string;
  matchScore: number;
  thumbnail?: string;
  reason: string;
}

export default function RecommendationsPage() {
  const [recommendations, setRecommendations] = useState<RecommendedCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState('');

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    setToken(storedToken || '');
    if (storedToken) fetchRecommendations(storedToken);
    else setLoading(false);
  }, []);

  async function fetchRecommendations(authToken: string) {
    try {
      const response = await fetch('/api/user/recommendations', {
        headers: { 'Authorization': `Bearer ${authToken}` },
      });
      if (response.ok) {
        const { data } = await response.json();
        setRecommendations(data);
      }
    } catch (err) {
      console.error('Failed to load recommendations');
    } finally {
      setLoading(false);
    }
  }

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
          <h1 className="text-5xl font-bold mb-2 text-yellow-400">🎯 Recommended For You</h1>
          <p className="text-green-400">Courses tailored to your learning style</p>
        </div>
      </div>

      <div className="flex-1 max-w-7xl mx-auto w-full px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {recommendations.map((course) => (
            <div
              key={course.id}
              className="bg-black border-2 border-green-500 rounded-lg overflow-hidden group hover:border-yellow-400 hover:shadow-xl transition-all"
            >
              <div className="h-40 bg-gradient-to-br from-green-900 to-black flex items-center justify-center">
                <span className="text-6xl opacity-50">📚</span>
              </div>
              <div className="p-4">
                <h3 className="font-bold text-yellow-400 mb-2">{course.title}</h3>
                <p className="text-white text-sm mb-3">{course.description}</p>

                <div className="bg-green-900/20 border border-green-500 p-3 rounded mb-3">
                  <p className="text-green-400 text-xs font-bold">Match Score: {course.matchScore}%</p>
                  <p className="text-green-400 text-xs">{course.reason}</p>
                </div>

                <div className="text-sm text-green-400 mb-3">
                  <p>👨‍🏫 {course.instructor}</p>
                  <p>📊 {course.difficulty}</p>
                </div>

                <button className="w-full bg-green-600 hover:bg-yellow-400 hover:text-black text-white px-4 py-2 rounded font-semibold border-2 border-green-500 transition-all">
                  Explore Course
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
      <Footer />
    </div>
  );
}
