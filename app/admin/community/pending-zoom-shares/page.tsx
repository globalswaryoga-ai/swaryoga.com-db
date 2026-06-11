'use client';

import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle2, Copy, ExternalLink } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface PendingVideo {
  _id: string;
  title: string;
  youtubeVideoId: string;
  communityId: string;
  pendingEmailInvites: string[];
  createdAt: string;
}

export default function PendingZoomSharesPage() {
  const token = useAuth();
  const [videos, setVideos] = useState<PendingVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    const fetchPending = async () => {
      try {
        const res = await fetch('/api/admin/community/pending-zoom-shares', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Failed to load pending videos');
        const data = await res.json();
        setVideos(data.videos || []);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };

    if (token) fetchPending();
  }, [token]);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const youtubeStudioUrl = (videoId: string) =>
    `https://studio.youtube.com/video/${videoId}/edit`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
            <AlertCircle className="w-8 h-8 text-amber-600" />
            Pending Zoom Share Invites
          </h1>
          <p className="text-gray-600 mt-2">
            Zoom recordings uploaded to YouTube — invite these emails so members can watch
          </p>
        </div>

        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {!loading && !error && videos.length === 0 && (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-4" />
            <p className="text-gray-600 text-lg">All Zoom recordings are shared!</p>
            <p className="text-gray-500 text-sm mt-2">
              No pending invites at this time.
            </p>
          </div>
        )}

        {!loading && videos.length > 0 && (
          <div className="space-y-4">
            {videos.map((video) => (
              <div key={video._id} className="bg-white rounded-lg shadow-md p-6 border-l-4 border-amber-500">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h2 className="text-lg font-bold text-gray-800">{video.title}</h2>
                    <p className="text-sm text-gray-500 mt-1">
                      Added: {new Date(video.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <span className="px-3 py-1 bg-amber-100 text-amber-800 text-xs font-medium rounded-full">
                    {video.communityId.toUpperCase()}
                  </span>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <p className="text-sm text-blue-900 font-medium mb-3">
                    📧 Invite these emails in YouTube Studio:
                  </p>
                  <div className="space-y-2">
                    {video.pendingEmailInvites.map((email) => (
                      <div
                        key={email}
                        className="flex items-center gap-2 bg-white p-2 rounded border border-blue-100"
                      >
                        <code className="text-sm text-gray-700 flex-1 font-mono">
                          {email}
                        </code>
                        <button
                          onClick={() => copyToClipboard(email, `email-${video._id}-${email}`)}
                          className="p-1 hover:bg-blue-100 rounded transition"
                          title="Copy email"
                        >
                          {copiedId === `email-${video._id}-${email}` ? (
                            <CheckCircle2 className="w-4 h-4 text-green-600" />
                          ) : (
                            <Copy className="w-4 h-4 text-blue-600" />
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 mb-4">
                  <p className="text-sm text-indigo-900 font-medium mb-2">
                    ✅ Steps to complete:
                  </p>
                  <ol className="text-sm text-indigo-800 space-y-1 ml-4">
                    <li>
                      1. Open the{' '}
                      <a
                        href={youtubeStudioUrl(video.youtubeVideoId)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-600 hover:underline font-medium inline-flex items-center gap-1"
                      >
                        YouTube Studio video editor
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </li>
                    <li>2. Go to <strong>Share</strong> (or <strong>Details</strong> → <strong>Visibility</strong>)</li>
                    <li>3. Invite each email above as a <strong>viewer</strong></li>
                    <li>4. YouTube emails them shareable links automatically</li>
                    <li>5. Community members can watch (no download, forward, or share)</li>
                  </ol>
                </div>

                <div className="flex gap-2">
                  <a
                    href={`https://youtu.be/${video.youtubeVideoId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition text-sm font-medium"
                  >
                    Watch Video
                  </a>
                  <a
                    href={youtubeStudioUrl(video.youtubeVideoId)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition text-sm font-medium"
                  >
                    Open in Studio
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
