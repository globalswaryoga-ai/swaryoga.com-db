import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Star, Users, Clock, DollarSign, Filter } from 'lucide-react';
import axios from 'axios';
import WorkshopModeBadge from '../components/WorkshopModeBadge';

interface Workshop {
  _id: string;
  title: string;
  category: string;
  thumbnail: string;
  level: string;
  averageRating: number;
  totalReviews: number;
  totalEnrollments: number;
  duration: number;
  languages: string[];
  batches: any[];
  slug: string;
  description: string;
}

export default function WorkshopListPage() {
  const navigate = useNavigate();
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('');
  const [filteredWorkshops, setFilteredWorkshops] = useState<Workshop[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 18;

  const categories = [
    'basic',
    'L1',
    'L2',
    'L3',
    'L4',
    'weight-loss',
    'meditation',
    'youth',
    'children',
    'pre-pregnancy',
    'bandhan-mukti',
    'amrut-aahar',
    'business',
    'corporate'
  ];

  const languages = ['hindi', 'marathi', 'english'];

  useEffect(() => {
    fetchWorkshops();
  }, []);

  const fetchWorkshops = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/workshops?isPublished=true');
      const data = response.data.data || response.data;
      setWorkshops(Array.isArray(data) ? data : []);
      setFilteredWorkshops(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching workshops:', error);
      setWorkshops([]);
      setFilteredWorkshops([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let filtered = workshops;

    if (selectedCategory) {
      filtered = filtered.filter((w) => w.category === selectedCategory);
    }

    if (selectedLanguage) {
      filtered = filtered.filter((w) => w.languages?.includes(selectedLanguage));
    }

    setFilteredWorkshops(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  }, [selectedCategory, selectedLanguage, workshops]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading workshops...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 text-white py-12">
        <div className="max-w-7xl mx-auto px-4">
          <h1 className="text-4xl font-bold mb-2">Swar Yoga Workshops</h1>
          <p className="text-indigo-100">Explore our comprehensive collection of courses</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Filters */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-semibold text-gray-800">Filters</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Category Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
              >
                <option value="">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            {/* Language Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Language
              </label>
              <select
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
              >
                <option value="">All Languages</option>
                {languages.map((lang) => (
                  <option key={lang} value={lang}>
                    {lang.charAt(0).toUpperCase() + lang.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Workshops Grid */}
        {filteredWorkshops.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600 text-lg">No workshops found matching your filters.</p>
          </div>
        ) : (
          <>
            {/* Results Count */}
            <div className="mb-6">
              <p className="text-gray-600">
                Showing <strong>{(currentPage - 1) * itemsPerPage + 1}</strong> to <strong>{Math.min(currentPage * itemsPerPage, filteredWorkshops.length)}</strong> of <strong>{filteredWorkshops.length}</strong> workshops
              </p>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {filteredWorkshops
                .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                .map((workshop) => (
              <div
                key={workshop._id}
                className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow overflow-hidden cursor-pointer"
                onClick={() => navigate(`/workshops/${workshop.slug || workshop._id}`)}
              >
                {/* Thumbnail */}
                <div className="relative h-48 bg-gray-200 overflow-hidden">
                  <img
                    src={workshop.thumbnail}
                    alt={workshop.title}
                    className="w-full h-full object-cover hover:scale-105 transition-transform"
                  />
                  {/* Level Badge */}
                  <div className="absolute top-3 right-3 bg-indigo-600 text-white px-3 py-1 rounded-full text-sm font-medium">
                    {workshop.level}
                  </div>
                  
                  {/* Mode Badges */}
                  {workshop.batches && workshop.batches.length > 0 && (
                    <div className="absolute bottom-3 left-3 flex gap-2 flex-wrap">
                      {Array.from(new Set(workshop.batches.map((b: any) => b.mode))).map((mode) => (
                        <div key={mode} className="w-10 h-10 rounded-full overflow-hidden border-2 border-white shadow-md hover:scale-110 transition-transform">
                          <WorkshopModeBadge mode={mode as any} size="sm" showLabel={false} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-4">
                  <h3 className="text-lg font-bold text-gray-800 mb-2 line-clamp-2">
                    {workshop.title}
                  </h3>

                  {/* Rating */}
                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-4 h-4 ${
                            i < Math.round(workshop.averageRating)
                              ? 'fill-yellow-400 text-yellow-400'
                              : 'text-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-sm text-gray-600">
                      ({workshop.totalReviews} reviews)
                    </span>
                  </div>

                  {/* Meta Info */}
                  <div className="space-y-2 mb-4 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      <span>{workshop.totalEnrollments} enrolled</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      <span>{workshop.duration} days</span>
                    </div>
                  </div>

                  {/* Languages */}
                  <div className="flex flex-wrap gap-1 mb-4">
                    {workshop.languages?.map((lang) => (
                      <span
                        key={lang}
                        className="inline-block bg-indigo-100 text-indigo-700 px-2 py-1 rounded text-xs"
                      >
                        {lang}
                      </span>
                    ))}
                  </div>

                  {/* Price */}
                  {workshop.batches && workshop.batches.length > 0 && (
                    <div className="flex items-center gap-1 text-indigo-600 font-semibold">
                      <DollarSign className="w-4 h-4" />
                      <span>From ₹{Math.min(...workshop.batches.map((b: any) => b.pricing?.INR || 0))}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
            </div>

            {/* Pagination Controls */}
            {filteredWorkshops.length > itemsPerPage && (
              <div className="flex items-center justify-center gap-4 mt-8 pt-8 border-t border-gray-200">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    currentPage === 1
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-indigo-600 text-white hover:bg-indigo-700'
                  }`}
                >
                  ← Previous
                </button>

                {/* Page Numbers */}
                <div className="flex items-center gap-2">
                  {Array.from({
                    length: Math.ceil(filteredWorkshops.length / itemsPerPage),
                  }).map((_, index) => (
                    <button
                      key={index + 1}
                      onClick={() => setCurrentPage(index + 1)}
                      className={`px-3 py-2 rounded-lg font-medium transition-colors ${
                        currentPage === index + 1
                          ? 'bg-indigo-600 text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      {index + 1}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setCurrentPage(Math.min(Math.ceil(filteredWorkshops.length / itemsPerPage), currentPage + 1))}
                  disabled={currentPage === Math.ceil(filteredWorkshops.length / itemsPerPage)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    currentPage === Math.ceil(filteredWorkshops.length / itemsPerPage)
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-indigo-600 text-white hover:bg-indigo-700'
                  }`}
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
