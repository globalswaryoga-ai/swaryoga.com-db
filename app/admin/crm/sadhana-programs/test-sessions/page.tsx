'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { SessionsPanel } from '../components/SessionsPanel';

/**
 * Test page for Sadhana Sessions feature
 * This is a temporary page to test the session tracking functionality
 * with dummy data before integrating into the main program page
 */

export default function TestSessionsPage() {
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split('T')[0]
  );

  // Dummy program data for testing
  const dummyProgramId = '69f9e6089b061023defe0eab'; // From screenshot URL
  const dummyProgramSlug = 'sadhana-program';
  const timeSlots = ['06:00', '07:00', '18:00', '19:00']; // 4 daily sessions

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <Link
        href="/admin/crm/sadhana-programs"
        className="inline-flex items-center gap-2 text-emerald-600 hover:text-emerald-700 mb-8"
      >
        <ArrowLeft size={20} />
        Back to Programs
      </Link>

      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            Test Sadhana Sessions
          </h1>
          <p className="text-slate-600 mb-6">
            Test the session tracking feature with dummy data
          </p>

          <div className="mb-6">
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Select Date
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="bg-slate-100 p-4 rounded-lg mb-6">
            <h3 className="font-semibold text-slate-900 mb-2">Test Info:</h3>
            <ul className="text-sm text-slate-700 space-y-1">
              <li>• Program ID: {dummyProgramId}</li>
              <li>• Time Slots: {timeSlots.join(', ')}</li>
              <li>• Selected Date: {selectedDate}</li>
            </ul>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-blue-900 mb-2">📝 Testing Steps:</h3>
            <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
              <li>Click "Initialize Sessions" to create 4 daily sessions</li>
              <li>Click "Add Member" to add a participant to a session</li>
              <li>Click "View Details" to see participants and their durations</li>
              <li>Click "Leave" to mark a participant as left (duration calculated)</li>
              <li>Check MongoDB to verify data persistence</li>
            </ol>
          </div>
        </div>

        <SessionsPanel
          programId={dummyProgramId}
          programSlug={dummyProgramSlug}
          date={selectedDate}
          timeSlots={timeSlots}
          onSessionsLoaded={(sessions) => {
            console.log('Sessions loaded:', sessions);
          }}
        />

        {/* Debug Info */}
        <div className="mt-8 bg-slate-900 text-slate-100 rounded-lg p-6 font-mono text-sm overflow-auto">
          <h3 className="font-bold mb-4">Debug Info</h3>
          <pre>
{`API Endpoints Available:

1. GET /api/admin/crm/sadhana-sessions
   Query: ?programId=ID&date=YYYY-MM-DD
   Returns: List of sessions with participants

2. POST /api/admin/crm/sadhana-sessions
   Body: { programId, programSlug, date, timeSlots: ["06:00", "07:00", "18:00", "19:00"] }
   Creates: 4 daily sessions

3. POST /api/admin/crm/sadhana-sessions/[sessionId]/join
   Body: { name }
   Adds: Participant with joinedAt timestamp

4. POST /api/admin/crm/sadhana-sessions/[sessionId]/leave
   Body: { participantId }
   Marks: Participant as left, calculates durationMinutes

MongoDB Collection: swaryoga_admin_crm.sadhana_sessions`}
          </pre>
        </div>
      </div>
    </div>
  );
}
