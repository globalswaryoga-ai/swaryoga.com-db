'use client';

import React, { useState, useEffect } from 'react';
import { Eye, Users, Plus, Trash2, Clock } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface Participant {
  _id: string;
  name: string;
  joinedAt: string;
  leftAt?: string;
  durationMinutes?: number;
}

interface Session {
  _id: string;
  programId: string;
  date: string;
  timeSlot: string;
  participantCount: number;
  participants: Participant[];
  createdAt: string;
}

interface SessionsPanelProps {
  programId: string;
  programSlug: string;
  date: string;
  timeSlots: string[];
  onSessionsLoaded?: (sessions: Session[]) => void;
}

export const SessionsPanel: React.FC<SessionsPanelProps> = ({
  programId,
  programSlug,
  date,
  timeSlots,
  onSessionsLoaded,
}) => {
  const token = useAuth();
  const authHeaders: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [showParticipantModal, setShowParticipantModal] = useState(false);
  const [newParticipantName, setNewParticipantName] = useState('');
  const [joiningSessionId, setJoiningSessionId] = useState<string | null>(null);

  // Load sessions for the date
  const loadSessions = async () => {
    try {
      setLoading(true);
      const res = await fetch(
        `/api/admin/crm/sadhana-sessions?programId=${programId}&date=${date}`,
        { headers: authHeaders }
      );
      const data = await res.json();

      if (data.success) {
        setSessions(data.sessions);
        onSessionsLoaded?.(data.sessions);
      }
    } catch (error) {
      console.error('Error loading sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  // Initialize sessions for the date
  const initializeSessions = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/crm/sadhana-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({
          programId,
          programSlug,
          date,
          timeSlots,
        }),
      });
      const data = await res.json();

      if (data.success) {
        loadSessions();
      }
    } catch (error) {
      console.error('Error initializing sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle participant join
  const handleJoin = async (sessionId: string, name: string) => {
    if (!name.trim()) return;

    try {
      const res = await fetch(
        `/api/admin/crm/sadhana-sessions/${sessionId}/join`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name }),
        }
      );
      const data = await res.json();

      if (data.success) {
        setNewParticipantName('');
        setJoiningSessionId(null);
        loadSessions();
      } else {
        alert('Error: ' + data.error);
      }
    } catch (error) {
      console.error('Error joining session:', error);
      alert('Failed to join session');
    }
  };

  // Handle participant leave
  const handleLeave = async (sessionId: string, participantId: string) => {
    try {
      const res = await fetch(
        `/api/admin/crm/sadhana-sessions/${sessionId}/leave`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ participantId }),
        }
      );
      const data = await res.json();

      if (data.success) {
        loadSessions();
      } else {
        alert('Error: ' + data.error);
      }
    } catch (error) {
      console.error('Error leaving session:', error);
      alert('Failed to leave session');
    }
  };

  useEffect(() => {
    if (programId && date) {
      loadSessions();
    }
  }, [programId, date]);

  if (!sessions.length) {
    return (
      <div className="p-6 bg-slate-50 rounded-lg border border-slate-200 text-center">
        <p className="text-slate-600 mb-4">No sessions initialized for {date}</p>
        <button
          onClick={initializeSessions}
          disabled={loading}
          className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 disabled:opacity-50"
        >
          {loading ? 'Initializing...' : 'Initialize Sessions'}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold text-slate-900">Sessions for {date}</h3>
        <button
          onClick={loadSessions}
          disabled={loading}
          className="px-3 py-1 text-sm bg-slate-200 text-slate-700 rounded hover:bg-slate-300 disabled:opacity-50"
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {sessions.map((session) => (
          <div
            key={session._id}
            className="bg-white p-4 rounded-lg border border-slate-200 hover:border-emerald-400 transition"
          >
            <div className="font-bold text-lg text-slate-900 mb-2">
              {session.timeSlot}
            </div>

            <div className="flex items-center gap-2 mb-3 text-slate-600">
              <Users size={16} />
              <span className="text-sm font-semibold">
                {session.participantCount} joined
              </span>
            </div>

            <button
              onClick={() => {
                setSelectedSession(session);
                setShowParticipantModal(true);
              }}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm bg-emerald-100 text-emerald-700 rounded hover:bg-emerald-200 transition"
            >
              <Eye size={16} />
              View Details
            </button>

            <button
              onClick={() => setJoiningSessionId(session._id)}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition mt-2"
            >
              <Plus size={16} />
              Add Member
            </button>

            {joiningSessionId === session._id && (
              <div className="mt-3 p-2 bg-blue-50 rounded border border-blue-200">
                <input
                  type="text"
                  placeholder="Member name"
                  value={newParticipantName}
                  onChange={(e) => setNewParticipantName(e.target.value)}
                  className="w-full px-2 py-1 text-sm border border-blue-300 rounded mb-2"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleJoin(session._id, newParticipantName);
                    }
                  }}
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => handleJoin(session._id, newParticipantName)}
                    className="flex-1 px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    Join
                  </button>
                  <button
                    onClick={() => {
                      setJoiningSessionId(null);
                      setNewParticipantName('');
                    }}
                    className="flex-1 px-2 py-1 text-xs bg-slate-300 text-slate-700 rounded hover:bg-slate-400"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Participants Modal */}
      {showParticipantModal && selectedSession && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-96 overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">
                Participants - {selectedSession.timeSlot}
              </h3>
              <button
                onClick={() => setShowParticipantModal(false)}
                className="text-2xl text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            {selectedSession.participants.length === 0 ? (
              <p className="text-slate-600 text-center py-8">
                No participants yet
              </p>
            ) : (
              <div className="space-y-2">
                {selectedSession.participants.map((participant) => (
                  <div
                    key={participant._id}
                    className="flex items-center justify-between p-3 bg-slate-50 rounded border border-slate-200"
                  >
                    <div className="flex-1">
                      <p className="font-semibold text-slate-900">
                        {participant.name}
                      </p>
                      <p className="text-xs text-slate-500">
                        Joined: {new Date(participant.joinedAt).toLocaleTimeString()}
                      </p>
                      {participant.leftAt && (
                        <div className="flex items-center gap-1 text-xs text-slate-600 mt-1">
                          <Clock size={12} />
                          Duration: {participant.durationMinutes} minutes
                        </div>
                      )}
                    </div>

                    {!participant.leftAt && (
                      <button
                        onClick={() =>
                          handleLeave(selectedSession._id, participant._id)
                        }
                        className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 transition"
                      >
                        Leave
                      </button>
                    )}
                    {participant.leftAt && (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                        Completed
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
