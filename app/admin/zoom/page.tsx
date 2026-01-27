'use client';

import { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';

interface SyncedFile {
  recordingType: string;
  displayName: string;
  s3Key: string;
  s3Url: string;
  fileSize: number;
}

interface Recording {
  _id: string;
  zoomMeetingId: number;
  topic: string;
  startTime: string;
  duration: number;
  totalSize: number;
  syncedFiles: SyncedFile[];
  syncStatus: string;
  syncedAt: string;
}

interface ZoomMeeting {
  id: number;
  topic: string;
  startTime: string;
  duration: number;
  joinUrl: string;
}

export default function ZoomAdminPage() {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [meetings, setMeetings] = useState<ZoomMeeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'recordings' | 'meetings'>('recordings');
  const [search, setSearch] = useState('');

  // Create meeting form
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newMeeting, setNewMeeting] = useState({
    topic: '',
    startTime: '',
    duration: 60,
    agenda: '',
  });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchRecordings();
    fetchMeetings();
  }, []);

  const fetchRecordings = async () => {
    try {
      const res = await fetch(`/api/admin/zoom/recordings?search=${search}`);
      const data = await res.json();
      if (data.success) {
        setRecordings(data.recordings);
      }
    } catch (error) {
      console.error('Failed to fetch recordings:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMeetings = async () => {
    try {
      const res = await fetch('/api/admin/zoom/meetings');
      const data = await res.json();
      if (data.success) {
        setMeetings(data.meetings);
      }
    } catch (error) {
      console.error('Failed to fetch meetings:', error);
    }
  };

  const createMeeting = async () => {
    setCreating(true);
    try {
      const res = await fetch('/api/admin/zoom/meetings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMeeting),
      });
      const data = await res.json();
      if (data.success) {
        alert(`Meeting created!\n\nJoin URL: ${data.meeting.joinUrl}\nPassword: ${data.meeting.password}`);
        setShowCreateForm(false);
        setNewMeeting({ topic: '', startTime: '', duration: 60, agenda: '' });
        fetchMeetings();
      } else {
        alert('Failed: ' + data.error);
      }
    } catch (error) {
      alert('Error creating meeting');
    } finally {
      setCreating(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDuration = (minutes: number) => {
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Zoom Management</h1>
          <p className="text-gray-600 mt-1">View synced recordings & manage meetings</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setActiveTab('recordings')}
            className={`px-4 py-2 rounded-lg font-medium ${
              activeTab === 'recordings'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            📹 Recordings ({recordings.length})
          </button>
          <button
            onClick={() => setActiveTab('meetings')}
            className={`px-4 py-2 rounded-lg font-medium ${
              activeTab === 'meetings'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            📅 Upcoming Meetings ({meetings.length})
          </button>
        </div>

        {/* Recordings Tab */}
        {activeTab === 'recordings' && (
          <div>
            {/* Search */}
            <div className="mb-4">
              <input
                type="text"
                placeholder="Search by topic..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchRecordings()}
                className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Recordings List */}
            {recordings.length === 0 ? (
              <div className="bg-white rounded-lg p-8 text-center">
                <p className="text-gray-500">No recordings synced yet.</p>
                <p className="text-sm text-gray-400 mt-2">
                  Recordings will appear here after your Zoom meetings end.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {recordings.map((rec) => (
                  <div key={rec._id} className="bg-white rounded-lg shadow p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-xl font-semibold text-gray-900">{rec.topic}</h3>
                        <p className="text-sm text-gray-500">
                          {new Date(rec.startTime).toLocaleString('en-IN', {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })}
                          {' • '}
                          {formatDuration(rec.duration)}
                          {' • '}
                          {formatBytes(rec.totalSize)}
                        </p>
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          rec.syncStatus === 'completed'
                            ? 'bg-green-100 text-green-700'
                            : rec.syncStatus === 'partial'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {rec.syncStatus}
                      </span>
                    </div>

                    {/* Synced Files */}
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-gray-700">Recordings in S3:</p>
                      {rec.syncedFiles.map((file, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between bg-gray-50 rounded-lg p-3"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">
                              {file.recordingType.includes('speaker') ? '👤' : '👥'}
                            </span>
                            <div>
                              <p className="font-medium text-gray-800">{file.displayName}</p>
                              <p className="text-xs text-gray-500">{file.s3Key}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-sm text-gray-500">
                              {formatBytes(file.fileSize)}
                            </span>
                            <a
                              href={file.s3Url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                            >
                              View
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>

                    <p className="text-xs text-gray-400 mt-4">
                      Synced {formatDistanceToNow(new Date(rec.syncedAt), { addSuffix: true })}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Meetings Tab */}
        {activeTab === 'meetings' && (
          <div>
            {/* Create Meeting Button */}
            <div className="mb-4">
              <button
                onClick={() => setShowCreateForm(!showCreateForm)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                + Create Zoom Meeting
              </button>
            </div>

            {/* Create Meeting Form */}
            {showCreateForm && (
              <div className="bg-white rounded-lg shadow p-6 mb-6">
                <h3 className="text-lg font-semibold mb-4">Create New Meeting</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Topic *
                    </label>
                    <input
                      type="text"
                      value={newMeeting.topic}
                      onChange={(e) =>
                        setNewMeeting({ ...newMeeting, topic: e.target.value })
                      }
                      className="w-full px-3 py-2 border rounded-lg"
                      placeholder="Workshop: Swar Yoga Day 1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Start Time *
                    </label>
                    <input
                      type="datetime-local"
                      value={newMeeting.startTime}
                      onChange={(e) =>
                        setNewMeeting({ ...newMeeting, startTime: e.target.value })
                      }
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Duration (minutes)
                    </label>
                    <input
                      type="number"
                      value={newMeeting.duration}
                      onChange={(e) =>
                        setNewMeeting({ ...newMeeting, duration: parseInt(e.target.value) })
                      }
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Agenda (optional)
                    </label>
                    <input
                      type="text"
                      value={newMeeting.agenda}
                      onChange={(e) =>
                        setNewMeeting({ ...newMeeting, agenda: e.target.value })
                      }
                      className="w-full px-3 py-2 border rounded-lg"
                      placeholder="Meeting description"
                    />
                  </div>
                </div>
                <div className="flex gap-3 mt-4">
                  <button
                    onClick={createMeeting}
                    disabled={creating || !newMeeting.topic || !newMeeting.startTime}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {creating ? 'Creating...' : 'Create Meeting'}
                  </button>
                  <button
                    onClick={() => setShowCreateForm(false)}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-3">
                  ✅ Cloud recording will be auto-enabled. Recordings will upload to S3 automatically!
                </p>
              </div>
            )}

            {/* Meetings List */}
            {meetings.length === 0 ? (
              <div className="bg-white rounded-lg p-8 text-center">
                <p className="text-gray-500">No upcoming meetings.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {meetings.map((meeting) => (
                  <div key={meeting.id} className="bg-white rounded-lg shadow p-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{meeting.topic}</h3>
                        <p className="text-sm text-gray-500">
                          {new Date(meeting.startTime).toLocaleString('en-IN', {
                            dateStyle: 'full',
                            timeStyle: 'short',
                          })}
                          {' • '}
                          {formatDuration(meeting.duration)}
                        </p>
                      </div>
                      <a
                        href={meeting.joinUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        Join Meeting
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
