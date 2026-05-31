'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import AdminSidebar from '@/components/AdminSidebar';

interface LandingPage {
  _id: string;
  slug: string;
  name: string;
  status: 'draft' | 'published' | 'archived';
  heroHeading?: string;
  heroSubheading?: string;
  heroImage?: string;
  heroImageFit?: 'cover' | 'contain' | 'fill' | 'none';
  heroImagePosition?: string;
  heroVideo?: string;
  heroCTA?: string;
  heroCtaLink?: string;
  eventTitle?: string;
  eventDescription?: string;
  startDate?: string;
  endDate?: string;
  eventTime?: string;
  eventTimezone?: string;
  location?: string;
  language?: string;
  pricing?: Array<{
    name: string;
    price: number;
    currency: string;
    originalPrice?: number;
    features: string[];
    isPopular: boolean;
    ctaText: string;
    paymentLink?: string;
  }>;
  instructorName?: string;
  instructorTitle?: string;
  instructorImage?: string;
  instructorBio?: string;
  benefits?: Array<{ icon: string; title: string; description: string }>;
  curriculum?: Array<{ title: string; description: string; duration: string }>;
  testimonials?: Array<{
    name: string;
    image?: string;
    location?: string;
    text: string;
    videoUrl?: string;
    rating?: number;
  }>;
  demoSession?: {
    enabled: boolean;
    title?: string;
    description?: string;
    date?: string;
    time?: string;
    zoomLink?: string;
    zoomId?: string;
    zoomPassword?: string;
  };
  faqs?: Array<{ question: string; answer: string }>;
  gallery?: Array<{ type: 'image' | 'video'; url: string; caption?: string }>;
  theme?: {
    mode: 'light' | 'dark' | 'custom';
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    backgroundColor: string;
    textColor: string;
    fontFamily: string;
  };
  seo?: {
    title?: string;
    description?: string;
    keywords?: string[];
    ogImage?: string;
  };
  integrations?: {
    whatsappNumber?: string;
    whatsappMessage?: string;
    googleAnalyticsId?: string;
    facebookPixelId?: string;
    paymentLink?: string;
  };
  countdown?: {
    enabled: boolean;
    endDate?: string;
    message?: string;
  };
  socialProof?: {
    studentsCount?: number;
    reviewsCount?: number;
    avgRating?: number;
    yearsExperience?: number;
  };
  linkedWorkshopSlug?: string;
  linkedScheduleId?: string;
  views?: number;
  conversions?: number;
  createdAt?: string;
  updatedAt?: string;
  // New World-Class Sections
  problemStatement?: {
    enabled: boolean;
    title?: string;
    subtitle?: string;
    points?: Array<{ icon: string; title: string; description: string }>;
  };
  solution?: {
    enabled: boolean;
    title?: string;
    subtitle?: string;
    description?: string;
    image?: string;
    videoUrl?: string;
    points?: string[];
  };
  howItWorks?: {
    enabled: boolean;
    title?: string;
    subtitle?: string;
    steps?: Array<{ number: number; icon: string; title: string; description: string }>;
  };
  successStories?: Array<{
    name: string;
    title?: string;
    image?: string;
    videoUrl?: string;
    beforeStats?: string;
    afterStats?: string;
    testimonial?: string;
    duration?: string;
  }>;
  bonuses?: Array<{
    title: string;
    description?: string;
    value?: number;
    currency?: string;
    image?: string;
  }>;
  trustBadges?: Array<{ image: string; title?: string; link?: string }>;
  guarantee?: {
    enabled: boolean;
    days?: number;
    title?: string;
    description?: string;
  };
  urgency?: {
    enabled: boolean;
    limitedSeats?: boolean;
    totalSeats?: number;
    seatsRemaining?: number;
    earlyBirdDeadline?: string;
    earlyBirdMessage?: string;
    showLiveCount?: boolean;
  };
  transformation?: {
    enabled: boolean;
    title?: string;
    before?: { title: string; points: string[] };
    after?: { title: string; points: string[] };
  };
  videoSection?: {
    enabled: boolean;
    title?: string;
    description?: string;
    videoUrl?: string;
    thumbnailUrl?: string;
  };
  logo?: { url?: string; altText?: string };
  navigation?: {
    enabled: boolean;
    showLogo?: boolean;
    showLogin?: boolean;
    loginLink?: string;
    links?: Array<{ label: string; href: string }>;
  };
  leadMagnet?: {
    enabled: boolean;
    title?: string;
    subtitle?: string;
    description?: string;
    image?: string;
    downloadUrl?: string;
    buttonText?: string;
  };
  heroQuickBenefits?: Array<{ icon: string; text: string }>;
  heroSecondaryCTA?: {
    enabled: boolean;
    text?: string;
    link?: string;
    icon?: string;
  };
  contactInfo?: {
    email?: string;
    phone?: string;
    address?: string;
    mapEmbed?: string;
  };
  footer?: {
    showAbout?: boolean;
    aboutText?: string;
    socialLinks?: {
      facebook?: string;
      instagram?: string;
      youtube?: string;
      twitter?: string;
      linkedin?: string;
    };
    quickLinks?: Array<{ label: string; href: string }>;
    showPrivacyPolicy?: boolean;
    privacyPolicyLink?: string;
    showTerms?: boolean;
    termsLink?: string;
    showRefundPolicy?: boolean;
    refundPolicyLink?: string;
    copyrightText?: string;
  };
  productDemo?: {
    enabled: boolean;
    title?: string;
    description?: string;
    demoType?: 'video' | 'gif' | 'interactive';
    mediaUrl?: string;
    screenshots?: string[];
  };
  newsletter?: {
    enabled: boolean;
    title?: string;
    subtitle?: string;
    buttonText?: string;
    placeholder?: string;
  };
  comparisonTable?: {
    enabled: boolean;
    title?: string;
    headers?: string[];
    rows?: Array<{ feature: string; values: string[] }>;
  };
  popup?: {
    enabled: boolean;
    type?: 'exit-intent' | 'timer' | 'scroll';
    delay?: number;
    title?: string;
    description?: string;
    ctaText?: string;
    ctaLink?: string;
    image?: string;
  };
  stickyHeader?: {
    enabled: boolean;
    text?: string;
    ctaText?: string;
    ctaLink?: string;
    showCountdown?: boolean;
  };
  announcementBar?: {
    enabled: boolean;
    text?: string;
    link?: string;
    backgroundColor?: string;
    textColor?: string;
  };
  registrationForm?: {
    enabled: boolean;
    title?: string;
    subtitle?: string;
    fields?: Array<{
      name: string;
      type: 'text' | 'email' | 'phone' | 'select' | 'textarea';
      required?: boolean;
      placeholder?: string;
      options?: string[];
    }>;
    submitText?: string;
    successMessage?: string;
  };
  liveNotifications?: {
    enabled: boolean;
    messages?: string[];
  };
}

type EditSection = 'basic' | 'hero' | 'event' | 'pricing' | 'instructor' | 'benefits' | 'curriculum' | 'testimonials' | 'demo' | 'faq' | 'gallery' | 'theme' | 'seo' | 'integrations' | 'countdown' | 'social' | 'problem' | 'solution' | 'howitworks' | 'successstories' | 'bonuses' | 'trust' | 'guarantee' | 'urgency' | 'transformation' | 'video' | 'navigation' | 'leadmagnet' | 'footer' | 'productdemo' | 'newsletter' | 'comparison' | 'popup' | 'sticky' | 'announcement' | 'registration' | 'notifications';

const DEFAULT_THEME = {
  mode: 'light' as const,
  primaryColor: '#FF6B35',
  secondaryColor: '#1E3A5F',
  accentColor: '#FFD700',
  backgroundColor: '#FFFFFF',
  textColor: '#333333',
  fontFamily: 'Inter',
};

const STATUS_COLORS = {
  draft: 'bg-yellow-100 text-yellow-800',
  published: 'bg-green-100 text-green-800',
  archived: 'bg-gray-100 text-gray-800',
};

// Pre-built landing page templates
const SAMPLE_TEMPLATES: Array<{
  id: string;
  name: string;
  description: string;
  preview: string;
  theme: LandingPage['theme'];
  data: Partial<LandingPage>;
}> = [
  {
    id: 'yoga-sunrise',
    name: '🌅 Yoga Sunrise',
    description: 'Warm, peaceful theme perfect for morning yoga classes',
    preview: 'linear-gradient(135deg, #FF6B35 0%, #FFD700 100%)',
    theme: {
      mode: 'light',
      primaryColor: '#FF6B35',
      secondaryColor: '#1E3A5F',
      accentColor: '#FFD700',
      backgroundColor: '#FFF9F5',
      textColor: '#2D3748',
      fontFamily: 'Poppins',
    },
    data: {
      heroHeading: 'Transform Your Life Through Ancient Yoga Wisdom',
      heroSubheading: 'Join our immersive yoga journey and discover inner peace, strength, and balance',
      heroCTA: 'Start Your Journey',
      benefits: [
        { icon: '🧘', title: 'Mind-Body Connection', description: 'Develop awareness and harmony between your mind and body' },
        { icon: '💪', title: 'Physical Strength', description: 'Build core strength and flexibility through traditional asanas' },
        { icon: '🌿', title: 'Stress Relief', description: 'Learn breathing techniques to manage stress and anxiety' },
        { icon: '✨', title: 'Spiritual Growth', description: 'Deepen your spiritual practice with guided meditation' },
      ],
      socialProof: { studentsCount: 10000, reviewsCount: 500, avgRating: 4.9, yearsExperience: 15 },
    },
  },
  {
    id: 'zen-dark',
    name: '🌙 Zen Dark',
    description: 'Modern dark theme for evening meditation & relaxation',
    preview: 'linear-gradient(135deg, #1A1A2E 0%, #16213E 100%)',
    theme: {
      mode: 'dark',
      primaryColor: '#7C3AED',
      secondaryColor: '#A78BFA',
      accentColor: '#F59E0B',
      backgroundColor: '#1A1A2E',
      textColor: '#E2E8F0',
      fontFamily: 'Inter',
    },
    data: {
      heroHeading: 'Find Your Inner Peace in the Silence',
      heroSubheading: 'Evening meditation sessions designed for deep relaxation and mindfulness',
      heroCTA: 'Begin Meditation',
      benefits: [
        { icon: '🌙', title: 'Better Sleep', description: 'Improve sleep quality with calming evening practices' },
        { icon: '🧠', title: 'Mental Clarity', description: 'Clear your mind and enhance focus through meditation' },
        { icon: '💫', title: 'Energy Balance', description: 'Restore your energy at the end of a busy day' },
        { icon: '🌊', title: 'Deep Relaxation', description: 'Release tension with guided relaxation techniques' },
      ],
      socialProof: { studentsCount: 8500, reviewsCount: 420, avgRating: 4.8, yearsExperience: 12 },
    },
  },
  {
    id: 'nature-green',
    name: '🌿 Nature Green',
    description: 'Fresh, earthy theme for holistic wellness programs',
    preview: 'linear-gradient(135deg, #059669 0%, #34D399 100%)',
    theme: {
      mode: 'light',
      primaryColor: '#059669',
      secondaryColor: '#065F46',
      accentColor: '#FCD34D',
      backgroundColor: '#F0FDF4',
      textColor: '#1F2937',
      fontFamily: 'Roboto',
    },
    data: {
      heroHeading: 'Reconnect With Nature Through Holistic Yoga',
      heroSubheading: 'Experience the healing power of yoga in harmony with natural elements',
      heroCTA: 'Join the Program',
      benefits: [
        { icon: '🌱', title: 'Natural Healing', description: 'Embrace natural wellness practices for complete health' },
        { icon: '🍃', title: 'Detox & Cleanse', description: 'Purify your body with pranayama and cleansing kriyas' },
        { icon: '🌸', title: 'Emotional Balance', description: 'Find emotional stability through mindful practices' },
        { icon: '🌳', title: 'Grounding', description: 'Connect with earth energy for stability and strength' },
      ],
      socialProof: { studentsCount: 12000, reviewsCount: 680, avgRating: 4.9, yearsExperience: 20 },
    },
  },
  {
    id: 'ocean-blue',
    name: '🌊 Ocean Blue',
    description: 'Calm, flowing theme for breathwork & pranayama',
    preview: 'linear-gradient(135deg, #0EA5E9 0%, #06B6D4 100%)',
    theme: {
      mode: 'light',
      primaryColor: '#0EA5E9',
      secondaryColor: '#0369A1',
      accentColor: '#F97316',
      backgroundColor: '#F0F9FF',
      textColor: '#1E3A5F',
      fontFamily: 'Open Sans',
    },
    data: {
      heroHeading: 'Master the Art of Breath & Pranayama',
      heroSubheading: 'Unlock the power within through ancient breathing techniques',
      heroCTA: 'Learn Pranayama',
      benefits: [
        { icon: '🌬️', title: 'Breath Mastery', description: 'Learn 12+ powerful pranayama techniques' },
        { icon: '❤️', title: 'Heart Health', description: 'Improve cardiovascular health through breathing exercises' },
        { icon: '🔋', title: 'Energy Boost', description: 'Increase vitality and stamina naturally' },
        { icon: '🎯', title: 'Focus & Clarity', description: 'Sharpen your concentration and mental acuity' },
      ],
      socialProof: { studentsCount: 7500, reviewsCount: 350, avgRating: 4.7, yearsExperience: 18 },
    },
  },
  {
    id: 'royal-purple',
    name: '👑 Royal Premium',
    description: 'Luxurious theme for premium masterclass & workshops',
    preview: 'linear-gradient(135deg, #7C3AED 0%, #EC4899 100%)',
    theme: {
      mode: 'custom',
      primaryColor: '#7C3AED',
      secondaryColor: '#4C1D95',
      accentColor: '#F59E0B',
      backgroundColor: '#FAF5FF',
      textColor: '#1F2937',
      fontFamily: 'Poppins',
    },
    data: {
      heroHeading: 'Exclusive Yoga Masterclass by World-Renowned Guru',
      heroSubheading: 'Limited seats available for this transformative premium workshop',
      heroCTA: 'Reserve Your Seat',
      benefits: [
        { icon: '🏆', title: 'Expert Guidance', description: 'Learn directly from a certified yoga master' },
        { icon: '📜', title: 'Certification', description: 'Receive internationally recognized certification' },
        { icon: '🎁', title: 'Bonus Materials', description: 'Get exclusive access to premium resources' },
        { icon: '🤝', title: 'Community Access', description: 'Join our private community of practitioners' },
      ],
      socialProof: { studentsCount: 5000, reviewsCount: 280, avgRating: 5.0, yearsExperience: 25 },
    },
  },
];

