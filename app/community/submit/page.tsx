'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Send, Loader, CheckCircle, Image as ImageIcon, User, BookOpen, Users, Sparkles, Lightbulb, HelpCircle } from 'lucide-react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { getSession } from '@/lib/sessionManager';

type Category = 'experiences' | 'tips' | 'transformations' | 'questions';

const CATEGORIES = [
  { key: 'experiences' as Category, label: 'My Experience', icon: '✨', color: 'purple', description: 'Share your journey and experience with Swar Yoga' },
  { key: 'tips' as Category, label: 'Tips & Tricks', icon: '💡', color: 'yellow', description: 'Share helpful tips that worked for you' },
  { key: 'transformations' as Category, label: 'My Transformation', icon: '🦋', color: 'emerald', description: 'Share your before & after transformation story' },
  { key: 'questions' as Category, label: 'Ask a Question', icon: '❓', color: 'blue', description: 'Have a question? Ask the community' },
];

export default function CommunitySubmitPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  
  // Form state
  const [category, setCategory] = useState<Category | null>(null);
  const [participantName, setParticipantName] = useState('');
  const [workshopName, setWorkshopName] = useState('');
  const [batchName, setBatchName] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  
  // Category-specific fields
  const [experienceDetails, setExperienceDetails] = useState('');
  const [problemHeading, setProblemHeading] = useState('');
  const [problemDescription, setProblemDescription] = useState('');
  const [tipsDetails, setTipsDetails] = useState('');
  const [beforeStory, setBeforeStory] = useState('');
  const [afterStory, setAfterStory] = useState('');
  const [question, setQuestion] = useState('');
  
  useEffect(() => {
    const session = getSession();
    if (session?.user) {
      setUser(session.user);
      setParticipantName(session.user.name || '');
    }
    setLoading(false);
  }, []);
  
  const getToken = () => getSession()?.token || localStorage.getItem('token') || '';
  
  const resetForm = () => {
    setCategory(null);
    setParticipantName(user?.name || '');
    setWorkshopName('');
    setBatchName('');
    setImageUrl('');
    setExperienceDetails('');
    setProblemHeading('');
    setProblemDescription('');
    setTipsDetails('');
    setBeforeStory('');
    setAfterStory('');
    setQuestion('');
  };
  
  const handleSubmit = async () => {
    if (!category) {
      setError('Please select a category');
      return;
    }
    
    const token = getToken();
    if (!token) {
      router.push('/signin?redirect=/community/submit');
      return;
    }
    
    setSubmitting(true);
    setError('');
    
    try {
      const payload = {
        category,
        participantName,
        workshopName,
        batchName,
        imageUrl,
        // Category-specific data
        ...(category === 'experiences' && { experienceDetails }),
        ...(category === 'tips' && { problemHeading, problemDescription, tipsDetails }),
        ...(category === 'transformations' && { beforeStory, afterStory }),
        ...(category === 'questions' && { question }),
      };
      
      const response = await fetch('/api/community/submissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      
      if (response.status === 401) {
        router.push('/signin?redirect=/community/submit');
        return;
      }
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit');
      }
      
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };
  
  const getCategoryColor = (cat: Category) => {
    const colors: Record<Category, { bg: string; border: string; text: string; focusRing: string }> = {
      experiences: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', focusRing: 'focus:ring-purple-300' },
      tips: { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700', focusRing: 'focus:ring-yellow-300' },
      transformations: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', focusRing: 'focus:ring-emerald-300' },
      questions: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', focusRing: 'focus:ring-blue-300' },
    };
    return colors[cat];
  };
  
  if (loading) {
    return (
      <>
        <Navigation />
        <main className="min-h-screen pt-20 bg-gradient-to-b from-swar-bg to-white flex items-center justify-center">
          <Loader className="animate-spin text-swar-primary" size={40} />
        </main>
        <Footer />
      </>
    );
  }
  
  if (submitted) {
    return (
      <>
        <Navigation />
        <main className="min-h-screen pt-20 bg-gradient-to-b from-swar-bg to-white">
          <div className="max-w-2xl mx-auto px-4 py-16 text-center">
            <div className="bg-white rounded-3xl shadow-xl p-12 border border-green-100">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="text-green-600" size={40} />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-4">Thank You!</h1>
              <p className="text-gray-600 mb-8">
                Your submission has been received. Our team will review it and post it to the community soon.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={() => { setSubmitted(false); resetForm(); }}
                  className="px-6 py-3 bg-swar-primary text-white rounded-xl font-semibold hover:bg-swar-primary/90 transition-colors"
                >
                  Submit Another
                </button>
                <Link
                  href="/community"
                  className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
                >
                  Back to Community
                </Link>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </>
    );
  }
  
  return (
    <>
      <Navigation />
      <main className="min-h-screen pt-20 bg-gradient-to-b from-swar-bg to-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
          {/* Header */}
          <div className="mb-8">
            <Link
              href="/community"
              className="inline-flex items-center gap-2 text-swar-primary hover:text-swar-primary/80 mb-4 transition-colors"
            >
              <ArrowLeft size={20} />
              Back to Community
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">Share with Community</h1>
            <p className="text-gray-600 mt-2">
              Share your experiences, tips, transformation stories, or ask questions. Your submission will be reviewed by our team before posting.
            </p>
          </div>
          
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
              {error}
            </div>
          )}
          
          {/* Category Selection */}
          {!category ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.key}
                  onClick={() => setCategory(cat.key)}
                  className={`p-6 rounded-2xl border-2 text-left transition-all hover:shadow-lg hover:-translate-y-1 ${
                    cat.color === 'purple' ? 'border-purple-200 hover:border-purple-400 bg-gradient-to-br from-purple-50 to-indigo-50' :
                    cat.color === 'yellow' ? 'border-yellow-200 hover:border-yellow-400 bg-gradient-to-br from-yellow-50 to-orange-50' :
                    cat.color === 'emerald' ? 'border-emerald-200 hover:border-emerald-400 bg-gradient-to-br from-emerald-50 to-teal-50' :
                    'border-blue-200 hover:border-blue-400 bg-gradient-to-br from-blue-50 to-cyan-50'
                  }`}
                >
                  <div className="text-4xl mb-3">{cat.icon}</div>
                  <h3 className="text-lg font-bold text-gray-900 mb-1">{cat.label}</h3>
                  <p className="text-sm text-gray-600">{cat.description}</p>
                </button>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-3xl shadow-xl border overflow-hidden">
              {/* Category Header */}
              <div className={`p-6 ${getCategoryColor(category).bg} border-b ${getCategoryColor(category).border}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">
                      {CATEGORIES.find(c => c.key === category)?.icon}
                    </span>
                    <div>
                      <h2 className={`text-xl font-bold ${getCategoryColor(category).text}`}>
                        {CATEGORIES.find(c => c.key === category)?.label}
                      </h2>
                      <p className="text-sm text-gray-600">
                        {CATEGORIES.find(c => c.key === category)?.description}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setCategory(null)}
                    className="text-gray-500 hover:text-gray-700 text-sm font-medium"
                  >
                    Change
                  </button>
                </div>
              </div>
              
              {/* Form */}
              <div className="p-6 space-y-6">
                {/* Common Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      <User size={14} className="inline mr-1" />
                      Your Name *
                    </label>
                    <input
                      type="text"
                      value={participantName}
                      onChange={(e) => setParticipantName(e.target.value)}
                      placeholder="Enter your name"
                      className={`w-full h-12 px-4 border rounded-xl text-sm font-medium outline-none focus:ring-2 ${getCategoryColor(category).border} ${getCategoryColor(category).focusRing}`}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      <BookOpen size={14} className="inline mr-1" />
                      Workshop Name
                    </label>
                    <input
                      type="text"
                      value={workshopName}
                      onChange={(e) => setWorkshopName(e.target.value)}
                      placeholder="Which workshop?"
                      className={`w-full h-12 px-4 border rounded-xl text-sm font-medium outline-none focus:ring-2 ${getCategoryColor(category).border} ${getCategoryColor(category).focusRing}`}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      <Users size={14} className="inline mr-1" />
                      Batch Name/Number
                    </label>
                    <input
                      type="text"
                      value={batchName}
                      onChange={(e) => setBatchName(e.target.value)}
                      placeholder="Batch info"
                      className={`w-full h-12 px-4 border rounded-xl text-sm font-medium outline-none focus:ring-2 ${getCategoryColor(category).border} ${getCategoryColor(category).focusRing}`}
                    />
                  </div>
                </div>
                
                {/* Image URL */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    <ImageIcon size={14} className="inline mr-1" />
                    Image URL (Optional)
                  </label>
                  <input
                    type="url"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://example.com/your-image.jpg"
                    className={`w-full h-12 px-4 border rounded-xl text-sm font-medium outline-none focus:ring-2 ${getCategoryColor(category).border} ${getCategoryColor(category).focusRing}`}
                  />
                  <p className="text-xs text-gray-500 mt-1">You can paste a link to your image</p>
                </div>
                
                {/* EXPERIENCES Form */}
                {category === 'experiences' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        <Sparkles size={14} className="inline mr-1" />
                        Your Experience Story *
                      </label>
                      <textarea
                        value={experienceDetails}
                        onChange={(e) => setExperienceDetails(e.target.value)}
                        placeholder="Share your experience... What happened? How did you feel? What changed for you?"
                        rows={6}
                        className="w-full p-4 border border-purple-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-purple-300 resize-none"
                        required
                      />
                    </div>
                  </div>
                )}
                
                {/* TIPS Form */}
                {category === 'tips' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        <Lightbulb size={14} className="inline mr-1" />
                        Tip/Problem Heading *
                      </label>
                      <input
                        type="text"
                        value={problemHeading}
                        onChange={(e) => setProblemHeading(e.target.value)}
                        placeholder="What's the tip about?"
                        className="w-full h-12 px-4 border border-yellow-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-yellow-300"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Problem/Situation Description
                      </label>
                      <textarea
                        value={problemDescription}
                        onChange={(e) => setProblemDescription(e.target.value)}
                        placeholder="Describe the problem or situation..."
                        rows={3}
                        className="w-full p-4 border border-yellow-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-yellow-300 resize-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Tips & Tricks *
                      </label>
                      <textarea
                        value={tipsDetails}
                        onChange={(e) => setTipsDetails(e.target.value)}
                        placeholder="Share your tips and tricks to solve this..."
                        rows={4}
                        className="w-full p-4 border border-yellow-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-yellow-300 resize-none"
                        required
                      />
                    </div>
                  </div>
                )}
                
                {/* TRANSFORMATIONS Form */}
                {category === 'transformations' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-red-600 mb-2">
                          ⬅️ Before (What was your situation before?) *
                        </label>
                        <textarea
                          value={beforeStory}
                          onChange={(e) => setBeforeStory(e.target.value)}
                          placeholder="What challenges did you face? How were things before?"
                          rows={5}
                          className="w-full p-4 bg-red-50 border border-red-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-red-300 resize-none"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-green-600 mb-2">
                          ➡️ After (How are things now?) *
                        </label>
                        <textarea
                          value={afterStory}
                          onChange={(e) => setAfterStory(e.target.value)}
                          placeholder="How have you transformed? What's different now?"
                          rows={5}
                          className="w-full p-4 bg-green-50 border border-green-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-green-300 resize-none"
                          required
                        />
                      </div>
                    </div>
                  </div>
                )}
                
                {/* QUESTIONS Form */}
                {category === 'questions' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        <HelpCircle size={14} className="inline mr-1" />
                        Your Question *
                      </label>
                      <textarea
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                        placeholder="What would you like to ask? Be as detailed as possible..."
                        rows={5}
                        className="w-full p-4 border border-blue-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-300 resize-none"
                        required
                      />
                    </div>
                  </div>
                )}
                
                {/* Submit Button */}
                <div className="pt-4 border-t">
                  <button
                    onClick={handleSubmit}
                    disabled={submitting || !participantName.trim()}
                    className={`w-full h-14 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all ${
                      submitting || !participantName.trim()
                        ? 'bg-gray-300 cursor-not-allowed'
                        : 'bg-swar-primary hover:bg-swar-primary/90 shadow-lg shadow-swar-primary/30'
                    }`}
                  >
                    {submitting ? (
                      <>
                        <Loader className="animate-spin" size={20} />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Send size={20} />
                        Submit for Review
                      </>
                    )}
                  </button>
                  <p className="text-center text-xs text-gray-500 mt-3">
                    Your submission will be reviewed by our team before posting to the community.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
