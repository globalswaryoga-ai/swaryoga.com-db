'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader } from 'lucide-react';

export default function CreateCommunityPostPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: 'experience',
    image: '',
  });

  const categories = [
    { id: 'experience', label: 'Experiences' },
    { id: 'tips', label: 'Tips & Tricks' },
    { id: 'transformation', label: 'Transformation Stories' },
    { id: 'questions', label: 'Questions' },
  ];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Check if user is authenticated
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/signin?redirect=/community/post');
        return;
      }

      const response = await fetch('/api/community/post/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Failed to create post');
      }

      const data = await response.json();
      router.push(`/community/${data.data._id}`);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-swar-bg to-white py-12">
      <div className="container mx-auto px-4 sm:px-6">
        {/* Header */}
        <Link
          href="/community"
          className="inline-flex items-center gap-2 text-swar-primary hover:text-swar-primary-hover mb-8 transition-colors"
        >
          <ArrowLeft size={20} />
          Back to Community
        </Link>

        <div className="max-w-2xl mx-auto">
          <h1 className="text-4xl font-serif text-swar-text mb-8">Create a Post</h1>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-lg p-8 space-y-6">
            {/* Title */}
            <div>
              <label className="block text-sm font-semibold text-swar-text mb-2">
                Title *
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                required
                placeholder="What would you like to share?"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-swar-primary"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-semibold text-swar-text mb-2">
                Category *
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-swar-primary"
              >
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Content */}
            <div>
              <label className="block text-sm font-semibold text-swar-text mb-2">
                Content *
              </label>
              <textarea
                name="content"
                value={formData.content}
                onChange={handleChange}
                required
                placeholder="Share your experience, tip, or question..."
                rows={8}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-swar-primary resize-none"
              />
            </div>

            {/* Image URL */}
            <div>
              <label className="block text-sm font-semibold text-swar-text mb-2">
                Image URL (optional)
              </label>
              <input
                type="url"
                name="image"
                value={formData.image}
                onChange={handleChange}
                placeholder="https://example.com/image.jpg"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-swar-primary"
              />
            </div>

            {/* Buttons */}
            <div className="flex gap-4 pt-6">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-swar-primary hover:bg-swar-primary-hover text-white px-6 py-3 rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading && <Loader size={20} className="animate-spin" />}
                {loading ? 'Publishing...' : 'Publish Post'}
              </button>
              <button
                type="button"
                onClick={() => router.push('/community')}
                className="flex-1 border-2 border-swar-primary text-swar-primary hover:bg-swar-primary-light px-6 py-3 rounded-lg transition-colors font-medium"
              >
                Cancel
              </button>
            </div>
          </form>

          {/* Info Box */}
          <div className="bg-swar-primary-light rounded-lg p-6 mt-8">
            <h3 className="font-semibold text-swar-text mb-3">Community Guidelines</h3>
            <ul className="space-y-2 text-sm text-swar-text-secondary">
              <li>• Be respectful and supportive of other community members</li>
              <li>• Share authentic experiences and genuine insights</li>
              <li>• No spam, advertising, or promotional content</li>
              <li>• Keep posts relevant to yoga and wellness</li>
              <li>• Respect others' privacy and personal information</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