export default function AdminLandingPagesPage() {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [adminToken, setAdminToken] = useState('');

  const [landingPages, setLandingPages] = useState<LandingPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'published' | 'archived'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [showEditor, setShowEditor] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [editingPage, setEditingPage] = useState<LandingPage | null>(null);
  const [activeSection, setActiveSection] = useState<EditSection>('basic');
  const [saving, setSaving] = useState(false);
  
  // Image upload state
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  // Preview state
  const [showPreview, setShowPreview] = useState(true);
  const [previewZoom, setPreviewZoom] = useState(0.4);
  const [previewKey, setPreviewKey] = useState(0);
  const [deviceMode, setDeviceMode] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');
  
  // Color history for undo/redo
  const [colorHistory, setColorHistory] = useState<Array<{
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    backgroundColor: string;
    textColor: string;
  }>>([]);
  const [colorHistoryIndex, setColorHistoryIndex] = useState(-1);
  const [showColorPalette, setShowColorPalette] = useState(true);
  
  // Resizable panel widths
  const [sidebarWidth, setSidebarWidth] = useState(224); // 14rem = 224px
  const [contentWidth, setContentWidth] = useState(400);
  const [isDraggingSidebar, setIsDraggingSidebar] = useState(false);
  const [isDraggingContent, setIsDraggingContent] = useState(false);
  
  // Sidebar section groups state
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    main: true,
    content: true,
    social: false,
    conversion: false,
    ui: false,
    settings: false,
  });

  // Device widths for preview
  const DEVICE_WIDTHS = {
    mobile: 375,
    tablet: 768,
    desktop: 1280,
  };

  // Form state
  const [form, setForm] = useState<Partial<LandingPage>>({
    name: '',
    slug: '',
    status: 'draft',
    theme: DEFAULT_THEME,
  });

  // Load admin token
  useEffect(() => {
    const storedToken = typeof window !== 'undefined'
      ? (localStorage.getItem('crm_token') || localStorage.getItem('adminToken') || localStorage.getItem('admin_token'))
      : null;
    if (!storedToken) {
      router.push('/admin/login');
      return;
    }
    setAdminToken(storedToken);
  }, [router]);

  // Load landing pages
  const loadLandingPages = useCallback(async () => {
    if (!adminToken) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (searchQuery) params.set('search', searchQuery);

      const res = await fetch(`/api/admin/landing-pages?${params}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      
      // Safe JSON parsing
      const text = await res.text();
      let json;
      try {
        json = JSON.parse(text);
      } catch {
        throw new Error(`Server error: ${res.status} ${res.statusText}`);
      }
      
      if (!res.ok) throw new Error(json.error || 'Failed to load');
      setLandingPages(json.data || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load landing pages');
    } finally {
      setLoading(false);
    }
  }, [adminToken, statusFilter, searchQuery]);

  useEffect(() => {
    loadLandingPages();
  }, [loadLandingPages]);

  // Auto-create one sample landing page in draft when the list is empty
  const autoSampleRef = useRef(false);
  useEffect(() => {
    if (!adminToken || loading || autoSampleRef.current) return;
    if (landingPages.length > 0) return;
    autoSampleRef.current = true;
    const tpl = SAMPLE_TEMPLATES.find(t => t.id === 'zen-dark') || SAMPLE_TEMPLATES[0];
    if (!tpl) return;
    const sampleBody = {
      name: tpl.name + ' (Sample)',
      slug: 'sample-' + tpl.id,
      status: 'draft' as const,
      theme: tpl.theme,
      heroHeading: tpl.data.heroHeading || '',
      heroSubheading: tpl.data.heroSubheading || '',
      heroCTA: tpl.data.heroCTA || '',
      benefits: tpl.data.benefits || [],
      socialProof: tpl.data.socialProof || {},
    };
    fetch('/api/admin/landing-pages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify(sampleBody),
    }).then(() => loadLandingPages()).catch(() => {});
  }, [adminToken, loading, landingPages.length, loadLandingPages]);

  const openCreate = () => {
    setShowTemplates(true);
  };

  const selectTemplate = (templateId: string | null) => {
    const template = templateId ? SAMPLE_TEMPLATES.find(t => t.id === templateId) : null;
    setEditingPage(null);
    setForm({
      name: template ? `New ${template.name.replace(/^[^\s]+\s/, '')} Page` : '',
      slug: '',
      status: 'draft',
      theme: template?.theme || DEFAULT_THEME,
      heroHeading: template?.data.heroHeading || '',
      heroSubheading: template?.data.heroSubheading || '',
      heroCTA: template?.data.heroCTA || 'Enroll Now',
      benefits: template?.data.benefits || [],
      socialProof: template?.data.socialProof || {},
      pricing: [],
      curriculum: [],
      testimonials: [],
      faqs: [],
      gallery: [],
    });
    setShowTemplates(false);
    setActiveSection('basic');
    setShowEditor(true);
  };

  const openEdit = (page: LandingPage) => {
    setEditingPage(page);
    setForm({ ...page });
    setActiveSection('basic');
    setShowEditor(true);
  };

  const closeEditor = () => {
    setShowEditor(false);
    setEditingPage(null);
    setForm({ name: '', slug: '', status: 'draft', theme: DEFAULT_THEME });
  };

  const handleSave = async () => {
    if (!form.name || !form.slug) {
      setError('Name and slug are required');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const method = editingPage ? 'PUT' : 'POST';
      const body = editingPage ? { ...form, id: editingPage._id } : form;

      const res = await fetch('/api/admin/landing-pages', {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify(body),
      });

      // Safe JSON parsing
      const text = await res.text();
      let json;
      try {
        json = JSON.parse(text);
      } catch {
        throw new Error(`Server error: ${res.status} ${res.statusText}`);
      }
      
      if (!res.ok) throw new Error(json.error || 'Failed to save');

      setSuccess(editingPage ? 'Landing page updated!' : 'Landing page created!');
      setTimeout(() => setSuccess(''), 3000);
      closeEditor();
      loadLandingPages();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this landing page?')) return;

    try {
      const res = await fetch(`/api/admin/landing-pages?id=${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      
      // Safe JSON parsing
      const text = await res.text();
      let json;
      try {
        json = JSON.parse(text);
      } catch {
        throw new Error(`Server error: ${res.status} ${res.statusText}`);
      }
      
      if (!res.ok) throw new Error(json.error || 'Failed to delete');

      setSuccess('Landing page deleted');
      setTimeout(() => setSuccess(''), 3000);
      loadLandingPages();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete');
    }
  };

  const handleTogglePublish = async (page: LandingPage) => {
    const newStatus = page.status === 'published' ? 'draft' : 'published';
    try {
      const res = await fetch('/api/admin/landing-pages', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ id: page._id, status: newStatus }),
      });
      
      // Safe JSON parsing
      const text = await res.text();
      let json;
      try {
        json = JSON.parse(text);
      } catch {
        throw new Error(`Server error: ${res.status} ${res.statusText}`);
      }
      
      if (!res.ok) throw new Error(json.error || 'Failed to update status');

      setSuccess(`Landing page ${newStatus === 'published' ? 'published' : 'unpublished'}!`);
      setTimeout(() => setSuccess(''), 3000);
      loadLandingPages();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update status');
    }
  };

  const updateForm = (key: string, value: any) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const updateNestedForm = (parent: string, key: string, value: any) => {
    setForm(prev => ({
      ...prev,
      [parent]: { ...(prev as any)[parent], [key]: value },
    }));
  };

  // Image upload handler
  const handleImageUpload = async (file: File, field: string, formKey?: string) => {
    if (!file) return;
    
    setUploadingField(field);
    setUploadProgress(0);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('field', field);
      
      // Simulate progress (actual XHR would give real progress)
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);
      
      const token = localStorage.getItem('adminToken') || '';
      const res = await fetch('/api/admin/landing-pages/upload', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Upload failed');
      }
      
      const data = await res.json();
      
      // Update the form with the uploaded URL
      const key = formKey || field;
      updateForm(key, data.url);
      
      setSuccess(`Image uploaded successfully!`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to upload image');
    } finally {
      setUploadingField(null);
      setUploadProgress(0);
    }
  };

  // Update preview - saves form to sessionStorage and refreshes iframe
  const updatePreview = () => {
    // Save current form data to sessionStorage for preview to read
    if (form.slug) {
      try {
        sessionStorage.setItem(`lp-preview-${form.slug}`, JSON.stringify(form));
      } catch (e) {
        console.warn('Failed to save preview data to sessionStorage:', e);
      }
    }
    setPreviewKey(k => k + 1);
    setSuccess('Preview updated!');
    setTimeout(() => setSuccess(''), 2000);
  };

  // Update Section Button Component
  const UpdateSectionButton = ({ sectionName }: { sectionName: string }) => (
    <div className="pt-4 mt-4 border-t border-gray-200">
      <button
        type="button"
        onClick={updatePreview}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-medium rounded-lg hover:from-blue-600 hover:to-blue-700 shadow-sm transition-all"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        Update {sectionName}
      </button>
      <p className="text-[10px] text-gray-400 text-center mt-1">Updates preview only. Click "Update Page" to save.</p>
    </div>
  );

  // Array helpers
  const addArrayItem = (key: string, item: any) => {
    setForm(prev => ({
      ...prev,
      [key]: [...((prev as any)[key] || []), item],
    }));
  };

  const updateArrayItem = (key: string, index: number, item: any) => {
    setForm(prev => ({
      ...prev,
      [key]: ((prev as any)[key] || []).map((i: any, idx: number) => idx === index ? item : i),
    }));
  };

  const removeArrayItem = (key: string, index: number) => {
    setForm(prev => ({
      ...prev,
      [key]: ((prev as any)[key] || []).filter((_: any, idx: number) => idx !== index),
    }));
  };

  // Grouped sections for drill-down sidebar
  const SECTION_GROUPS: Array<{
    id: string;
    label: string;
    icon: string;
    sections: Array<{ key: EditSection; label: string; icon: string }>;
  }> = [
    {
      id: 'main',
      label: 'Main Sections',
      icon: '⭐',
      sections: [
        { key: 'basic', label: 'Basic Info', icon: '📝' },
        { key: 'hero', label: 'Hero Section', icon: '🖼️' },
        { key: 'navigation', label: 'Navigation', icon: '🧭' },
        { key: 'pricing', label: 'Pricing', icon: '💰' },
        { key: 'event', label: 'Event Details', icon: '📅' },
      ],
    },
    {
      id: 'content',
      label: 'Content',
      icon: '📄',
      sections: [
        { key: 'instructor', label: 'Instructor', icon: '👤' },
        { key: 'benefits', label: 'Benefits', icon: '✨' },
        { key: 'curriculum', label: 'Curriculum', icon: '📚' },
        { key: 'problem', label: 'Problem Statement', icon: '😰' },
        { key: 'solution', label: 'Solution', icon: '💡' },
        { key: 'howitworks', label: 'How It Works', icon: '🔄' },
        { key: 'video', label: 'Video Section', icon: '🎬' },
        { key: 'faq', label: 'FAQ', icon: '❓' },
        { key: 'gallery', label: 'Gallery', icon: '🖼️' },
      ],
    },
    {
      id: 'social',
      label: 'Social Proof',
      icon: '🏆',
      sections: [
        { key: 'testimonials', label: 'Testimonials', icon: '💬' },
        { key: 'successstories', label: 'Success Stories', icon: '🏆' },
        { key: 'transformation', label: 'Transformation', icon: '🦋' },
        { key: 'trust', label: 'Trust Badges', icon: '✅' },
        { key: 'social', label: 'Social Numbers', icon: '📊' },
        { key: 'notifications', label: 'Live Notifications', icon: '🔔' },
      ],
    },
    {
      id: 'conversion',
      label: 'Conversion',
      icon: '💸',
      sections: [
        { key: 'bonuses', label: 'Bonuses', icon: '🎁' },
        { key: 'guarantee', label: 'Guarantee', icon: '🛡️' },
        { key: 'urgency', label: 'Urgency', icon: '⚡' },
        { key: 'countdown', label: 'Countdown', icon: '⏰' },
        { key: 'leadmagnet', label: 'Lead Magnet', icon: '🧲' },
        { key: 'comparison', label: 'Comparison Table', icon: '📊' },
      ],
    },
    {
      id: 'ui',
      label: 'UI Elements',
      icon: '🖥️',
      sections: [
        { key: 'popup', label: 'Popup', icon: '💥' },
        { key: 'sticky', label: 'Sticky Header', icon: '📌' },
        { key: 'announcement', label: 'Announcement Bar', icon: '📢' },
        { key: 'registration', label: 'Registration Form', icon: '📋' },
        { key: 'demo', label: 'Demo Session', icon: '🎥' },
        { key: 'productdemo', label: 'Product Demo', icon: '📺' },
        { key: 'newsletter', label: 'Newsletter', icon: '📧' },
        { key: 'footer', label: 'Footer', icon: '🦶' },
      ],
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: '⚙️',
      sections: [
        { key: 'theme', label: 'Theme & Colors', icon: '🎨' },
        { key: 'seo', label: 'SEO Settings', icon: '🔍' },
        { key: 'integrations', label: 'Integrations', icon: '🔗' },
      ],
    },
  ];

  // Toggle group expansion
  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  // Find which group a section belongs to (for auto-expand)
  const findGroupForSection = (sectionKey: EditSection): string | null => {
    for (const group of SECTION_GROUPS) {
      if (group.sections.some(s => s.key === sectionKey)) {
        return group.id;
      }
    }
    return null;
  };

  // Drag handlers for resizable panels
  const handleSidebarDrag = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDraggingSidebar(true);
    
    const startX = e.clientX;
    const startWidth = sidebarWidth;
    
    const onMouseMove = (moveEvent: MouseEvent) => {
      const delta = moveEvent.clientX - startX;
      const newWidth = Math.max(180, Math.min(400, startWidth + delta));
      setSidebarWidth(newWidth);
    };
    
    const onMouseUp = () => {
      setIsDraggingSidebar(false);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
    
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  const handleContentDrag = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDraggingContent(true);
    
    const startX = e.clientX;
    const startWidth = contentWidth;
    
    const onMouseMove = (moveEvent: MouseEvent) => {
      const delta = moveEvent.clientX - startX;
      const newWidth = Math.max(300, Math.min(700, startWidth + delta));
      setContentWidth(newWidth);
    };
    
    const onMouseUp = () => {
      setIsDraggingContent(false);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
    
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  const renderSectionContent = () => {
    switch (activeSection) {
      case 'basic':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Page Name (Internal)</label>
              <input
                type="text"
                value={form.name || ''}
                onChange={e => updateForm('name', e.target.value)}
                placeholder="e.g., Swar Yoga Level 1 June 2024"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-orange-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">URL Slug</label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">/lp/</span>
                <input
                  type="text"
                  value={form.slug || ''}
                  onChange={e => updateForm('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                  placeholder="swar-yoga-june-2024"
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-2 focus:border-orange-500 focus:outline-none"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={form.status || 'draft'}
                onChange={e => updateForm('status', e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-orange-500 focus:outline-none"
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Linked Workshop (Optional)</label>
              <input
                type="text"
                value={form.linkedWorkshopSlug || ''}
                onChange={e => updateForm('linkedWorkshopSlug', e.target.value)}
                placeholder="Workshop slug"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-orange-500 focus:outline-none"
              />
            </div>
            <UpdateSectionButton sectionName="Basic" />
          </div>
        );

      case 'hero':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Main Heading</label>
              <input
                type="text"
                value={form.heroHeading || ''}
                onChange={e => updateForm('heroHeading', e.target.value)}
                placeholder="Transform Your Life with Swar Yoga"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-orange-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subheading</label>
              <input
                type="text"
                value={form.heroSubheading || ''}
                onChange={e => updateForm('heroSubheading', e.target.value)}
                placeholder="Join thousands who have discovered inner peace"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-orange-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hero Image</label>
              <div className="space-y-2">
                {/* Upload Button */}
                <div className="flex gap-2">
                  <label className="flex-1 cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleImageUpload(file, 'heroImage');
                      }}
                      disabled={uploadingField === 'heroImage'}
                    />
                    <div className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg border-2 border-dashed transition-all ${
                      uploadingField === 'heroImage' 
                        ? 'border-orange-400 bg-orange-50' 
                        : 'border-gray-300 hover:border-orange-400 hover:bg-orange-50'
                    }`}>
                      {uploadingField === 'heroImage' ? (
                        <>
                          <svg className="animate-spin h-5 w-5 text-orange-500" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                          </svg>
                          <span className="text-sm text-orange-600">Uploading... {uploadProgress}%</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span className="text-sm text-gray-600">Click to upload image</span>
                        </>
                      )}
                    </div>
                  </label>
                </div>
                
                {/* Or paste URL */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">or paste URL:</span>
                  <input
                    type="text"
                    value={form.heroImage || ''}
                    onChange={e => updateForm('heroImage', e.target.value)}
                    placeholder="https://..."
                    className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-orange-500 focus:outline-none"
                  />
                  {form.heroImage && (
                    <button
                      type="button"
                      onClick={() => updateForm('heroImage', '')}
                      className="p-1.5 text-red-500 hover:bg-red-50 rounded"
                      title="Remove image"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
                
                {/* Preview */}
                {form.heroImage && (
                  <div className="space-y-2">
                    <div className="relative">
                      <img 
                        src={form.heroImage} 
                        alt="Hero Preview" 
                        className="w-full h-40 rounded-lg border" 
                        style={{ 
                          objectFit: form.heroImageFit || 'cover',
                          objectPosition: form.heroImagePosition || 'center'
                        }}
                      />
                      <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
                        Hero Image
                      </div>
                    </div>
                    
                    {/* Image Adjustment Controls */}
                    <div className="grid grid-cols-2 gap-2 p-2 bg-gray-50 rounded-lg">
                      <div>
                        <label className="block text-[10px] font-medium text-gray-500 mb-1">Image Fit</label>
                        <select
                          value={form.heroImageFit || 'cover'}
                          onChange={e => updateForm('heroImageFit', e.target.value)}
                          className="w-full text-xs rounded border border-gray-300 px-2 py-1 focus:border-orange-500 focus:outline-none"
                        >
                          <option value="cover">Cover (fill)</option>
                          <option value="contain">Contain (fit)</option>
                          <option value="fill">Stretch</option>
                          <option value="none">Original</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-medium text-gray-500 mb-1">Position</label>
                        <select
                          value={form.heroImagePosition || 'center'}
                          onChange={e => updateForm('heroImagePosition', e.target.value)}
                          className="w-full text-xs rounded border border-gray-300 px-2 py-1 focus:border-orange-500 focus:outline-none"
                        >
                          <option value="center">Center</option>
                          <option value="top">Top</option>
                          <option value="bottom">Bottom</option>
                          <option value="left">Left</option>
                          <option value="right">Right</option>
                          <option value="top left">Top Left</option>
                          <option value="top right">Top Right</option>
                          <option value="bottom left">Bottom Left</option>
                          <option value="bottom right">Bottom Right</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hero Video URL (YouTube/Vimeo)</label>
              <input
                type="text"
                value={form.heroVideo || ''}
                onChange={e => updateForm('heroVideo', e.target.value)}
                placeholder="https://youtube.com/..."
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-orange-500 focus:outline-none"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">CTA Button Text</label>
                <input
                  type="text"
                  value={form.heroCTA || 'Register Now'}
                  onChange={e => updateForm('heroCTA', e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-orange-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">CTA Link</label>
                <input
                  type="text"
                  value={form.heroCtaLink || ''}
                  onChange={e => updateForm('heroCtaLink', e.target.value)}
                  placeholder="#pricing or https://..."
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-orange-500 focus:outline-none"
                />
              </div>
            </div>
            <UpdateSectionButton sectionName="Hero" />
          </div>
        );

      case 'event':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Event Title</label>
              <input
                type="text"
                value={form.eventTitle || ''}
                onChange={e => updateForm('eventTitle', e.target.value)}
                placeholder="Swar Yoga Level 1 Workshop"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-orange-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Event Description</label>
              <textarea
                value={form.eventDescription || ''}
                onChange={e => updateForm('eventDescription', e.target.value)}
                rows={4}
                placeholder="Describe your workshop..."
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-orange-500 focus:outline-none"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                <input
                  type="date"
                  value={form.startDate ? form.startDate.split('T')[0] : ''}
                  onChange={e => updateForm('startDate', e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-orange-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                <input
                  type="date"
                  value={form.endDate ? form.endDate.split('T')[0] : ''}
                  onChange={e => updateForm('endDate', e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-orange-500 focus:outline-none"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
                <input
                  type="text"
                  value={form.eventTime || ''}
                  onChange={e => updateForm('eventTime', e.target.value)}
                  placeholder="7:00 PM - 8:30 PM IST"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-orange-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Timezone</label>
                <input
                  type="text"
                  value={form.eventTimezone || 'Asia/Kolkata'}
                  onChange={e => updateForm('eventTimezone', e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-orange-500 focus:outline-none"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                <input
                  type="text"
                  value={form.location || ''}
                  onChange={e => updateForm('location', e.target.value)}
                  placeholder="Online (Zoom)"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-orange-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Language</label>
                <input
                  type="text"
                  value={form.language || ''}
                  onChange={e => updateForm('language', e.target.value)}
                  placeholder="Hindi"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-orange-500 focus:outline-none"
                />
              </div>
            </div>
            <UpdateSectionButton sectionName="Event" />
          </div>
        );

      case 'pricing':
        return (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Pricing Plans</h3>
              <button
                onClick={() => addArrayItem('pricing', {
                  name: 'Standard',
                  price: 0,
                  currency: 'INR',
                  features: [],
                  isPopular: false,
                  ctaText: 'Enroll Now',
                })}
                className="rounded-lg bg-orange-500 px-3 py-1.5 text-sm text-white hover:bg-orange-600"
              >
                + Add Plan
              </button>
            </div>
            {(form.pricing || []).map((plan, idx) => (
              <div key={idx} className="rounded-lg border border-gray-200 p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="font-medium">Plan #{idx + 1}</h4>
                  <button
                    onClick={() => removeArrayItem('pricing', idx)}
                    className="text-red-500 text-sm hover:text-red-700"
                  >
                    Remove
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    placeholder="Plan Name"
                    value={plan.name}
                    onChange={e => updateArrayItem('pricing', idx, { ...plan, name: e.target.value })}
                    className="rounded border px-2 py-1.5 text-sm"
                  />
                  <input
                    placeholder="Price"
                    type="number"
                    value={plan.price}
                    onChange={e => updateArrayItem('pricing', idx, { ...plan, price: Number(e.target.value) })}
                    className="rounded border px-2 py-1.5 text-sm"
                  />
                  <select
                    value={plan.currency}
                    onChange={e => updateArrayItem('pricing', idx, { ...plan, currency: e.target.value })}
                    className="rounded border px-2 py-1.5 text-sm"
                  >
                    <option value="INR">INR</option>
                    <option value="USD">USD</option>
                    <option value="NPR">NPR</option>
                  </select>
                  <input
                    placeholder="Original Price (for strikethrough)"
                    type="number"
                    value={plan.originalPrice || ''}
                    onChange={e => updateArrayItem('pricing', idx, { ...plan, originalPrice: Number(e.target.value) || undefined })}
                    className="rounded border px-2 py-1.5 text-sm"
                  />
                </div>
                <input
                  placeholder="Payment Link URL"
                  value={plan.paymentLink || ''}
                  onChange={e => updateArrayItem('pricing', idx, { ...plan, paymentLink: e.target.value })}
                  className="w-full rounded border px-2 py-1.5 text-sm"
                />
                <input
                  placeholder="CTA Text"
                  value={plan.ctaText}
                  onChange={e => updateArrayItem('pricing', idx, { ...plan, ctaText: e.target.value })}
                  className="w-full rounded border px-2 py-1.5 text-sm"
                />
                <textarea
                  placeholder="Features (one per line)"
                  value={plan.features.join('\n')}
                  onChange={e => updateArrayItem('pricing', idx, { ...plan, features: e.target.value.split('\n').filter(Boolean) })}
                  rows={3}
                  className="w-full rounded border px-2 py-1.5 text-sm"
                />
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={plan.isPopular}
                    onChange={e => updateArrayItem('pricing', idx, { ...plan, isPopular: e.target.checked })}
                  />
                  Mark as Popular
                </label>
              </div>
            ))}
            <UpdateSectionButton sectionName="Pricing" />
          </div>
        );

      case 'instructor':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Instructor Name</label>
              <input
                type="text"
                value={form.instructorName || ''}
                onChange={e => updateForm('instructorName', e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-orange-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title/Designation</label>
              <input
                type="text"
                value={form.instructorTitle || ''}
                onChange={e => updateForm('instructorTitle', e.target.value)}
                placeholder="Founder, Swar Yoga"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-orange-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Instructor Photo</label>
              <div className="space-y-2">
                {/* Upload Button */}
                <label className="cursor-pointer block">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleImageUpload(file, 'instructorImage');
                    }}
                    disabled={uploadingField === 'instructorImage'}
                  />
                  <div className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg border-2 border-dashed transition-all ${
                    uploadingField === 'instructorImage' 
                      ? 'border-orange-400 bg-orange-50' 
                      : 'border-gray-300 hover:border-orange-400 hover:bg-orange-50'
                  }`}>
                    {uploadingField === 'instructorImage' ? (
                      <>
                        <svg className="animate-spin h-5 w-5 text-orange-500" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                        </svg>
                        <span className="text-sm text-orange-600">Uploading... {uploadProgress}%</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <span className="text-sm text-gray-600">Click to upload photo</span>
                      </>
                    )}
                  </div>
                </label>
                
                {/* Or paste URL */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">or URL:</span>
                  <input
                    type="text"
                    value={form.instructorImage || ''}
                    onChange={e => updateForm('instructorImage', e.target.value)}
                    placeholder="https://..."
                    className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-orange-500 focus:outline-none"
                  />
                </div>
                
                {/* Preview */}
                {form.instructorImage && (
                  <div className="flex items-center gap-3">
                    <img src={form.instructorImage} alt="Instructor" className="h-20 w-20 rounded-full object-cover border-2 border-orange-200" />
                    <button
                      type="button"
                      onClick={() => updateForm('instructorImage', '')}
                      className="text-xs text-red-500 hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
              <textarea
                value={form.instructorBio || ''}
                onChange={e => updateForm('instructorBio', e.target.value)}
                rows={4}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-orange-500 focus:outline-none"
              />
            </div>
            <UpdateSectionButton sectionName="Instructor" />
          </div>
        );

      case 'benefits':
        return (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Benefits</h3>
              <button
                onClick={() => addArrayItem('benefits', { icon: '✨', title: '', description: '' })}
                className="rounded-lg bg-orange-500 px-3 py-1.5 text-sm text-white hover:bg-orange-600"
              >
                + Add Benefit
              </button>
            </div>
            {(form.benefits || []).map((benefit, idx) => (
              <div key={idx} className="rounded-lg border border-gray-200 p-4 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Benefit #{idx + 1}</span>
                  <button onClick={() => removeArrayItem('benefits', idx)} className="text-red-500 text-sm">Remove</button>
                </div>
                <div className="grid grid-cols-[60px_1fr] gap-2">
                  <input
                    placeholder="Icon"
                    value={benefit.icon}
                    onChange={e => updateArrayItem('benefits', idx, { ...benefit, icon: e.target.value })}
                    className="rounded border px-2 py-1.5 text-sm text-center"
                  />
                  <input
                    placeholder="Title"
                    value={benefit.title}
                    onChange={e => updateArrayItem('benefits', idx, { ...benefit, title: e.target.value })}
                    className="rounded border px-2 py-1.5 text-sm"
                  />
                </div>
                <textarea
                  placeholder="Description"
                  value={benefit.description}
                  onChange={e => updateArrayItem('benefits', idx, { ...benefit, description: e.target.value })}
                  rows={2}
                  className="w-full rounded border px-2 py-1.5 text-sm"
                />
              </div>
            ))}
            <UpdateSectionButton sectionName="Benefits" />
          </div>
        );

      case 'curriculum':
        return (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">What You'll Learn</h3>
              <button
                onClick={() => addArrayItem('curriculum', { title: '', description: '', duration: '' })}
                className="rounded-lg bg-orange-500 px-3 py-1.5 text-sm text-white hover:bg-orange-600"
              >
                + Add Topic
              </button>
            </div>
            {(form.curriculum || []).map((item, idx) => (
              <div key={idx} className="rounded-lg border border-gray-200 p-4 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Topic #{idx + 1}</span>
                  <button onClick={() => removeArrayItem('curriculum', idx)} className="text-red-500 text-sm">Remove</button>
                </div>
                <input
                  placeholder="Title"
                  value={item.title}
                  onChange={e => updateArrayItem('curriculum', idx, { ...item, title: e.target.value })}
                  className="w-full rounded border px-2 py-1.5 text-sm"
                />
                <textarea
                  placeholder="Description"
                  value={item.description}
                  onChange={e => updateArrayItem('curriculum', idx, { ...item, description: e.target.value })}
                  rows={2}
                  className="w-full rounded border px-2 py-1.5 text-sm"
                />
                <input
                  placeholder="Duration (e.g., Day 1, 30 mins)"
                  value={item.duration}
                  onChange={e => updateArrayItem('curriculum', idx, { ...item, duration: e.target.value })}
                  className="w-full rounded border px-2 py-1.5 text-sm"
                />
              </div>
            ))}
            <UpdateSectionButton sectionName="Curriculum" />
          </div>
        );

      case 'testimonials':
        return (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Testimonials</h3>
              <button
                onClick={() => addArrayItem('testimonials', { name: '', text: '', location: '' })}
                className="rounded-lg bg-orange-500 px-3 py-1.5 text-sm text-white hover:bg-orange-600"
              >
                + Add Testimonial
              </button>
            </div>
            {(form.testimonials || []).map((t, idx) => (
              <div key={idx} className="rounded-lg border border-gray-200 p-4 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Testimonial #{idx + 1}</span>
                  <button onClick={() => removeArrayItem('testimonials', idx)} className="text-red-500 text-sm">Remove</button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    placeholder="Name"
                    value={t.name}
                    onChange={e => updateArrayItem('testimonials', idx, { ...t, name: e.target.value })}
                    className="rounded border px-2 py-1.5 text-sm"
                  />
                  <input
                    placeholder="Location"
                    value={t.location || ''}
                    onChange={e => updateArrayItem('testimonials', idx, { ...t, location: e.target.value })}
                    className="rounded border px-2 py-1.5 text-sm"
                  />
                </div>
                <input
                  placeholder="Photo URL"
                  value={t.image || ''}
                  onChange={e => updateArrayItem('testimonials', idx, { ...t, image: e.target.value })}
                  className="w-full rounded border px-2 py-1.5 text-sm"
                />
                <textarea
                  placeholder="Testimonial text"
                  value={t.text}
                  onChange={e => updateArrayItem('testimonials', idx, { ...t, text: e.target.value })}
                  rows={3}
                  className="w-full rounded border px-2 py-1.5 text-sm"
                />
                <input
                  placeholder="Video URL (optional)"
                  value={t.videoUrl || ''}
                  onChange={e => updateArrayItem('testimonials', idx, { ...t, videoUrl: e.target.value })}
                  className="w-full rounded border px-2 py-1.5 text-sm"
                />
                <select
                  value={t.rating || 5}
                  onChange={e => updateArrayItem('testimonials', idx, { ...t, rating: Number(e.target.value) })}
                  className="rounded border px-2 py-1.5 text-sm"
                >
                  {[5, 4, 3, 2, 1].map(r => (
                    <option key={r} value={r}>{r} Stars</option>
                  ))}
                </select>
              </div>
            ))}
            <UpdateSectionButton sectionName="Testimonials" />
          </div>
        );

      case 'demo':
        return (
          <div className="space-y-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.demoSession?.enabled || false}
                onChange={e => updateNestedForm('demoSession', 'enabled', e.target.checked)}
              />
              <span className="font-medium">Enable Demo/Free Session Section</span>
            </label>
            {form.demoSession?.enabled && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Demo Title</label>
                  <input
                    type="text"
                    value={form.demoSession?.title || ''}
                    onChange={e => updateNestedForm('demoSession', 'title', e.target.value)}
                    placeholder="Free Introduction Session"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-orange-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={form.demoSession?.description || ''}
                    onChange={e => updateNestedForm('demoSession', 'description', e.target.value)}
                    rows={2}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-orange-500 focus:outline-none"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                    <input
                      type="date"
                      value={form.demoSession?.date ? String(form.demoSession.date).split('T')[0] : ''}
                      onChange={e => updateNestedForm('demoSession', 'date', e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-orange-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
                    <input
                      type="text"
                      value={form.demoSession?.time || ''}
                      onChange={e => updateNestedForm('demoSession', 'time', e.target.value)}
                      placeholder="7:00 PM IST"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-orange-500 focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Zoom Link</label>
                  <input
                    type="text"
                    value={form.demoSession?.zoomLink || ''}
                    onChange={e => updateNestedForm('demoSession', 'zoomLink', e.target.value)}
                    placeholder="https://zoom.us/j/..."
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-orange-500 focus:outline-none"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Zoom ID</label>
                    <input
                      type="text"
                      value={form.demoSession?.zoomId || ''}
                      onChange={e => updateNestedForm('demoSession', 'zoomId', e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-orange-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Zoom Password</label>
                    <input
                      type="text"
                      value={form.demoSession?.zoomPassword || ''}
                      onChange={e => updateNestedForm('demoSession', 'zoomPassword', e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-orange-500 focus:outline-none"
                    />
                  </div>
                </div>
              </>
            )}
            <UpdateSectionButton sectionName="Demo Session" />
          </div>
        );

      case 'faq':
        return (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">FAQs</h3>
              <button
                onClick={() => addArrayItem('faqs', { question: '', answer: '' })}
                className="rounded-lg bg-orange-500 px-3 py-1.5 text-sm text-white hover:bg-orange-600"
              >
                + Add FAQ
              </button>
            </div>
            {(form.faqs || []).map((faq, idx) => (
              <div key={idx} className="rounded-lg border border-gray-200 p-4 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">FAQ #{idx + 1}</span>
                  <button onClick={() => removeArrayItem('faqs', idx)} className="text-red-500 text-sm">Remove</button>
                </div>
                <input
                  placeholder="Question"
                  value={faq.question}
                  onChange={e => updateArrayItem('faqs', idx, { ...faq, question: e.target.value })}
                  className="w-full rounded border px-2 py-1.5 text-sm"
                />
                <textarea
                  placeholder="Answer"
                  value={faq.answer}
                  onChange={e => updateArrayItem('faqs', idx, { ...faq, answer: e.target.value })}
                  rows={3}
                  className="w-full rounded border px-2 py-1.5 text-sm"
                />
              </div>
            ))}
            <UpdateSectionButton sectionName="FAQs" />
          </div>
        );

      case 'gallery':
        return (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Gallery</h3>
              <button
                onClick={() => addArrayItem('gallery', { type: 'image', url: '', caption: '' })}
                className="rounded-lg bg-orange-500 px-3 py-1.5 text-sm text-white hover:bg-orange-600"
              >
                + Add Media
              </button>
            </div>
            {(form.gallery || []).map((item, idx) => (
              <div key={idx} className="rounded-lg border border-gray-200 p-4 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Media #{idx + 1}</span>
                  <button onClick={() => removeArrayItem('gallery', idx)} className="text-red-500 text-sm">Remove</button>
                </div>
                <select
                  value={item.type}
                  onChange={e => updateArrayItem('gallery', idx, { ...item, type: e.target.value as 'image' | 'video' })}
                  className="w-full rounded border px-2 py-1.5 text-sm"
                >
                  <option value="image">Image</option>
                  <option value="video">Video</option>
                </select>
                <input
                  placeholder="URL"
                  value={item.url}
                  onChange={e => updateArrayItem('gallery', idx, { ...item, url: e.target.value })}
                  className="w-full rounded border px-2 py-1.5 text-sm"
                />
                <input
                  placeholder="Caption"
                  value={item.caption || ''}
                  onChange={e => updateArrayItem('gallery', idx, { ...item, caption: e.target.value })}
                  className="w-full rounded border px-2 py-1.5 text-sm"
                />
                {item.type === 'image' && item.url && (
                  <img src={item.url} alt="Preview" className="h-20 rounded object-cover" />
                )}
              </div>
            ))}
            <UpdateSectionButton sectionName="Gallery" />
          </div>
        );

      case 'theme':
        // Color palette with shades
        const COLOR_PALETTE = {
          red: ['#fef2f2', '#fee2e2', '#fecaca', '#fca5a5', '#f87171', '#ef4444', '#dc2626', '#b91c1c', '#991b1b', '#7f1d1d'],
          orange: ['#fff7ed', '#ffedd5', '#fed7aa', '#fdba74', '#fb923c', '#f97316', '#ea580c', '#c2410c', '#9a3412', '#7c2d12'],
          amber: ['#fffbeb', '#fef3c7', '#fde68a', '#fcd34d', '#fbbf24', '#f59e0b', '#d97706', '#b45309', '#92400e', '#78350f'],
          yellow: ['#fefce8', '#fef9c3', '#fef08a', '#fde047', '#facc15', '#eab308', '#ca8a04', '#a16207', '#854d0e', '#713f12'],
          lime: ['#f7fee7', '#ecfccb', '#d9f99d', '#bef264', '#a3e635', '#84cc16', '#65a30d', '#4d7c0f', '#3f6212', '#365314'],
          green: ['#f0fdf4', '#dcfce7', '#bbf7d0', '#86efac', '#4ade80', '#22c55e', '#16a34a', '#15803d', '#166534', '#14532d'],
          emerald: ['#ecfdf5', '#d1fae5', '#a7f3d0', '#6ee7b7', '#34d399', '#10b981', '#059669', '#047857', '#065f46', '#064e3b'],
          teal: ['#f0fdfa', '#ccfbf1', '#99f6e4', '#5eead4', '#2dd4bf', '#14b8a6', '#0d9488', '#0f766e', '#115e59', '#134e4a'],
          cyan: ['#ecfeff', '#cffafe', '#a5f3fc', '#67e8f9', '#22d3ee', '#06b6d4', '#0891b2', '#0e7490', '#155e75', '#164e63'],
          sky: ['#f0f9ff', '#e0f2fe', '#bae6fd', '#7dd3fc', '#38bdf8', '#0ea5e9', '#0284c7', '#0369a1', '#075985', '#0c4a6e'],
          blue: ['#eff6ff', '#dbeafe', '#bfdbfe', '#93c5fd', '#60a5fa', '#3b82f6', '#2563eb', '#1d4ed8', '#1e40af', '#1e3a8a'],
          indigo: ['#eef2ff', '#e0e7ff', '#c7d2fe', '#a5b4fc', '#818cf8', '#6366f1', '#4f46e5', '#4338ca', '#3730a3', '#312e81'],
          violet: ['#f5f3ff', '#ede9fe', '#ddd6fe', '#c4b5fd', '#a78bfa', '#8b5cf6', '#7c3aed', '#6d28d9', '#5b21b6', '#4c1d95'],
          purple: ['#faf5ff', '#f3e8ff', '#e9d5ff', '#d8b4fe', '#c084fc', '#a855f7', '#9333ea', '#7e22ce', '#6b21a8', '#581c87'],
          fuchsia: ['#fdf4ff', '#fae8ff', '#f5d0fe', '#f0abfc', '#e879f9', '#d946ef', '#c026d3', '#a21caf', '#86198f', '#701a75'],
          pink: ['#fdf2f8', '#fce7f3', '#fbcfe8', '#f9a8d4', '#f472b6', '#ec4899', '#db2777', '#be185d', '#9d174d', '#831843'],
          rose: ['#fff1f2', '#ffe4e6', '#fecdd3', '#fda4af', '#fb7185', '#f43f5e', '#e11d48', '#be123c', '#9f1239', '#881337'],
          slate: ['#f8fafc', '#f1f5f9', '#e2e8f0', '#cbd5e1', '#94a3b8', '#64748b', '#475569', '#334155', '#1e293b', '#0f172a'],
          gray: ['#f9fafb', '#f3f4f6', '#e5e7eb', '#d1d5db', '#9ca3af', '#6b7280', '#4b5563', '#374151', '#1f2937', '#111827'],
          zinc: ['#fafafa', '#f4f4f5', '#e4e4e7', '#d4d4d8', '#a1a1aa', '#71717a', '#52525b', '#3f3f46', '#27272a', '#18181b'],
          neutral: ['#fafafa', '#f5f5f5', '#e5e5e5', '#d4d4d4', '#a3a3a3', '#737373', '#525252', '#404040', '#262626', '#171717'],
          stone: ['#fafaf9', '#f5f5f4', '#e7e5e4', '#d6d3d1', '#a8a29e', '#78716c', '#57534e', '#44403c', '#292524', '#1c1917'],
        };
        const SHADE_LABELS = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900'];
        
        const renderColorPicker = (
          label: string, 
          colorKey: 'primaryColor' | 'secondaryColor' | 'accentColor' | 'backgroundColor' | 'textColor',
          defaultValue: string
        ) => (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
            {/* Current color display */}
            <div className="flex items-center gap-3 mb-3">
              <div 
                className="w-12 h-12 rounded-lg border-2 border-gray-300 shadow-inner"
                style={{ backgroundColor: form.theme?.[colorKey] || defaultValue }}
              />
              <input
                type="text"
                value={form.theme?.[colorKey] || defaultValue}
                onChange={e => updateNestedForm('theme', colorKey, e.target.value)}
                className="w-28 rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:border-orange-500 focus:outline-none"
              />
              <input
                type="color"
                value={form.theme?.[colorKey] || defaultValue}
                onChange={e => updateNestedForm('theme', colorKey, e.target.value)}
                className="h-10 w-10 rounded cursor-pointer border-0"
                title="Custom color picker"
              />
            </div>
            {/* Scrollable color palette */}
            <div className="overflow-x-auto pb-2">
              <div className="flex gap-1 min-w-max">
                {Object.entries(COLOR_PALETTE).map(([colorName, shades]) => (
                  <div key={colorName} className="flex flex-col">
                    <span className="text-[10px] text-gray-500 text-center mb-1 capitalize">{colorName}</span>
                    <div className="flex flex-col gap-0.5">
                      {shades.map((shade, idx) => (
                        <button
                          key={shade}
                          type="button"
                          onClick={() => updateNestedForm('theme', colorKey, shade)}
                          className={`w-6 h-4 rounded-sm transition-all hover:scale-125 hover:z-10 ${
                            (form.theme?.[colorKey] || defaultValue).toLowerCase() === shade.toLowerCase()
                              ? 'ring-2 ring-orange-500 ring-offset-1 scale-110'
                              : 'hover:ring-1 hover:ring-gray-400'
                          }`}
                          style={{ backgroundColor: shade }}
                          title={`${colorName}-${SHADE_LABELS[idx]}: ${shade}`}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Theme Mode</label>
              <select
                value={form.theme?.mode || 'light'}
                onChange={e => {
                  const newMode = e.target.value;
                  updateNestedForm('theme', 'mode', newMode);
                  // Auto-set colors based on mode
                  if (newMode === 'dark') {
                    updateNestedForm('theme', 'backgroundColor', '#1A1A2E');
                    updateNestedForm('theme', 'textColor', '#E2E8F0');
                  } else if (newMode === 'light') {
                    updateNestedForm('theme', 'backgroundColor', '#FFFFFF');
                    updateNestedForm('theme', 'textColor', '#1F2937');
                  }
                }}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-orange-500 focus:outline-none"
              >
                <option value="light">Light</option>
                <option value="dark">Dark</option>
                <option value="custom">Custom</option>
              </select>
            </div>
            
            {/* Color Pickers with Palette */}
            {renderColorPicker('Primary Color', 'primaryColor', '#F59E0B')}
            {renderColorPicker('Secondary Color', 'secondaryColor', '#1E3A5F')}
            {renderColorPicker('Accent Color', 'accentColor', '#FCD34D')}
            {renderColorPicker('Background Color', 'backgroundColor', form.theme?.mode === 'dark' ? '#1A1A2E' : '#FFFFFF')}
            {renderColorPicker('Text Color', 'textColor', form.theme?.mode === 'dark' ? '#E2E8F0' : '#1F2937')}
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Font Family</label>
              <select
                value={form.theme?.fontFamily || 'Inter'}
                onChange={e => updateNestedForm('theme', 'fontFamily', e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-orange-500 focus:outline-none"
              >
                <option value="Inter">Inter</option>
                <option value="Poppins">Poppins</option>
                <option value="Roboto">Roboto</option>
                <option value="Open Sans">Open Sans</option>
                <option value="Lato">Lato</option>
                <option value="Montserrat">Montserrat</option>
                <option value="Nunito">Nunito</option>
                <option value="Raleway">Raleway</option>
              </select>
            </div>
            <UpdateSectionButton sectionName="Theme" />
          </div>
        );

      case 'seo':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">SEO Title</label>
              <input
                type="text"
                value={form.seo?.title || ''}
                onChange={e => updateNestedForm('seo', 'title', e.target.value)}
                placeholder="Page title for search engines"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-orange-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Meta Description</label>
              <textarea
                value={form.seo?.description || ''}
                onChange={e => updateNestedForm('seo', 'description', e.target.value)}
                rows={3}
                placeholder="Description for search engines (150-160 chars)"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-orange-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Keywords (comma-separated)</label>
              <input
                type="text"
                value={(form.seo?.keywords || []).join(', ')}
                onChange={e => updateNestedForm('seo', 'keywords', e.target.value.split(',').map(k => k.trim()).filter(Boolean))}
                placeholder="yoga, meditation, wellness"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-orange-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">OG Image URL</label>
              <input
                type="text"
                value={form.seo?.ogImage || ''}
                onChange={e => updateNestedForm('seo', 'ogImage', e.target.value)}
                placeholder="Image for social sharing"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-orange-500 focus:outline-none"
              />
            </div>
            <UpdateSectionButton sectionName="SEO" />
          </div>
        );

      case 'integrations':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp Number</label>
              <input
                type="text"
                value={form.integrations?.whatsappNumber || ''}
                onChange={e => updateNestedForm('integrations', 'whatsappNumber', e.target.value)}
                placeholder="917979108108"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-orange-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp Pre-filled Message</label>
              <input
                type="text"
                value={form.integrations?.whatsappMessage || ''}
                onChange={e => updateNestedForm('integrations', 'whatsappMessage', e.target.value)}
                placeholder="Hi, I'm interested in..."
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-orange-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Primary Payment Link</label>
              <input
                type="text"
                value={form.integrations?.paymentLink || ''}
                onChange={e => updateNestedForm('integrations', 'paymentLink', e.target.value)}
                placeholder="https://..."
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-orange-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Google Analytics ID</label>
              <input
                type="text"
                value={form.integrations?.googleAnalyticsId || ''}
                onChange={e => updateNestedForm('integrations', 'googleAnalyticsId', e.target.value)}
                placeholder="G-XXXXXXXXXX"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-orange-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Facebook Pixel ID</label>
              <input
                type="text"
                value={form.integrations?.facebookPixelId || ''}
                onChange={e => updateNestedForm('integrations', 'facebookPixelId', e.target.value)}
                placeholder="XXXXXXXXXXXXXXXX"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-orange-500 focus:outline-none"
              />
            </div>
            <UpdateSectionButton sectionName="Integrations" />
          </div>
        );

      case 'countdown':
        return (
          <div className="space-y-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.countdown?.enabled || false}
                onChange={e => updateNestedForm('countdown', 'enabled', e.target.checked)}
              />
              <span className="font-medium">Enable Countdown Timer</span>
            </label>
            {form.countdown?.enabled && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Countdown End Date</label>
                  <input
                    type="datetime-local"
                    value={form.countdown?.endDate ? String(form.countdown.endDate).slice(0, 16) : ''}
                    onChange={e => updateNestedForm('countdown', 'endDate', e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-orange-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Countdown Message</label>
                  <input
                    type="text"
                    value={form.countdown?.message || 'Registration closes in:'}
                    onChange={e => updateNestedForm('countdown', 'message', e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-orange-500 focus:outline-none"
                  />
                </div>
              </>
            )}
            <UpdateSectionButton sectionName="Countdown" />
          </div>
        );

      case 'social':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Social Proof Numbers</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Students Count</label>
                <input
                  type="number"
                  value={form.socialProof?.studentsCount || ''}
                  onChange={e => updateNestedForm('socialProof', 'studentsCount', Number(e.target.value) || undefined)}
                  placeholder="10000"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-orange-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reviews Count</label>
                <input
                  type="number"
                  value={form.socialProof?.reviewsCount || ''}
                  onChange={e => updateNestedForm('socialProof', 'reviewsCount', Number(e.target.value) || undefined)}
                  placeholder="500"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-orange-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Average Rating</label>
                <input
                  type="number"
                  step="0.1"
                  min="1"
                  max="5"
                  value={form.socialProof?.avgRating || ''}
                  onChange={e => updateNestedForm('socialProof', 'avgRating', Number(e.target.value) || undefined)}
                  placeholder="4.8"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-orange-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Years of Experience</label>
                <input
                  type="number"
                  value={form.socialProof?.yearsExperience || ''}
                  onChange={e => updateNestedForm('socialProof', 'yearsExperience', Number(e.target.value) || undefined)}
                  placeholder="15"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-orange-500 focus:outline-none"
                />
              </div>
            </div>
            <UpdateSectionButton sectionName="Social Proof" />
          </div>
        );

      case 'problem':
        return (
          <div className="space-y-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.problemStatement?.enabled || false}
                onChange={e => updateNestedForm('problemStatement', 'enabled', e.target.checked)}
              />
              <span className="font-medium">Enable Problem Statement Section</span>
            </label>
            {form.problemStatement?.enabled && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                  <input
                    type="text"
                    value={form.problemStatement?.title || 'Are You Facing These Problems?'}
                    onChange={e => updateNestedForm('problemStatement', 'title', e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-orange-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Subtitle</label>
                  <input
                    type="text"
                    value={form.problemStatement?.subtitle || ''}
                    onChange={e => updateNestedForm('problemStatement', 'subtitle', e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-orange-500 focus:outline-none"
                  />
                </div>
                <div className="flex justify-between items-center">
                  <h4 className="font-medium">Pain Points</h4>
                  <button
                    onClick={() => {
                      const points = form.problemStatement?.points || [];
                      updateNestedForm('problemStatement', 'points', [...points, { icon: '😫', title: '', description: '' }]);
                    }}
                    className="rounded-lg bg-orange-500 px-3 py-1.5 text-sm text-white hover:bg-orange-600"
                  >
                    + Add Pain Point
                  </button>
                </div>
                {(form.problemStatement?.points || []).map((point, idx) => (
                  <div key={idx} className="rounded-lg border border-gray-200 p-3 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Point #{idx + 1}</span>
                      <button
                        onClick={() => {
                          const points = [...(form.problemStatement?.points || [])];
                          points.splice(idx, 1);
                          updateNestedForm('problemStatement', 'points', points);
                        }}
                        className="text-red-500 text-sm"
                      >Remove</button>
                    </div>
                    <div className="grid grid-cols-[60px_1fr] gap-2">
                      <input
                        placeholder="Icon"
                        value={point.icon || ''}
                        onChange={e => {
                          const points = [...(form.problemStatement?.points || [])];
                          points[idx] = { ...point, icon: e.target.value };
                          updateNestedForm('problemStatement', 'points', points);
                        }}
                        className="rounded border px-2 py-1.5 text-sm text-center"
                      />
                      <input
                        placeholder="Title"
                        value={point.title || ''}
                        onChange={e => {
                          const points = [...(form.problemStatement?.points || [])];
                          points[idx] = { ...point, title: e.target.value };
                          updateNestedForm('problemStatement', 'points', points);
                        }}
                        className="rounded border px-2 py-1.5 text-sm"
                      />
                    </div>
                    <textarea
                      placeholder="Description"
                      value={point.description || ''}
                      onChange={e => {
                        const points = [...(form.problemStatement?.points || [])];
                        points[idx] = { ...point, description: e.target.value };
                        updateNestedForm('problemStatement', 'points', points);
                      }}
                      rows={2}
                      className="w-full rounded border px-2 py-1.5 text-sm"
                    />
                  </div>
                ))}
              </>
            )}
            <UpdateSectionButton sectionName="Problem Statement" />
          </div>
        );

      case 'solution':
        return (
          <div className="space-y-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.solution?.enabled || false}
                onChange={e => updateNestedForm('solution', 'enabled', e.target.checked)}
              />
              <span className="font-medium">Enable Solution Section</span>
            </label>
            {form.solution?.enabled && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                  <input
                    type="text"
                    value={form.solution?.title || "Here's Your Solution"}
                    onChange={e => updateNestedForm('solution', 'title', e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-orange-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Subtitle</label>
                  <input
                    type="text"
                    value={form.solution?.subtitle || ''}
                    onChange={e => updateNestedForm('solution', 'subtitle', e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-orange-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={form.solution?.description || ''}
                    onChange={e => updateNestedForm('solution', 'description', e.target.value)}
                    rows={3}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-orange-500 focus:outline-none"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Image URL</label>
                    <input
                      type="text"
                      value={form.solution?.image || ''}
                      onChange={e => updateNestedForm('solution', 'image', e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-orange-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Video URL</label>
                    <input
                      type="text"
                      value={form.solution?.videoUrl || ''}
                      onChange={e => updateNestedForm('solution', 'videoUrl', e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-orange-500 focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Key Points (one per line)</label>
                  <textarea
                    value={(form.solution?.points || []).join('\n')}
                    onChange={e => updateNestedForm('solution', 'points', e.target.value.split('\n').filter(Boolean))}
                    rows={4}
                    placeholder="Enter solution points, one per line..."
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-orange-500 focus:outline-none"
                  />
                </div>
              </>
            )}
            <UpdateSectionButton sectionName="Solution" />
          </div>
        );

      case 'howitworks':
        return (
          <div className="space-y-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.howItWorks?.enabled || false}
                onChange={e => updateNestedForm('howItWorks', 'enabled', e.target.checked)}
              />
              <span className="font-medium">Enable How It Works Section</span>
            </label>
            {form.howItWorks?.enabled && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                  <input
                    type="text"
                    value={form.howItWorks?.title || 'How It Works'}
                    onChange={e => updateNestedForm('howItWorks', 'title', e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-orange-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Subtitle</label>
                  <input
                    type="text"
                    value={form.howItWorks?.subtitle || ''}
                    onChange={e => updateNestedForm('howItWorks', 'subtitle', e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-orange-500 focus:outline-none"
                  />
                </div>
                <div className="flex justify-between items-center">
                  <h4 className="font-medium">Steps</h4>
                  <button
                    onClick={() => {
                      const steps = form.howItWorks?.steps || [];
                      updateNestedForm('howItWorks', 'steps', [...steps, { number: steps.length + 1, icon: '📌', title: '', description: '' }]);
                    }}
                    className="rounded-lg bg-orange-500 px-3 py-1.5 text-sm text-white hover:bg-orange-600"
                  >
                    + Add Step
                  </button>
                </div>
                {(form.howItWorks?.steps || []).map((step, idx) => (
                  <div key={idx} className="rounded-lg border border-gray-200 p-3 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Step #{idx + 1}</span>
                      <button
                        onClick={() => {
                          const steps = [...(form.howItWorks?.steps || [])];
                          steps.splice(idx, 1);
                          updateNestedForm('howItWorks', 'steps', steps);
                        }}
                        className="text-red-500 text-sm"
                      >Remove</button>
                    </div>
                    <div className="grid grid-cols-[60px_60px_1fr] gap-2">
                      <input
                        placeholder="#"
                        type="number"
                        value={step.number || idx + 1}
                        onChange={e => {
                          const steps = [...(form.howItWorks?.steps || [])];
                          steps[idx] = { ...step, number: parseInt(e.target.value) };
                          updateNestedForm('howItWorks', 'steps', steps);
                        }}
                        className="rounded border px-2 py-1.5 text-sm text-center"
                      />
                      <input
                        placeholder="Icon"
                        value={step.icon || ''}
                        onChange={e => {
                          const steps = [...(form.howItWorks?.steps || [])];
                          steps[idx] = { ...step, icon: e.target.value };
                          updateNestedForm('howItWorks', 'steps', steps);
                        }}
                        className="rounded border px-2 py-1.5 text-sm text-center"
                      />
                      <input
                        placeholder="Title"
                        value={step.title || ''}
                        onChange={e => {
                          const steps = [...(form.howItWorks?.steps || [])];
                          steps[idx] = { ...step, title: e.target.value };
                          updateNestedForm('howItWorks', 'steps', steps);
                        }}
                        className="rounded border px-2 py-1.5 text-sm"
                      />
                    </div>
                    <textarea
                      placeholder="Description"
                      value={step.description || ''}
                      onChange={e => {
                        const steps = [...(form.howItWorks?.steps || [])];
                        steps[idx] = { ...step, description: e.target.value };
                        updateNestedForm('howItWorks', 'steps', steps);
                      }}
                      rows={2}
                      className="w-full rounded border px-2 py-1.5 text-sm"
                    />
                  </div>
                ))}
              </>
            )}
            <UpdateSectionButton sectionName="How It Works" />
          </div>
        );

      case 'successstories':
        return (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Success Stories</h3>
              <button
                onClick={() => addArrayItem('successStories', { name: '', title: '', testimonial: '' })}
                className="rounded-lg bg-orange-500 px-3 py-1.5 text-sm text-white hover:bg-orange-600"
              >
                + Add Story
              </button>
            </div>
            {(form.successStories || []).map((story, idx) => (
              <div key={idx} className="rounded-lg border border-gray-200 p-4 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Story #{idx + 1}</span>
                  <button onClick={() => removeArrayItem('successStories', idx)} className="text-red-500 text-sm">Remove</button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    placeholder="Name"
                    value={story.name || ''}
                    onChange={e => updateArrayItem('successStories', idx, { ...story, name: e.target.value })}
                    className="rounded border px-2 py-1.5 text-sm"
                  />
                  <input
                    placeholder="Title/Role"
                    value={story.title || ''}
                    onChange={e => updateArrayItem('successStories', idx, { ...story, title: e.target.value })}
                    className="rounded border px-2 py-1.5 text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    placeholder="Photo URL"
                    value={story.image || ''}
                    onChange={e => updateArrayItem('successStories', idx, { ...story, image: e.target.value })}
                    className="rounded border px-2 py-1.5 text-sm"
                  />
                  <input
                    placeholder="Video URL (testimonial)"
                    value={story.videoUrl || ''}
                    onChange={e => updateArrayItem('successStories', idx, { ...story, videoUrl: e.target.value })}
                    className="rounded border px-2 py-1.5 text-sm"
                  />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    placeholder="Before Stats"
                    value={story.beforeStats || ''}
                    onChange={e => updateArrayItem('successStories', idx, { ...story, beforeStats: e.target.value })}
                    className="rounded border px-2 py-1.5 text-sm"
                  />
                  <input
                    placeholder="After Stats"
                    value={story.afterStats || ''}
                    onChange={e => updateArrayItem('successStories', idx, { ...story, afterStats: e.target.value })}
                    className="rounded border px-2 py-1.5 text-sm"
                  />
                  <input
                    placeholder="Duration (e.g., 3 months)"
                    value={story.duration || ''}
                    onChange={e => updateArrayItem('successStories', idx, { ...story, duration: e.target.value })}
                    className="rounded border px-2 py-1.5 text-sm"
                  />
                </div>
                <textarea
                  placeholder="Testimonial text"
                  value={story.testimonial || ''}
                  onChange={e => updateArrayItem('successStories', idx, { ...story, testimonial: e.target.value })}
                  rows={3}
                  className="w-full rounded border px-2 py-1.5 text-sm"
                />
              </div>
            ))}
            <UpdateSectionButton sectionName="Success Stories" />
          </div>
        );

      case 'bonuses':
        return (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Bonuses</h3>
              <button
                onClick={() => addArrayItem('bonuses', { title: '', description: '', value: 0, currency: 'INR' })}
                className="rounded-lg bg-orange-500 px-3 py-1.5 text-sm text-white hover:bg-orange-600"
              >
                + Add Bonus
              </button>
            </div>
            {(form.bonuses || []).map((bonus, idx) => (
              <div key={idx} className="rounded-lg border border-gray-200 p-4 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Bonus #{idx + 1}</span>
                  <button onClick={() => removeArrayItem('bonuses', idx)} className="text-red-500 text-sm">Remove</button>
                </div>
                <input
                  placeholder="Bonus Title"
                  value={bonus.title || ''}
                  onChange={e => updateArrayItem('bonuses', idx, { ...bonus, title: e.target.value })}
                  className="w-full rounded border px-2 py-1.5 text-sm"
                />
                <textarea
                  placeholder="Description"
                  value={bonus.description || ''}
                  onChange={e => updateArrayItem('bonuses', idx, { ...bonus, description: e.target.value })}
                  rows={2}
                  className="w-full rounded border px-2 py-1.5 text-sm"
                />
                <div className="grid grid-cols-3 gap-2">
                  <input
                    placeholder="Value"
                    type="number"
                    value={bonus.value || ''}
                    onChange={e => updateArrayItem('bonuses', idx, { ...bonus, value: parseInt(e.target.value) || 0 })}
                    className="rounded border px-2 py-1.5 text-sm"
                  />
                  <select
                    value={bonus.currency || 'INR'}
                    onChange={e => updateArrayItem('bonuses', idx, { ...bonus, currency: e.target.value })}
                    className="rounded border px-2 py-1.5 text-sm"
                  >
                    <option value="INR">INR</option>
                    <option value="USD">USD</option>
                  </select>
                  <input
                    placeholder="Image URL"
                    value={bonus.image || ''}
                    onChange={e => updateArrayItem('bonuses', idx, { ...bonus, image: e.target.value })}
                    className="rounded border px-2 py-1.5 text-sm"
                  />
                </div>
              </div>
            ))}
            <UpdateSectionButton sectionName="Bonuses" />
          </div>
        );

      case 'trust':
        return (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Trust Badges & Partner Logos</h3>
              <button
                onClick={() => addArrayItem('trustBadges', { image: '', title: '', link: '' })}
                className="rounded-lg bg-orange-500 px-3 py-1.5 text-sm text-white hover:bg-orange-600"
              >
                + Add Badge
              </button>
            </div>
            {(form.trustBadges || []).map((badge, idx) => (
              <div key={idx} className="rounded-lg border border-gray-200 p-3 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Badge #{idx + 1}</span>
                  <button onClick={() => removeArrayItem('trustBadges', idx)} className="text-red-500 text-sm">Remove</button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    placeholder="Image URL"
                    value={badge.image || ''}
                    onChange={e => updateArrayItem('trustBadges', idx, { ...badge, image: e.target.value })}
                    className="rounded border px-2 py-1.5 text-sm"
                  />
                  <input
                    placeholder="Title/Alt Text"
                    value={badge.title || ''}
                    onChange={e => updateArrayItem('trustBadges', idx, { ...badge, title: e.target.value })}
                    className="rounded border px-2 py-1.5 text-sm"
                  />
                  <input
                    placeholder="Link (optional)"
                    value={badge.link || ''}
                    onChange={e => updateArrayItem('trustBadges', idx, { ...badge, link: e.target.value })}
                    className="rounded border px-2 py-1.5 text-sm"
                  />
                </div>
                {badge.image && <img src={badge.image} alt={badge.title || 'Badge'} className="h-12 object-contain" />}
              </div>
            ))}
            <UpdateSectionButton sectionName="Trust Badges" />
          </div>
        );

      case 'guarantee':
        return (
          <div className="space-y-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.guarantee?.enabled || false}
                onChange={e => updateNestedForm('guarantee', 'enabled', e.target.checked)}
              />
              <span className="font-medium">Enable Money-Back Guarantee</span>
            </label>
            {form.guarantee?.enabled && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Guarantee Title</label>
                  <input
                    type="text"
                    value={form.guarantee?.title || '100% Money-Back Guarantee'}
                    onChange={e => updateNestedForm('guarantee', 'title', e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-orange-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Number of Days</label>
                  <input
                    type="number"
                    value={form.guarantee?.days || 7}
                    onChange={e => updateNestedForm('guarantee', 'days', parseInt(e.target.value) || 7)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-orange-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={form.guarantee?.description || ''}
                    onChange={e => updateNestedForm('guarantee', 'description', e.target.value)}
                    rows={3}
                    placeholder="Explain your guarantee policy..."
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-orange-500 focus:outline-none"
                  />
                </div>
              </>
            )}
            <UpdateSectionButton sectionName="Guarantee" />
          </div>
        );

      case 'urgency':
        return (
          <div className="space-y-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.urgency?.enabled || false}
                onChange={e => updateNestedForm('urgency', 'enabled', e.target.checked)}
              />
              <span className="font-medium">Enable Urgency/Scarcity</span>
            </label>
            {form.urgency?.enabled && (
              <>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.urgency?.limitedSeats || false}
                    onChange={e => updateNestedForm('urgency', 'limitedSeats', e.target.checked)}
                  />
                  <span className="text-sm">Show Limited Seats</span>
                </label>
                {form.urgency?.limitedSeats && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 ml-6">
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Total Seats</label>
                      <input
                        type="number"
                        value={form.urgency?.totalSeats || ''}
                        onChange={e => updateNestedForm('urgency', 'totalSeats', parseInt(e.target.value))}
                        className="w-full rounded border px-2 py-1.5 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Seats Remaining</label>
                      <input
                        type="number"
                        value={form.urgency?.seatsRemaining || ''}
                        onChange={e => updateNestedForm('urgency', 'seatsRemaining', parseInt(e.target.value))}
                        className="w-full rounded border px-2 py-1.5 text-sm"
                      />
                    </div>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Early Bird Deadline</label>
                  <input
                    type="datetime-local"
                    value={form.urgency?.earlyBirdDeadline ? String(form.urgency.earlyBirdDeadline).slice(0, 16) : ''}
                    onChange={e => updateNestedForm('urgency', 'earlyBirdDeadline', e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-orange-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Early Bird Message</label>
                  <input
                    type="text"
                    value={form.urgency?.earlyBirdMessage || ''}
                    onChange={e => updateNestedForm('urgency', 'earlyBirdMessage', e.target.value)}
                    placeholder="Save 50% - Limited time offer!"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-orange-500 focus:outline-none"
                  />
                </div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.urgency?.showLiveCount || false}
                    onChange={e => updateNestedForm('urgency', 'showLiveCount', e.target.checked)}
                  />
                  <span className="text-sm">Show "X people viewing now"</span>
                </label>
              </>
            )}
            <UpdateSectionButton sectionName="Urgency" />
          </div>
        );

      case 'transformation':
        return (
          <div className="space-y-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.transformation?.enabled || false}
                onChange={e => updateNestedForm('transformation', 'enabled', e.target.checked)}
              />
              <span className="font-medium">Enable Before/After Transformation</span>
            </label>
            {form.transformation?.enabled && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Section Title</label>
                  <input
                    type="text"
                    value={form.transformation?.title || 'Your Transformation Journey'}
                    onChange={e => updateNestedForm('transformation', 'title', e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-orange-500 focus:outline-none"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">Before (Pain Points)</label>
                    <input
                      type="text"
                      placeholder="Before Title"
                      value={form.transformation?.before?.title || 'Before'}
                      onChange={e => {
                        const before = { ...(form.transformation?.before || { title: '', points: [] }), title: e.target.value };
                        updateNestedForm('transformation', 'before', before);
                      }}
                      className="w-full rounded border px-2 py-1.5 text-sm"
                    />
                    <textarea
                      placeholder="Before points (one per line)"
                      value={(form.transformation?.before?.points || []).join('\n')}
                      onChange={e => {
                        const before = { ...(form.transformation?.before || { title: '', points: [] }), points: e.target.value.split('\n').filter(Boolean) };
                        updateNestedForm('transformation', 'before', before);
                      }}
                      rows={5}
                      className="w-full rounded border px-2 py-1.5 text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">After (Results)</label>
                    <input
                      type="text"
                      placeholder="After Title"
                      value={form.transformation?.after?.title || 'After'}
                      onChange={e => {
                        const after = { ...(form.transformation?.after || { title: '', points: [] }), title: e.target.value };
                        updateNestedForm('transformation', 'after', after);
                      }}
                      className="w-full rounded border px-2 py-1.5 text-sm"
                    />
                    <textarea
                      placeholder="After points (one per line)"
                      value={(form.transformation?.after?.points || []).join('\n')}
                      onChange={e => {
                        const after = { ...(form.transformation?.after || { title: '', points: [] }), points: e.target.value.split('\n').filter(Boolean) };
                        updateNestedForm('transformation', 'after', after);
                      }}
                      rows={5}
                      className="w-full rounded border px-2 py-1.5 text-sm"
                    />
                  </div>
                </div>
              </>
            )}
            <UpdateSectionButton sectionName="Transformation" />
          </div>
        );

      case 'video':
        return (
          <div className="space-y-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.videoSection?.enabled || false}
                onChange={e => updateNestedForm('videoSection', 'enabled', e.target.checked)}
              />
              <span className="font-medium">Enable Video Section</span>
            </label>
            {form.videoSection?.enabled && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                  <input
                    type="text"
                    value={form.videoSection?.title || ''}
                    onChange={e => updateNestedForm('videoSection', 'title', e.target.value)}
                    placeholder="Watch This First"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-orange-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={form.videoSection?.description || ''}
                    onChange={e => updateNestedForm('videoSection', 'description', e.target.value)}
                    rows={2}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-orange-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Video URL</label>
                  <input
                    type="text"
                    value={form.videoSection?.videoUrl || ''}
                    onChange={e => updateNestedForm('videoSection', 'videoUrl', e.target.value)}
                    placeholder="https://youtube.com/..."
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-orange-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Thumbnail URL (optional)</label>
                  <input
                    type="text"
                    value={form.videoSection?.thumbnailUrl || ''}
                    onChange={e => updateNestedForm('videoSection', 'thumbnailUrl', e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-orange-500 focus:outline-none"
                  />
                </div>
              </>
            )}
            <UpdateSectionButton sectionName="Video" />
          </div>
        );

      case 'navigation':
        return (
          <div className="space-y-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.navigation?.enabled !== false}
                onChange={e => updateNestedForm('navigation', 'enabled', e.target.checked)}
              />
              <span className="font-medium">Enable Navigation Bar</span>
            </label>
            {form.navigation?.enabled !== false && (
              <>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={form.navigation?.showLogo !== false}
                      onChange={e => updateNestedForm('navigation', 'showLogo', e.target.checked)}
                    />
                    <span className="text-sm">Show Logo</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={form.navigation?.showLogin || false}
                      onChange={e => updateNestedForm('navigation', 'showLogin', e.target.checked)}
                    />
                    <span className="text-sm">Show Login Button</span>
                  </label>
                </div>
                {form.navigation?.showLogin && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Login URL</label>
                    <input
                      type="text"
                      value={form.navigation?.loginLink || ''}
                      onChange={e => updateNestedForm('navigation', 'loginLink', e.target.value)}
                      placeholder="/login"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-orange-500 focus:outline-none"
                    />
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <h4 className="font-medium">Navigation Links</h4>
                  <button
                    onClick={() => {
                      const links = form.navigation?.links || [];
                      updateNestedForm('navigation', 'links', [...links, { label: '', href: '' }]);
                    }}
                    className="rounded-lg bg-orange-500 px-3 py-1.5 text-sm text-white hover:bg-orange-600"
                  >
                    + Add Link
                  </button>
                </div>
                {(form.navigation?.links || []).map((link, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <input
                      placeholder="Label"
                      value={link.label || ''}
                      onChange={e => {
                        const links = [...(form.navigation?.links || [])];
                        links[idx] = { ...link, label: e.target.value };
                        updateNestedForm('navigation', 'links', links);
                      }}
                      className="flex-1 rounded border px-2 py-1.5 text-sm"
                    />
                    <input
                      placeholder="URL (e.g., #pricing)"
                      value={link.href || ''}
                      onChange={e => {
                        const links = [...(form.navigation?.links || [])];
                        links[idx] = { ...link, href: e.target.value };
                        updateNestedForm('navigation', 'links', links);
                      }}
                      className="flex-1 rounded border px-2 py-1.5 text-sm"
                    />
                    <button
                      onClick={() => {
                        const links = [...(form.navigation?.links || [])];
                        links.splice(idx, 1);
                        updateNestedForm('navigation', 'links', links);
                      }}
                      className="text-red-500 text-sm px-2"
                    >×</button>
                  </div>
                ))}
              </>
            )}
            <hr className="my-4" />
            <h4 className="font-medium">Logo Settings</h4>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Logo URL</label>
              <input
                type="text"
                value={form.logo?.url || ''}
                onChange={e => updateNestedForm('logo', 'url', e.target.value)}
                placeholder="https://..."
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-orange-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Logo Alt Text</label>
              <input
                type="text"
                value={form.logo?.altText || 'Logo'}
                onChange={e => updateNestedForm('logo', 'altText', e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-orange-500 focus:outline-none"
              />
            </div>
            <UpdateSectionButton sectionName="Navigation" />
          </div>
        );

      case 'leadmagnet':
        return (
          <div className="space-y-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.leadMagnet?.enabled || false}
                onChange={e => updateNestedForm('leadMagnet', 'enabled', e.target.checked)}
              />
              <span className="font-medium">Enable Lead Magnet / Free Resource</span>
            </label>
            {form.leadMagnet?.enabled && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                  <input
                    type="text"
                    value={form.leadMagnet?.title || 'Get Your Free Guide!'}
                    onChange={e => updateNestedForm('leadMagnet', 'title', e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-orange-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Subtitle</label>
                  <input
                    type="text"
                    value={form.leadMagnet?.subtitle || ''}
                    onChange={e => updateNestedForm('leadMagnet', 'subtitle', e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-orange-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={form.leadMagnet?.description || ''}
                    onChange={e => updateNestedForm('leadMagnet', 'description', e.target.value)}
                    rows={3}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-orange-500 focus:outline-none"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Image URL</label>
                    <input
                      type="text"
                      value={form.leadMagnet?.image || ''}
                      onChange={e => updateNestedForm('leadMagnet', 'image', e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-orange-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Download URL</label>
                    <input
                      type="text"
                      value={form.leadMagnet?.downloadUrl || ''}
                      onChange={e => updateNestedForm('leadMagnet', 'downloadUrl', e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-orange-500 focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Button Text</label>
                  <input
                    type="text"
                    value={form.leadMagnet?.buttonText || 'Download Free Guide'}
                    onChange={e => updateNestedForm('leadMagnet', 'buttonText', e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-orange-500 focus:outline-none"
                  />
                </div>
              </>
            )}
            <UpdateSectionButton sectionName="Lead Magnet" />
          </div>
        );

      case 'footer':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Footer Settings</h3>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.footer?.showAbout !== false}
                onChange={e => updateNestedForm('footer', 'showAbout', e.target.checked)}
              />
              <span className="text-sm">Show About Section</span>
            </label>
            {form.footer?.showAbout !== false && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">About Text</label>
                <textarea
                  value={form.footer?.aboutText || ''}
                  onChange={e => updateNestedForm('footer', 'aboutText', e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-orange-500 focus:outline-none"
                />
              </div>
            )}

            <h4 className="font-medium pt-4">Social Links</h4>
            <div className="grid grid-cols-2 gap-3">
              {['facebook', 'instagram', 'youtube', 'twitter', 'linkedin'].map(platform => (
                <div key={platform}>
                  <label className="block text-xs text-gray-600 mb-1 capitalize">{platform}</label>
                  <input
                    type="text"
                    value={(form.footer?.socialLinks as any)?.[platform] || ''}
                    onChange={e => {
                      const socialLinks = { ...(form.footer?.socialLinks || {}), [platform]: e.target.value };
                      updateNestedForm('footer', 'socialLinks', socialLinks);
                    }}
                    placeholder={`https://${platform}.com/...`}
                    className="w-full rounded border px-2 py-1.5 text-sm"
                  />
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center pt-4">
              <h4 className="font-medium">Quick Links</h4>
              <button
                onClick={() => {
                  const quickLinks = form.footer?.quickLinks || [];
                  updateNestedForm('footer', 'quickLinks', [...quickLinks, { label: '', href: '' }]);
                }}
                className="rounded-lg bg-orange-500 px-3 py-1.5 text-sm text-white hover:bg-orange-600"
              >
                + Add Link
              </button>
            </div>
            {(form.footer?.quickLinks || []).map((link, idx) => (
              <div key={idx} className="flex gap-2 items-center">
                <input
                  placeholder="Label"
                  value={link.label || ''}
                  onChange={e => {
                    const links = [...(form.footer?.quickLinks || [])];
                    links[idx] = { ...link, label: e.target.value };
                    updateNestedForm('footer', 'quickLinks', links);
                  }}
                  className="flex-1 rounded border px-2 py-1.5 text-sm"
                />
                <input
                  placeholder="URL"
                  value={link.href || ''}
                  onChange={e => {
                    const links = [...(form.footer?.quickLinks || [])];
                    links[idx] = { ...link, href: e.target.value };
                    updateNestedForm('footer', 'quickLinks', links);
                  }}
                  className="flex-1 rounded border px-2 py-1.5 text-sm"
                />
                <button
                  onClick={() => {
                    const links = [...(form.footer?.quickLinks || [])];
                    links.splice(idx, 1);
                    updateNestedForm('footer', 'quickLinks', links);
                  }}
                  className="text-red-500 text-sm px-2"
                >×</button>
              </div>
            ))}

            <h4 className="font-medium pt-4">Policy Links</h4>
            <div className="space-y-3">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.footer?.showPrivacyPolicy !== false}
                  onChange={e => updateNestedForm('footer', 'showPrivacyPolicy', e.target.checked)}
                />
                <span className="text-sm">Privacy Policy</span>
              </label>
              {form.footer?.showPrivacyPolicy !== false && (
                <input
                  type="text"
                  value={form.footer?.privacyPolicyLink || ''}
                  onChange={e => updateNestedForm('footer', 'privacyPolicyLink', e.target.value)}
                  placeholder="/privacy-policy"
                  className="w-full rounded border px-2 py-1.5 text-sm ml-6"
                />
              )}
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.footer?.showTerms !== false}
                  onChange={e => updateNestedForm('footer', 'showTerms', e.target.checked)}
                />
                <span className="text-sm">Terms & Conditions</span>
              </label>
              {form.footer?.showTerms !== false && (
                <input
                  type="text"
                  value={form.footer?.termsLink || ''}
                  onChange={e => updateNestedForm('footer', 'termsLink', e.target.value)}
                  placeholder="/terms"
                  className="w-full rounded border px-2 py-1.5 text-sm ml-6"
                />
              )}
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.footer?.showRefundPolicy !== false}
                  onChange={e => updateNestedForm('footer', 'showRefundPolicy', e.target.checked)}
                />
                <span className="text-sm">Refund Policy</span>
              </label>
              {form.footer?.showRefundPolicy !== false && (
                <input
                  type="text"
                  value={form.footer?.refundPolicyLink || ''}
                  onChange={e => updateNestedForm('footer', 'refundPolicyLink', e.target.value)}
                  placeholder="/refund-policy"
                  className="w-full rounded border px-2 py-1.5 text-sm ml-6"
                />
              )}
            </div>

            <div className="pt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Copyright Text</label>
              <input
                type="text"
                value={form.footer?.copyrightText || ''}
                onChange={e => updateNestedForm('footer', 'copyrightText', e.target.value)}
                placeholder="© 2024 Swar Yoga. All rights reserved."
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-orange-500 focus:outline-none"
              />
            </div>

            <h4 className="font-medium pt-4">Contact Information</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Email</label>
                <input
                  type="text"
                  value={form.contactInfo?.email || ''}
                  onChange={e => updateNestedForm('contactInfo', 'email', e.target.value)}
                  placeholder="contact@example.com"
                  className="w-full rounded border px-2 py-1.5 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Phone</label>
                <input
                  type="text"
                  value={form.contactInfo?.phone || ''}
                  onChange={e => updateNestedForm('contactInfo', 'phone', e.target.value)}
                  placeholder="+91 99999 99999"
                  className="w-full rounded border px-2 py-1.5 text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Address</label>
              <input
                type="text"
                value={form.contactInfo?.address || ''}
                onChange={e => updateNestedForm('contactInfo', 'address', e.target.value)}
                className="w-full rounded border px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Google Maps Embed URL</label>
              <input
                type="text"
                value={form.contactInfo?.mapEmbed || ''}
                onChange={e => updateNestedForm('contactInfo', 'mapEmbed', e.target.value)}
                placeholder="https://www.google.com/maps/embed?..."
                className="w-full rounded border px-2 py-1.5 text-sm"
              />
            </div>
            <UpdateSectionButton sectionName="Footer" />
          </div>
        );

      case 'productdemo':
        return (
          <div className="space-y-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.productDemo?.enabled || false}
                onChange={e => updateNestedForm('productDemo', 'enabled', e.target.checked)}
              />
              <span className="font-medium">Enable Product Demo Section</span>
            </label>
            {form.productDemo?.enabled && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                  <input
                    type="text"
                    value={form.productDemo?.title || ''}
                    onChange={e => updateNestedForm('productDemo', 'title', e.target.value)}
                    placeholder="See It In Action"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-orange-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={form.productDemo?.description || ''}
                    onChange={e => updateNestedForm('productDemo', 'description', e.target.value)}
                    rows={2}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-orange-500 focus:outline-none"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Demo Type</label>
                    <select
                      value={form.productDemo?.demoType || 'video'}
                      onChange={e => updateNestedForm('productDemo', 'demoType', e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-orange-500 focus:outline-none"
                    >
                      <option value="video">Video</option>
                      <option value="gif">GIF/Animation</option>
                      <option value="interactive">Interactive</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Media URL</label>
                    <input
                      type="text"
                      value={form.productDemo?.mediaUrl || ''}
                      onChange={e => updateNestedForm('productDemo', 'mediaUrl', e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-orange-500 focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Screenshots (one URL per line)</label>
                  <textarea
                    value={(form.productDemo?.screenshots || []).join('\n')}
                    onChange={e => updateNestedForm('productDemo', 'screenshots', e.target.value.split('\n').filter(Boolean))}
                    rows={3}
                    placeholder="https://example.com/screenshot1.jpg"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-orange-500 focus:outline-none"
                  />
                </div>
              </>
            )}
            <UpdateSectionButton sectionName="Product Demo" />
          </div>
        );

      case 'newsletter':
        return (
          <div className="space-y-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.newsletter?.enabled || false}
                onChange={e => updateNestedForm('newsletter', 'enabled', e.target.checked)}
              />
              <span className="font-medium">Enable Newsletter Signup</span>
            </label>
            {form.newsletter?.enabled && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                  <input
                    type="text"
                    value={form.newsletter?.title || 'Stay Updated'}
                    onChange={e => updateNestedForm('newsletter', 'title', e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-orange-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Subtitle</label>
                  <input
                    type="text"
                    value={form.newsletter?.subtitle || ''}
                    onChange={e => updateNestedForm('newsletter', 'subtitle', e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-orange-500 focus:outline-none"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Button Text</label>
                    <input
                      type="text"
                      value={form.newsletter?.buttonText || 'Subscribe'}
                      onChange={e => updateNestedForm('newsletter', 'buttonText', e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-orange-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Placeholder</label>
                    <input
                      type="text"
                      value={form.newsletter?.placeholder || 'Enter your email'}
                      onChange={e => updateNestedForm('newsletter', 'placeholder', e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-orange-500 focus:outline-none"
                    />
                  </div>
                </div>
              </>
            )}
            <UpdateSectionButton sectionName="Newsletter" />
          </div>
        );

      case 'comparison':
        return (
          <div className="space-y-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.comparisonTable?.enabled || false}
                onChange={e => updateNestedForm('comparisonTable', 'enabled', e.target.checked)}
              />
              <span className="font-medium">Enable Comparison Table</span>
            </label>
            {form.comparisonTable?.enabled && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                  <input
                    type="text"
                    value={form.comparisonTable?.title || ''}
                    onChange={e => updateNestedForm('comparisonTable', 'title', e.target.value)}
                    placeholder="Compare Options"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-orange-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Column Headers (comma-separated)</label>
                  <input
                    type="text"
                    value={(form.comparisonTable?.headers || []).join(', ')}
                    onChange={e => updateNestedForm('comparisonTable', 'headers', e.target.value.split(',').map(h => h.trim()).filter(Boolean))}
                    placeholder="Feature, Basic, Pro, Premium"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-orange-500 focus:outline-none"
                  />
                </div>
                <div className="flex justify-between items-center">
                  <h4 className="font-medium">Rows</h4>
                  <button
                    onClick={() => {
                      const rows = form.comparisonTable?.rows || [];
                      const headerCount = (form.comparisonTable?.headers || []).length;
                      updateNestedForm('comparisonTable', 'rows', [...rows, { feature: '', values: Array(headerCount > 1 ? headerCount - 1 : 2).fill('') }]);
                    }}
                    className="rounded-lg bg-orange-500 px-3 py-1.5 text-sm text-white hover:bg-orange-600"
                  >
                    + Add Row
                  </button>
                </div>
                {(form.comparisonTable?.rows || []).map((row, idx) => (
                  <div key={idx} className="rounded-lg border border-gray-200 p-3 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Row #{idx + 1}</span>
                      <button
                        onClick={() => {
                          const rows = [...(form.comparisonTable?.rows || [])];
                          rows.splice(idx, 1);
                          updateNestedForm('comparisonTable', 'rows', rows);
                        }}
                        className="text-red-500 text-sm"
                      >Remove</button>
                    </div>
                    <input
                      placeholder="Feature name"
                      value={row.feature || ''}
                      onChange={e => {
                        const rows = [...(form.comparisonTable?.rows || [])];
                        rows[idx] = { ...row, feature: e.target.value };
                        updateNestedForm('comparisonTable', 'rows', rows);
                      }}
                      className="w-full rounded border px-2 py-1.5 text-sm"
                    />
                    <input
                      placeholder="Values (comma-separated, e.g., ✓, ✗, ✓)"
                      value={(row.values || []).join(', ')}
                      onChange={e => {
                        const rows = [...(form.comparisonTable?.rows || [])];
                        rows[idx] = { ...row, values: e.target.value.split(',').map(v => v.trim()) };
                        updateNestedForm('comparisonTable', 'rows', rows);
                      }}
                      className="w-full rounded border px-2 py-1.5 text-sm"
                    />
                  </div>
                ))}
              </>
            )}
            <UpdateSectionButton sectionName="Comparison" />
          </div>
        );

      case 'popup':
        return (
          <div className="space-y-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.popup?.enabled || false}
                onChange={e => updateNestedForm('popup', 'enabled', e.target.checked)}
              />
              <span className="font-medium">Enable Popup</span>
            </label>
            {form.popup?.enabled && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Popup Type</label>
                  <select
                    value={form.popup?.type || 'timer'}
                    onChange={e => updateNestedForm('popup', 'type', e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-orange-500 focus:outline-none"
                  >
                    <option value="timer">Timer (Delay)</option>
                    <option value="exit-intent">Exit Intent</option>
                    <option value="scroll">Scroll Percentage</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {form.popup?.type === 'scroll' ? 'Scroll % Trigger' : 'Delay (ms)'}
                  </label>
                  <input
                    type="number"
                    value={form.popup?.delay || 5000}
                    onChange={e => updateNestedForm('popup', 'delay', parseInt(e.target.value))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-orange-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                  <input
                    type="text"
                    value={form.popup?.title || ''}
                    onChange={e => updateNestedForm('popup', 'title', e.target.value)}
                    placeholder="Wait! Don't Miss This..."
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-orange-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={form.popup?.description || ''}
                    onChange={e => updateNestedForm('popup', 'description', e.target.value)}
                    rows={2}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-orange-500 focus:outline-none"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">CTA Text</label>
                    <input
                      type="text"
                      value={form.popup?.ctaText || 'Get Special Offer'}
                      onChange={e => updateNestedForm('popup', 'ctaText', e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-orange-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">CTA Link</label>
                    <input
                      type="text"
                      value={form.popup?.ctaLink || ''}
                      onChange={e => updateNestedForm('popup', 'ctaLink', e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-orange-500 focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Image URL (optional)</label>
                  <input
                    type="text"
                    value={form.popup?.image || ''}
                    onChange={e => updateNestedForm('popup', 'image', e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-orange-500 focus:outline-none"
                  />
                </div>
              </>
            )}
            <UpdateSectionButton sectionName="Popup" />
          </div>
        );

      case 'sticky':
        return (
          <div className="space-y-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.stickyHeader?.enabled !== false}
                onChange={e => updateNestedForm('stickyHeader', 'enabled', e.target.checked)}
              />
              <span className="font-medium">Enable Sticky Header CTA</span>
            </label>
            {form.stickyHeader?.enabled !== false && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Header Text</label>
                  <input
                    type="text"
                    value={form.stickyHeader?.text || ''}
                    onChange={e => updateNestedForm('stickyHeader', 'text', e.target.value)}
                    placeholder="Limited time offer - Enroll now!"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-orange-500 focus:outline-none"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">CTA Text</label>
                    <input
                      type="text"
                      value={form.stickyHeader?.ctaText || 'Enroll Now'}
                      onChange={e => updateNestedForm('stickyHeader', 'ctaText', e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-orange-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">CTA Link</label>
                    <input
                      type="text"
                      value={form.stickyHeader?.ctaLink || ''}
                      onChange={e => updateNestedForm('stickyHeader', 'ctaLink', e.target.value)}
                      placeholder="#pricing"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-orange-500 focus:outline-none"
                    />
                  </div>
                </div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.stickyHeader?.showCountdown || false}
                    onChange={e => updateNestedForm('stickyHeader', 'showCountdown', e.target.checked)}
                  />
                  <span className="text-sm">Show Countdown in Sticky Header</span>
                </label>
              </>
            )}
            <UpdateSectionButton sectionName="Sticky Header" />
          </div>
        );

      case 'announcement':
        return (
          <div className="space-y-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.announcementBar?.enabled || false}
                onChange={e => updateNestedForm('announcementBar', 'enabled', e.target.checked)}
              />
              <span className="font-medium">Enable Announcement Bar</span>
            </label>
            {form.announcementBar?.enabled && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Announcement Text</label>
                  <input
                    type="text"
                    value={form.announcementBar?.text || ''}
                    onChange={e => updateNestedForm('announcementBar', 'text', e.target.value)}
                    placeholder="🎉 Special Launch Offer - 50% OFF!"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-orange-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Link (optional)</label>
                  <input
                    type="text"
                    value={form.announcementBar?.link || ''}
                    onChange={e => updateNestedForm('announcementBar', 'link', e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-orange-500 focus:outline-none"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Background Color</label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={form.announcementBar?.backgroundColor || '#FF6B35'}
                        onChange={e => updateNestedForm('announcementBar', 'backgroundColor', e.target.value)}
                        className="h-10 w-14 rounded border"
                      />
                      <input
                        type="text"
                        value={form.announcementBar?.backgroundColor || '#FF6B35'}
                        onChange={e => updateNestedForm('announcementBar', 'backgroundColor', e.target.value)}
                        className="flex-1 rounded border px-2 text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Text Color</label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={form.announcementBar?.textColor || '#FFFFFF'}
                        onChange={e => updateNestedForm('announcementBar', 'textColor', e.target.value)}
                        className="h-10 w-14 rounded border"
                      />
                      <input
                        type="text"
                        value={form.announcementBar?.textColor || '#FFFFFF'}
                        onChange={e => updateNestedForm('announcementBar', 'textColor', e.target.value)}
                        className="flex-1 rounded border px-2 text-sm"
                      />
                    </div>
                  </div>
                </div>
              </>
            )}
            <UpdateSectionButton sectionName="Announcement" />
          </div>
        );

      case 'registration':
        return (
          <div className="space-y-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.registrationForm?.enabled || false}
                onChange={e => updateNestedForm('registrationForm', 'enabled', e.target.checked)}
              />
              <span className="font-medium">Enable Custom Registration Form</span>
            </label>
            {form.registrationForm?.enabled && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Form Title</label>
                  <input
                    type="text"
                    value={form.registrationForm?.title || 'Register Now'}
                    onChange={e => updateNestedForm('registrationForm', 'title', e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-orange-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Subtitle</label>
                  <input
                    type="text"
                    value={form.registrationForm?.subtitle || ''}
                    onChange={e => updateNestedForm('registrationForm', 'subtitle', e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-orange-500 focus:outline-none"
                  />
                </div>
                <div className="flex justify-between items-center">
                  <h4 className="font-medium">Form Fields</h4>
                  <button
                    onClick={() => {
                      const fields = form.registrationForm?.fields || [];
                      updateNestedForm('registrationForm', 'fields', [...fields, { name: '', type: 'text', required: false, placeholder: '' }]);
                    }}
                    className="rounded-lg bg-orange-500 px-3 py-1.5 text-sm text-white hover:bg-orange-600"
                  >
                    + Add Field
                  </button>
                </div>
                {(form.registrationForm?.fields || []).map((field, idx) => (
                  <div key={idx} className="rounded-lg border border-gray-200 p-3 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Field #{idx + 1}</span>
                      <button
                        onClick={() => {
                          const fields = [...(form.registrationForm?.fields || [])];
                          fields.splice(idx, 1);
                          updateNestedForm('registrationForm', 'fields', fields);
                        }}
                        className="text-red-500 text-sm"
                      >Remove</button>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <input
                        placeholder="Field Name"
                        value={field.name || ''}
                        onChange={e => {
                          const fields = [...(form.registrationForm?.fields || [])];
                          fields[idx] = { ...field, name: e.target.value };
                          updateNestedForm('registrationForm', 'fields', fields);
                        }}
                        className="rounded border px-2 py-1.5 text-sm"
                      />
                      <select
                        value={field.type || 'text'}
                        onChange={e => {
                          const fields = [...(form.registrationForm?.fields || [])];
                          fields[idx] = { ...field, type: e.target.value as any };
                          updateNestedForm('registrationForm', 'fields', fields);
                        }}
                        className="rounded border px-2 py-1.5 text-sm"
                      >
                        <option value="text">Text</option>
                        <option value="email">Email</option>
                        <option value="phone">Phone</option>
                        <option value="select">Dropdown</option>
                        <option value="textarea">Text Area</option>
                      </select>
                      <label className="flex items-center gap-1 text-sm">
                        <input
                          type="checkbox"
                          checked={field.required || false}
                          onChange={e => {
                            const fields = [...(form.registrationForm?.fields || [])];
                            fields[idx] = { ...field, required: e.target.checked };
                            updateNestedForm('registrationForm', 'fields', fields);
                          }}
                        />
                        Required
                      </label>
                    </div>
                    <input
                      placeholder="Placeholder text"
                      value={field.placeholder || ''}
                      onChange={e => {
                        const fields = [...(form.registrationForm?.fields || [])];
                        fields[idx] = { ...field, placeholder: e.target.value };
                        updateNestedForm('registrationForm', 'fields', fields);
                      }}
                      className="w-full rounded border px-2 py-1.5 text-sm"
                    />
                    {field.type === 'select' && (
                      <input
                        placeholder="Options (comma-separated)"
                        value={(field.options || []).join(', ')}
                        onChange={e => {
                          const fields = [...(form.registrationForm?.fields || [])];
                          fields[idx] = { ...field, options: e.target.value.split(',').map(o => o.trim()).filter(Boolean) };
                          updateNestedForm('registrationForm', 'fields', fields);
                        }}
                        className="w-full rounded border px-2 py-1.5 text-sm"
                      />
                    )}
                  </div>
                ))}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Submit Button Text</label>
                    <input
                      type="text"
                      value={form.registrationForm?.submitText || 'Register Now'}
                      onChange={e => updateNestedForm('registrationForm', 'submitText', e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-orange-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Success Message</label>
                    <input
                      type="text"
                      value={form.registrationForm?.successMessage || 'Thank you! We will contact you soon.'}
                      onChange={e => updateNestedForm('registrationForm', 'successMessage', e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-orange-500 focus:outline-none"
                    />
                  </div>
                </div>
              </>
            )}
            <UpdateSectionButton sectionName="Registration" />
          </div>
        );

      case 'notifications':
        return (
          <div className="space-y-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.liveNotifications?.enabled || false}
                onChange={e => updateNestedForm('liveNotifications', 'enabled', e.target.checked)}
              />
              <span className="font-medium">Enable Live Notifications (Social Proof)</span>
            </label>
            {form.liveNotifications?.enabled && (
              <>
                <p className="text-sm text-gray-500">
                  Add messages that will randomly appear to show recent activity. Use placeholders like names and locations.
                </p>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notification Messages (one per line)</label>
                  <textarea
                    value={(form.liveNotifications?.messages || []).join('\n')}
                    onChange={e => updateNestedForm('liveNotifications', 'messages', e.target.value.split('\n').filter(Boolean))}
                    rows={6}
                    placeholder="John from Delhi just enrolled!&#10;Sarah from Mumbai registered 2 mins ago&#10;15 people enrolled today"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-orange-500 focus:outline-none"
                  />
                </div>
              </>
            )}
            <UpdateSectionButton sectionName="Notifications" />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-16'}`}>
        <main className="p-6">
          {/* Header */}
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Landing Page Builder</h1>
              <p className="text-sm text-gray-500">Create high-converting landing pages for your workshops</p>
            </div>
            <button
              onClick={openCreate}
              className="flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 font-semibold text-white hover:bg-orange-600"
            >
              <span>+</span> Create Landing Page
            </button>
          </div>

          {/* Alerts */}
          {error && (
            <div className="mb-4 rounded-lg bg-red-50 p-4 text-red-700">
              {error}
              <button onClick={() => setError('')} className="ml-2 text-red-500 hover:text-red-700">×</button>
            </div>
          )}
          {success && (
            <div className="mb-4 rounded-lg bg-green-50 p-4 text-green-700">
              {success}
            </div>
          )}

          {/* Filters */}
          <div className="mb-6 flex flex-wrap gap-4">
            <div className="flex gap-2">
              {(['all', 'draft', 'published', 'archived'] as const).map(s => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                    statusFilter === s
                      ? 'bg-orange-500 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search landing pages..."
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-orange-500 focus:outline-none"
            />
          </div>

          {/* Landing Pages List */}
          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-200 border-t-orange-500"></div>
            </div>
          ) : landingPages.length === 0 ? (
            <div className="rounded-lg bg-white p-12 text-center shadow">
              <p className="text-gray-500">No landing pages found. Create your first one!</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {landingPages.map(page => (
                <div key={page._id} className="rounded-lg bg-white p-4 shadow hover:shadow-md transition">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-gray-900">{page.name}</h3>
                      <p className="text-xs text-gray-500">/lp/{page.slug}</p>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[page.status]}`}>
                      {page.status}
                    </span>
                  </div>

                  {page.heroHeading && (
                    <p className="text-sm text-gray-600 mb-2 line-clamp-2">{page.heroHeading}</p>
                  )}

                  <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
                    <span>👁 {page.views || 0} views</span>
                    <span>🎯 {page.conversions || 0} conversions</span>
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => openEdit(page)}
                      className="rounded bg-gray-900 px-3 py-1 text-xs text-white hover:bg-gray-800"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleTogglePublish(page)}
                      className={`rounded px-3 py-1 text-xs ${
                        page.status === 'published'
                          ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                          : 'bg-green-100 text-green-800 hover:bg-green-200'
                      }`}
                    >
                      {page.status === 'published' ? 'Unpublish' : 'Publish'}
                    </button>
                    <a
                      href={`/lp/${page.slug}?preview=true`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded bg-blue-100 px-3 py-1 text-xs text-blue-800 hover:bg-blue-200"
                    >
                      Preview
                    </a>
                    <button
                      onClick={() => handleDelete(page._id)}
                      className="rounded bg-red-100 px-3 py-1 text-xs text-red-800 hover:bg-red-200"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Editor Modal */}
      {showEditor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-[95vw] max-h-[95vh] rounded-xl bg-white shadow-2xl flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b px-6 py-4 flex-shrink-0">
              <h2 className="text-xl font-bold">
                {editingPage ? 'Edit Landing Page' : 'Create Landing Page'}
              </h2>
              <div className="flex items-center gap-4">
                {/* Preview Toggle */}
                <button
                  onClick={() => setShowPreview(!showPreview)}
                  className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                    showPreview ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <span>{showPreview ? '👁️' : '👁️‍🗨️'}</span>
                  {showPreview ? 'Hide Preview' : 'Show Preview'}
                </button>
                <button onClick={closeEditor} className="text-gray-500 hover:text-gray-700 text-2xl">×</button>
              </div>
            </div>

            <div className={`flex flex-1 min-h-0 overflow-hidden ${isDraggingSidebar || isDraggingContent ? 'select-none' : ''}`}>
              {/* Section Tabs - Collapsible Groups */}
              <div 
                className="border-r bg-gray-50 flex-shrink-0 flex flex-col"
                style={{ width: `${sidebarWidth}px` }}
              >
                {/* Search Bar */}
                <div className="p-3 border-b bg-white">
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Sections</div>
                </div>
                {/* Scrollable Groups */}
                <div className="flex-1 overflow-y-auto p-2">
                  {SECTION_GROUPS.map(group => {
                    const isExpanded = expandedGroups[group.id];
                    const hasActiveSection = group.sections.some(s => s.key === activeSection);
                    
                    return (
                      <div key={group.id} className="mb-1">
                        {/* Group Header */}
                        <button
                          onClick={() => toggleGroup(group.id)}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition ${
                            hasActiveSection
                              ? 'bg-orange-50 text-orange-700 border border-orange-200'
                              : 'text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span>{group.icon}</span>
                            <span>{group.label}</span>
                            <span className="text-xs text-gray-400">({group.sections.length})</span>
                          </div>
                          <span className={`text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                            ▼
                          </span>
                        </button>
                        
                        {/* Group Items */}
                        {isExpanded && (
                          <div className="ml-2 mt-1 space-y-0.5 border-l-2 border-gray-200 pl-2">
                            {group.sections.map(section => (
                              <button
                                key={section.key}
                                onClick={() => setActiveSection(section.key)}
                                className={`w-full rounded-md px-2.5 py-1.5 text-left text-xs transition flex items-center gap-2 ${
                                  activeSection === section.key
                                    ? 'bg-orange-500 text-white font-medium'
                                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                                }`}
                              >
                                <span>{section.icon}</span>
                                <span>{section.label}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                {/* Quick Jump Footer */}
                <div className="p-2 border-t bg-white">
                  <div className="text-xs text-gray-500 text-center">
                    {SECTION_GROUPS.reduce((acc, g) => acc + g.sections.length, 0)} sections total
                  </div>
                </div>
              </div>

              {/* Sidebar Resize Handle */}
              <div
                onMouseDown={handleSidebarDrag}
                className={`w-1 flex-shrink-0 cursor-col-resize hover:bg-orange-400 transition-colors ${
                  isDraggingSidebar ? 'bg-orange-500' : 'bg-gray-200 hover:bg-orange-300'
                }`}
                title="Drag to resize sidebar"
              />

              {/* Section Content */}
              <div 
                className="p-6 overflow-y-auto flex-shrink-0"
                style={{ width: showPreview ? `${contentWidth}px` : undefined, flex: showPreview ? undefined : 1 }}
              >
                {renderSectionContent()}
              </div>

              {/* Live Preview Pane */}
              {showPreview && (
                <>
                  {/* Content Resize Handle */}
                  <div
                    onMouseDown={handleContentDrag}
                    className={`w-1 flex-shrink-0 cursor-col-resize hover:bg-orange-400 transition-colors ${
                      isDraggingContent ? 'bg-orange-500' : 'bg-gray-200 hover:bg-orange-300'
                    }`}
                    title="Drag to resize content panel"
                  />
                  
                  <div className="flex-1 bg-gray-100 flex flex-col min-w-0">
                  {/* Preview Controls */}
                  <div className="flex items-center justify-between border-b bg-white px-3 py-2 flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-700">Preview</span>
                      {form.slug && (
                        <a
                          href={`/lp/${form.slug}?preview=true`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-orange-600 hover:underline"
                        >
                          Open in new tab ↗
                        </a>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Device Mode Buttons */}
                      <div className="flex items-center bg-gray-100 rounded-lg p-1">
                        <button
                          onClick={() => { setDeviceMode('mobile'); setPreviewZoom(0.5); }}
                          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition ${
                            deviceMode === 'mobile' ? 'bg-white shadow text-orange-600' : 'text-gray-600 hover:bg-gray-200'
                          }`}
                          title="Mobile (375px)"
                        >
                          <span>📱</span>
                          <span className="hidden sm:inline">Mobile</span>
                        </button>
                        <button
                          onClick={() => { setDeviceMode('tablet'); setPreviewZoom(0.45); }}
                          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition ${
                            deviceMode === 'tablet' ? 'bg-white shadow text-orange-600' : 'text-gray-600 hover:bg-gray-200'
                          }`}
                          title="Tablet (768px)"
                        >
                          <span>📟</span>
                          <span className="hidden sm:inline">Tablet</span>
                        </button>
                        <button
                          onClick={() => { setDeviceMode('desktop'); setPreviewZoom(0.4); }}
                          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition ${
                            deviceMode === 'desktop' ? 'bg-white shadow text-orange-600' : 'text-gray-600 hover:bg-gray-200'
                          }`}
                          title="Desktop (1280px)"
                        >
                          <span>🖥️</span>
                          <span className="hidden sm:inline">Desktop</span>
                        </button>
                      </div>
                      <div className="w-px h-6 bg-gray-300" />
                      {/* Zoom Controls */}
                      <button
                        onClick={() => setPreviewZoom(Math.max(0.2, previewZoom - 0.1))}
                        className="w-7 h-7 rounded bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold text-sm"
                        title="Zoom out"
                      >
                        −
                      </button>
                      <span className="text-xs font-medium text-gray-600 w-10 text-center">
                        {Math.round(previewZoom * 100)}%
                      </span>
                      <button
                        onClick={() => setPreviewZoom(Math.min(1, previewZoom + 0.1))}
                        className="w-7 h-7 rounded bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold text-sm"
                        title="Zoom in"
                      >
                        +
                      </button>
                      <div className="w-px h-6 bg-gray-300" />
                      {/* Refresh Preview */}
                      <button
                        onClick={() => setPreviewKey(k => k + 1)}
                        className="w-7 h-7 rounded bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm"
                        title="Refresh preview"
                      >
                        🔄
                      </button>
                    </div>
                  </div>

                  {/* Device Info Bar */}
                  <div className="bg-gray-800 text-white px-4 py-1.5 flex items-center justify-center gap-3 text-xs">
                    <span className="opacity-75">
                      {deviceMode === 'mobile' && '📱 Mobile View'}
                      {deviceMode === 'tablet' && '📟 Tablet View'}
                      {deviceMode === 'desktop' && '🖥️ Desktop View'}
                    </span>
                    <span className="font-mono bg-gray-700 px-2 py-0.5 rounded">
                      {DEVICE_WIDTHS[deviceMode]}px
                    </span>
                  </div>

                  {/* Color Palette Bar */}
                  {showColorPalette && (
                    <div className="bg-white border-b px-3 py-2">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        {/* All Used Colors with Labels & Hex Codes */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">Used Colors:</span>
                          <div className="flex items-center gap-2 flex-wrap">
                            {(() => {
                              // Define labeled colors with their names
                              const themeColors = [
                                { color: form.theme?.primaryColor || '#F59E0B', label: 'Primary', short: 'Pri' },
                                { color: form.theme?.secondaryColor || '#1E3A5F', label: 'Secondary (Blue)', short: 'Sec' },
                                { color: form.theme?.accentColor || '#FCD34D', label: 'Accent', short: 'Acc' },
                                { color: form.theme?.backgroundColor || '#FFFFFF', label: 'Background', short: 'BG' },
                                { color: form.theme?.textColor || '#1F2937', label: 'Text', short: 'Txt' },
                              ];
                              
                              return themeColors.map(({ color, label, short }) => (
                                <div 
                                  key={label}
                                  className="flex flex-col items-center gap-0.5 group relative"
                                >
                                  <div 
                                    className="w-8 h-8 rounded-lg border-2 border-gray-300 shadow-md cursor-pointer hover:scale-110 transition-transform"
                                    style={{ backgroundColor: color }}
                                    title={`${label}: ${color}`}
                                  />
                                  <span className="text-[8px] text-gray-500 font-semibold">{short}</span>
                                  <span className="text-[7px] text-gray-400 font-mono">{color.slice(0, 7)}</span>
                                  {/* Tooltip on hover */}
                                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-50">
                                    <div className="bg-gray-900 text-white text-[10px] px-2 py-1 rounded shadow-lg whitespace-nowrap">
                                      {label}
                                    </div>
                                  </div>
                                </div>
                              ));
                            })()}
                          </div>
                        </div>
                        
                        {/* History Navigation */}
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              if (colorHistoryIndex > 0) {
                                const prevColors = colorHistory[colorHistoryIndex - 1];
                                updateNestedForm('theme', 'primaryColor', prevColors.primaryColor);
                                updateNestedForm('theme', 'secondaryColor', prevColors.secondaryColor);
                                updateNestedForm('theme', 'accentColor', prevColors.accentColor);
                                updateNestedForm('theme', 'backgroundColor', prevColors.backgroundColor);
                                updateNestedForm('theme', 'textColor', prevColors.textColor);
                                setColorHistoryIndex(colorHistoryIndex - 1);
                                setPreviewKey(k => k + 1);
                              }
                            }}
                            disabled={colorHistoryIndex <= 0}
                            className="w-6 h-6 rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-xs"
                            title="Previous color scheme"
                          >
                            ←
                          </button>
                          <span className="text-[10px] text-gray-400 font-mono min-w-[40px] text-center">
                            {colorHistoryIndex >= 0 ? `${colorHistoryIndex + 1}/${colorHistory.length}` : '--'}
                          </span>
                          <button
                            onClick={() => {
                              if (colorHistoryIndex < colorHistory.length - 1) {
                                const nextColors = colorHistory[colorHistoryIndex + 1];
                                updateNestedForm('theme', 'primaryColor', nextColors.primaryColor);
                                updateNestedForm('theme', 'secondaryColor', nextColors.secondaryColor);
                                updateNestedForm('theme', 'accentColor', nextColors.accentColor);
                                updateNestedForm('theme', 'backgroundColor', nextColors.backgroundColor);
                                updateNestedForm('theme', 'textColor', nextColors.textColor);
                                setColorHistoryIndex(colorHistoryIndex + 1);
                                setPreviewKey(k => k + 1);
                              }
                            }}
                            disabled={colorHistoryIndex >= colorHistory.length - 1}
                            className="w-6 h-6 rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-xs"
                            title="Next color scheme"
                          >
                            →
                          </button>
                        </div>
                        
                        {/* Apply Colors Button */}
                        <button
                          onClick={() => {
                            // Save current colors to history
                            const currentColors = {
                              primaryColor: form.theme?.primaryColor || '#F59E0B',
                              secondaryColor: form.theme?.secondaryColor || '#1E3A5F',
                              accentColor: form.theme?.accentColor || '#FCD34D',
                              backgroundColor: form.theme?.backgroundColor || '#FFFFFF',
                              textColor: form.theme?.textColor || '#1F2937',
                            };
                            
                            // Only add if different from last entry
                            const lastEntry = colorHistory[colorHistory.length - 1];
                            if (!lastEntry || JSON.stringify(lastEntry) !== JSON.stringify(currentColors)) {
                              const newHistory = [...colorHistory.slice(0, colorHistoryIndex + 1), currentColors];
                              setColorHistory(newHistory);
                              setColorHistoryIndex(newHistory.length - 1);
                            }
                            
                            // Refresh preview
                            setPreviewKey(k => k + 1);
                          }}
                          className="px-3 py-1.5 bg-gradient-to-r from-orange-500 to-amber-500 text-white text-xs font-semibold rounded-lg hover:from-orange-600 hover:to-amber-600 shadow-sm transition-all flex items-center gap-1.5"
                        >
                          <span>✨</span>
                          Apply Colors
                        </button>
                        
                        {/* Toggle */}
                        <button
                          onClick={() => setShowColorPalette(false)}
                          className="text-gray-400 hover:text-gray-600 p-1"
                          title="Hide color palette"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  )}
                  
                  {/* Show Color Palette Button (when hidden) */}
                  {!showColorPalette && (
                    <button
                      onClick={() => setShowColorPalette(true)}
                      className="absolute top-20 right-2 z-10 px-2 py-1 bg-white/90 border border-gray-200 rounded-lg text-xs text-gray-600 hover:bg-white shadow-sm"
                    >
                      🎨 Colors
                    </button>
                  )}

                  {/* Preview Frame Container */}
                  <div className="flex-1 overflow-auto p-4 flex items-start justify-center bg-gradient-to-b from-gray-200 to-gray-300">
                    {form.slug ? (
                      <div
                        className={`bg-white rounded-lg shadow-2xl overflow-hidden ${
                          deviceMode === 'mobile' ? 'rounded-3xl border-4 border-gray-800' : 
                          deviceMode === 'tablet' ? 'rounded-2xl border-4 border-gray-700' : 
                          'border border-gray-300'
                        }`}
                        style={{
                          width: `${DEVICE_WIDTHS[deviceMode]}px`,
                          transform: `scale(${previewZoom})`,
                          transformOrigin: 'top center',
                        }}
                      >
                        {/* Device Notch for Mobile */}
                        {deviceMode === 'mobile' && (
                          <div className="bg-gray-800 h-6 flex items-center justify-center">
                            <div className="w-20 h-4 bg-gray-900 rounded-full" />
                          </div>
                        )}
                        {/* Device Top Bar for Tablet */}
                        {deviceMode === 'tablet' && (
                          <div className="bg-gray-700 h-3 flex items-center justify-center">
                            <div className="w-2 h-2 bg-gray-600 rounded-full" />
                          </div>
                        )}
                        <iframe
                          key={`${previewKey}-${deviceMode}`}
                          src={`/lp/${form.slug}?preview=true&primaryColor=${encodeURIComponent(form.theme?.primaryColor || '#F59E0B')}&secondaryColor=${encodeURIComponent(form.theme?.secondaryColor || '#1E3A5F')}&accentColor=${encodeURIComponent(form.theme?.accentColor || '#FCD34D')}&backgroundColor=${encodeURIComponent(form.theme?.backgroundColor || '#FFFFFF')}&textColor=${encodeURIComponent(form.theme?.textColor || '#1F2937')}&heroImageFit=${encodeURIComponent(form.heroImageFit || 'cover')}&heroImagePosition=${encodeURIComponent(form.heroImagePosition || 'center')}`}
                          className="w-full border-0"
                          style={{ 
                            height: deviceMode === 'mobile' ? '667px' : deviceMode === 'tablet' ? '1024px' : '900px',
                            minHeight: '500px'
                          }}
                          title="Landing Page Preview"
                        />
                        {/* Device Home Button for Mobile */}
                        {deviceMode === 'mobile' && (
                          <div className="bg-gray-800 h-5 flex items-center justify-center">
                            <div className="w-12 h-1 bg-gray-600 rounded-full" />
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-gray-500 bg-white p-8 rounded-lg shadow">
                        <span className="text-6xl mb-4">📝</span>
                        <p className="text-lg font-medium">Enter a URL slug to see preview</p>
                        <p className="text-sm">Go to Basic Info and set a slug first</p>
                      </div>
                    )}
                  </div>
                </div>
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between border-t px-6 py-4 flex-shrink-0 bg-white">
              <div className="text-sm text-gray-500">
                {form.slug && (
                  <span>
                    URL: <code className="rounded bg-gray-100 px-1">/lp/{form.slug}</code>
                  </span>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={closeEditor}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="rounded-lg bg-orange-500 px-6 py-2 font-semibold text-white hover:bg-orange-600 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editingPage ? 'Update Page' : 'Create Page'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Template Selection Modal */}
      {showTemplates && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4">
          <div className="my-8 w-full max-w-4xl rounded-xl bg-white shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b px-6 py-4">
              <div>
                <h2 className="text-xl font-bold">Choose a Template</h2>
                <p className="text-sm text-gray-500">Select a pre-built template or start from scratch</p>
              </div>
              <button onClick={() => setShowTemplates(false)} className="text-gray-500 hover:text-gray-700 text-2xl">×</button>
            </div>

            <div className="p-6">
              {/* Start from scratch option */}
              <button
                onClick={() => selectTemplate(null)}
                className="mb-6 w-full rounded-lg border-2 border-dashed border-gray-300 p-6 text-center hover:border-orange-400 hover:bg-orange-50 transition group"
              >
                <div className="text-4xl mb-2">📝</div>
                <h3 className="font-semibold text-gray-900 group-hover:text-orange-600">Start from Scratch</h3>
                <p className="text-sm text-gray-500">Create a blank landing page with default settings</p>
              </button>

              {/* Template Grid */}
              <h3 className="font-semibold text-gray-900 mb-4">Pre-built Templates</h3>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {SAMPLE_TEMPLATES.map(template => (
                  <button
                    key={template.id}
                    onClick={() => selectTemplate(template.id)}
                    className="rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition group text-left"
                  >
                    {/* Template Preview */}
                    <div
                      className="h-32 relative"
                      style={{ background: template.preview }}
                    >
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-4xl filter drop-shadow-lg">{template.name.split(' ')[0]}</span>
                      </div>
                      {/* Mobile/Desktop indicator */}
                      <div className="absolute bottom-2 right-2 flex gap-1">
                        <span className="bg-white/90 rounded px-1.5 py-0.5 text-xs">📱</span>
                        <span className="bg-white/90 rounded px-1.5 py-0.5 text-xs">🖥️</span>
                      </div>
                    </div>
                    {/* Template Info */}
                    <div className="p-4">
                      <h4 className="font-semibold text-gray-900 group-hover:text-orange-600">
                        {template.name}
                      </h4>
                      <p className="text-xs text-gray-500 mt-1">{template.description}</p>
                      {/* Color swatches */}
                      <div className="flex gap-1 mt-3">
                        <span
                          className="w-5 h-5 rounded-full border border-gray-200"
                          style={{ backgroundColor: template.theme?.primaryColor || '#FF6B35' }}
                          title="Primary"
                        />
                        <span
                          className="w-5 h-5 rounded-full border border-gray-200"
                          style={{ backgroundColor: template.theme?.secondaryColor || '#1E3A5F' }}
                          title="Secondary"
                        />
                        <span
                          className="w-5 h-5 rounded-full border border-gray-200"
                          style={{ backgroundColor: template.theme?.accentColor || '#FFD700' }}
                          title="Accent"
                        />
                        <span
                          className="w-5 h-5 rounded-full border border-gray-200"
                          style={{ backgroundColor: template.theme?.backgroundColor || '#FFFFFF' }}
                          title="Background"
                        />
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
