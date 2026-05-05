'use client';

import React, { useState } from 'react';
import { MessageSquare, Loader, Send, Trash2 } from 'lucide-react';

interface Submission {
  _id: string;
  category: 'experiences' | 'tips' | 'transformations' | 'questions';
  status: 'pending' | 'approved' | 'rejected' | 'posted';
  participantName?: string;
  userName?: string;
  workshopName?: string;
  batchName?: string;
  createdAt: string;
  experienceDetails?: string;
  problemHeading?: string;
  problemDescription?: string;
  tipsDetails?: string;
  beforeStory?: string;
  afterStory?: string;
  question?: string;
  answer?: string;
  imageUrl?: string;
  source?: string;
}

interface SubmissionsCounts {
  pending: number;
  approved: number;
  rejected: number;
  posted: number;
}

interface SubmissionsPanelProps {
  submissions: Submission[];
  loading: boolean;
  activeTab: string;
  counts: SubmissionsCounts;
  currentFilter: 'pending' | 'approved' | 'rejected' | 'posted' | 'all';
  onFilterChange: (filter: string) => void;
  onFetchSubmissions: (filter?: string) => void;
  onCreatePost: (submission: Submission) => void;
  onApprove: (submissionId: string, source: string) => void;
  onReject: (submissionId: string, source: string) => void;
  onDelete: (submissionId: string, source: string) => void;
}

