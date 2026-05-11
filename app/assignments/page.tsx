'use client';

import React, { useState, useEffect } from 'react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import Link from 'next/link';

interface Assignment {
  id: string;
  courseId: string;
  courseTitle: string;
  title: string;
  description: string;
  dueDate: string;
  type: 'assignment' | 'quiz';
  totalPoints: number;
  submissionStatus: 'pending' | 'submitted' | 'graded';
  submittedDate?: string;
  score?: number;
  feedback?: string;
  questions?: Question[];
}

interface Question {
  id: string;
  question: string;
  type: 'multiple-choice' | 'short-answer' | 'essay';
  options?: string[];
  correctAnswer?: string;
  points: number;
}

export default function AssignmentsPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [token, setToken] = useState('');
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({});
  const [submittingQuiz, setSubmittingQuiz] = useState(false);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (!storedToken) {
      setError('Please log in');
      setLoading(false);
      return;
    }
    setToken(storedToken);
    fetchAssignments(storedToken);
  }, []);

  async function fetchAssignments(authToken: string) {
    try {
      setLoading(true);
      const response = await fetch('/api/user/assignments', {
        headers: { 'Authorization': `Bearer ${authToken}` },
      });

      if (!response.ok) throw new Error('Failed to load assignments');

      const { data } = await response.json();
      setAssignments(data);
      setError('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function submitQuiz() {
    if (!selectedAssignment) return;

    try {
      setSubmittingQuiz(true);
      const response = await fetch(`/api/assignments/${selectedAssignment.id}/submit`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ answers: quizAnswers }),
      });

      if (!response.ok) throw new Error('Failed to submit quiz');

      const { assignment } = await response.json();
      setSelectedAssignment(assignment);
      setQuizAnswers({});
      await fetchAssignments(token);
    } catch (err) {
      alert('Failed to submit quiz');
    } finally {
      setSubmittingQuiz(false);
    }
  }

  const filteredAssignments = assignments.filter((a) => {
    const statusMatch = filterStatus === 'all' || a.submissionStatus === filterStatus;
    const typeMatch = filterType === 'all' || a.type === filterType;
    return statusMatch && typeMatch;
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

  return (
    <div className="min-h-screen bg-black flex flex-col">
      <Navigation />

      {/* Hero */}
      <div className="bg-black border-b-2 border-green-500 text-white py-12">
        <div className="max-w-7xl mx-auto px-4">
          <h1 className="text-5xl font-bold mb-2 text-yellow-400">📝 Assignments & Quizzes</h1>
          <p className="text-green-400">Test your knowledge and submit assignments</p>
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 max-w-7xl mx-auto w-full px-4 py-8">
        {error && (
          <div className="bg-red-950 border-2 border-red-500 text-red-200 px-4 py-4 rounded-lg mb-6">
            ❌ {error}
          </div>
        )}

        {assignments.length === 0 ? (
          <div className="text-center py-12">
            <span className="text-6xl mb-4 block">📋</span>
            <p className="text-xl text-white mb-4">No assignments yet</p>
            <p className="text-green-400 mb-6">Assignments will be available in your courses</p>
            <Link
              href="/my-sessions"
              className="bg-green-600 hover:bg-yellow-400 hover:text-black text-white px-6 py-2 rounded-lg font-semibold border-2 border-green-500 transition-all"
            >
              View My Courses
            </Link>
          </div>
        ) : (
          <div>
            {/* Filters */}
            <div className="bg-black border-2 border-green-500 p-6 rounded-lg mb-8">
              <h2 className="text-yellow-400 font-bold text-lg mb-4">Filter</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="bg-black border-2 border-green-500 text-white px-4 py-2 rounded-lg"
                >
                  <option value="all">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="submitted">Submitted</option>
                  <option value="graded">Graded</option>
                </select>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="bg-black border-2 border-green-500 text-white px-4 py-2 rounded-lg"
                >
                  <option value="all">All Types</option>
                  <option value="assignment">Assignments</option>
                  <option value="quiz">Quizzes</option>
                </select>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-black border-2 border-green-500 p-6 rounded-lg">
                <p className="text-green-400 text-sm">Total</p>
                <p className="text-3xl font-bold text-yellow-400">{assignments.length}</p>
              </div>
              <div className="bg-black border-2 border-green-500 p-6 rounded-lg">
                <p className="text-green-400 text-sm">Pending</p>
                <p className="text-3xl font-bold text-yellow-400">
                  {assignments.filter((a) => a.submissionStatus === 'pending').length}
                </p>
              </div>
              <div className="bg-black border-2 border-green-500 p-6 rounded-lg">
                <p className="text-green-400 text-sm">Submitted</p>
                <p className="text-3xl font-bold text-yellow-400">
                  {assignments.filter((a) => a.submissionStatus === 'submitted').length}
                </p>
              </div>
              <div className="bg-black border-2 border-green-500 p-6 rounded-lg">
                <p className="text-green-400 text-sm">Graded</p>
                <p className="text-3xl font-bold text-yellow-400">
                  {assignments.filter((a) => a.submissionStatus === 'graded').length}
                </p>
              </div>
            </div>

            {/* Assignments List */}
            <div className="space-y-4">
              {filteredAssignments.map((assignment) => {
                const isOverdue = new Date(assignment.dueDate) < new Date() && assignment.submissionStatus === 'pending';
                return (
                  <div
                    key={assignment.id}
                    className="bg-black border-2 border-green-500 rounded-lg p-6 group hover:border-yellow-400 hover:shadow-xl hover:shadow-green-500/50 transition-all cursor-pointer"
                    onClick={() => setSelectedAssignment(assignment)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-2xl">
                            {assignment.type === 'quiz' ? '❓' : '📝'}
                          </span>
                          <h3 className="font-bold text-yellow-400 text-lg">
                            {assignment.title}
                          </h3>
                        </div>
                        <p className="text-white mb-3">{assignment.description}</p>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-green-400">Course</p>
                            <p className="text-white">{assignment.courseTitle}</p>
                          </div>
                          <div>
                            <p className="text-green-400">Due Date</p>
                            <p className={`${isOverdue ? 'text-red-400' : 'text-white'}`}>
                              {new Date(assignment.dueDate).toLocaleDateString()}
                            </p>
                          </div>
                          <div>
                            <p className="text-green-400">Points</p>
                            <p className="text-white">{assignment.totalPoints}</p>
                          </div>
                          <div>
                            <p className="text-green-400">Status</p>
                            <p className={`font-bold ${
                              assignment.submissionStatus === 'pending' ? 'text-yellow-400' :
                              assignment.submissionStatus === 'submitted' ? 'text-blue-400' :
                              'text-green-400'
                            }`}>
                              {assignment.submissionStatus.toUpperCase()}
                            </p>
                          </div>
                        </div>
                      </div>

                      {assignment.submissionStatus === 'graded' && assignment.score !== undefined && (
                        <div className="ml-6 text-center">
                          <p className="text-green-400 text-sm">Score</p>
                          <p className="text-3xl font-bold text-yellow-400">
                            {assignment.score}/{assignment.totalPoints}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Assignment Detail Modal */}
      {selectedAssignment && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-black border-2 border-green-500 rounded-lg max-w-2xl w-full my-8">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-yellow-400">
                  {selectedAssignment.type === 'quiz' ? '❓' : '📝'} {selectedAssignment.title}
                </h2>
                <button
                  onClick={() => {
                    setSelectedAssignment(null);
                    setQuizAnswers({});
                  }}
                  className="text-green-400 hover:text-yellow-400 text-2xl font-bold"
                >
                  ✕
                </button>
              </div>

              <p className="text-white mb-6">{selectedAssignment.description}</p>

              {/* Quiz Questions */}
              {selectedAssignment.type === 'quiz' && selectedAssignment.submissionStatus === 'pending' && (
                <div className="space-y-6 mb-6">
                  {selectedAssignment.questions?.map((question, idx) => (
                    <div key={question.id} className="bg-green-900/20 border border-green-500 p-4 rounded-lg">
                      <p className="text-white font-bold mb-3">
                        Q{idx + 1}: {question.question} ({question.points} pts)
                      </p>

                      {question.type === 'multiple-choice' && question.options && (
                        <div className="space-y-2">
                          {question.options.map((option, optIdx) => (
                            <label key={optIdx} className="flex items-center gap-3 cursor-pointer">
                              <input
                                type="radio"
                                name={question.id}
                                value={option}
                                checked={quizAnswers[question.id] === option}
                                onChange={(e) => setQuizAnswers({
                                  ...quizAnswers,
                                  [question.id]: e.target.value,
                                })}
                                className="w-4 h-4"
                              />
                              <span className="text-green-400">{option}</span>
                            </label>
                          ))}
                        </div>
                      )}

                      {(question.type === 'short-answer' || question.type === 'essay') && (
                        <textarea
                          value={quizAnswers[question.id] || ''}
                          onChange={(e) => setQuizAnswers({
                            ...quizAnswers,
                            [question.id]: e.target.value,
                          })}
                          placeholder="Enter your answer..."
                          className="w-full bg-black border-2 border-green-500 text-white px-3 py-2 rounded"
                          rows={question.type === 'essay' ? 4 : 2}
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Graded Results */}
              {selectedAssignment.submissionStatus === 'graded' && (
                <div className="bg-green-900/20 border border-green-500 p-6 rounded-lg mb-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-green-400">Your Score</p>
                      <p className="text-3xl font-bold text-yellow-400">
                        {selectedAssignment.score}/{selectedAssignment.totalPoints}
                      </p>
                    </div>
                    <div>
                      <p className="text-green-400">Percentage</p>
                      <p className="text-3xl font-bold text-yellow-400">
                        {Math.round(((selectedAssignment.score || 0) / selectedAssignment.totalPoints) * 100)}%
                      </p>
                    </div>
                  </div>

                  {selectedAssignment.feedback && (
                    <div>
                      <p className="text-green-400 font-bold mb-2">Instructor Feedback:</p>
                      <p className="text-white">{selectedAssignment.feedback}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3">
                {selectedAssignment.type === 'quiz' && selectedAssignment.submissionStatus === 'pending' && (
                  <button
                    onClick={submitQuiz}
                    disabled={submittingQuiz}
                    className="flex-1 bg-green-600 hover:bg-yellow-400 hover:text-black text-white px-4 py-2 rounded font-semibold border-2 border-green-500 transition-all disabled:opacity-50"
                  >
                    {submittingQuiz ? '⏳ Submitting...' : '✓ Submit Quiz'}
                  </button>
                )}
                <button
                  onClick={() => {
                    setSelectedAssignment(null);
                    setQuizAnswers({});
                  }}
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
