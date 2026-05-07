'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { ArrowLeft, Award, Download, Trash2, Save, Loader, AlertCircle, Plus } from 'lucide-react';

interface Certificate {
  enrollmentId: string;
  userId: { _id: string; name: string; email: string };
  courseId: { _id: string; content: { en: { title: string } } };
  certificateUrl: string;
  certificateIssuedAt: string;
}

interface Course {
  _id: string;
  content: { en: { title: string } };
}

interface Enrollment {
  _id: string;
  userId: { name: string; email: string };
  status: string;
  progress: number;
  certificateIssued: boolean;
}

export default function CertificatesPage({ params }: { params: { courseId: string } }) {
  const token = useAuth();
  const { courseId } = params;

  const [course, setCourse] = useState<Course | null>(null);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedEnrollment, setSelectedEnrollment] = useState('');
  const [certificateUrl, setCertificateUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    if (!token || !courseId) return;

    try {
      setLoading(true);
      const [courseRes, certRes, enrollRes] = await Promise.all([
        fetch('/api/admin/recorded-courses', { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/admin/e-learning/certificates?courseId=${courseId}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/admin/e-learning/enrollments?courseId=${courseId}`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      const [courseData, certData, enrollData] = await Promise.all([
        courseRes.json(),
        certRes.json(),
        enrollRes.json(),
      ]);

      if (courseData.success) {
        const found = courseData.courses?.find((c: Course) => c._id === courseId);
        setCourse(found || null);
      }

      if (certData.success) {
        setCertificates(certData.certificates || []);
      }

      if (enrollData.success) {
        setEnrollments(enrollData.enrollments || []);
      }
    } catch (err) {
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [token, courseId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleIssueCertificate = async () => {
    if (!token || !selectedEnrollment || !certificateUrl) return;

    setSaving(true);
    try {
      const res = await fetch('/api/admin/e-learning/certificates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          enrollmentId: selectedEnrollment,
          certificateUrl,
        }),
      });

      if (res.ok) {
        await fetchData();
        setSelectedEnrollment('');
        setCertificateUrl('');
        setShowForm(false);
      } else {
        setError('Failed to issue certificate');
      }
    } catch (err) {
      setError('Error issuing certificate');
    } finally {
      setSaving(false);
    }
  };

  const handleRevoke = async (enrollmentId: string) => {
    if (!token || !confirm('Revoke this certificate?')) return;

    try {
      const res = await fetch(`/api/admin/e-learning/certificates?id=${enrollmentId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        await fetchData();
      }
    } catch (err) {
      setError('Error revoking certificate');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader className="w-8 h-8 animate-spin text-green-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black p-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link href={`/admin/crm/e-learning`} className="p-2 hover:bg-gray-800 rounded-lg text-gray-400">
          <ArrowLeft size={24} />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-white">{course?.content.en.title || 'Course'} - Certificates</h1>
          <p className="text-sm text-gray-400">{certificates.length} issued • {enrollments.filter(e => !e.certificateIssued && e.status === 'active').length} pending</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-green-500 hover:bg-green-600 text-black font-semibold rounded-lg"
        >
          <Plus size={18} />
          Issue Certificate
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-lg mb-6 flex items-center gap-2">
          <AlertCircle size={20} />
          {error}
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div className="bg-gray-900/50 rounded-xl border border-gray-800 p-6 mb-6">
          <h2 className="text-lg font-bold text-white mb-4">Issue Certificate</h2>
          <div className="space-y-4">
            <select
              value={selectedEnrollment}
              onChange={(e) => setSelectedEnrollment(e.target.value)}
              className="w-full px-4 py-2 bg-black border border-gray-700 rounded-lg text-white focus:border-green-500 focus:outline-none"
            >
              <option value="">Select student...</option>
              {enrollments
                .filter((e) => !e.certificateIssued && e.status === 'completed')
                .map((e) => (
                  <option key={e._id} value={e._id}>
                    {e.userId.name} ({e.userId.email}) - {e.progress}%
                  </option>
                ))}
            </select>

            <input
              type="text"
              value={certificateUrl}
              onChange={(e) => setCertificateUrl(e.target.value)}
              placeholder="Certificate URL or file path"
              className="w-full px-4 py-2 bg-black border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-green-500 focus:outline-none"
            />

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowForm(false);
                  setSelectedEnrollment('');
                  setCertificateUrl('');
                }}
                className="flex-1 px-4 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleIssueCertificate}
                disabled={saving || !selectedEnrollment || !certificateUrl}
                className="flex-1 px-4 py-2 bg-green-500 hover:bg-green-600 text-black font-semibold rounded-lg flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {saving ? <Loader className="w-4 h-4 animate-spin" /> : <Save size={18} />}
                {saving ? 'Issuing...' : 'Issue Certificate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Issued Certificates */}
      <div className="mb-8">
        <h2 className="text-lg font-bold text-white mb-4">Issued Certificates ({certificates.length})</h2>
        <div className="space-y-3">
          {certificates.length === 0 ? (
            <div className="text-center py-8 bg-gray-900/50 rounded-xl border border-gray-800">
              <Award className="w-12 h-12 text-gray-600 mx-auto mb-2" />
              <p className="text-gray-400">No certificates issued yet</p>
            </div>
          ) : (
            certificates.map((cert) => (
              <div key={cert.enrollmentId} className="bg-gray-900/50 rounded-xl border border-gray-800 p-4 hover:bg-gray-800/50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Award size={18} className="text-yellow-400" />
                      <h3 className="font-medium text-white">{cert.userId.name}</h3>
                    </div>
                    <p className="text-sm text-gray-400 mb-2">{cert.userId.email}</p>
                    <p className="text-xs text-gray-500">
                      Issued: {new Date(cert.certificateIssuedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <a
                      href={cert.certificateUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-2 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 rounded-lg transition-colors flex items-center gap-2"
                    >
                      <Download size={16} />
                      View
                    </a>
                    <button
                      onClick={() => handleRevoke(cert.enrollmentId)}
                      className="px-3 py-2 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Pending Completions */}
      <div>
        <h2 className="text-lg font-bold text-white mb-4">
          Pending Completions ({enrollments.filter(e => !e.certificateIssued && e.status === 'completed').length})
        </h2>
        <div className="space-y-2">
          {enrollments
            .filter((e) => !e.certificateIssued && e.status === 'completed')
            .map((e) => (
              <div key={e._id} className="bg-gray-900/50 rounded-lg border border-gray-800 p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-white">{e.userId.name}</p>
                    <p className="text-sm text-gray-400">{e.userId.email}</p>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedEnrollment(e._id);
                      setShowForm(true);
                    }}
                    className="px-4 py-2 bg-green-500/20 text-green-400 hover:bg-green-500/30 rounded-lg text-sm"
                  >
                    Issue Now
                  </button>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