export const SubmissionsPanel: React.FC<SubmissionsPanelProps> = ({
  submissions,
  loading,
  activeTab,
  counts,
  currentFilter,
  onFilterChange,
  onFetchSubmissions,
  onCreatePost,
  onApprove,
  onReject,
  onDelete,
}) => {
  if (activeTab !== 'submissions') return null;

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'experiences':
        return '✨';
      case 'tips':
        return '💡';
      case 'transformations':
        return '🦋';
      case 'questions':
        return '❓';
      default:
        return '📝';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'experiences':
        return 'bg-purple-50 border-purple-100';
      case 'tips':
        return 'bg-yellow-50 border-yellow-100';
      case 'transformations':
        return 'bg-emerald-50 border-emerald-100';
      case 'questions':
        return 'bg-indigo-50 border-indigo-100';
      default:
        return 'bg-gray-50 border-gray-100';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-orange-100 text-orange-700';
      case 'approved':
        return 'bg-green-100 text-green-700';
      case 'rejected':
        return 'bg-red-100 text-red-700';
      case 'posted':
        return 'bg-indigo-100 text-indigo-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="flex-1 overflow-auto bg-slate-50/80 p-6">
      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900">📝 User Submissions</h3>
            <p className="text-sm text-slate-500">Review and approve community content from users</p>
          </div>
          <div className="flex gap-3">
            <select
              value={currentFilter}
              onChange={(e) => { onFilterChange(e.target.value); onFetchSubmissions(e.target.value); }}
              className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none"
            >
              <option value="pending">⏳ Pending ({counts.pending})</option>
              <option value="approved">✅ Approved ({counts.approved})</option>
              <option value="rejected">❌ Rejected ({counts.rejected})</option>
              <option value="posted">📤 Posted ({counts.posted})</option>
              <option value="all">All</option>
            </select>
            <button
              onClick={() => onFetchSubmissions()}
              className="px-4 py-2 bg-slate-50 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-100 transition-all flex items-center gap-2"
            >
              <Loader size={16} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center h-80 space-y-4">
          <div className="w-10 h-10 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin" />
          <p className="text-sm text-slate-500">Loading submissions...</p>
        </div>
      ) : submissions.length === 0 ? (
        <div className="bg-white rounded-[2.5rem] border border-slate-200/60 h-[400px] flex flex-col items-center justify-center text-center p-20 shadow-sm">
          <MessageSquare size={48} className="text-slate-200 mb-6" />
          <h3 className="text-xl font-bold text-slate-900 mb-2">No Submissions</h3>
          <p className="text-slate-500 text-sm">No user submissions found for this filter.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {submissions.map((sub: Submission) => (
            <div key={sub._id} className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
              <div className={`px-6 py-4 border-b flex items-center justify-between ${getCategoryColor(sub.category)}`}>
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{getCategoryIcon(sub.category)}</span>
                  <div>
                    <h4 className="font-bold text-slate-900 capitalize">{sub.category}</h4>
                    <p className="text-xs text-slate-500">
                      by {sub.userName || sub.participantName} • {new Date(sub.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(sub.status)}`}>
                  {sub.status.toUpperCase()}
                </span>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-3 gap-4 mb-4 text-sm">
                  <div><span className="text-slate-500">Name:</span> <strong>{sub.participantName}</strong></div>
                  {sub.workshopName && <div><span className="text-slate-500">Workshop:</span> <strong>{sub.workshopName}</strong></div>}
                  {sub.batchName && <div><span className="text-slate-500">Batch:</span> <strong>{sub.batchName}</strong></div>}
                </div>

                {/* Category-specific content */}
                {sub.category === 'experiences' && sub.experienceDetails && (
                  <div className="bg-purple-50 rounded-xl p-4 mb-4">
                    <h5 className="text-sm font-bold text-purple-700 mb-2">Experience Story</h5>
                    <p className="text-sm text-slate-700 whitespace-pre-wrap">{sub.experienceDetails}</p>
                  </div>
                )}

                {sub.category === 'tips' && (
                  <div className="bg-yellow-50 rounded-xl p-4 mb-4 space-y-3">
                    {sub.problemHeading && <h5 className="text-lg font-bold text-yellow-800">{sub.problemHeading}</h5>}
                    {sub.problemDescription && <p className="text-sm text-slate-600">{sub.problemDescription}</p>}
                    {sub.tipsDetails && (
                      <div className="pt-2 border-t border-yellow-200">
                        <h6 className="text-sm font-bold text-yellow-700 mb-1">Tips & Tricks</h6>
                        <p className="text-sm text-slate-700 whitespace-pre-wrap">{sub.tipsDetails}</p>
                      </div>
                    )}
                  </div>
                )}

                {sub.category === 'transformations' && (
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="bg-red-50 rounded-xl p-4">
                      <h5 className="text-sm font-bold text-red-700 mb-2">⬅️ Before</h5>
                      <p className="text-sm text-slate-700 whitespace-pre-wrap">{sub.beforeStory}</p>
                    </div>
                    <div className="bg-green-50 rounded-xl p-4">
                      <h5 className="text-sm font-bold text-green-700 mb-2">➡️ After</h5>
                      <p className="text-sm text-slate-700 whitespace-pre-wrap">{sub.afterStory}</p>
                    </div>
                  </div>
                )}

                {sub.category === 'questions' && sub.question && (
                  <div className="bg-indigo-50 rounded-xl p-4 mb-4">
                    <h5 className="text-sm font-bold text-indigo-700 mb-2">❓ Question</h5>
                    <p className="text-sm text-slate-700 whitespace-pre-wrap">{sub.question}</p>
                    {sub.answer && (
                      <div className="mt-3 pt-3 border-t border-indigo-200">
                        <h6 className="text-sm font-bold text-green-700 mb-1">✅ Answer</h6>
                        <p className="text-sm text-slate-700 whitespace-pre-wrap">{sub.answer}</p>
                      </div>
                    )}
                  </div>
                )}

                {sub.imageUrl && (
                  <div className="mb-4">
                    <img src={sub.imageUrl} alt="Submission" className="max-h-48 rounded-xl object-cover" />
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-3 pt-4 border-t">
                  {sub.status === 'pending' && (
                    <>
                      <button
                        onClick={() => onCreatePost(sub)}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-all flex items-center gap-2"
                      >
                        <Send size={16} />
                        Create Post
                      </button>
                      <button
                        onClick={() => onApprove(sub._id, sub.source || '')}
                        className="px-4 py-2 bg-green-100 text-green-700 rounded-xl font-bold text-sm hover:bg-green-200 transition-all"
                      >
                        ✅ Approve
                      </button>
                      <button
                        onClick={() => onReject(sub._id, sub.source || '')}
                        className="px-4 py-2 bg-red-100 text-red-700 rounded-xl font-bold text-sm hover:bg-red-200 transition-all"
                      >
                        ❌ Reject
                      </button>
                    </>
                  )}
                  {sub.status === 'approved' && (
                    <button
                      onClick={() => onCreatePost(sub)}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-all flex items-center gap-2"
                    >
                      <Send size={16} />
                      Create Post
                    </button>
                  )}
                  <button
                    onClick={() => onDelete(sub._id, sub.source || '')}
                    className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-200 transition-all ml-auto"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
