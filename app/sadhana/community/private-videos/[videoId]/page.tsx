'use client';

import React, { useState, useEffect } from 'react';
import { ArrowLeft, Lock, AlertCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';

interface VideoData {
  _id: string;
  videoTitle: string;
  videoId: string;
  videoUrl: string;
  ownerEmail: string;
  createdAt: string;
}

export default function VideoPlayerPage({
  params,
  token,
}: {
  params: { videoId: string };
  token: string | null;
}) {
  const [video, setVideo] = useState<VideoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  // Decode user email from token
  useEffect(() => {
    if (token) {
      try {
        const decoded = JSON.parse(atob(token.split('.')[1]));
        setUserEmail(decoded.email || null);
      } catch (e) {
        console.error('Failed to decode token');
      }
    }
  }, [token]);

  // Fetch video details
  useEffect(() => {
    if (!token) {
      setError('Login required');
      setLoading(false);
      return;
    }

    const fetchVideo = async () => {
      try {
        // Verify user has access to this video
        const res = await fetch('/api/admin/community/private-videos', {
          headers: { 'Authorization': `Bearer ${token}` },
        });

        if (!res.ok) throw new Error('Failed to fetch videos');

        const data = await res.json();
        const foundVideo = data.videos.find(
          (v: VideoData) => v.videoId === params.videoId
        );

        if (!foundVideo) {
          setError('Video not found or you do not have access');
        } else {
          setVideo(foundVideo);
        }
      } catch (e: any) {
        setError(e.message || 'Failed to load video');
      } finally {
        setLoading(false);
      }
    };

    fetchVideo();
  }, [params.videoId, token]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <Loader2 className="w-8 h-8 animate-spin text-white" />
      </div>
    );
  }

  if (!token || error) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
        <div className="bg-gray-900 rounded-lg p-8 max-w-md w-full text-center">
          <Lock className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-white text-xl font-bold mb-2">Access Denied</h2>
          <p className="text-gray-400 mb-6">
            {error || 'Login required to watch this video'}
          </p>
          <Link
            href="/sadhana/community/private-videos"
            className="inline-block bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition"
          >
            ← Back to Videos
          </Link>
        </div>
      </div>
    );
  }

  if (!video) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
        <div className="bg-gray-900 rounded-lg p-8 max-w-md w-full text-center">
          <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <h2 className="text-white text-xl font-bold mb-2">Video Not Found</h2>
          <p className="text-gray-400 mb-6">This video is no longer available</p>
          <Link
            href="/sadhana/community/private-videos"
            className="inline-block bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition"
          >
            ← Back to Videos
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-800 p-4">
        <Link
          href="/sadhana/community/private-videos"
          className="text-indigo-400 hover:text-indigo-300 transition flex items-center gap-2"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Videos
        </Link>
      </div>

      <div className="max-w-4xl mx-auto p-4">
        {/* Video Title */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white mb-2">{video.videoTitle}</h1>
          <div className="flex items-center gap-4 text-sm text-gray-400">
            <span>🔒 Private Video</span>
            <span>📧 Owner: {video.ownerEmail}</span>
            <span>👤 You: {userEmail}</span>
          </div>
        </div>

        {/* YouTube Embed */}
        <div className="relative w-full bg-black rounded-lg overflow-hidden mb-6" style={{ paddingBottom: '56.25%', height: 0 }}>
          <iframe
            className="absolute top-0 left-0 w-full h-full"
            src={`https://www.youtube.com/embed/${video.videoId}?autoplay=1&controls=1&modestbranding=1`}
            title={video.videoTitle}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>

        {/* Video Info */}
        <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
          <h2 className="text-white font-bold text-lg mb-4">Video Information</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-400">Owner Email</p>
              <p className="text-white font-medium">{video.ownerEmail}</p>
            </div>
            <div>
              <p className="text-gray-400">Access Status</p>
              <p className="text-green-400 font-medium">✅ Full Access</p>
            </div>
            <div>
              <p className="text-gray-400">Video ID</p>
              <p className="text-white font-mono text-xs">{video.videoId}</p>
            </div>
            <div>
              <p className="text-gray-400">Shared Date</p>
              <p className="text-white">{new Date(video.createdAt).toLocaleDateString()}</p>
            </div>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="mt-6 p-4 bg-blue-900/30 border border-blue-700 rounded-lg text-blue-100 text-sm">
          <p>
            <strong>⚠️ Note:</strong> This video is private and shared only with approved members.
            Do not share the link with others.
          </p>
        </div>
      </div>
    </div>
  );
}
