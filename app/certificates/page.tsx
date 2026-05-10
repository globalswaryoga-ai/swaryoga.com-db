'use client';

import React, { useState, useEffect } from 'react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import Link from 'next/link';

interface Certificate {
  enrollmentId: string;
  certificateNumber: string;
  courseTitle: string;
  courseInstructor: string;
  completionDate: string;
  certificateIssuedAt: string;
  progress: number;
}

export default function CertificatesPage() {
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [token, setToken] = useState('');
  const [selectedCert, setSelectedCert] = useState<Certificate | null>(null);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (!storedToken) {
      setError('Please log in to view your certificates');
      setLoading(false);
      return;
    }
    setToken(storedToken);
    fetchCertificates(storedToken);
  }, []);

  async function fetchCertificates(authToken: string) {
    try {
      setLoading(true);
      const response = await fetch('/api/user/certificates', {
        headers: { 'Authorization': `Bearer ${authToken}` },
      });

      if (!response.ok) throw new Error('Failed to load certificates');

      const { data } = await response.json();
      setCertificates(data);
      setError('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function downloadCertificate(enrollmentId: string) {
    try {
      const response = await fetch(`/api/recorded-courses/certificate/${enrollmentId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to download');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Certificate_${enrollmentId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Failed to download certificate');
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

  if (!token) {
    return (
      <div className="min-h-screen bg-black flex flex-col">
        <Navigation />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-xl text-white mb-4">Please log in to view your certificates</p>
            <Link
              href="/signin"
              className="bg-green-600 hover:bg-yellow-400 hover:text-black text-white px-6 py-2 rounded-lg font-semibold border-2 border-green-500 transition-all duration-300"
            >
              Go to Sign In
            </Link>
          </div>
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
          <h1 className="text-5xl font-bold mb-2 text-yellow-400">🏆 My Certificates</h1>
          <p className="text-green-400">Celebrate your learning achievements</p>
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 max-w-7xl mx-auto w-full px-4 py-8">
        {error && (
          <div className="bg-red-950 border-2 border-red-500 text-red-200 px-4 py-4 rounded-lg mb-6">
            ❌ {error}
          </div>
        )}

        {certificates.length === 0 ? (
          <div className="text-center py-12">
            <span className="text-6xl mb-4 block">📜</span>
            <p className="text-xl text-white mb-4">No certificates yet</p>
            <p className="text-green-400 mb-6">Complete your first course to earn a certificate</p>
            <Link
              href="/my-sessions"
              className="bg-green-600 hover:bg-yellow-400 hover:text-black text-white px-6 py-2 rounded-lg font-semibold border-2 border-green-500 transition-all duration-300"
            >
              View My Courses
            </Link>
          </div>
        ) : (
          <div>
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <div className="bg-black border-2 border-green-500 p-6 rounded-lg">
                <p className="text-green-400 text-sm">Total Certificates</p>
                <p className="text-3xl font-bold text-yellow-400">{certificates.length}</p>
              </div>
              <div className="bg-black border-2 border-green-500 p-6 rounded-lg">
                <p className="text-green-400 text-sm">Courses Completed</p>
                <p className="text-3xl font-bold text-yellow-400">{certificates.length}</p>
              </div>
              <div className="bg-black border-2 border-green-500 p-6 rounded-lg">
                <p className="text-green-400 text-sm">Latest Achievement</p>
                <p className="text-yellow-400 font-semibold">
                  {certificates.length > 0
                    ? new Date(certificates[0].certificateIssuedAt).toLocaleDateString()
                    : 'N/A'}
                </p>
              </div>
            </div>

            {/* Certificates Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {certificates.map((cert) => (
                <div
                  key={cert.enrollmentId}
                  className="bg-black border-2 border-green-500 rounded-lg overflow-hidden group hover:border-yellow-400 hover:shadow-xl hover:shadow-green-500/50 transition-all duration-300"
                >
                  {/* Certificate Preview */}
                  <div className="h-48 bg-gradient-to-br from-green-900 to-black flex items-center justify-center relative overflow-hidden">
                    <div className="text-center">
                      <p className="text-5xl mb-2">🏆</p>
                      <p className="text-yellow-400 font-bold text-lg">Certificate of</p>
                      <p className="text-green-400 font-semibold">Completion</p>
                    </div>
                  </div>

                  {/* Certificate Details */}
                  <div className="p-4">
                    <h3 className="font-bold text-yellow-400 mb-2 line-clamp-2">
                      {cert.courseTitle}
                    </h3>

                    <div className="space-y-2 text-sm mb-4 pb-4 border-b border-green-500">
                      <div className="flex justify-between">
                        <span className="text-green-400">Instructor</span>
                        <span className="text-white">{cert.courseInstructor}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-green-400">Issued</span>
                        <span className="text-white">
                          {new Date(cert.certificateIssuedAt).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-green-400">Certificate #</span>
                        <span className="text-white font-mono text-xs">{cert.certificateNumber}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="space-y-2">
                      <button
                        onClick={() => downloadCertificate(cert.enrollmentId)}
                        className="w-full bg-green-600 hover:bg-yellow-400 hover:text-black text-white px-4 py-2 rounded font-semibold border-2 border-green-500 transition-all duration-300"
                      >
                        📥 Download PDF
                      </button>
                      <button
                        onClick={() => setSelectedCert(cert)}
                        className="w-full bg-transparent hover:bg-green-900 text-green-400 px-4 py-2 rounded font-semibold border-2 border-green-500 transition-all duration-300"
                      >
                        👁️ Preview
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Certificate Preview Modal */}
      {selectedCert && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-black border-2 border-green-500 rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-yellow-400">Certificate Preview</h2>
                <button
                  onClick={() => setSelectedCert(null)}
                  className="text-green-400 hover:text-yellow-400 text-2xl font-bold transition-colors"
                >
                  ✕
                </button>
              </div>

              {/* Certificate Preview Content */}
              <div className="bg-gradient-to-br from-green-900 to-black p-8 rounded-lg text-center border-2 border-yellow-400">
                <div className="mb-8">
                  <p className="text-6xl mb-4">🏆</p>
                  <p className="text-4xl font-bold text-yellow-400 mb-2">Certificate of Completion</p>
                </div>

                <div className="bg-black border-2 border-green-500 p-6 rounded-lg mb-8">
                  <p className="text-green-400 text-sm mb-2">This certifies that</p>
                  <p className="text-white font-bold text-2xl mb-4">You</p>
                  <p className="text-green-400 text-sm mb-4">has successfully completed</p>
                  <p className="text-yellow-400 font-bold text-xl mb-6">{selectedCert.courseTitle}</p>

                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between text-white">
                      <span>Instructor:</span>
                      <span className="text-green-400">{selectedCert.courseInstructor}</span>
                    </div>
                    <div className="flex justify-between text-white">
                      <span>Completion Date:</span>
                      <span className="text-green-400">
                        {new Date(selectedCert.certificateIssuedAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                    <div className="flex justify-between text-white">
                      <span>Certificate No:</span>
                      <span className="text-green-400 font-mono">{selectedCert.certificateNumber}</span>
                    </div>
                  </div>
                </div>

                <p className="text-green-400 text-xs">
                  Verify at: swaryoga.com/verify/{selectedCert.certificateNumber}
                </p>
              </div>

              <div className="mt-6 flex gap-4">
                <button
                  onClick={() => downloadCertificate(selectedCert.enrollmentId)}
                  className="flex-1 bg-green-600 hover:bg-yellow-400 hover:text-black text-white px-4 py-3 rounded font-semibold border-2 border-green-500 transition-all duration-300"
                >
                  📥 Download PDF
                </button>
                <button
                  onClick={() => setSelectedCert(null)}
                  className="flex-1 bg-transparent hover:bg-green-900 text-green-400 px-4 py-3 rounded font-semibold border-2 border-green-500 transition-all duration-300"
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
