'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Recording {
  id: string;
  title: string;
  description?: string;
  s3Key: string;
  recordingType: string;
  source: string;
  createdAt: string;
}

interface Community {
  id: string;
  name: string;
  description: string;
  type: string;
  memberCount: number;
}

export default function YouthProgramPage() {
  const [loading, setLoading] = useState(true);
  const [community, setCommunity] = useState<Community | null>(null);
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Form state for adding recordings
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    s3Key: '',
    recordingType: 'gallery_view',
    duration: '',
  });

  const getToken = () => localStorage.getItem('adminToken');

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/youth-program', {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      
      if (data.exists) {
        setCommunity(data.community);
        setRecordings(data.recordings || []);
      } else {
        setCommunity(null);
        setRecordings([]);
      }
    } catch (err) {
      setError('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const createCommunity = async () => {
    try {
      setMessage('Creating community...');
      const res = await fetch('/api/admin/youth-program', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ action: 'create-community' }),
      });
      const data = await res.json();
      
      if (data.success) {
        setMessage(`✅ ${data.message}`);
        fetchData();
      } else {
        setError(data.error || 'Failed to create community');
      }
    } catch (err) {
      setError('Failed to create community');
    }
  };

  const [syncing, setSyncing] = useState(false);
  const [zoomMeetings, setZoomMeetings] = useState<any[]>([]);

  const listZoomMeetings = async () => {
    try {
      setMessage('Fetching Zoom meetings...');
      const res = await fetch('/api/admin/zoom/sync-recordings?topic=youth&from=2026-01-01&to=2026-01-31', {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      
      if (data.success) {
        setZoomMeetings(data.meetings || []);
        setMessage(`✅ Found ${data.meetings?.length || 0} Youth Program meetings`);
      } else {
        setError(`Error: ${data.error}\n${data.requiredScope ? `Required scope: ${data.requiredScope}` : ''}`);
      }
    } catch (err) {
      setError('Failed to fetch Zoom meetings');
    }
  };

  const syncMeeting = async (meetingId: string) => {
    if (!community) {
      setError('Create community first before syncing recordings');
      return;
    }
    
    try {
      setSyncing(true);
      setMessage(`Syncing meeting ${meetingId}...`);
      
      const res = await fetch('/api/admin/zoom/sync-recordings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          meetingId,
          communityId: community.id,
          syncToS3: true,
          addToCommunity: true,
        }),
      });
      
      const data = await res.json();
      
      if (data.success) {
        if (data.alreadySynced) {
          setMessage(`ℹ️ Meeting already synced on ${new Date(data.existingSync.syncedAt).toLocaleDateString()}`);
        } else {
          setMessage(`✅ Synced! ${data.results?.synced || 0} recordings added to community`);
          fetchData();
          listZoomMeetings(); // Refresh list to show synced status
        }
      } else {
        setError(data.error || 'Sync failed');
      }
    } catch (err) {
      setError('Failed to sync meeting');
    } finally {
      setSyncing(false);
    }
  };

  const syncAllMeetings = async () => {
    if (!community) {
      setError('Create community first');
      return;
    }
    
    const unsyncedMeetings = zoomMeetings.filter(m => !m.synced);
    if (unsyncedMeetings.length === 0) {
      setMessage('All meetings already synced!');
      return;
    }
    
    setSyncing(true);
    setMessage(`Syncing ${unsyncedMeetings.length} meetings...`);
    
    let synced = 0;
    let errors = 0;
    
    for (const meeting of unsyncedMeetings) {
      try {
        const res = await fetch('/api/admin/zoom/sync-recordings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${getToken()}`,
          },
          body: JSON.stringify({
            meetingId: meeting.id,
            communityId: community.id,
            syncToS3: true,
            addToCommunity: true,
          }),
        });
        
        const data = await res.json();
        if (data.success && !data.alreadySynced) {
          synced++;
        }
      } catch {
        errors++;
      }
      
      // Small delay to avoid rate limiting
      await new Promise(r => setTimeout(r, 2000));
    }
    
    setSyncing(false);
    setMessage(`✅ Sync complete! ${synced} synced, ${errors} errors`);
    fetchData();
    listZoomMeetings();
  };

  const checkZoomRecordings = async () => {
    try {
      setMessage('Checking Zoom recordings...');
      const res = await fetch('/api/admin/youth-program', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ action: 'list-zoom-recordings' }),
      });
      const data = await res.json();
      
      if (data.success) {
        setMessage(
          `Found ${data.recordingCount} recordings:\n` +
          data.recordings?.map((r: any) => `• ${r.type} (${r.fileType}) - ${r.sizeMB} MB`).join('\n')
        );
      } else {
        setError(`Zoom Error: ${data.error}\n\n${data.help || ''}`);
      }
    } catch (err) {
      setError('Failed to check Zoom recordings');
    }
  };

  const addRecording = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setMessage('Adding recording...');
      const res = await fetch('/api/admin/youth-program', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          action: 'add-recording',
          ...formData,
          duration: formData.duration ? parseInt(formData.duration) : undefined,
        }),
      });
      const data = await res.json();
      
      if (data.success) {
        setMessage(`✅ Recording added: ${data.video.title}`);
        setShowAddForm(false);
        setFormData({ title: '', description: '', s3Key: '', recordingType: 'gallery_view', duration: '' });
        fetchData();
      } else {
        setError(data.error || 'Failed to add recording');
      }
    } catch (err) {
      setError('Failed to add recording');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4 mb-2">
            <Link href="/admin" className="text-gray-600 hover:text-gray-900">
              ← Admin
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">🧘 Youth Program Community</h1>
          <p className="text-gray-600">Meeting ID: 833 7691 7306</p>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Messages */}
        {message && (
          <div className="mb-6 p-4 bg-green-50 text-green-800 rounded-lg whitespace-pre-wrap">
            {message}
            <button onClick={() => setMessage('')} className="ml-4 text-green-600 hover:underline">
              Dismiss
            </button>
          </div>
        )}
        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-800 rounded-lg whitespace-pre-wrap">
            {error}
            <button onClick={() => setError('')} className="ml-4 text-red-600 hover:underline">
              Dismiss
            </button>
          </div>
        )}

        {/* Community Status */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Community Status</h2>
          
          {community ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-2xl">✅</span>
                <span className="font-medium">{community.name}</span>
                <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-sm rounded">
                  {community.type}
                </span>
              </div>
              <p className="text-gray-600">{community.description}</p>
              <p className="text-sm text-gray-500">
                {community.memberCount} members • {recordings.length} recordings
              </p>
            </div>
          ) : (
            <div className="text-center py-8">
              <span className="text-4xl mb-4 block">🧘</span>
              <p className="text-gray-600 mb-4">Youth Program community not created yet</p>
              <button
                onClick={createCommunity}
                className="px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 font-medium"
              >
                Create Youth Program Community
              </button>
            </div>
          )}
        </div>

        {/* Zoom Integration */}
        {community && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">📹 Sync Zoom Cloud Recordings</h2>
            <p className="text-gray-600 mb-4">
              Sync 9 Youth Program recordings from Zoom Cloud to S3 and add to community.
            </p>
            
            <div className="flex flex-wrap gap-3 mb-4">
              <button
                onClick={listZoomMeetings}
                disabled={syncing}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
              >
                🔍 List Zoom Meetings
              </button>
              <button
                onClick={syncAllMeetings}
                disabled={syncing || zoomMeetings.length === 0}
                className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50"
              >
                {syncing ? '⏳ Syncing...' : '🚀 Sync All to S3'}
              </button>
              <button
                onClick={checkZoomRecordings}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
              >
                📋 Check via API (legacy)
              </button>
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
              >
                ➕ Add Manually
              </button>
            </div>

            {/* Zoom Meetings List */}
            {zoomMeetings.length > 0 && (
              <div className="mt-4 border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left">Date</th>
                      <th className="px-4 py-2 text-left">Topic</th>
                      <th className="px-4 py-2 text-left">Duration</th>
                      <th className="px-4 py-2 text-left">Files</th>
                      <th className="px-4 py-2 text-left">Status</th>
                      <th className="px-4 py-2 text-left">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {zoomMeetings.map((meeting) => (
                      <tr key={meeting.id} className="border-t">
                        <td className="px-4 py-2">{new Date(meeting.startTime).toLocaleDateString()}</td>
                        <td className="px-4 py-2 max-w-xs truncate">{meeting.topic}</td>
                        <td className="px-4 py-2">{meeting.duration} min</td>
                        <td className="px-4 py-2">{meeting.recordingCount}</td>
                        <td className="px-4 py-2">
                          {meeting.synced ? (
                            <span className="text-green-600">✅ Synced</span>
                          ) : (
                            <span className="text-amber-600">⏳ Pending</span>
                          )}
                        </td>
                        <td className="px-4 py-2">
                          {!meeting.synced && (
                            <button
                              onClick={() => syncMeeting(meeting.id)}
                              disabled={syncing}
                              className="text-blue-600 hover:underline disabled:opacity-50"
                            >
                              Sync
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="mt-4 p-4 bg-amber-50 rounded-lg text-sm">
              <strong>⚠️ Zoom API Scope:</strong> To list recordings, add{' '}
              <code className="bg-amber-100 px-1 rounded">cloud_recording:read:list_recording_files</code>{' '}
              scope in{' '}
              <a href="https://marketplace.zoom.us" target="_blank" className="text-blue-600 underline">
                Zoom Marketplace
              </a> → Your App → Scopes.
            </div>
          </div>
        )}

        {/* Add Recording Form */}
        {showAddForm && community && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h3 className="text-lg font-semibold mb-4">Add Recording to Community</h3>
            <form onSubmit={addRecording} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Youth Program Day 1 - Introduction"
                  className="w-full border rounded-lg px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Session description..."
                  className="w-full border rounded-lg px-3 py-2"
                  rows={2}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">S3 Key *</label>
                <input
                  type="text"
                  value={formData.s3Key}
                  onChange={(e) => setFormData({ ...formData, s3Key: e.target.value })}
                  placeholder="zoom-recordings/2026-01-05/Youth_Program/gallery_view.mp4"
                  className="w-full border rounded-lg px-3 py-2 font-mono text-sm"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Path in S3 bucket where recording is stored
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Recording Type</label>
                  <select
                    value={formData.recordingType}
                    onChange={(e) => setFormData({ ...formData, recordingType: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                  >
                    <option value="gallery_view">Gallery View</option>
                    <option value="speaker_view">Speaker View</option>
                    <option value="shared_screen">Shared Screen</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Duration (seconds)</label>
                  <input
                    type="number"
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                    placeholder="3600"
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                >
                  Add Recording
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Recordings List */}
        {community && recordings.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Community Recordings ({recordings.length})</h2>
            <div className="space-y-3">
              {recordings.map((recording) => (
                <div key={recording.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h3 className="font-medium">{recording.title}</h3>
                    {recording.description && (
                      <p className="text-sm text-gray-600">{recording.description}</p>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      {recording.recordingType} • {recording.source} • {new Date(recording.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                      {recording.recordingType}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {community && recordings.length === 0 && (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <span className="text-4xl mb-4 block">📹</span>
            <p className="text-gray-600">No recordings added yet. Add recordings from Zoom or manually.</p>
          </div>
        )}
      </main>
    </div>
  );
}
