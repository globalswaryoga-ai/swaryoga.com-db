'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { MediaPreview } from '@/components/admin/crm';
import {
  Users, MessageSquare, MessageCircle, Send, Mail, Phone, MoreVertical, Trash2, Edit, Shield,
  Search, ChevronDown, Plus, Filter, Download, ArrowRight, CheckCircle, AlertCircle,
  Clock, User, Settings, Loader, Globe, Upload, Bold, Italic, Strikethrough, Code, Smile, Wand2,
  Calendar, MapPin, Link as LinkIcon, Image as ImageIcon, Video as VideoIcon, FileText, Copy,
  Heart, Share2, Eye
} from 'lucide-react';

/**
 * Convert S3 URLs to proxied URLs for authenticated access
 * S3 bucket has "Block Public Access" enabled, so we need to proxy through API
 */
function getProxiedMediaUrl(url: string, authToken: string | null): string {
  if (!url) return url;
  
  // Check if it's an S3 URL (our bucket)
  const isS3Url = url.includes('.s3.') && url.includes('.amazonaws.com');
  
  if (isS3Url && authToken) {
    // Proxy through our API which will generate a signed URL and fetch the content
    return `/api/admin/crm/media/proxy?url=${encodeURIComponent(url)}&token=${encodeURIComponent(authToken)}`;
  }
  
  return url;
}

type CommunityButton = {
  id: string;
  label: string;
  actionType: 'link' | 'phone' | 'text';
  url?: string;
  phoneNumber?: string;
};

interface CommunityMember {
  _id: string;
   userId?: string;
  name: string;
  email?: string;
  mobile: string;
  communityName: string;
  joinedAt: string;
  status: 'active' | 'inactive' | 'banned';
  approved?: boolean;
  approvedAt?: string;
  messageCount: number;
  reactions: number;
  chatEnabled?: boolean;
  metadata?: {
    requestMessage?: string;
    workshopsCompleted?: boolean;
    requestId?: string;
  };
  chatPermissions?: {
    canSend?: boolean;
    allowText?: boolean;
    allowLinks?: boolean;
    allowImages?: boolean;
    allowVideos?: boolean;
    allowDocuments?: boolean;
  };
}

interface Community {
  id: string;
  _id?: string;
  name: string;
  icon: string;
  memberCount: number;
  joinLink?: string;
  type?: string;
}

// Default communities as fallback - will be merged with DB communities
const DEFAULT_COMMUNITIES: Community[] = [
  { id: 'global', name: 'Global Community', icon: '🌍', memberCount: 0, joinLink: 'https://swaryoga.com/community?join=global', type: 'global' },
  { id: 'swar-yoga', name: 'Swar Yoga', icon: '🎵', memberCount: 0, joinLink: 'https://swaryoga.com/community?join=swar-yoga' },
  { id: 'aham-bramhasmi', name: 'Aham Bramhasmi', icon: '✨', memberCount: 0, joinLink: 'https://swaryoga.com/community?join=aham-bramhasmi' },
  { id: 'astavakra', name: 'Astavakra', icon: '🧘', memberCount: 0, joinLink: 'https://swaryoga.com/community?join=astavakra' },
  { id: 'shivoham', name: 'Shivoham', icon: '🔱', memberCount: 0, joinLink: 'https://swaryoga.com/community?join=shivoham' },
  { id: 'i-am-fit', name: 'I am Fit', icon: '💪', memberCount: 0, joinLink: 'https://swaryoga.com/community?join=i-am-fit' },
  { id: 'youth', name: 'Youth', icon: '🚀', memberCount: 0, joinLink: 'https://swaryoga.com/community?join=youth' },
  { id: 'children', name: 'Children', icon: '👶', memberCount: 0, joinLink: 'https://swaryoga.com/community?join=children' },
  { id: 'married-couple', name: 'Married Couple', icon: '💍', memberCount: 0, joinLink: 'https://swaryoga.com/community?join=married-couple' },
  { id: 'investors', name: 'Investors', icon: '📈', memberCount: 0, joinLink: 'https://swaryoga.com/community?join=investors' },
  { id: 'children-yoga', name: 'Children Swar Yoga', icon: '👶', memberCount: 0, joinLink: 'https://swaryoga.com/community?join=children-yoga' },
  { id: 'youth-yoga', name: 'Youth Swar Yoga', icon: '🚀', memberCount: 0, joinLink: 'https://swaryoga.com/community?join=youth-yoga' },
  { id: 'english-yoga', name: 'English Swar Yoga', icon: '🌐', memberCount: 0, joinLink: 'https://swaryoga.com/community?join=english-yoga' },
  { id: 'shankara', name: 'Shankara', icon: '📚', memberCount: 0, joinLink: 'https://swaryoga.com/community?join=shankara' },
  { id: 'amrut-bhoj', name: 'Amrut Bhoj', icon: '🍯', memberCount: 0, joinLink: 'https://swaryoga.com/community?join=amrut-bhoj' },
  { id: 'yogasana', name: 'Yogasana', icon: '🕉️', memberCount: 0, joinLink: 'https://swaryoga.com/community?join=yogasana' },
  { id: 'businessman', name: 'Businessman', icon: '💼', memberCount: 0, joinLink: 'https://swaryoga.com/community?join=businessman' },
];

// Icon map for assigning icons to new communities
const COMMUNITY_ICONS: Record<string, string> = {
  global: '🌍', yoga: '🧘', workshop: '📚', fitness: '💪', youth: '🚀', 
  children: '👶', business: '💼', spiritual: '✨', music: '🎵', default: '🌟'
};

export default function AdminCommunityPage() {
  const router = useRouter();
  const token = useAuth();
  
  // Dynamic communities state - loaded from DB, fallback to defaults
  const [communities, setCommunities] = useState<Community[]>(DEFAULT_COMMUNITIES);
  const [loadingCommunities, setLoadingCommunities] = useState(true);
  const [showCreateCommunityModal, setShowCreateCommunityModal] = useState(false);
  const [newCommunityInput, setNewCommunityInput] = useState({ name: '', description: '', icon: '🌟' });
  const [creatingCommunity, setCreatingCommunity] = useState(false);
  
  const [selectedCommunity, setSelectedCommunity] = useState('global');
  const [members, setMembers] = useState<CommunityMember[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'banned' | 'pending'>('all');
  const [loading, setLoading] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<CommunityMember | null>(null);
  const [messageText, setMessageText] = useState('');
  const [actionDropdown, setActionDropdown] = useState<string | null>(null);

  const [showChatPermModal, setShowChatPermModal] = useState(false);
  const [chatPermSaving, setChatPermSaving] = useState(false);
  const [chatEnabled, setChatEnabled] = useState(true);
  const [canSend, setCanSend] = useState(true);
  const [allowText, setAllowText] = useState(true);
  const [allowLinks, setAllowLinks] = useState(true);
  const [allowImages, setAllowImages] = useState(true);
  const [allowVideos, setAllowVideos] = useState(true);
  const [allowDocuments, setAllowDocuments] = useState(true);
  const [searchUserQuery, setSearchUserQuery] = useState('');
  const [foundUser, setFoundUser] = useState<any>(null);
  const [searchingUser, setSearchingUser] = useState(false);
  const [addingMember, setAddingMember] = useState(false);
  const [showPostModal, setShowPostModal] = useState(false);
  
  const [postHeader, setPostHeader] = useState('');
  const [postContent, setPostContent] = useState('');
  const [postFooter, setPostFooter] = useState('');
  const [postButtons, setPostButtons] = useState<CommunityButton[]>([]);
  const [postTargetMode, setPostTargetMode] = useState<'selected' | 'all'>('selected');
  const [postSelectedCommunityIds, setPostSelectedCommunityIds] = useState<Set<string>>(new Set(['global']));
  const [crossPostMedia, setCrossPostMedia] = useState(false);
  const [crossPostSocial, setCrossPostSocial] = useState(false);
  const [postVideoUrl, setPostVideoUrl] = useState('');
  const [postDocUrl, setPostDocUrl] = useState('');
  const [postExtraLinks, setPostExtraLinks] = useState('');
  const [postType, setPostType] = useState<'text' | 'image' | 'video' | 'document' | 'link'>('text');
  const [postImageUrls, setPostImageUrls] = useState<string[]>([]);
  const [localImagePreview, setLocalImagePreview] = useState<string | null>(null);
  const [postScheduledAt, setPostScheduledAt] = useState('');
  const [postCategory, setPostCategory] = useState<'general' | 'experiences' | 'tips' | 'transformations' | 'questions'>('general');
  
  // Category-specific fields
  // Experiences & Transformations & Questions
  const [postParticipantName, setPostParticipantName] = useState('');
  const [postWorkshopName, setPostWorkshopName] = useState('');
  const [postBatchName, setPostBatchName] = useState('');
  // Experiences
  const [postExperienceDetails, setPostExperienceDetails] = useState('');
  // Tips & Tricks
  const [postProblemHeading, setPostProblemHeading] = useState('');
  const [postProblemDescription, setPostProblemDescription] = useState('');
  const [postTipsDetails, setPostTipsDetails] = useState('');
  // Transformations
  const [postBeforeStory, setPostBeforeStory] = useState('');
  const [postAfterStory, setPostAfterStory] = useState('');
  // Questions
  const [postQuestion, setPostQuestion] = useState('');
  const [postAnswer, setPostAnswer] = useState('');
  
  const [editingCommunityName, setEditingCommunityName] = useState(false);
  const [newCommunityName, setNewCommunityName] = useState('');
  const [editingWAId, setEditingWAId] = useState(false);
  const [newWAId, setNewWAId] = useState('');
  const [currentCommunityDb, setCurrentCommunityDb] = useState<any>(null);
  const [approving, setApproving] = useState<string | null>(null);
  
  const [previewWidth, setPreviewWidth] = useState<'mobile' | 'tablet'>('mobile');
  const [previewZoom, setPreviewZoom] = useState(1);

  // Posts Manager State
  const [activeTab, setActiveTab] = useState<'members' | 'posts' | 'recordings' | 'videos' | 'submissions'>('members');
  
  // User Submissions State
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [submissionsCounts, setSubmissionsCounts] = useState({ pending: 0, approved: 0, rejected: 0, posted: 0 });
  const [submissionsFilter, setSubmissionsFilter] = useState<'pending' | 'approved' | 'rejected' | 'posted' | 'all'>('pending');
  const [communityPosts, setCommunityPosts] = useState<any[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [postsPage, setPostsPage] = useState(1);
  const [postsLimit] = useState(20);
  const [totalPosts, setTotalPosts] = useState(0);
  
  // Recordings & Videos State
  const [recordings, setRecordings] = useState<any[]>([]);
  const [videos, setVideos] = useState<any[]>([]);
  const [loadingRecordings, setLoadingRecordings] = useState(false);
  const [loadingVideos, setLoadingVideos] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [videoTitle, setVideoTitle] = useState('');
  const [videoDescription, setVideoDescription] = useState('');
  const [showUploadVideoModal, setShowUploadVideoModal] = useState(false);
  
  // YouTube Video Add Modal State
  const [showAddYouTubeModal, setShowAddYouTubeModal] = useState(false);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [youtubeTitle, setYoutubeTitle] = useState('');
  const [youtubeDescription, setYoutubeDescription] = useState('');
  const [addingYouTube, setAddingYouTube] = useState(false);
  
  // YouTube Recording Add Modal State
  const [showAddYouTubeRecordingModal, setShowAddYouTubeRecordingModal] = useState(false);
  const [youtubeRecordingUrl, setYoutubeRecordingUrl] = useState('');
  const [addingYouTubeRecording, setAddingYouTubeRecording] = useState(false);
  
  // Recording Upload Modal State (Folder > Playlist > Video structure)
  const [showUploadRecordingModal, setShowUploadRecordingModal] = useState(false);
  const [recordingFolderName, setRecordingFolderName] = useState(''); // Workshop name
  const [recordingPlaylistName, setRecordingPlaylistName] = useState(''); // Batch name
  const [recordingVideoNumber, setRecordingVideoNumber] = useState(''); // Video number
  const [recordingDescription, setRecordingDescription] = useState('');
  const [uploadingRecording, setUploadingRecording] = useState(false);
  
  // Folder/Playlist view state for recordings
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [selectedPlaylist, setSelectedPlaylist] = useState<string | null>(null);
  const [draftPosts, setDraftPosts] = useState(0);
  const [pendingMembers, setPendingMembers] = useState(0);
  const [lastActivityTime, setLastActivityTime] = useState<string>('');
  const [postsSortBy, setPostsSortBy] = useState('createdAt');
  const [postsSortOrder, setPostsSortOrder] = useState('desc');
  const [postsSearchQuery, setPostsSearchQuery] = useState('');
  const [postCategoryFilter, setPostCategoryFilter] = useState<'all' | 'experiences' | 'tips' | 'transformations' | 'questions'>('all');
  const [showEditPostModal, setShowEditPostModal] = useState(false);
  const [editingPost, setEditingPost] = useState<any>(null);
  const [editPostContent, setEditPostContent] = useState('');
  const [editPostImages, setEditPostImages] = useState<string[]>([]);
  const [editPostStatus, setEditPostStatus] = useState<'published' | 'draft' | 'scheduled'>('published');
  const [editPostHeader, setEditPostHeader] = useState('');
  const [editPostFooter, setEditPostFooter] = useState('');
  const [editPostButtons, setEditPostButtons] = useState<any[]>([]);
  const [editingPostLoading, setEditingPostLoading] = useState(false);
  const [uploadingEditImage, setUploadingEditImage] = useState(false);
  const [deletingPostId, setDeletingPostId] = useState<string | null>(null);
  const [changingStatusId, setChangingStatusId] = useState<string | null>(null);
  
  // Comments Management State
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [selectedPostForComments, setSelectedPostForComments] = useState<any>(null);
  const [deletingCommentIndex, setDeletingCommentIndex] = useState<number | null>(null);
  
  // User Blocking State
  const [blockingMemberId, setBlockingMemberId] = useState<string | null>(null);

  // Bulk Invite State
  const [showBulkInviteModal, setShowBulkInviteModal] = useState(false);
  const [bulkInviteLoading, setBulkInviteLoading] = useState(false);
  const [bulkInviteStats, setBulkInviteStats] = useState<any>(null);
  const [bulkInviteSource, setBulkInviteSource] = useState<'leads' | 'community'>('leads');
  const [bulkInviteWorkshop, setBulkInviteWorkshop] = useState('all');
  const [bulkInviteMessage, setBulkInviteMessage] = useState('');
  const [bulkInvitePreview, setBulkInvitePreview] = useState<any>(null);

  // Filtered posts based on search and category
  const filteredPosts = communityPosts.filter(post => {
    // Search filter
    const matchesSearch = postsSearchQuery === '' || 
      post.content?.toLowerCase().includes(postsSearchQuery.toLowerCase()) ||
      post.userId?.toLowerCase().includes(postsSearchQuery.toLowerCase());
    
    // Category filter - map category to post type or content keywords
    let matchesCategory = true;
    if (postCategoryFilter !== 'all') {
      const content = (post.content || '').toLowerCase();
      switch (postCategoryFilter) {
        case 'experiences':
          matchesCategory = post.category === 'experiences' || content.includes('experience') || content.includes('journey');
          break;
        case 'tips':
          matchesCategory = post.category === 'tips' || content.includes('tip') || content.includes('trick') || content.includes('how to');
          break;
        case 'transformations':
          matchesCategory = post.category === 'transformations' || content.includes('transform') || content.includes('before') || content.includes('after');
          break;
        case 'questions':
          matchesCategory = post.category === 'questions' || content.includes('?') || content.includes('question') || content.includes('help');
          break;
      }
    }
    
    return matchesSearch && matchesCategory;
  });

  const renderFormattedText = (text: string) => {
    if (!text) return 'Content Preview...';
    
    // Replace *bold* with <strong>
    let formatted = text.replace(/\*(.*?)\*/g, '<strong class="font-bold">$1</strong>');
    
    // Replace _italic_ with <em>
    formatted = formatted.replace(/_(.*?)_/g, '<em class="italic">$1</em>');
    
    // Replace ~strike~ with <del>
    formatted = formatted.replace(/~(.*?)~/g, '<del class="line-through">$1</del>');
    
    // Replace ```code``` with <code>
    formatted = formatted.replace(/```(.*?)```/g, '<code class="bg-slate-100 px-1 rounded">$1</code>');
    
    // New lines
    formatted = formatted.replace(/\n/g, '<br />');
    
    return <div dangerouslySetInnerHTML={{ __html: formatted }} />;
  };

  // Helper function to normalize and proxy image URLs
  // S3 bucket has Block Public Access, so we need to proxy S3 URLs
  const normalizeImageUrl = (imageUrl: string): string => {
    if (!imageUrl) return '';
    
    let fullUrl = imageUrl;
    
    // If it's already a full URL, use as-is
    if (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
      // If it's a filename or partial path, construct S3 URL
      if (imageUrl && !imageUrl.startsWith('/')) {
        const s3BaseUrl = 'https://swarygoal1hindi.s3.us-east-1.amazonaws.com/';
        fullUrl = `${s3BaseUrl}${imageUrl}`;
      }
    }
    
    // Proxy S3 URLs through our API
    return getProxiedMediaUrl(fullUrl, token);
  };

  const [editedCommunities, setEditedCommunities] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);
  const [addMode, setAddMode] = useState<'search' | 'manual'>('search');
  const [manualMember, setManualMember] = useState({ name: '', mobile: '', email: '' });
  
  // Rich Text & Tools States
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showToolsDropdown, setShowToolsDropdown] = useState(false);
  const textAreaRef = React.useRef<HTMLTextAreaElement>(null);

  const insertTextAtCursor = (textBefore: string, textAfter: string = '') => {
    if (!textAreaRef.current) return;
    const start = textAreaRef.current.selectionStart;
    const end = textAreaRef.current.selectionEnd;
    const selected = postContent.substring(start, end);
    const newText = postContent.substring(0, start) + textBefore + selected + textAfter + postContent.substring(end);
    setPostContent(newText);
    
    // Reset focus and selection
    setTimeout(() => {
        if (textAreaRef.current) {
            textAreaRef.current.focus();
            const newCursorPos = start + textBefore.length + selected.length + textAfter.length;
            textAreaRef.current.setSelectionRange(newCursorPos, newCursorPos);
        }
    }, 10);
  };

  const EMOJIS = ['✨', '🙏', '🧘‍♂️', '🌞', '🕉️', '🕉', '🪷', '🌙', '📅', '🔔', '📍', '📱', '🔗', '🔥', '💎', '🚀'];

  const WHATSAPP_FORMATS = [
    { label: 'Bold', icon: <Bold size={16}/>, prefix: '*', suffix: '*', desc: '*bold text*' },
    { label: 'Italic', icon: <Italic size={16}/>, prefix: '_', suffix: '_', desc: '_italicized_' },
    { label: 'Strike', icon: <Strikethrough size={16}/>, prefix: '~', suffix: '~', desc: '~strikethrough~' },
    { label: 'Code', icon: <Code size={16}/>, prefix: '```', suffix: '```', desc: '```monospace```' },
  ];

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video' | 'document') => {
    const file = e.target.files?.[0];
    if (!file || !token) return;

    // Create local preview immediately for images
    if (type === 'image') {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLocalImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('fileType', type);
      formData.append('templateId', 'community_campaign_' + Date.now());

      const res = await fetch('/api/admin/crm/templates/upload', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      if (res.status === 401 || res.status === 403) {
        localStorage.removeItem('adminToken');
        localStorage.removeItem('admin_token');
        router.push('/admin/login');
        return;
      }

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Upload failed');

      if (type === 'image') {
        // Replace current image for single-image campaigns to make it "direct"
        setPostImageUrls([json.data.url]);
      } else if (type === 'video') {
        setPostVideoUrl(json.data.url);
      } else if (type === 'document') {
        setPostDocUrl(json.data.url);
      }

      // Success - keep local preview until S3 is ready if needed, 
      // but the URL from S3 is now set in postImageUrls.
    } catch (err: any) {
      alert('❌ Upload failed: ' + err.message);
      setLocalImagePreview(null);
    } finally {
      setUploading(false);
    }
  };

  const openChatPermissions = (member: CommunityMember) => {
    setSelectedMember(member);
    const perms = (member as any)?.chatPermissions || {};
    setChatEnabled(typeof member.chatEnabled === 'boolean' ? member.chatEnabled : true);
    setCanSend(typeof perms.canSend === 'boolean' ? perms.canSend : true);
    setAllowText(typeof perms.allowText === 'boolean' ? perms.allowText : true);
    setAllowLinks(typeof perms.allowLinks === 'boolean' ? perms.allowLinks : true);
    setAllowImages(typeof perms.allowImages === 'boolean' ? perms.allowImages : true);
    setAllowVideos(typeof perms.allowVideos === 'boolean' ? perms.allowVideos : true);
    setAllowDocuments(typeof perms.allowDocuments === 'boolean' ? perms.allowDocuments : true);
    setShowChatPermModal(true);
  };

  const saveChatPermissions = async () => {
    if (!selectedMember || !token) return;
    try {
      setChatPermSaving(true);
      const res = await fetch(`/api/admin/community/members/${selectedMember._id}/chat-permissions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ chatEnabled, canSend, allowText, allowLinks, allowImages, allowVideos, allowDocuments }),
      });
      if (!res.ok) {
        const json = await res.json();
        alert('❌ ' + (json?.error || 'Failed to update chat permissions'));
        return;
      }
      setMembers((prev) => prev.map((m) => m._id === selectedMember._id ? { ...m, chatEnabled, chatPermissions: { canSend, allowText, allowLinks, allowImages, allowVideos, allowDocuments } } : m));
      alert('✅ Chat permissions updated');
      setShowChatPermModal(false);
    } catch (e) {
      alert('❌ Error updating chat permissions');
    } finally {
      setChatPermSaving(false);
    }
  };

  const searchUser = async () => {
    if (!searchUserQuery.trim() || !token) return;
    try {
      setSearchingUser(true);
      const response = await fetch(`/api/community/admin/find-user?q=${encodeURIComponent(searchUserQuery)}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setFoundUser(data.data);
    } catch (err: any) {
      alert('❌ User not found');
    } finally {
      setSearchingUser(false);
    }
  };

  const addMemberToCommunity = async () => {
    if (!token) return;
    if (addMode === 'search' && !foundUser) return;
    if (addMode === 'manual' && (!manualMember.name || !manualMember.mobile)) return;
    try {
      setAddingMember(true);
      const response = await fetch('/api/community/admin/add-member', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ communityId: selectedCommunity, userId: addMode === 'search' ? foundUser.userId : undefined, manualMember: addMode === 'manual' ? manualMember : undefined }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error);
      }
      alert('✅ Member added!');
      setShowAddMemberModal(false);
      window.location.reload();
    } catch (err: any) {
      alert('❌ Error: ' + err.message);
    } finally {
      setAddingMember(false);
    }
  };

  const addPostButton = () => {
    setPostButtons((prev) => [...prev, { id: Math.random().toString(36).slice(2, 9), label: `Button ${prev.length + 1}`, actionType: 'link', url: '' }]);
  };

  const updatePostButton = (id: string, updates: Partial<CommunityButton>) => {
    setPostButtons((prev) => prev.map((b) => (b.id === id ? { ...b, ...updates } : b)));
  };

  const removePostButton = (id: string) => {
    setPostButtons((prev) => prev.filter((b) => b.id !== id));
  };

  // Reset category-specific fields when category changes
  const resetCategoryFields = () => {
    setPostParticipantName('');
    setPostWorkshopName('');
    setPostBatchName('');
    setPostExperienceDetails('');
    setPostProblemHeading('');
    setPostProblemDescription('');
    setPostTipsDetails('');
    setPostBeforeStory('');
    setPostAfterStory('');
    setPostQuestion('');
    setPostAnswer('');
  };

  // Build formatted content based on category
  const buildCategoryContent = (): string => {
    switch (postCategory) {
      case 'experiences':
        return [
          postParticipantName && `*👤 ${postParticipantName}*`,
          postWorkshopName && `📚 Workshop: ${postWorkshopName}`,
          postBatchName && `🎯 Batch: ${postBatchName}`,
          '',
          postExperienceDetails && `_${postExperienceDetails}_`,
        ].filter(Boolean).join('\n');

      case 'tips':
        return [
          postProblemHeading && `*💡 ${postProblemHeading}*`,
          '',
          postProblemDescription && `❓ *Problem:*\n${postProblemDescription}`,
          '',
          postTipsDetails && `✨ *Tips & Tricks:*\n${postTipsDetails}`,
        ].filter(Boolean).join('\n');

      case 'transformations':
        return [
          postParticipantName && `*🦋 ${postParticipantName}*`,
          postWorkshopName && `📚 Workshop: ${postWorkshopName}`,
          postBatchName && `🎯 Batch: ${postBatchName}`,
          '',
          postBeforeStory && `*Before:*\n${postBeforeStory}`,
          '',
          postAfterStory && `*After:*\n${postAfterStory}`,
        ].filter(Boolean).join('\n');

      case 'questions':
        return [
          postParticipantName && `*👤 ${postParticipantName}*`,
          (postWorkshopName || postBatchName) && `📚 ${[postWorkshopName, postBatchName].filter(Boolean).join(' | ')}`,
          '',
          postQuestion && `*❓ Question:*\n${postQuestion}`,
          '',
          postAnswer && `*✅ Answer:*\n${postAnswer}`,
        ].filter(Boolean).join('\n');

      default: // general
        return postContent;
    }
  };

  const createAdminPost = async () => {
    // For general category, use postContent; for others, build from category fields
    const finalContent = postCategory === 'general' ? postContent : buildCategoryContent();
    
    if (!postHeader.trim() && !finalContent.trim() && postImageUrls.length === 0) {
      alert('Post content required');
      return;
    }
    if (!token) return;
    const communityIds = postTargetMode === 'all' ? communities.map((c) => c.id) : [...postSelectedCommunityIds];
    try {
      // Build category-specific metadata
      const categoryMetadata = postCategory !== 'general' ? {
        participantName: postParticipantName,
        workshopName: postWorkshopName,
        batchName: postBatchName,
        ...(postCategory === 'experiences' && { experienceDetails: postExperienceDetails }),
        ...(postCategory === 'tips' && { 
          problemHeading: postProblemHeading, 
          problemDescription: postProblemDescription, 
          tipsDetails: postTipsDetails 
        }),
        ...(postCategory === 'transformations' && { 
          beforeStory: postBeforeStory, 
          afterStory: postAfterStory 
        }),
        ...(postCategory === 'questions' && { 
          question: postQuestion, 
          answer: postAnswer 
        }),
      } : undefined;

      const response = await fetch('/api/admin/crm/community/posts/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ 
          communityIds, 
          headerText: postHeader, 
          content: finalContent, 
          footerText: postFooter, 
          buttons: postButtons, 
          type: postType, 
          videoUrl: postVideoUrl, 
          docUrl: postDocUrl, 
          imageUrls: postImageUrls, 
          scheduledAt: postScheduledAt,
          category: postCategory,
          categoryMetadata,
          crossPost: { media: crossPostMedia, socialMedia: crossPostSocial } 
        }),
      });

      if (response.status === 401 || response.status === 403) {
        alert('Your session has expired. Please log in again.');
        localStorage.removeItem('adminToken');
        localStorage.removeItem('admin_token');
        router.push('/admin/login');
        return;
      }

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed');
      
      alert('✅ Campaign Deployed!');
      setShowPostModal(false);
    } catch (err: any) {
      alert('❌ Error deploying campaign: ' + err.message);
    }
  };

  const updateCommunitySettings = async (updates: any) => {
    if (!token) return;
    try {
      const response = await fetch(`/api/community/admin/${selectedCommunity}/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(updates),
      });
      if (!response.ok) throw new Error();
      
      if (updates.name) {
        setEditedCommunities(prev => ({ ...prev, [selectedCommunity]: updates.name }));
        setEditingCommunityName(false);
      }
      
      if (updates.whatsappGroupId !== undefined) {
        setEditingWAId(false);
        // Refresh to see changes
        window.location.reload();
      }
      
      alert('✅ Updated!');
    } catch (err) {
      alert('❌ Failed');
    }
  };

  const updateCommunityName = () => updateCommunitySettings({ name: newCommunityName });
  const updateWAId = () => updateCommunitySettings({ whatsappGroupId: newWAId });

  const approveMember = async (memberId: string) => {
    if (!token) return;
    try {
      setApproving(memberId);
      const res = await fetch(`/api/admin/community/members/${memberId}/approve`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      setMembers(prev => prev.map(m => m._id === memberId ? { ...m, approved: true } : m));
      alert('✅ Member Approved');
    } catch (e) {
      alert('❌ Failed to approve member');
    } finally {
      setApproving(null);
    }
  };

  // Fetch communities from database
  const fetchCommunities = async () => {
    if (!token) return;
    setLoadingCommunities(true);
    try {
      const res = await fetch('/api/admin/communities', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 401 || res.status === 403) {
        localStorage.removeItem('adminToken');
        localStorage.removeItem('admin_token');
        router.push('/admin/login');
        return;
      }

      const json = await res.json();
      if (json.success && json.communities) {
        // Merge DB communities with defaults, prioritizing DB data
        const dbCommunities = json.communities.map((c: any) => ({
          id: c.id || c._id,
          _id: c._id,
          name: c.name,
          icon: COMMUNITY_ICONS[c.type] || COMMUNITY_ICONS.default,
          memberCount: c.memberCount || 0,
          joinLink: c.joinLink || `https://swaryoga.com/community?join=${c.id || c._id}`,
          type: c.type
        }));
        
        // Merge: Start with defaults, update with DB data, add any new DB communities
        const mergedMap = new Map<string, Community>();
        DEFAULT_COMMUNITIES.forEach(c => mergedMap.set(c.id, c));
        dbCommunities.forEach((c: Community) => {
          const existing = mergedMap.get(c.id);
          mergedMap.set(c.id, { ...existing, ...c, icon: existing?.icon || c.icon });
        });
        
        setCommunities(Array.from(mergedMap.values()));
      }
    } catch (error) {
      console.error('[Communities] Fetch error:', error);
      // Keep default communities on error
    } finally {
      setLoadingCommunities(false);
    }
  };

  // Create a new community
  const createCommunity = async () => {
    if (!newCommunityInput.name.trim()) {
      alert('❌ Community name is required');
      return;
    }
    if (!token) return;
    
    setCreatingCommunity(true);
    try {
      const res = await fetch('/api/admin/communities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: newCommunityInput.name.trim(),
          description: newCommunityInput.description.trim(),
        }),
      });

      if (res.status === 401 || res.status === 403) {
        localStorage.removeItem('adminToken');
        router.push('/admin/login');
        return;
      }

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to create community');

      alert('✅ Community created successfully!');
      setShowCreateCommunityModal(false);
      setNewCommunityInput({ name: '', description: '', icon: '🌟' });
      
      // Refresh communities list
      await fetchCommunities();
      
      // Select the new community
      if (json.community?.id) {
        setSelectedCommunity(json.community.id);
      }
    } catch (error: any) {
      alert('❌ ' + error.message);
    } finally {
      setCreatingCommunity(false);
    }
  };

  // Posts Management Functions
  const fetchCommunityPosts = async (page: number = 1) => {
    if (!token) return;
    setLoadingPosts(true);
    try {
      const queryParams = new URLSearchParams({
        communityId: selectedCommunity,
        page: String(page),
        limit: String(postsLimit),
        sortBy: postsSortBy,
        sortOrder: postsSortOrder,
        ...(postsSearchQuery && { search: postsSearchQuery }),
      });

      const res = await fetch(`/api/admin/crm/community/posts/list?${queryParams}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 401 || res.status === 403) {
        localStorage.removeItem('adminToken');
        localStorage.removeItem('admin_token');
        router.push('/admin/login');
        return;
      }

      const json = await res.json();
      if (json.success) {
        setCommunityPosts(json.data.posts || []);
        setTotalPosts(json.data.pagination.total);
        setPostsPage(page);
      } else {
        alert('❌ Failed to load posts: ' + (json.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('[Community Posts] Fetch error:', error);
      alert('❌ Error loading posts');
    } finally {
      setLoadingPosts(false);
    }
  };

  const deletePost = async (postId: string) => {
    if (!confirm('Are you sure you want to delete this post? This action cannot be undone.')) return;

    try {
      setDeletingPostId(postId);
      const res = await fetch('/api/admin/crm/community/posts/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ postId }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to delete');

      alert('✅ Post deleted successfully');
      setCommunityPosts(prev => prev.filter(p => p._id !== postId));
      setTotalPosts(prev => prev - 1);
    } catch (error: any) {
      alert('❌ Failed to delete post: ' + error.message);
    } finally {
      setDeletingPostId(null);
    }
  };

  const deleteComment = async (postId: string, commentIndex: number) => {
    if (!confirm('Are you sure you want to delete this comment?')) return;

    try {
      setDeletingCommentIndex(commentIndex);
      const res = await fetch('/api/admin/crm/community/posts/comment/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ postId, commentIndex }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to delete comment');

      alert('✅ Comment deleted successfully');
      
      // Update the local state
      if (selectedPostForComments) {
        const updatedComments = [...(selectedPostForComments.comments || [])];
        updatedComments.splice(commentIndex, 1);
        setSelectedPostForComments({ ...selectedPostForComments, comments: updatedComments });
      }
      
      // Update posts list
      setCommunityPosts(prev => prev.map(p => {
        if (p._id === postId) {
          const updatedComments = [...(p.comments || [])];
          updatedComments.splice(commentIndex, 1);
          return { ...p, comments: updatedComments };
        }
        return p;
      }));
    } catch (error: any) {
      alert('❌ Failed to delete comment: ' + error.message);
    } finally {
      setDeletingCommentIndex(null);
    }
  };

  const blockMember = async (memberId: string, userId: string, memberName: string) => {
    const reason = prompt(`Enter reason for blocking ${memberName}:`, 'Inappropriate behavior or content');
    if (!reason) return;

    try {
      setBlockingMemberId(memberId);
      const res = await fetch('/api/admin/crm/community/members/block', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          memberId, 
          userId,
          communityId: selectedCommunity,
          reason 
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to block member');

      alert('✅ Member blocked successfully');
      
      // Update the local state
      setMembers(prev => prev.map(m => 
        m._id === memberId ? { ...m, status: 'banned' as const } : m
      ));
    } catch (error: any) {
      alert('❌ Failed to block member: ' + error.message);
    } finally {
      setBlockingMemberId(null);
    }
  };

  const unblockMember = async (memberId: string, userId: string, memberName: string) => {
    if (!confirm(`Unblock ${memberName}?`)) return;

    try {
      setBlockingMemberId(memberId);
      const res = await fetch('/api/admin/crm/community/members/block', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          memberId, 
          userId,
          communityId: selectedCommunity
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to unblock member');

      alert('✅ Member unblocked successfully');
      
      // Update the local state
      setMembers(prev => prev.map(m => 
        m._id === memberId ? { ...m, status: 'active' as const } : m
      ));
    } catch (error: any) {
      alert('❌ Failed to unblock member: ' + error.message);
    } finally {
      setBlockingMemberId(null);
    }
  };

  const openCommentsModal = (post: any) => {
    setSelectedPostForComments(post);
    setShowCommentsModal(true);
  };

  const openEditPostModal = (post: any) => {
    setEditingPost(post);
    setEditPostContent(post.content);
    setEditPostImages(post.images || []);
    setEditPostStatus(post.status || 'published');
    setEditPostHeader(post.metadata?.originalHeader || '');
    setEditPostFooter(post.metadata?.originalFooter || '');
    setEditPostButtons(post.metadata?.buttons || []);
    setShowEditPostModal(true);
  };

  const saveEditPost = async () => {
    if (!editPostContent.trim()) {
      alert('Content cannot be empty');
      return;
    }

    try {
      setEditingPostLoading(true);
      const res = await fetch('/api/admin/crm/community/posts/edit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          postId: editingPost._id,
          content: editPostContent,
          images: editPostImages,
          status: editPostStatus,
          metadata: {
            originalHeader: editPostHeader,
            originalFooter: editPostFooter,
            buttons: editPostButtons
          }
        }),
      });

      if (!res.ok) throw new Error('Failed to update post');

      alert('✅ Post updated successfully');
      setCommunityPosts(prev =>
        prev.map(p => (p._id === editingPost._id ? { ...p, content: editPostContent, images: editPostImages, status: editPostStatus } : p))
      );
      setShowEditPostModal(false);
      setEditingPost(null);
      setEditPostContent('');
      setEditPostImages([]);
      setEditPostStatus('published');
    } catch (error: any) {
      alert('❌ Failed to update post: ' + error.message);
    } finally {
      setEditingPostLoading(false);
    }
  };

  const handleEditImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !token) return;

    try {
      setUploadingEditImage(true);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('fileType', 'image');
      formData.append('templateId', 'post_edit_' + Date.now());

      const res = await fetch('/api/admin/crm/templates/upload', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      if (res.status === 401 || res.status === 403) {
        localStorage.removeItem('adminToken');
        localStorage.removeItem('admin_token');
        router.push('/admin/login');
        return;
      }

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Upload failed');

      // Add the new image URL to the array
      setEditPostImages(prev => [...prev, json.data.url]);
    } catch (err: any) {
      alert('❌ Upload failed: ' + err.message);
    } finally {
      setUploadingEditImage(false);
    }
  };

  // Fetch Recordings (all recordings with folder structure)
  const fetchRecordings = async () => {
    if (!token) return;
    setLoadingRecordings(true);
    try {
      // Fetch all content that has folder structure in title (Workshop > Batch > Video format)
      const res = await fetch(`/api/admin/communities/recordings-videos?communityId=${selectedCommunity}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401 || res.status === 403) {
        localStorage.removeItem('adminToken');
        router.push('/admin/login');
        return;
      }
      const json = await res.json();
      if (json.success) {
        // Filter to only show recordings with folder structure (title contains " > ") or marked as recording
        const folderRecordings = (json.content || []).filter((r: any) => 
          r.title?.includes(' > ') || r.source === 'zoom' || r.source === 'youtube_recording'
        );
        setRecordings(folderRecordings);
      }
    } catch (error) {
      console.error('[Recordings] Fetch error:', error);
    } finally {
      setLoadingRecordings(false);
    }
  };

  // Fetch Videos (manually uploaded)
  const fetchVideos = async () => {
    if (!token) return;
    setLoadingVideos(true);
    try {
      const res = await fetch(`/api/admin/communities/recordings-videos?communityId=${selectedCommunity}&type=video`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401 || res.status === 403) {
        localStorage.removeItem('adminToken');
        router.push('/admin/login');
        return;
      }
      const json = await res.json();
      if (json.success) {
        setVideos(json.content || []);
      }
    } catch (error) {
      console.error('[Videos] Fetch error:', error);
    } finally {
      setLoadingVideos(false);
    }
  };

  // Fetch User Submissions
  const fetchSubmissions = async (status?: string) => {
    if (!token) return;
    setLoadingSubmissions(true);
    try {
      const filterStatus = status || submissionsFilter;
      const res = await fetch(`/api/admin/crm/community/submissions?status=${filterStatus}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401 || res.status === 403) {
        localStorage.removeItem('adminToken');
        router.push('/admin/login');
        return;
      }
      const json = await res.json();
      if (json.success) {
        setSubmissions(json.submissions || []);
        setSubmissionsCounts(json.counts || { pending: 0, approved: 0, rejected: 0, posted: 0 });
      }
    } catch (error) {
      console.error('[Submissions] Fetch error:', error);
    } finally {
      setLoadingSubmissions(false);
    }
  };

  // Update Submission Status
  const updateSubmissionStatus = async (submissionId: string, newStatus: string, adminNotes?: string) => {
    if (!token) return;
    try {
      const res = await fetch('/api/admin/crm/community/submissions', {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ submissionId, status: newStatus, adminNotes }),
      });
      if (res.ok) {
        fetchSubmissions();
      } else {
        const json = await res.json();
        alert('❌ Failed: ' + (json.error || 'Unknown error'));
      }
    } catch (error: any) {
      alert('❌ Error: ' + error.message);
    }
  };

  // Delete Submission
  const deleteSubmission = async (submissionId: string) => {
    if (!token) return;
    if (!confirm('Delete this submission?')) return;
    try {
      const res = await fetch(`/api/admin/crm/community/submissions?id=${submissionId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        fetchSubmissions();
      } else {
        const json = await res.json();
        alert('❌ Failed: ' + (json.error || 'Unknown error'));
      }
    } catch (error: any) {
      alert('❌ Error: ' + error.message);
    }
  };

  // Convert submission to post modal data
  const loadSubmissionToPost = (submission: any) => {
    setPostCategory(submission.category);
    setPostParticipantName(submission.participantName || '');
    setPostWorkshopName(submission.workshopName || '');
    setPostBatchName(submission.batchName || '');
    setPostExperienceDetails(submission.experienceDetails || '');
    setPostProblemHeading(submission.problemHeading || '');
    setPostProblemDescription(submission.problemDescription || '');
    setPostTipsDetails(submission.tipsDetails || '');
    setPostBeforeStory(submission.beforeStory || '');
    setPostAfterStory(submission.afterStory || '');
    setPostQuestion(submission.question || '');
    setPostAnswer(submission.answer || '');
    if (submission.imageUrl) {
      setPostImageUrls([submission.imageUrl]);
      setPostType('image');
    } else {
      setPostType('text');
    }
    setShowPostModal(true);
  };

  // Upload new video
  const uploadNewVideo = async (file: File) => {
    if (!token || !file) return;
    setUploadingVideo(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('communityId', selectedCommunity);
      formData.append('title', videoTitle || file.name);
      formData.append('description', videoDescription);

      const res = await fetch('/api/admin/communities/recordings-videos', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });

      if (!res.ok) throw new Error('Upload failed');
      
      const json = await res.json();
      if (json.success) {
        alert('✅ Video uploaded successfully!');
        setShowUploadVideoModal(false);
        setVideoTitle('');
        setVideoDescription('');
        fetchVideos();
      }
    } catch (error: any) {
      alert('❌ Upload failed: ' + error.message);
    } finally {
      setUploadingVideo(false);
    }
  };

  // Upload recording with folder/playlist structure
  const uploadNewRecording = async (file: File) => {
    if (!token || !file) return;
    if (!recordingFolderName.trim()) {
      alert('❌ Please enter a Workshop/Folder name');
      return;
    }
    if (!recordingPlaylistName.trim()) {
      alert('❌ Please enter a Batch/Playlist name');
      return;
    }
    if (!recordingVideoNumber.trim()) {
      alert('❌ Please enter a Video number');
      return;
    }
    
    setUploadingRecording(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('communityId', selectedCommunity);
      // Title format: "FolderName > PlaylistName > Video X"
      const title = `${recordingFolderName} > ${recordingPlaylistName} > Video ${recordingVideoNumber}`;
      formData.append('title', title);
      formData.append('description', recordingDescription);
      // Add metadata for folder/playlist organization
      formData.append('folderName', recordingFolderName.trim());
      formData.append('playlistName', recordingPlaylistName.trim());
      formData.append('videoNumber', recordingVideoNumber.trim());
      formData.append('isRecording', 'true');

      const res = await fetch('/api/admin/communities/recordings-videos', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });

      if (!res.ok) throw new Error('Upload failed');
      
      const json = await res.json();
      if (json.success) {
        alert('✅ Recording uploaded successfully!');
        setShowUploadRecordingModal(false);
        setRecordingFolderName('');
        setRecordingPlaylistName('');
        setRecordingVideoNumber('');
        setRecordingDescription('');
        fetchRecordings();
      }
    } catch (error: any) {
      alert('❌ Upload failed: ' + error.message);
    } finally {
      setUploadingRecording(false);
    }
  };

  // Delete video/recording
  const deleteVideo = async (contentId: string) => {
    if (!confirm('Are you sure you want to delete this content?')) return;
    
    try {
      const res = await fetch(`/api/admin/communities/recordings-videos?contentId=${contentId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error('Delete failed');
      
      alert('✅ Content deleted successfully');
      // Refresh both lists
      fetchRecordings();
      fetchVideos();
    } catch (error: any) {
      alert('❌ Delete failed: ' + error.message);
    }
  };

  // Fetch communities on mount
  useEffect(() => {
    if (token) {
      fetchCommunities();
    }
  }, [token]);

  useEffect(() => {
    if (activeTab === 'posts') {
      fetchCommunityPosts(1);
    }
    if (activeTab === 'recordings') {
      fetchRecordings();
    }
    if (activeTab === 'videos') {
      fetchVideos();
    }
  }, [selectedCommunity, activeTab, token]);

  // Also fetch post count for header display
  useEffect(() => {
    if (!token) return;
    
    const fetchPostCount = async () => {
      try {
        const queryParams = new URLSearchParams({
          communityId: selectedCommunity,
          page: '1',
          limit: '1', // We only need the count, not the posts
        });

        const res = await fetch(`/api/admin/crm/community/posts/list?${queryParams}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
          const json = await res.json();
          if (json.success) {
            setTotalPosts(json.data.pagination.total);
          }
        }
      } catch (error) {
        console.error('[Community Post Count] Fetch error:', error);
      }
    };

    fetchPostCount();
  }, [selectedCommunity, token]);

  useEffect(() => {
    if (!token) return;
    const fetchMembers = async () => {
      setLoading(true);
      try {
        // Fetch members - no limit to support large communities
        const res = await fetch(`/api/admin/community/members?communityId=${selectedCommunity}&status=${statusFilter}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        
        if (res.status === 401 || res.status === 403) {
          localStorage.removeItem('adminToken');
          localStorage.removeItem('admin_token');
          router.push('/admin/login');
          return;
        }

        const json = await res.json();
        const membersList = Array.isArray(json?.data?.members) ? json.data.members : [];
        setMembers(membersList);
        
        // Calculate pending members (not approved)
        const pending = membersList.filter((m: any) => !m.approved).length;
        setPendingMembers(pending);
        
        // Calculate last activity time
        if (membersList.length > 0) {
          const recentMember = membersList.sort((a: any, b: any) => 
            new Date(b.joinedAt || 0).getTime() - new Date(a.joinedAt || 0).getTime()
          )[0];
          if (recentMember?.joinedAt) {
            const timeAgo = new Date(recentMember.joinedAt);
            const now = new Date();
            const diffMinutes = Math.floor((now.getTime() - timeAgo.getTime()) / 60000);
            if (diffMinutes < 60) {
              setLastActivityTime(`${diffMinutes}m ago`);
            } else if (diffMinutes < 1440) {
              setLastActivityTime(`${Math.floor(diffMinutes / 60)}h ago`);
            } else {
              setLastActivityTime(`${Math.floor(diffMinutes / 1440)}d ago`);
            }
          }
        }

        // Fetch community specific settings from our new endpoint
        const settingsRes = await fetch(`/api/community/admin/${selectedCommunity}/settings`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const settingsJson = await settingsRes.json();
        if (settingsJson.success) {
          setCurrentCommunityDb(settingsJson.community);
          setNewWAId(settingsJson.community?.whatsappGroupId || '');
        }
      } catch (error) {
        console.error('[CRM Community] Fetch error:', error);
        setMembers([]);
      } finally {
        setLoading(false);
      }
    };
    fetchMembers();
   }, [selectedCommunity, statusFilter, token, router]);

  const filteredMembers = members.filter(member => 
    (member.name.toLowerCase().includes(searchQuery.toLowerCase()) || member.mobile.includes(searchQuery)) && 
    (statusFilter === 'all' || member.status === statusFilter)
  );

  const currentCommunity = communities.find(c => c.id === selectedCommunity);

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans antialiased text-slate-900">
      {/* Sidebar */}
      <div className="w-72 bg-slate-900 border-r border-slate-800 overflow-y-auto flex flex-col shrink-0">
        <div className="p-8 border-b border-slate-800 sticky top-0 bg-slate-900 z-20">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 bg-indigo-600 rounded-xl shadow-lg flex items-center justify-center font-bold text-white text-2xl">S</div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">CRM</h2>
              <p className="text-xs text-slate-500 font-medium italic">Community Engine</p>
            </div>
          </div>
        </div>
        <div className="p-4 space-y-1">
          {loadingCommunities ? (
            <div className="text-center py-4">
              <Loader size={20} className="animate-spin text-indigo-400 mx-auto" />
              <p className="text-xs text-slate-500 mt-2">Loading...</p>
            </div>
          ) : (
            <>
              {communities.map((community) => {
                const isActive = selectedCommunity === community.id;
                return (
                  <button key={community.id} onClick={() => setSelectedCommunity(community.id)} className={`w-full text-left px-4 py-3 rounded-xl transition-all flex items-center gap-3 ${isActive ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 shadow-lg' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'}`}>
                    <span className="text-xl">{community.icon}</span>
                    <span className="font-semibold text-[13px] truncate">{community.name}</span>
                  </button>
                );
              })}
              {/* Create New Community Button */}
              <button
                onClick={() => setShowCreateCommunityModal(true)}
                className="w-full text-left px-4 py-3 rounded-xl transition-all flex items-center gap-3 text-emerald-400 hover:bg-emerald-800/20 hover:text-emerald-300 border border-dashed border-emerald-500/30 mt-4"
              >
                <span className="text-xl">➕</span>
                <span className="font-semibold text-[13px]">Create New Group</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="bg-white border-b border-slate-200/60 p-6 z-10">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-3xl shadow-inner border border-slate-100/80">
                {currentCommunity?.icon}
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{editedCommunities[selectedCommunity] || currentCommunity?.name}</h1>
                  <button onClick={() => { setEditingCommunityName(true); setNewCommunityName(currentCommunity?.name || ''); }} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"><Edit size={14} /></button>
                </div>
                <div className="flex items-center gap-6 flex-wrap">
                  {/* Stats Grid */}
                  <div className="flex gap-6">
                    {/* Active Members */}
                    <div className="flex items-center gap-2">
                      <Users size={14} className="text-indigo-500" />
                      <div>
                        <p className="text-[8px] text-slate-500 font-semibold">ACTIVE</p>
                        <p className="text-sm font-bold text-indigo-600">{members.length}</p>
                      </div>
                    </div>
                    
                    {/* Total Posts */}
                    <div className="flex items-center gap-2">
                      <MessageCircle size={14} className="text-emerald-500" />
                      <div>
                        <p className="text-[8px] text-slate-500 font-semibold">POSTS</p>
                        <p className="text-sm font-bold text-emerald-600">{totalPosts}</p>
                      </div>
                    </div>
                    
                    {/* Draft Posts */}
                    <div className="flex items-center gap-2">
                      <Clock size={14} className="text-amber-500" />
                      <div>
                        <p className="text-[8px] text-slate-500 font-semibold">DRAFT</p>
                        <p className="text-sm font-bold text-amber-600">{draftPosts}</p>
                      </div>
                    </div>
                    
                    {/* Pending Members */}
                    <div className="flex items-center gap-2">
                      <AlertCircle size={14} className="text-red-500" />
                      <div>
                        <p className="text-[8px] text-slate-500 font-semibold">PENDING</p>
                        <p className="text-sm font-bold text-red-600">{pendingMembers}</p>
                      </div>
                    </div>
                    
                    {/* Last Activity */}
                    <div className="flex items-center gap-2">
                      <Clock size={14} className="text-blue-500" />
                      <div>
                        <p className="text-[8px] text-slate-500 font-semibold">ACTIVITY</p>
                        <p className="text-sm font-bold text-blue-600">{lastActivityTime || 'N/A'}</p>
                      </div>
                    </div>
                    
                    {/* Chat Status */}
                    <div className="flex items-center gap-2">
                      <MessageSquare size={14} className="text-green-500" />
                      <div>
                        <p className="text-[8px] text-slate-500 font-semibold">CHAT</p>
                        <p className="text-sm font-bold text-green-600">{chatEnabled ? 'ON' : 'OFF'}</p>
                      </div>
                    </div>
                  </div>
                  {currentCommunity?.joinLink && (
                    <div className="flex items-center gap-2 bg-indigo-50/50 px-3 py-1 rounded-lg border border-indigo-100 group">
                      <LinkIcon size={12} className="text-indigo-400" />
                      <span className="text-[9px] font-bold text-indigo-600 truncate max-w-[200px]">{currentCommunity.joinLink}</span>
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText(currentCommunity.joinLink!);
                          // Create a transient toast or alert
                          const btn = document.getElementById('copy-link-btn');
                          if (btn) btn.innerHTML = 'COPIED!';
                          setTimeout(() => { if (btn) btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-copy"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"></rect><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path></svg>'; }, 2000);
                        }}
                        id="copy-link-btn"
                        className="p-1.5 hover:bg-white rounded-md transition-all text-indigo-400 hover:text-indigo-600 shadow-sm border border-transparent hover:border-indigo-100"
                        title="Copy Invite Link"
                      >
                        <Copy size={12} />
                      </button>
                    </div>
                  )}
                  
                  {/* WhatsApp Group Mapping */}
                  <div className="flex items-center gap-2 bg-green-50/50 px-3 py-1 rounded-lg border border-green-100 group">
                    <Phone size={12} className="text-green-500" />
                    {editingWAId ? (
                      <div className="flex items-center gap-1">
                        <input 
                          value={newWAId}
                          onChange={(e) => setNewWAId(e.target.value)}
                          placeholder="Group ID (@g.us)"
                          className="text-[9px] px-1 py-0.5 border rounded outline-none"
                        />
                        <button onClick={updateWAId} className="text-[9px] font-bold text-green-700 underline">SAVE</button>
                      </div>
                    ) : (
                      <>
                        <span className="text-[9px] font-bold text-green-700 truncate max-w-[150px]">
                          WA Group: {currentCommunityDb?.whatsappGroupId || 'None Linked'}
                        </span>
                        <button onClick={() => { setEditingWAId(true); setNewWAId(currentCommunityDb?.whatsappGroupId || ''); }} className="p-1 rounded hover:bg-green-100 text-green-500"><Edit size={10} /></button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex gap-4">
              <button onClick={() => setShowPostModal(true)} className="h-14 px-8 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all flex items-center gap-3 shadow-xl shadow-indigo-600/20 text-sm tracking-tight border border-indigo-500/50"><Send size={18} /> Run Campaign</button>
              <button onClick={() => setShowAddMemberModal(true)} className="h-14 px-8 bg-white hover:bg-slate-50 text-slate-900 rounded-xl font-bold transition-all flex items-center gap-3 shadow-lg text-sm border border-slate-200"><Plus size={18} className="text-indigo-600" /> New Member</button>
            </div>
          </div>

          {/* Tabs Navigation */}
          <div className="flex gap-2 border-b border-slate-200/60">
            <button
              onClick={() => setActiveTab('members')}
              className={`px-6 py-4 font-bold text-sm uppercase tracking-tight border-b-2 transition-all ${
                activeTab === 'members'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              Members ({members.length})
            </button>
            <button
              onClick={() => setActiveTab('posts')}
              className={`px-6 py-4 font-bold text-sm uppercase tracking-tight border-b-2 transition-all ${
                activeTab === 'posts'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              Posts ({totalPosts})
            </button>
            <button
              onClick={() => setActiveTab('recordings')}
              className={`px-6 py-4 font-bold text-sm uppercase tracking-tight border-b-2 transition-all ${
                activeTab === 'recordings'
                  ? 'border-emerald-600 text-emerald-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              🎥 Recordings ({recordings.length})
            </button>
            <button
              onClick={() => setActiveTab('videos')}
              className={`px-6 py-4 font-bold text-sm uppercase tracking-tight border-b-2 transition-all ${
                activeTab === 'videos'
                  ? 'border-purple-600 text-purple-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              📹 Videos ({videos.length})
            </button>
            <button
              onClick={() => { setActiveTab('submissions'); fetchSubmissions(); }}
              className={`px-6 py-4 font-bold text-sm uppercase tracking-tight border-b-2 transition-all ${
                activeTab === 'submissions'
                  ? 'border-orange-600 text-orange-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              📝 Submissions {submissionsCounts.pending > 0 && <span className="ml-1 px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full text-xs">{submissionsCounts.pending}</span>}
            </button>
          </div>

          {/* Members Search and Filter - Only show for members tab */}
          {activeTab === 'members' && (
            <div className="flex gap-5 items-center">
              <div className="flex-1 relative">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input type="text" placeholder="Search registry..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-14 pr-7 h-14 bg-slate-50/50 text-slate-900 rounded-2xl border border-slate-200/60 font-medium text-sm outline-none" />
              </div>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)} className="px-6 h-14 bg-white text-slate-700 rounded-2xl border border-slate-200/60 font-bold text-xs uppercase cursor-pointer min-w-[160px]">
                <option value="all">Display All</option>
                <option value="pending">Pending Approval</option>
                <option value="active">Verified members</option>
                <option value="inactive">Waitlist</option>
              </select>
              {/* Export Members Button */}
              <button 
                onClick={async () => {
                  try {
                    const res = await fetch(`/api/admin/community/export?communityId=${selectedCommunity}&format=csv`, {
                      headers: { Authorization: `Bearer ${token}` },
                    });
                    if (!res.ok) throw new Error('Export failed');
                    const blob = await res.blob();
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `community-members-${selectedCommunity}-${Date.now()}.csv`;
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                    window.URL.revokeObjectURL(url);
                  } catch (e: any) {
                    alert('❌ Export failed: ' + e.message);
                  }
                }}
                className="h-14 px-5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-2xl border border-emerald-200 font-bold text-xs uppercase flex items-center gap-2 transition-all"
                title="Export members to CSV"
              >
                <Download size={16} /> Export CSV
              </button>
              {/* Bulk Invite Button */}
              <button 
                onClick={() => setShowBulkInviteModal(true)}
                className="h-14 px-5 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-2xl border border-purple-200 font-bold text-xs uppercase flex items-center gap-2 transition-all"
                title="Send bulk invite to old participants"
              >
                <Mail size={16} /> Bulk Invite
              </button>
            </div>
          )}
        </div>

        {/* Members Tab */}
        {activeTab === 'members' && (
          <div className="flex-1 overflow-auto bg-slate-50/80 p-6">
             {loading ? (
               <div className="flex flex-col items-center justify-center h-80 space-y-4">
                  <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
               </div>
             ) : members.length === 0 ? (
               <div className="bg-white rounded-[2.5rem] border border-slate-200/60 h-[400px] flex flex-col items-center justify-center text-center p-20 shadow-sm">
                  <Users size={48} className="text-slate-200 mb-6" />
                  <h3 className="text-xl font-bold text-slate-900 mb-2">Registry Empty</h3>
                  <p className="text-slate-500 text-sm mb-8">No matching records found in this portfolio.</p>
                  <button onClick={() => setShowAddMemberModal(true)} className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold text-xs uppercase shadow-lg shadow-indigo-600/20">Add Person</button>
               </div>
             ) : (
               <div className="bg-white rounded-[2rem] shadow-xl border border-slate-200/60 overflow-hidden">
                  <table className="w-full">
                     <thead className="bg-[#fcfdfe] border-b border-slate-100 text-left">
                        <tr className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                           <th className="pl-10 px-4 py-3">Profile</th>
                           <th className="px-4 py-3">Connectivity</th>
                           <th className="px-4 py-3">Status</th>
                           <th className="px-4 py-3">Interaction</th>
                           <th className="pr-10 px-4 py-3 text-right">Ops</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-50">
                        {filteredMembers.map(member => (
                          <tr key={member._id} className="hover:bg-indigo-50/[0.15] group transition-all">
                             <td className="pl-10 px-4 py-3">
                                <div className="flex items-center gap-4">
                                   <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-sm">{member.name.charAt(0)}</div>
                                   <div>
                                      <p className="font-bold text-slate-900 text-sm uppercase tracking-tight leading-none">{member.name}</p>
                                      <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">ID: {member.userId}</p>
                                   </div>
                                </div>
                             </td>
                             <td className="px-4 py-3 font-semibold text-sm text-slate-600">{member.mobile}</td>
                             <td className="px-4 py-3">
                                <div className="flex flex-col gap-0.5">
                                   <span className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest inline-block w-fit ${member.status === 'active' ? 'bg-emerald-50 text-emerald-700' : member.status === 'banned' ? 'bg-red-50 text-red-700' : 'bg-slate-50 text-slate-500'}`}>{member.status}</span>
                                   {!member.approved && (
                                      <>
                                         <span className="px-2 py-0.5 text-[8px] font-bold text-amber-600 bg-amber-50 rounded border border-amber-100 uppercase w-fit">Pending Approval</span>
                                         {member.metadata?.requestMessage && (
                                            <p className="text-[9px] text-slate-500 italic max-w-[150px] truncate" title={member.metadata.requestMessage}>
                                               "{member.metadata.requestMessage}"
                                            </p>
                                         )}
                                         {member.metadata?.workshopsCompleted && (
                                            <span className="text-[8px] font-bold text-emerald-600 uppercase">✓ Workshops Done</span>
                                         )}
                                      </>
                                   )}
                                </div>
                             </td>
                             <td className="px-4 py-3">
                                <div className="flex gap-4">
                                   <div className="bg-slate-50 px-2 py-1 rounded-lg border border-slate-100 text-center min-w-[40px]">
                                      <p className="text-xs font-bold text-slate-800">{member.messageCount}</p>
                                      <p className="text-[8px] font-bold text-slate-400 uppercase">Posts</p>
                                   </div>
                                </div>
                             </td>
                             <td className="pr-10 px-4 py-3 text-right opacity-0 group-hover:opacity-100 transition-all">
                                <div className="flex justify-end gap-1.5">
                                   {!member.approved && (
                                      <button 
                                         onClick={() => approveMember(member._id)} 
                                         disabled={approving === member._id}
                                         title="Approve Member"
                                         className="p-2 hover:bg-emerald-600 hover:text-white rounded-lg transition-all text-emerald-600 border border-emerald-100 bg-emerald-50 disabled:opacity-50"
                                      >
                                         {approving === member._id ? <Loader size={16} className="animate-spin" /> : <CheckCircle size={16}/>}
                                      </button>
                                   )}
                                   <button onClick={() => openChatPermissions(member)} className="p-2 hover:bg-slate-900 hover:text-white rounded-lg transition-all text-slate-400 border border-slate-100" title="Chat Permissions"><Shield size={16}/></button>
                                   <button onClick={() => { setSelectedMember(member); setShowMessageModal(true); }} className="p-2 hover:bg-indigo-600 hover:text-white rounded-lg transition-all text-slate-400 border border-slate-100" title="Send Message"><Send size={16}/></button>
                                   {member.status === 'banned' ? (
                                      <button 
                                         onClick={() => unblockMember(member._id, member.userId || '', member.name)} 
                                         disabled={blockingMemberId === member._id}
                                         className="p-2 hover:bg-emerald-500 hover:text-white rounded-lg transition-all text-emerald-600 border border-emerald-100 bg-emerald-50 disabled:opacity-50"
                                         title="Unblock Member"
                                      >
                                         {blockingMemberId === member._id ? <Loader size={16} className="animate-spin" /> : <CheckCircle size={16}/>}
                                      </button>
                                   ) : (
                                      <button 
                                         onClick={() => blockMember(member._id, member.userId || '', member.name)} 
                                         disabled={blockingMemberId === member._id}
                                         className="p-2 hover:bg-red-500 hover:text-white rounded-lg transition-all text-red-400 border border-red-100 disabled:opacity-50"
                                         title="Block Member"
                                      >
                                         {blockingMemberId === member._id ? <Loader size={16} className="animate-spin" /> : <AlertCircle size={16}/>}
                                      </button>
                                   )}
                                   <button className="p-2 hover:bg-red-500 hover:text-white rounded-lg transition-all text-slate-400 border border-slate-100" title="Delete Member"><Trash2 size={16}/></button>
                                </div>
                             </td>
                          </tr>
                        ))}
                     </tbody>
                  </table>
               </div>
             )}
          </div>
        )}

        {/* Posts Tab */}
        {activeTab === 'posts' && (
          <div className="flex-1 overflow-auto bg-slate-50/80 p-6">
            {/* Posts Header with Search and Category Tabs */}
            <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-6 mb-6">
              {/* Search Bar */}
              <div className="relative mb-6">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input 
                  type="text" 
                  placeholder="Search posts..." 
                  value={postsSearchQuery} 
                  onChange={(e) => setPostsSearchQuery(e.target.value)} 
                  className="w-full pl-12 pr-4 h-12 bg-slate-50 text-slate-900 rounded-xl border border-slate-200 font-medium text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 transition-all" 
                />
              </div>
              
              {/* Category Tabs */}
              <div className="flex flex-wrap gap-2">
                {[
                  { key: 'all', label: 'All Posts', icon: '📋' },
                  { key: 'experiences', label: 'Experiences', icon: '✨' },
                  { key: 'tips', label: 'Tips & Tricks', icon: '💡' },
                  { key: 'transformations', label: 'Transformations', icon: '🦋' },
                  { key: 'questions', label: 'Questions', icon: '❓' },
                ].map(cat => (
                  <button
                    key={cat.key}
                    onClick={() => setPostCategoryFilter(cat.key as any)}
                    className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-all flex items-center gap-2 ${
                      postCategoryFilter === cat.key
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <span>{cat.icon}</span>
                    <span>{cat.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {loadingPosts ? (
              <div className="flex flex-col items-center justify-center h-80 space-y-4">
                <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
              </div>
            ) : filteredPosts.length === 0 ? (
              <div className="bg-white rounded-[2.5rem] border border-slate-200/60 h-[400px] flex flex-col items-center justify-center text-center p-20 shadow-sm">
                <MessageCircle size={48} className="text-slate-200 mb-6" />
                <h3 className="text-xl font-bold text-slate-900 mb-2">No Posts Found</h3>
                <p className="text-slate-500 text-sm">{postsSearchQuery || postCategoryFilter !== 'all' ? 'Try adjusting your search or category filter.' : 'No posts found in this community.'}</p>
              </div>
            ) : (
              <div className="bg-white rounded-[2rem] shadow-xl border border-slate-200/60 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-[#fcfdfe] border-b border-slate-100 text-left">
                    <tr className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                      <th className="pl-10 px-4 py-3">Content</th>
                      <th className="px-4 py-3">Author</th>
                      <th className="px-4 py-3">Category</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Interactions</th>
                      <th className="pr-10 px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredPosts.map(post => (
                      <tr key={post._id} className="hover:bg-indigo-50/[0.15] group transition-all">
                        <td className="pl-10 px-4 py-3">
                          <div className="flex flex-col gap-1">
                            <p className="text-sm font-semibold text-slate-900 truncate max-w-[300px]">{post.content?.substring(0, 100)}{(post.content?.length || 0) > 100 ? '...' : ''}</p>
                            {post.images?.length > 0 && <span className="text-[8px] text-slate-400">📷 {post.images.length} image(s)</span>}
                            {post.videos?.length > 0 && <span className="text-[8px] text-slate-400">🎥 {post.videos.length} video(s)</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm font-semibold text-slate-700">{post.userId}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-1 rounded-full text-[9px] font-bold uppercase bg-indigo-50 text-indigo-600">
                            {post.category || 'General'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase inline-block w-fit ${
                            post.status === 'published' ? 'bg-emerald-50 text-emerald-700' :
                            post.status === 'draft' ? 'bg-amber-50 text-amber-700' :
                            'bg-blue-50 text-blue-700'
                          }`}>
                            {post.status || 'published'}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-4">
                            <div className="text-center">
                              <p className="text-xs font-bold text-slate-800">👍 {Array.isArray(post.likes) ? post.likes.length : (post.likes || 0)}</p>
                              <p className="text-[8px] text-slate-400">Likes</p>
                            </div>
                            <div className="text-center">
                              <p className="text-xs font-bold text-slate-800">💬 {Array.isArray(post.comments) ? post.comments.length : (post.comments || 0)}</p>
                              <p className="text-[8px] text-slate-400">Comments</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">
                          {new Date(post.createdAt).toLocaleDateString()}
                        </td>
                        <td className="pr-10 px-4 py-3 text-right opacity-0 group-hover:opacity-100 transition-all">
                          <div className="flex justify-end gap-1.5">
                            <button
                              onClick={() => openCommentsModal(post)}
                              className="p-2 hover:bg-emerald-600 hover:text-white rounded-lg transition-all text-emerald-500 border border-emerald-100"
                              title={`Manage Comments (${Array.isArray(post.comments) ? post.comments.length : 0})`}
                            >
                              <MessageCircle size={16} />
                            </button>
                            <button
                              onClick={() => openEditPostModal(post)}
                              className="p-2 hover:bg-blue-600 hover:text-white rounded-lg transition-all text-blue-500 border border-blue-100"
                              title="Edit Post"
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              onClick={() => deletePost(post._id)}
                              disabled={deletingPostId === post._id}
                              className="p-2 hover:bg-red-600 hover:text-white rounded-lg transition-all text-red-500 border border-red-100 disabled:opacity-50"
                              title="Delete Post"
                            >
                              {deletingPostId === post._id ? <Loader size={16} className="animate-spin" /> : <Trash2 size={16} />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Pagination */}
                {totalPosts > postsLimit && (
                  <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50">
                    <p className="text-sm text-slate-600">
                      Showing {((postsPage - 1) * postsLimit) + 1} to {Math.min(postsPage * postsLimit, totalPosts)} of {totalPosts} posts
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => fetchCommunityPosts(postsPage - 1)}
                        disabled={postsPage === 1}
                        className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold hover:bg-slate-50 disabled:opacity-50"
                      >
                        Previous
                      </button>
                      <button
                        onClick={() => fetchCommunityPosts(postsPage + 1)}
                        disabled={postsPage >= Math.ceil(totalPosts / postsLimit)}
                        className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold hover:bg-slate-50 disabled:opacity-50"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Recordings Tab - Hero + Playlist Cards Design */}
        {activeTab === 'recordings' && (
          <div className="flex-1 overflow-auto bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
            {loadingRecordings ? (
              <div className="flex flex-col items-center justify-center h-full space-y-4">
                <div className="w-12 h-12 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
                <p className="text-sm text-slate-400">Loading recordings...</p>
              </div>
            ) : recordings.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-20">
                <div className="w-24 h-24 bg-slate-700/50 rounded-full flex items-center justify-center mb-8">
                  <VideoIcon size={48} className="text-slate-500" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">No Workshop Recordings Yet</h3>
                <p className="text-slate-400 text-sm mb-8 max-w-md">Upload your workshop recordings organized by Workshop → Batch → Video for easy access.</p>
                <div className="flex gap-4">
                  <button
                    onClick={() => setShowUploadRecordingModal(true)}
                    className="px-8 py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-2xl font-bold text-sm hover:from-emerald-600 hover:to-teal-600 transition-all flex items-center gap-3 shadow-xl shadow-emerald-500/20"
                  >
                    <Upload size={20} />
                    Upload Recording
                  </button>
                  <button
                    onClick={() => setShowAddYouTubeRecordingModal(true)}
                    className="px-8 py-4 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-2xl font-bold text-sm hover:from-red-600 hover:to-red-700 transition-all flex items-center gap-3 shadow-xl shadow-red-500/20"
                  >
                    ▶ Add YouTube URL
                  </button>
                </div>
              </div>
            ) : (() => {
              // Parse recordings into folder/playlist structure
              const folders: Record<string, Record<string, any[]>> = {};
              recordings.forEach(rec => {
                const parts = rec.title?.split(' > ') || [];
                const folder = parts[0] || 'Uncategorized';
                const playlist = parts[1] || 'Default Batch';
                
                if (!folders[folder]) folders[folder] = {};
                if (!folders[folder][playlist]) folders[folder][playlist] = [];
                folders[folder][playlist].push(rec);
              });
              
              const folderNames = Object.keys(folders);
              const currentFolder = selectedFolder || folderNames[0];
              const playlists = folders[currentFolder] || {};
              const playlistNames = Object.keys(playlists);
              
              // Get first video thumbnail for hero
              const firstPlaylist = playlistNames[0];
              const heroVideo = firstPlaylist ? playlists[firstPlaylist]?.[0] : null;
              
              return (
                <div className="min-h-full">
                  {/* Hero Section with Folder Name */}
                  <div className="relative h-[400px] overflow-hidden">
                    {/* Background Image/Gradient */}
                    <div className="absolute inset-0">
                      {heroVideo?.thumbnailUrl ? (
                        <img 
                          src={getProxiedMediaUrl(heroVideo.thumbnailUrl, token)} 
                          alt={currentFolder}
                          className="w-full h-full object-cover opacity-40"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700" />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/80 to-transparent" />
                    </div>
                    
                    {/* Hero Content */}
                    <div className="relative z-10 h-full flex flex-col justify-end p-8 lg:p-12">
                      {/* Top bar with actions */}
                      <div className="absolute top-6 right-6 flex gap-3">
                        <button
                          onClick={fetchRecordings}
                          className="px-4 py-2 bg-white/10 backdrop-blur-md text-white rounded-xl font-bold text-sm hover:bg-white/20 transition-all flex items-center gap-2 border border-white/20"
                        >
                          <Loader size={16} className={loadingRecordings ? 'animate-spin' : ''} />
                          Refresh
                        </button>
                        <button
                          onClick={() => setShowUploadRecordingModal(true)}
                          className="px-4 py-2 bg-emerald-500 text-white rounded-xl font-bold text-sm hover:bg-emerald-600 transition-all flex items-center gap-2"
                        >
                          <Upload size={16} />
                          Upload
                        </button>
                        <button
                          onClick={() => setShowAddYouTubeRecordingModal(true)}
                          className="px-4 py-2 bg-red-500 text-white rounded-xl font-bold text-sm hover:bg-red-600 transition-all flex items-center gap-2"
                        >
                          ▶ YouTube
                        </button>
                      </div>
                      
                      {/* Folder tabs */}
                      {folderNames.length > 1 && (
                        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                          {folderNames.map(folder => (
                            <button
                              key={folder}
                              onClick={() => { setSelectedFolder(folder); setSelectedPlaylist(null); }}
                              className={`px-5 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all ${
                                currentFolder === folder
                                  ? 'bg-white text-slate-900'
                                  : 'bg-white/10 text-white hover:bg-white/20 border border-white/20'
                              }`}
                            >
                              {folder}
                            </button>
                          ))}
                        </div>
                      )}
                      
                      {/* Folder title */}
                      <div className="flex items-center gap-4 mb-2">
                        <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-lg text-xs font-bold uppercase tracking-wider">
                          Workshop
                        </span>
                      </div>
                      <h1 className="text-4xl lg:text-5xl font-black text-white mb-3 tracking-tight">
                        {currentFolder}
                      </h1>
                      <p className="text-slate-300 text-lg">
                        {playlistNames.length} Batches • {Object.values(playlists).flat().length} Videos
                      </p>
                    </div>
                  </div>
                  
                  {/* Playlist Cards Section */}
                  <div className="p-8 lg:p-12 -mt-16 relative z-20">
                    <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                      <span className="w-1 h-6 bg-emerald-500 rounded-full"></span>
                      Batches / Playlists
                    </h2>
                    
                    {!selectedPlaylist ? (
                      /* Playlist Grid */
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {playlistNames.map((playlistName, index) => {
                          const playlistVideos = playlists[playlistName];
                          const firstVideo = playlistVideos[0];
                          const colors = [
                            'from-purple-500 to-pink-500',
                            'from-blue-500 to-cyan-500',
                            'from-orange-500 to-red-500',
                            'from-emerald-500 to-teal-500',
                            'from-indigo-500 to-purple-500',
                            'from-rose-500 to-orange-500',
                          ];
                          
                          return (
                            <div 
                              key={playlistName}
                              className="group bg-slate-800/50 backdrop-blur-sm rounded-3xl overflow-hidden border border-slate-700/50 hover:border-emerald-500/50 transition-all hover:shadow-2xl hover:shadow-emerald-500/10 cursor-pointer"
                              onClick={() => setSelectedPlaylist(playlistName)}
                            >
                              {/* Thumbnail */}
                              <div className="aspect-video relative overflow-hidden">
                                {firstVideo?.thumbnailUrl ? (
                                  <img 
                                    src={getProxiedMediaUrl(firstVideo.thumbnailUrl, token)} 
                                    alt={playlistName}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                  />
                                ) : (
                                  <div className={`w-full h-full bg-gradient-to-br ${colors[index % colors.length]} flex items-center justify-center`}>
                                    <VideoIcon size={48} className="text-white/50" />
                                  </div>
                                )}
                                
                                {/* Overlay with play button */}
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                                  <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center shadow-xl transform scale-75 group-hover:scale-100 transition-transform">
                                    <ArrowRight size={28} className="text-slate-900 ml-1" />
                                  </div>
                                </div>
                                
                                {/* Video count badge */}
                                <div className="absolute bottom-3 right-3 px-3 py-1 bg-black/70 backdrop-blur-sm rounded-lg text-white text-xs font-bold">
                                  {playlistVideos.length} videos
                                </div>
                              </div>
                              
                              {/* Card content */}
                              <div className="p-5">
                                <h3 className="font-bold text-white text-lg mb-2 group-hover:text-emerald-400 transition-colors">
                                  {playlistName}
                                </h3>
                                <div className="flex items-center justify-between">
                                  <span className="text-slate-400 text-sm">
                                    {playlistVideos.length} recordings
                                  </span>
                                  <button className="px-4 py-2 bg-emerald-500/20 text-emerald-400 rounded-xl text-sm font-bold group-hover:bg-emerald-500 group-hover:text-white transition-all flex items-center gap-2">
                                    Play Now <ArrowRight size={16} />
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      /* Video List View when playlist selected */
                      <div>
                        {/* Back button */}
                        <button 
                          onClick={() => setSelectedPlaylist(null)}
                          className="mb-6 px-4 py-2 bg-slate-700/50 text-white rounded-xl font-bold text-sm hover:bg-slate-700 transition-all flex items-center gap-2"
                        >
                          ← Back to Batches
                        </button>
                        
                        {/* Playlist header */}
                        <div className="bg-gradient-to-r from-emerald-500/20 to-teal-500/20 rounded-2xl p-6 mb-8 border border-emerald-500/30">
                          <h3 className="text-2xl font-bold text-white mb-2">{selectedPlaylist}</h3>
                          <p className="text-slate-300">{playlists[selectedPlaylist]?.length || 0} videos in this batch</p>
                        </div>
                        
                        {/* Videos grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          {(playlists[selectedPlaylist] || []).sort((a, b) => {
                            const numA = parseInt(a.title?.match(/Video (\d+)/)?.[1] || '0');
                            const numB = parseInt(b.title?.match(/Video (\d+)/)?.[1] || '0');
                            return numA - numB;
                          }).map((recording, index) => (
                            <div key={recording._id} className="group bg-slate-800/50 backdrop-blur-sm rounded-2xl overflow-hidden border border-slate-700/50 hover:border-emerald-500/50 transition-all">
                              {/* Video thumbnail */}
                              <div className="aspect-video relative overflow-hidden">
                                {recording.thumbnailUrl ? (
                                  <img 
                                    src={getProxiedMediaUrl(recording.thumbnailUrl, token)} 
                                    alt={recording.title}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                  />
                                ) : (
                                  <div className="w-full h-full bg-gradient-to-br from-slate-700 to-slate-600 flex items-center justify-center">
                                    <VideoIcon size={40} className="text-slate-500" />
                                  </div>
                                )}
                                
                                {/* Play overlay */}
                                {recording.s3Url && (
                                  <a 
                                    href={getProxiedMediaUrl(recording.s3Url, token)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center"
                                  >
                                    <div className="w-14 h-14 rounded-full bg-emerald-500 flex items-center justify-center shadow-xl transform scale-75 group-hover:scale-100 transition-transform">
                                      <ArrowRight size={24} className="text-white ml-0.5" />
                                    </div>
                                  </a>
                                )}
                                
                                {/* Video number badge */}
                                <div className="absolute top-3 left-3 w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-lg">
                                  {index + 1}
                                </div>
                                
                                {/* Duration */}
                                {recording.duration && (
                                  <div className="absolute bottom-3 right-3 px-2 py-1 bg-black/70 rounded-lg text-white text-xs font-bold">
                                    {Math.floor(recording.duration / 60)}:{(recording.duration % 60).toString().padStart(2, '0')}
                                  </div>
                                )}
                              </div>
                              
                              {/* Video info */}
                              <div className="p-4">
                                <h4 className="font-bold text-white mb-1">
                                  {recording.title?.split(' > ').pop() || `Video ${index + 1}`}
                                </h4>
                                {recording.description && (
                                  <p className="text-slate-400 text-sm mb-3 line-clamp-2">{recording.description}</p>
                                )}
                                <div className="flex items-center justify-between">
                                  <span className="text-slate-500 text-xs">
                                    {new Date(recording.createdAt).toLocaleDateString()}
                                  </span>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); deleteVideo(recording._id); }}
                                    className="p-2 text-slate-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* Videos Tab */}
        {activeTab === 'videos' && (
          <div className="flex-1 overflow-auto bg-slate-50/80 p-6">
            <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">📹 Community Videos</h3>
                  <p className="text-sm text-slate-500">AWS uploads and YouTube links (non-shareable)</p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={fetchVideos}
                    className="px-4 py-2 bg-slate-50 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-100 transition-all flex items-center gap-2"
                  >
                    <Loader size={16} className={loadingVideos ? 'animate-spin' : ''} />
                    Refresh
                  </button>
                  <button
                    onClick={() => setShowAddYouTubeModal(true)}
                    className="px-4 py-2 bg-red-600 text-white rounded-xl font-bold text-sm hover:bg-red-700 transition-all flex items-center gap-2"
                  >
                    ▶ Add YouTube
                  </button>
                  <button
                    onClick={() => setShowUploadVideoModal(true)}
                    className="px-4 py-2 bg-purple-600 text-white rounded-xl font-bold text-sm hover:bg-purple-700 transition-all flex items-center gap-2"
                  >
                    <Upload size={16} />
                    Upload Video
                  </button>
                </div>
              </div>
            </div>

            {loadingVideos ? (
              <div className="flex flex-col items-center justify-center h-80 space-y-4">
                <div className="w-10 h-10 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />
                <p className="text-sm text-slate-500">Loading videos...</p>
              </div>
            ) : videos.length === 0 ? (
              <div className="bg-white rounded-[2.5rem] border border-slate-200/60 h-[400px] flex flex-col items-center justify-center text-center p-20 shadow-sm">
                <VideoIcon size={48} className="text-slate-200 mb-6" />
                <h3 className="text-xl font-bold text-slate-900 mb-2">No Videos Yet</h3>
                <p className="text-slate-500 text-sm mb-6">Upload videos to share exclusive content with this community.</p>
                <button
                  onClick={() => setShowUploadVideoModal(true)}
                  className="px-6 py-3 bg-purple-600 text-white rounded-xl font-bold text-sm hover:bg-purple-700 transition-all flex items-center gap-2"
                >
                  <Upload size={18} />
                  Upload First Video
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {videos.map(video => (
                  <div key={video._id} className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden hover:shadow-lg transition-all group">
                    <div className="aspect-video bg-gradient-to-br from-purple-100 to-purple-50 flex items-center justify-center relative">
                      {video.thumbnailUrl ? (
                        <img 
                          src={video.source === 'youtube_import' 
                            ? video.thumbnailUrl 
                            : getProxiedMediaUrl(video.thumbnailUrl, token)} 
                          alt={video.title} 
                          className="w-full h-full object-cover" 
                        />
                      ) : (
                        <VideoIcon size={48} className="text-purple-300" />
                      )}
                      {video.duration && video.duration > 0 && (
                        <span className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded-lg font-bold">
                          {Math.floor(video.duration / 60)}:{(video.duration % 60).toString().padStart(2, '0')}
                        </span>
                      )}
                      {/* Source badge */}
                      <span className={`absolute top-2 left-2 px-2 py-1 rounded text-xs font-bold ${
                        video.source === 'youtube_import' 
                          ? 'bg-red-600 text-white' 
                          : 'bg-purple-600 text-white'
                      }`}>
                        {video.source === 'youtube_import' ? '▶ YouTube' : '☁️ AWS'}
                      </span>
                    </div>
                    <div className="p-5">
                      <h4 className="font-bold text-slate-900 mb-1 line-clamp-2">{video.title}</h4>
                      {video.description && (
                        <p className="text-xs text-slate-500 mb-2 line-clamp-2">{video.description}</p>
                      )}
                      <p className="text-xs text-slate-400 mb-3">
                        Added {new Date(video.createdAt).toLocaleDateString()}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-purple-600 bg-purple-50 px-3 py-1 rounded-full">
                          📊 {video.views || 0} views
                        </span>
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                          {video.source === 'youtube_import' && video.youtubeVideoId && (
                            <a 
                              href={`https://www.youtube.com/watch?v=${video.youtubeVideoId}`} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="p-2 hover:bg-red-600 hover:text-white rounded-lg transition-all text-red-500 border border-red-100"
                              title="Open on YouTube"
                            >
                              <ArrowRight size={16} />
                            </a>
                          )}
                          {video.s3Url && video.source !== 'youtube_import' && (
                            <a 
                              href={getProxiedMediaUrl(video.s3Url, token)} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="p-2 hover:bg-purple-600 hover:text-white rounded-lg transition-all text-purple-500 border border-purple-100"
                            >
                              <ArrowRight size={16} />
                            </a>
                          )}
                          <button
                            onClick={() => deleteVideo(video._id)}
                            className="p-2 hover:bg-red-600 hover:text-white rounded-lg transition-all text-red-500 border border-red-100"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Submissions Tab */}
        {activeTab === 'submissions' && (
          <div className="flex-1 overflow-auto bg-slate-50/80 p-6">
            <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">📝 User Submissions</h3>
                  <p className="text-sm text-slate-500">Review and approve community content from users</p>
                </div>
                <div className="flex gap-3">
                  <select 
                    value={submissionsFilter} 
                    onChange={(e) => { setSubmissionsFilter(e.target.value as any); fetchSubmissions(e.target.value); }}
                    className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none"
                  >
                    <option value="pending">⏳ Pending ({submissionsCounts.pending})</option>
                    <option value="approved">✅ Approved ({submissionsCounts.approved})</option>
                    <option value="rejected">❌ Rejected ({submissionsCounts.rejected})</option>
                    <option value="posted">📤 Posted ({submissionsCounts.posted})</option>
                    <option value="all">All</option>
                  </select>
                  <button
                    onClick={() => fetchSubmissions()}
                    className="px-4 py-2 bg-slate-50 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-100 transition-all flex items-center gap-2"
                  >
                    <Loader size={16} className={loadingSubmissions ? 'animate-spin' : ''} />
                    Refresh
                  </button>
                </div>
              </div>
            </div>

            {loadingSubmissions ? (
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
                {submissions.map((sub: any) => (
                  <div key={sub._id} className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
                    <div className={`px-6 py-4 border-b flex items-center justify-between ${
                      sub.category === 'experiences' ? 'bg-purple-50 border-purple-100' :
                      sub.category === 'tips' ? 'bg-yellow-50 border-yellow-100' :
                      sub.category === 'transformations' ? 'bg-emerald-50 border-emerald-100' :
                      'bg-blue-50 border-blue-100'
                    }`}>
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">
                          {sub.category === 'experiences' ? '✨' : sub.category === 'tips' ? '💡' : sub.category === 'transformations' ? '🦋' : '❓'}
                        </span>
                        <div>
                          <h4 className="font-bold text-slate-900 capitalize">{sub.category}</h4>
                          <p className="text-xs text-slate-500">
                            by {sub.userName || sub.participantName} • {new Date(sub.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        sub.status === 'pending' ? 'bg-orange-100 text-orange-700' :
                        sub.status === 'approved' ? 'bg-green-100 text-green-700' :
                        sub.status === 'rejected' ? 'bg-red-100 text-red-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
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
                        <div className="bg-blue-50 rounded-xl p-4 mb-4">
                          <h5 className="text-sm font-bold text-blue-700 mb-2">❓ Question</h5>
                          <p className="text-sm text-slate-700 whitespace-pre-wrap">{sub.question}</p>
                          {sub.answer && (
                            <div className="mt-3 pt-3 border-t border-blue-200">
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
                              onClick={() => loadSubmissionToPost(sub)}
                              className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-all flex items-center gap-2"
                            >
                              <Send size={16} />
                              Create Post
                            </button>
                            <button
                              onClick={() => updateSubmissionStatus(sub._id, 'approved')}
                              className="px-4 py-2 bg-green-100 text-green-700 rounded-xl font-bold text-sm hover:bg-green-200 transition-all"
                            >
                              ✅ Approve
                            </button>
                            <button
                              onClick={() => updateSubmissionStatus(sub._id, 'rejected')}
                              className="px-4 py-2 bg-red-100 text-red-700 rounded-xl font-bold text-sm hover:bg-red-200 transition-all"
                            >
                              ❌ Reject
                            </button>
                          </>
                        )}
                        {sub.status === 'approved' && (
                          <button
                            onClick={() => loadSubmissionToPost(sub)}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-all flex items-center gap-2"
                          >
                            <Send size={16} />
                            Create Post
                          </button>
                        )}
                        <button
                          onClick={() => deleteSubmission(sub._id)}
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
        )}
      </div>

      {/* Upload Video Modal */}
      {showUploadVideoModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[100] flex items-center justify-center animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-8 m-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-slate-900">📹 Upload Video</h3>
              <button onClick={() => setShowUploadVideoModal(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-all">
                <Plus className="rotate-45" size={20} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-bold text-slate-700 mb-2 block">Video Title</label>
                <input 
                  type="text" 
                  value={videoTitle} 
                  onChange={e => setVideoTitle(e.target.value)}
                  placeholder="Enter video title..."
                  className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-300 transition-all"
                />
              </div>
              
              <div>
                <label className="text-sm font-bold text-slate-700 mb-2 block">Description (Optional)</label>
                <textarea 
                  value={videoDescription} 
                  onChange={e => setVideoDescription(e.target.value)}
                  placeholder="Enter video description..."
                  className="w-full h-24 p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-300 transition-all resize-none"
                />
              </div>
              
              <div>
                <label className="text-sm font-bold text-slate-700 mb-2 block">Video File</label>
                <label className={`flex flex-col items-center justify-center h-32 border-2 border-dashed rounded-2xl cursor-pointer transition-all ${uploadingVideo ? 'border-purple-300 bg-purple-50' : 'border-slate-200 hover:border-purple-300 hover:bg-purple-50'}`}>
                  {uploadingVideo ? (
                    <>
                      <Loader className="animate-spin text-purple-600 mb-2" size={32} />
                      <span className="text-sm font-bold text-purple-600">Uploading...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="text-slate-400 mb-2" size={32} />
                      <span className="text-sm font-medium text-slate-600">Click to select video</span>
                      <span className="text-xs text-slate-400">MP4, WebM, MOV (max 2GB)</span>
                    </>
                  )}
                  <input 
                    type="file" 
                    className="hidden" 
                    accept="video/*" 
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) uploadNewVideo(file);
                    }}
                    disabled={uploadingVideo}
                  />
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add YouTube Video Modal */}
      {showAddYouTubeModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[100] flex items-center justify-center animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-8 m-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-slate-900">▶ Add YouTube Video</h3>
              <button onClick={() => setShowAddYouTubeModal(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-all">
                <Plus className="rotate-45" size={20} />
              </button>
            </div>
            
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
              <p className="text-amber-800 text-sm">
                <strong>🔒 Privacy:</strong> YouTube videos should be <strong>unlisted</strong> to prevent unauthorized access. 
                Members can watch via embed but cannot share the direct URL.
              </p>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-bold text-slate-700 mb-2 block">YouTube URL or Video ID *</label>
                <input 
                  type="text" 
                  value={youtubeUrl} 
                  onChange={e => setYoutubeUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=... or video ID"
                  className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-300 transition-all"
                />
              </div>
              
              <div>
                <label className="text-sm font-bold text-slate-700 mb-2 block">Video Title *</label>
                <input 
                  type="text" 
                  value={youtubeTitle} 
                  onChange={e => setYoutubeTitle(e.target.value)}
                  placeholder="Enter video title..."
                  className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-300 transition-all"
                />
              </div>
              
              <div>
                <label className="text-sm font-bold text-slate-700 mb-2 block">Description (Optional)</label>
                <textarea 
                  value={youtubeDescription} 
                  onChange={e => setYoutubeDescription(e.target.value)}
                  placeholder="Enter video description..."
                  className="w-full h-24 p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-300 transition-all resize-none"
                />
              </div>
              
              <button
                onClick={async () => {
                  if (!youtubeUrl.trim() || !youtubeTitle.trim()) {
                    alert('YouTube URL and title are required');
                    return;
                  }
                  setAddingYouTube(true);
                  try {
                    const res = await fetch('/api/admin/communities/youtube-videos', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                      },
                      body: JSON.stringify({
                        communityId: selectedCommunity,
                        youtubeUrl: youtubeUrl.trim(),
                        title: youtubeTitle.trim(),
                        description: youtubeDescription.trim(),
                        isCommon: true,
                      }),
                    });
                    const json = await res.json();
                    if (!res.ok) throw new Error(json.error || 'Failed to add video');
                    alert('✅ YouTube video added successfully!');
                    setShowAddYouTubeModal(false);
                    setYoutubeUrl('');
                    setYoutubeTitle('');
                    setYoutubeDescription('');
                    fetchVideos();
                  } catch (err: any) {
                    alert('❌ Error: ' + err.message);
                  } finally {
                    setAddingYouTube(false);
                  }
                }}
                disabled={addingYouTube || !youtubeUrl.trim() || !youtubeTitle.trim()}
                className="w-full h-12 bg-red-600 text-white rounded-xl font-bold text-sm hover:bg-red-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {addingYouTube ? (
                  <>
                    <Loader className="animate-spin" size={18} />
                    Adding...
                  </>
                ) : (
                  <>▶ Add YouTube Video</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create New Community Modal */}
      {showCreateCommunityModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[100] flex items-center justify-center animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-8 m-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-slate-900">➕ Create New Community</h3>
              <button onClick={() => setShowCreateCommunityModal(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-all">
                <Plus className="rotate-45" size={20} />
              </button>
            </div>
            
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-6">
              <p className="text-emerald-800 text-sm">
                <strong>ℹ️ Note:</strong> New communities are <strong>members-only</strong> by default. 
                Only the <strong>Global Community</strong> is open to everyone.
              </p>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-bold text-slate-700 mb-2 block">Community Name *</label>
                <input 
                  type="text" 
                  value={newCommunityInput.name} 
                  onChange={e => setNewCommunityInput(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Advanced Yoga Masters"
                  className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-300 transition-all"
                />
              </div>
              
              <div>
                <label className="text-sm font-bold text-slate-700 mb-2 block">Description (Optional)</label>
                <textarea 
                  value={newCommunityInput.description} 
                  onChange={e => setNewCommunityInput(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe what this community is for..."
                  className="w-full h-24 p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-300 transition-all resize-none"
                />
              </div>
              
              <div>
                <label className="text-sm font-bold text-slate-700 mb-2 block">Icon</label>
                <div className="flex flex-wrap gap-2">
                  {['🌟', '🧘', '✨', '🎵', '🔱', '💪', '🚀', '👶', '💍', '📈', '🌐', '📚', '🕉️', '💼', '🌍'].map(icon => (
                    <button 
                      key={icon}
                      onClick={() => setNewCommunityInput(prev => ({ ...prev, icon }))}
                      className={`w-10 h-10 rounded-xl border-2 transition-all text-xl flex items-center justify-center ${
                        newCommunityInput.icon === icon 
                          ? 'border-emerald-500 bg-emerald-50' 
                          : 'border-slate-200 hover:border-emerald-300'
                      }`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>
              
              <button
                onClick={createCommunity}
                disabled={creatingCommunity || !newCommunityInput.name.trim()}
                className="w-full h-12 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-4"
              >
                {creatingCommunity ? (
                  <>
                    <Loader className="animate-spin" size={18} />
                    Creating...
                  </>
                ) : (
                  <>➕ Create Community</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Recording Modal - Folder/Playlist/Video Structure */}
      {showUploadRecordingModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[100] flex items-center justify-center animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-8 m-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-slate-900">🎥 Upload Recording</h3>
              <button onClick={() => setShowUploadRecordingModal(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-all">
                <Plus className="rotate-45" size={20} />
              </button>
            </div>
            
            <div className="space-y-4">
              {/* Folder/Workshop Name */}
              <div>
                <label className="text-sm font-bold text-slate-700 mb-2 block">
                  📁 Workshop Name (Folder)
                </label>
                <input 
                  type="text" 
                  value={recordingFolderName} 
                  onChange={e => setRecordingFolderName(e.target.value)}
                  placeholder="e.g., Swar Yoga Workshop"
                  className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-300 transition-all"
                />
              </div>
              
              {/* Playlist/Batch Name */}
              <div>
                <label className="text-sm font-bold text-slate-700 mb-2 block">
                  🎬 Batch Name (Playlist)
                </label>
                <input 
                  type="text" 
                  value={recordingPlaylistName} 
                  onChange={e => setRecordingPlaylistName(e.target.value)}
                  placeholder="e.g., February 2026 Batch"
                  className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-300 transition-all"
                />
              </div>
              
              {/* Video Number */}
              <div>
                <label className="text-sm font-bold text-slate-700 mb-2 block">
                  🔢 Video Number
                </label>
                <input 
                  type="text" 
                  value={recordingVideoNumber} 
                  onChange={e => setRecordingVideoNumber(e.target.value)}
                  placeholder="e.g., 1, 2, 3..."
                  className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-300 transition-all"
                />
              </div>
              
              {/* Description */}
              <div>
                <label className="text-sm font-bold text-slate-700 mb-2 block">Description (Optional)</label>
                <textarea 
                  value={recordingDescription} 
                  onChange={e => setRecordingDescription(e.target.value)}
                  placeholder="e.g., Introduction to Nadi, Breathing techniques..."
                  className="w-full h-20 p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-300 transition-all resize-none"
                />
              </div>
              
              {/* Preview */}
              {recordingFolderName && recordingPlaylistName && recordingVideoNumber && (
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                  <p className="text-xs font-bold text-emerald-700 uppercase mb-1">Video will be saved as:</p>
                  <p className="text-sm text-emerald-800 font-medium">
                    📁 {recordingFolderName} → 🎬 {recordingPlaylistName} → 🎥 Video {recordingVideoNumber}
                  </p>
                </div>
              )}
              
              {/* Video File Upload */}
              <div>
                <label className="text-sm font-bold text-slate-700 mb-2 block">Video File</label>
                <label className={`flex flex-col items-center justify-center h-32 border-2 border-dashed rounded-2xl cursor-pointer transition-all ${uploadingRecording ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 hover:border-emerald-300 hover:bg-emerald-50'}`}>
                  {uploadingRecording ? (
                    <>
                      <Loader className="animate-spin text-emerald-600 mb-2" size={32} />
                      <span className="text-sm font-bold text-emerald-600">Uploading...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="text-slate-400 mb-2" size={32} />
                      <span className="text-sm font-medium text-slate-600">Click to select video</span>
                      <span className="text-xs text-slate-400">MP4, WebM, MOV (max 2GB)</span>
                    </>
                  )}
                  <input 
                    type="file" 
                    className="hidden" 
                    accept="video/*" 
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) uploadNewRecording(file);
                    }}
                    disabled={uploadingRecording || !recordingFolderName || !recordingPlaylistName || !recordingVideoNumber}
                  />
                </label>
                {(!recordingFolderName || !recordingPlaylistName || !recordingVideoNumber) && (
                  <p className="text-xs text-amber-600 mt-2">⚠️ Fill all required fields above before uploading</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add YouTube Recording Modal - with Folder/Playlist structure */}
      {showAddYouTubeRecordingModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[100] flex items-center justify-center animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-8 m-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-slate-900">▶ Add YouTube Recording</h3>
              <button onClick={() => setShowAddYouTubeRecordingModal(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-all">
                <Plus className="rotate-45" size={20} />
              </button>
            </div>
            
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
              <p className="text-amber-800 text-sm">
                <strong>🔒 Privacy:</strong> YouTube videos should be <strong>unlisted</strong> to prevent unauthorized access. 
              </p>
            </div>
            
            <div className="space-y-4">
              {/* YouTube URL */}
              <div>
                <label className="text-sm font-bold text-slate-700 mb-2 block">YouTube URL or Video ID *</label>
                <input 
                  type="text" 
                  value={youtubeRecordingUrl} 
                  onChange={e => setYoutubeRecordingUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=... or video ID"
                  className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-300 transition-all"
                />
              </div>
              
              {/* Folder/Workshop Name */}
              <div>
                <label className="text-sm font-bold text-slate-700 mb-2 block">
                  📁 Workshop Name (Folder) *
                </label>
                <input 
                  type="text" 
                  value={recordingFolderName} 
                  onChange={e => setRecordingFolderName(e.target.value)}
                  placeholder="e.g., Swar Yoga Workshop"
                  className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-300 transition-all"
                />
              </div>
              
              {/* Playlist/Batch Name */}
              <div>
                <label className="text-sm font-bold text-slate-700 mb-2 block">
                  🎬 Batch Name (Playlist) *
                </label>
                <input 
                  type="text" 
                  value={recordingPlaylistName} 
                  onChange={e => setRecordingPlaylistName(e.target.value)}
                  placeholder="e.g., February 2026 Batch"
                  className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-300 transition-all"
                />
              </div>
              
              {/* Video Number */}
              <div>
                <label className="text-sm font-bold text-slate-700 mb-2 block">
                  🔢 Video Number *
                </label>
                <input 
                  type="text" 
                  value={recordingVideoNumber} 
                  onChange={e => setRecordingVideoNumber(e.target.value)}
                  placeholder="e.g., 1, 2, 3..."
                  className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-300 transition-all"
                />
              </div>
              
              {/* Description */}
              <div>
                <label className="text-sm font-bold text-slate-700 mb-2 block">Description (Optional)</label>
                <textarea 
                  value={recordingDescription} 
                  onChange={e => setRecordingDescription(e.target.value)}
                  placeholder="e.g., Introduction to Nadi, Breathing techniques..."
                  className="w-full h-20 p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-300 transition-all resize-none"
                />
              </div>
              
              {/* Preview */}
              {recordingFolderName && recordingPlaylistName && recordingVideoNumber && (
                <div className="p-3 bg-red-50 rounded-xl border border-red-100">
                  <p className="text-xs font-bold text-red-700 uppercase mb-1">Video will be saved as:</p>
                  <p className="text-sm text-red-800 font-medium">
                    📁 {recordingFolderName} → 🎬 {recordingPlaylistName} → 🎥 Video {recordingVideoNumber}
                  </p>
                </div>
              )}
              
              <button
                onClick={async () => {
                  if (!youtubeRecordingUrl.trim()) {
                    alert('YouTube URL is required');
                    return;
                  }
                  if (!recordingFolderName.trim() || !recordingPlaylistName.trim() || !recordingVideoNumber.trim()) {
                    alert('Workshop name, Batch name, and Video number are required');
                    return;
                  }
                  setAddingYouTubeRecording(true);
                  try {
                    const title = `${recordingFolderName} > ${recordingPlaylistName} > Video ${recordingVideoNumber}`;
                    const res = await fetch('/api/admin/communities/youtube-videos', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                      },
                      body: JSON.stringify({
                        communityId: selectedCommunity,
                        youtubeUrl: youtubeRecordingUrl.trim(),
                        title: title,
                        description: recordingDescription.trim(),
                        isCommon: true,
                        tags: [`folder:${recordingFolderName}`, `playlist:${recordingPlaylistName}`, 'recording'],
                        isRecording: true,
                      }),
                    });
                    const json = await res.json();
                    if (!res.ok) throw new Error(json.error || 'Failed to add recording');
                    alert('✅ YouTube recording added successfully!');
                    setShowAddYouTubeRecordingModal(false);
                    setYoutubeRecordingUrl('');
                    setRecordingFolderName('');
                    setRecordingPlaylistName('');
                    setRecordingVideoNumber('');
                    setRecordingDescription('');
                    fetchRecordings();
                  } catch (err: any) {
                    alert('❌ Error: ' + err.message);
                  } finally {
                    setAddingYouTubeRecording(false);
                  }
                }}
                disabled={addingYouTubeRecording || !youtubeRecordingUrl.trim() || !recordingFolderName.trim() || !recordingPlaylistName.trim() || !recordingVideoNumber.trim()}
                className="w-full h-12 bg-red-600 text-white rounded-xl font-bold text-sm hover:bg-red-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {addingYouTubeRecording ? (
                  <>
                    <Loader className="animate-spin" size={18} />
                    Adding...
                  </>
                ) : (
                  <>▶ Add YouTube Recording</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Post Modal */}
      {showEditPostModal && editingPost && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[100] flex flex-col animate-in fade-in">
           <div className="bg-white w-full h-full flex flex-col">
              <div className="h-24 border-b px-12 flex items-center justify-between shrink-0">
                 <div className="flex items-center gap-6">
                    <button onClick={() => setShowEditPostModal(false)} className="p-2 hover:bg-slate-50 rounded-xl transition-all"><Plus className="rotate-45" size={24} /></button>
                    <h2 className="text-2xl font-bold tracking-tight">Edit Published Post</h2>
                 </div>
                 <button onClick={saveEditPost} disabled={editingPostLoading} className="h-14 px-12 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-xl shadow-indigo-600/20 transition-all flex items-center gap-3 text-sm">
                   {editingPostLoading ? <Loader className="animate-spin" size={18} /> : <CheckCircle size={18} />} 
                   Save Changes
                 </button>
              </div>

              <div className="flex-1 flex overflow-hidden bg-slate-50/50">
                 {/* Left Side: Form */}
                 <div className="flex-1 overflow-y-auto p-8 lg:p-12 space-y-12">
                    
                    {/* 1. Header & Footer */}
                    <section className="bg-white p-8 rounded-[2rem] border shadow-sm space-y-6">
                       <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400">1. Styling (Header/Footer)</h3>
                       <div className="grid grid-cols-2 gap-6">
                          <div className="relative">
                             <input type="text" value={editPostHeader} onChange={e => setEditPostHeader(e.target.value)} placeholder="Headline (Optional)" className="w-full h-14 px-6 bg-slate-50 border rounded-xl font-semibold outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20 transition-all" />
                             <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">Header</div>
                          </div>
                          <div className="relative">
                             <input type="text" value={editPostFooter} onChange={e => setEditPostFooter(e.target.value)} placeholder="Footer (Optional)" className="w-full h-14 px-6 bg-slate-50 border rounded-xl font-semibold outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20 transition-all" />
                             <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">Footer</div>
                          </div>
                       </div>
                    </section>

                    {/* 2. Content */}
                    <section className="bg-white p-8 rounded-[2rem] border shadow-sm space-y-6">
                       <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400">2. Message Content</h3>
                       <textarea 
                          value={editPostContent} 
                          onChange={e => setEditPostContent(e.target.value)} 
                          placeholder="What would you like to share?" 
                          className="w-full h-48 p-8 bg-slate-50 border rounded-[2rem] font-medium text-slate-700 outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20 transition-all resize-none"
                       />
                       
                       {/* Image Management */}
                       <div>
                          <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Post Images</label>
                          <div className="flex flex-wrap gap-3">
                             {editPostImages.length > 0 && (
                                <MediaPreview 
                                   media={editPostImages.map((url) => ({
                                      url: normalizeImageUrl(url),
                                      type: 'image' as const,
                                   }))}
                                   size="sm"
                                   showDownload={false}
                                   onRemove={(index) => setEditPostImages(prev => prev.filter((_, i) => i !== index))}
                                />
                             )}
                             <label className={`w-24 h-24 flex flex-col items-center justify-center border-2 border-dashed rounded-2xl cursor-pointer hover:border-indigo-400 transition-all ${uploadingEditImage ? 'bg-indigo-50' : 'bg-slate-50'}`}>
                                {uploadingEditImage ? <Loader className="animate-spin text-indigo-600" size={20} /> : <Plus className="text-slate-400" />}
                                <input type="file" className="hidden" accept="image/*" onChange={handleEditImageUpload} disabled={uploadingEditImage} />
                             </label>
                          </div>
                       </div>
                    </section>

                    {/* 3. Action Buttons */}
                    <section className="bg-white p-8 rounded-[2rem] border shadow-sm space-y-6">
                       <div className="flex items-center justify-between">
                          <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400">3. Action Buttons</h3>
                          <button onClick={() => setEditPostButtons([...editPostButtons, { id: Date.now().toString(), label: 'New Button', actionType: 'link', url: '' }])} className="text-[10px] font-black uppercase text-indigo-600 hover:underline">+ Add Button</button>
                       </div>
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {editPostButtons.map((btn, idx) => (
                             <div key={btn.id} className="p-6 bg-slate-50 border rounded-2xl space-y-4">
                                <div className="flex items-center justify-between">
                                   <input type="text" value={btn.label} onChange={e => {
                                      const next = [...editPostButtons];
                                      next[idx].label = e.target.value;
                                      setEditPostButtons(next);
                                   }} className="bg-transparent font-bold text-sm outline-none border-b border-transparent focus:border-indigo-400" />
                                   <button onClick={() => setEditPostButtons(prev => prev.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-600"><Trash2 size={14} /></button>
                                </div>
                                <div className="flex gap-2">
                                   <select value={btn.actionType} onChange={e => {
                                      const next = [...editPostButtons];
                                      next[idx].actionType = e.target.value as any;
                                      setEditPostButtons(next);
                                   }} className="bg-white border rounded-lg px-2 py-1 text-[10px] font-bold">
                                      <option value="link">Link</option>
                                      <option value="phone">Phone</option>
                                   </select>
                                   <input type="text" value={btn.url || btn.phoneNumber || ''} onChange={e => {
                                      const next = [...editPostButtons];
                                      if(btn.actionType === 'link') next[idx].url = e.target.value;
                                      else next[idx].phoneNumber = e.target.value;
                                      setEditPostButtons(next);
                                   }} placeholder={btn.actionType === 'link' ? "https://..." : "Phone number"} className="flex-1 bg-white border rounded-lg px-3 py-1 text-[10px]" />
                                </div>
                             </div>
                          ))}
                       </div>
                    </section>
                 </div>

                 {/* Right Side: Preview */}
                 <div className="w-[500px] bg-slate-100 border-l flex flex-col items-center p-12 gap-8 overflow-y-auto">
                    <div className="w-full flex items-center justify-between bg-white px-6 py-4 rounded-[2rem] shadow-sm border">
                       <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Live Feed Preview</span>
                       <div className="flex p-1 bg-slate-100 rounded-xl">
                          <button onClick={() => setPreviewWidth('mobile')} className={`px-6 py-2 rounded-lg text-[10px] font-bold uppercase transition-all ${previewWidth === 'mobile' ? 'bg-white shadow text-indigo-600' : 'text-slate-400'}`}>Mobile</button>
                          <button onClick={() => setPreviewWidth('tablet')} className={`px-6 py-2 rounded-lg text-[10px] font-bold uppercase transition-all ${previewWidth === 'tablet' ? 'bg-white shadow text-indigo-600' : 'text-slate-400'}`}>Wide</button>
                       </div>
                    </div>

                    <div 
                       className="bg-white rounded-[3rem] shadow-2xl border-[10px] border-slate-900 overflow-hidden relative transition-all duration-500 origin-top"
                       style={{ 
                          width: previewWidth === 'mobile' ? '360px' : '480px', 
                          maxWidth: '100%',
                          aspectRatio: previewWidth === 'mobile' ? '9/19' : '16/10',
                          transform: `scale(${previewZoom})`
                       }}
                    >
                       <div className="h-10 flex items-center justify-between px-8 text-xs font-black">9:41</div>
                       <div className="p-6 space-y-5 overflow-y-auto max-h-[calc(100%-40px)]">
                          <div className="bg-white border border-slate-200 rounded-[2.5rem] shadow-sm overflow-hidden group p-6">
                             
                             {/* WhatsApp Style 1: Header (Heading) */}
                             <div className="mb-4">
                                {editPostHeader && (
                                   <h3 className="text-xl font-black text-slate-900 mb-2 leading-tight tracking-tight">
                                      {editPostHeader}
                                   </h3>
                                )}
                                <div className="flex items-center gap-2 opacity-50">
                                   <div className="w-5 h-5 bg-gradient-to-br from-orange-500 to-red-500 rounded-full flex items-center justify-center text-white font-bold text-[8px] border border-white">
                                      {(editingPost.userId || 'A').charAt(0).toUpperCase()}
                                   </div>
                                   <p className="text-[8px] font-black text-slate-800 uppercase tracking-tighter">{editingPost.userId || 'Anonymous'} • {new Date(editingPost.createdAt).toLocaleDateString()}</p>
                                </div>
                             </div>

                             {/* WhatsApp Style 2: Image */}
                             {editPostImages.length > 0 && (
                                <div className="relative w-full aspect-video bg-slate-950 overflow-hidden rounded-[1.5rem] mb-4 border border-slate-100">
                                   <img 
                                      src={normalizeImageUrl(editPostImages[0])} 
                                      alt="Preview"
                                      className="w-full h-full object-contain"
                                   />
                                </div>
                             )}

                             {/* WhatsApp Style 3: Body (Text) */}
                             <div className="mb-6">
                                <div className="text-sm text-slate-700 leading-relaxed font-medium whitespace-pre-wrap">
                                   {renderFormattedText(editPostContent)}
                                </div>
                             </div>

                             {/* WhatsApp Style 4: Footer */}
                             {editPostFooter && (
                                <div className="mb-6 p-4 bg-emerald-50 rounded-2xl border-l-4 border-emerald-500">
                                   <p className="text-[10px] text-slate-600 italic font-medium">
                                      {editPostFooter}
                                   </p>
                                </div>
                             )}

                             {/* WhatsApp Style 5: Blue Buttons */}
                             {editPostButtons.length > 0 && (
                                <div className="space-y-2 mb-6">
                                   {editPostButtons.map(b => (
                                      <div key={b.id} className="w-full py-3 bg-[#0070f3] text-white rounded-full text-[10px] font-black uppercase tracking-widest text-center shadow-lg shadow-blue-100 cursor-pointer">
                                         {b.label}
                                      </div>
                                   ))}
                                </div>
                             )}

                             {/* Engagement Stats */}
                             <div className="flex gap-8 text-[10px] font-black border-t border-slate-100 pt-6">
                                <div className="flex items-center gap-2 text-slate-400">
                                   <Heart size={14} className="fill-red-500 text-red-500" />
                                   <span className="text-red-600">0 Likes</span>
                                </div>
                                <div className="flex items-center gap-2 text-slate-400">
                                   <MessageCircle size={14} />
                                   <span>0 Comments</span>
                                </div>
                                <div className="flex items-center gap-2 text-slate-400 ml-auto uppercase tracking-widest">
                                   <Share2 size={14} />
                                   <span>Share</span>
                                </div>
                             </div>
                          </div>
                       </div>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* Comments Management Modal */}
      {showCommentsModal && selectedPostForComments && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[100] flex items-center justify-center animate-in fade-in p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <MessageCircle className="text-emerald-600" size={24} />
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Manage Comments</h2>
                  <p className="text-xs text-slate-500">{Array.isArray(selectedPostForComments.comments) ? selectedPostForComments.comments.length : 0} comments on this post</p>
                </div>
              </div>
              <button 
                onClick={() => { setShowCommentsModal(false); setSelectedPostForComments(null); }} 
                className="p-2 hover:bg-slate-100 rounded-xl transition-all"
              >
                <Plus className="rotate-45" size={20} />
              </button>
            </div>
            
            {/* Post Preview */}
            <div className="p-4 bg-slate-50 border-b border-slate-100 shrink-0">
              <p className="text-sm text-slate-600 font-medium line-clamp-2">
                {selectedPostForComments.content?.substring(0, 200)}...
              </p>
            </div>
            
            {/* Comments List */}
            <div className="flex-1 overflow-y-auto p-6 space-y-3">
              {Array.isArray(selectedPostForComments.comments) && selectedPostForComments.comments.length > 0 ? (
                selectedPostForComments.comments.map((comment: any, index: number) => (
                  <div key={index} className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-md transition-all group">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                          {(comment.userId || 'U').charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-sm font-bold text-slate-800 truncate">{comment.userId || 'Anonymous'}</p>
                            <span className="text-[10px] text-slate-400">
                              {comment.createdAt ? new Date(comment.createdAt).toLocaleDateString('en-IN', { 
                                day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                              }) : 'Unknown date'}
                            </span>
                          </div>
                          <p className="text-sm text-slate-600">{comment.text}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => deleteComment(selectedPostForComments._id, index)}
                        disabled={deletingCommentIndex === index}
                        className="p-2 opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-600 rounded-lg transition-all text-slate-400 shrink-0"
                        title="Delete Comment"
                      >
                        {deletingCommentIndex === index ? (
                          <Loader size={16} className="animate-spin" />
                        ) : (
                          <Trash2 size={16} />
                        )}
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <MessageCircle size={48} className="text-slate-200 mb-4" />
                  <h3 className="text-lg font-bold text-slate-400 mb-1">No Comments</h3>
                  <p className="text-sm text-slate-400">This post has no comments yet.</p>
                </div>
              )}
            </div>
            
            {/* Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 shrink-0">
              <p className="text-xs text-slate-400 text-center">
                Click the trash icon to delete inappropriate comments
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Post Modal */}
      {showPostModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[100] flex flex-col animate-in fade-in">
           <div className="bg-white w-full h-full flex flex-col">
              <div className="h-24 border-b px-12 flex items-center justify-between shrink-0">
                 <div className="flex items-center gap-6">
                    <button onClick={() => setShowPostModal(false)} className="p-2 hover:bg-slate-50 rounded-xl transition-all"><Plus className="rotate-45" size={24} /></button>
                    <h2 className="text-2xl font-bold tracking-tight">Campaign Studio</h2>
                 </div>
                 <button onClick={createAdminPost} className="h-14 px-12 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-xl shadow-indigo-600/20 transition-all flex items-center gap-3 text-sm">
                   <Send size={18} /> {postScheduledAt ? 'Schedule Campaign' : 'Deploy Campaign'}
                 </button>
              </div>
              <div className="flex-1 flex overflow-hidden bg-slate-50/50">
                 <div className="flex-1 overflow-y-auto p-8 lg:p-12 space-y-12">
                    <section className="bg-white p-8 rounded-[2rem] border shadow-sm space-y-6">
                       <h3 className="text-sm font-bold uppercase tracking-widest">1. Audience</h3>
                       <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                          {communities.map(c => (
                             <label key={c.id} className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${postSelectedCommunityIds.has(c.id) ? 'bg-indigo-50 border-indigo-200 shadow-sm' : 'bg-white hover:border-slate-300'}`}>
                                <input type="checkbox" className="hidden" checked={postSelectedCommunityIds.has(c.id)} onChange={e => {
                                   const next = new Set(postSelectedCommunityIds);
                                   if(e.target.checked) next.add(c.id); else next.delete(c.id);
                                   setPostSelectedCommunityIds(next);
                                }} />
                                <span className="text-xl">{c.icon}</span>
                                <span className="text-xs font-bold truncate">{c.name}</span>
                             </label>
                          ))}
                       </div>
                    </section>
                    {/* Category Selection */}
                    <section className="bg-white p-8 rounded-[2rem] border shadow-sm space-y-6">
                       <h3 className="text-sm font-bold uppercase tracking-widest">2. Category</h3>
                       <div className="flex flex-wrap gap-3">
                          {[
                             { key: 'general', label: 'General', icon: '📋' },
                             { key: 'experiences', label: 'Experiences', icon: '✨' },
                             { key: 'tips', label: 'Tips & Tricks', icon: '💡' },
                             { key: 'transformations', label: 'Transformations', icon: '🦋' },
                             { key: 'questions', label: 'Questions', icon: '❓' },
                          ].map(cat => (
                             <button
                                key={cat.key}
                                onClick={() => { resetCategoryFields(); setPostCategory(cat.key as any); }}
                                className={`px-5 py-3 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 border ${
                                   postCategory === cat.key
                                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-600/25'
                                      : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:bg-indigo-50'
                                }`}
                             >
                                <span>{cat.icon}</span>
                                <span>{cat.label}</span>
                             </button>
                          ))}
                       </div>
                       <p className="text-xs text-slate-400">Choose a category to help users find relevant content in the community.</p>
                    </section>

                    <section className="bg-white p-8 rounded-[2rem] border shadow-sm space-y-6">
                       <h3 className="text-sm font-bold uppercase tracking-widest">3. Content</h3>
                       
                       {/* Common Header/Footer for all categories */}
                       <div className="grid grid-cols-2 gap-6">
                          <div className="relative">
                             <input type="text" value={postHeader} onChange={e => setPostHeader(e.target.value)} placeholder="Headline (Optional)" className="w-full h-14 px-6 bg-slate-50 border rounded-xl font-semibold outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20 transition-all" />
                             <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">Header</div>
                          </div>
                          <div className="relative">
                             <input type="text" value={postFooter} onChange={e => setPostFooter(e.target.value)} placeholder="Footer (Optional)" className="w-full h-14 px-6 bg-slate-50 border rounded-xl font-semibold outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20 transition-all" />
                             <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">Footer</div>
                          </div>
                       </div>

                       {/* Media Type Selection */}
                       <div className="grid grid-cols-5 gap-2 p-1.5 bg-slate-100 rounded-2xl">
                          {['text', 'image', 'video', 'document', 'link'].map((t: any) => (
                             <button key={t} onClick={() => setPostType(t)} className={`h-11 rounded-xl text-[10px] font-bold uppercase border transition-all ${postType === t ? 'bg-white text-indigo-600 shadow-sm border-white' : 'text-slate-500 border-transparent hover:text-slate-700'}`}>{t}</button>
                          ))}
                       </div>

                       {/* Image Upload (common for image type) */}
                       {postType === 'image' && (
                          <div className="flex flex-col gap-4">
                             <div className="flex gap-3">
                                <input type="text" value={postImageUrls.join(', ')} onChange={e => setPostImageUrls(e.target.value.split(',').map(u => u.trim()).filter(Boolean))} placeholder="Image URL..." className="flex-1 h-14 px-6 bg-slate-50 border rounded-xl font-semibold outline-none focus:bg-white transition-all text-xs" />
                                <label className={`h-14 px-6 border rounded-xl flex items-center justify-center gap-2 cursor-pointer font-black text-[10px] uppercase tracking-wider transition-all shadow-sm ${uploading ? 'bg-indigo-50 text-indigo-600 border-indigo-200' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}`}>
                                   {uploading ? (
                                      <>
                                         <Loader className="animate-spin" size={16}/>
                                         <span>Uploading...</span>
                                      </>
                                   ) : (
                                      <>
                                         <ImageIcon size={16}/>
                                         <span>{postImageUrls.length > 0 ? 'Change' : 'Upload'}</span>
                                      </>
                                   )}
                                   <input type="file" className="hidden" accept="image/*" onChange={e => handleFileUpload(e, 'image')} disabled={uploading} />
                                </label>
                                {(postImageUrls.length > 0 || localImagePreview) && (
                                   <button onClick={() => { setPostImageUrls([]); setLocalImagePreview(null); }} className="h-14 px-4 border border-red-100 text-red-500 rounded-xl hover:bg-red-50 transition-all" title="Remove Image">
                                      <Trash2 size={18} />
                                   </button>
                                )}
                             </div>
                             {localImagePreview && !postImageUrls[0] && (
                                <div className="text-[10px] font-bold text-amber-600 flex items-center gap-2 animate-pulse">
                                   <Loader size={10} className="animate-spin" /> Uploading to S3... Showing local preview
                                </div>
                             )}
                          </div>
                       )}

                       {postType === 'video' && (
                          <div className="flex gap-3">
                             <input type="text" value={postVideoUrl} onChange={e => setPostVideoUrl(e.target.value)} placeholder="Video URL..." className="flex-1 h-14 px-6 bg-slate-50 border rounded-xl font-semibold outline-none text-xs" />
                             <label className={`h-14 px-6 border rounded-xl flex items-center justify-center gap-2 cursor-pointer font-black text-[10px] uppercase tracking-wider transition-all shadow-sm ${uploading ? 'bg-indigo-50 text-indigo-600 border-indigo-200' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}`}>
                                {uploading ? (<><Loader className="animate-spin" size={16}/><span>Uploading...</span></>) : (<><VideoIcon size={16}/><span>Upload</span></>)}
                                <input type="file" className="hidden" accept="video/*" onChange={e => handleFileUpload(e, 'video')} disabled={uploading} />
                             </label>
                          </div>
                       )}

                       {/* CATEGORY-SPECIFIC FORMS */}
                       
                       {/* GENERAL CATEGORY - Original text editor */}
                       {postCategory === 'general' && (
                          <div className="relative group">
                             <div className="flex items-center gap-1 p-2 bg-white border-x border-t rounded-t-[2rem] border-slate-200">
                                {WHATSAPP_FORMATS.map(f => (
                                   <button key={f.label} title={f.desc} onClick={() => insertTextAtCursor(f.prefix, f.suffix)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-indigo-600 transition-colors">
                                      {f.icon}
                                   </button>
                                ))}
                                <div className="w-px h-4 bg-slate-200 mx-1" />
                                <button onClick={() => setShowEmojiPicker(!showEmojiPicker)} className={`p-2 hover:bg-slate-100 rounded-lg transition-colors ${showEmojiPicker ? 'text-indigo-600 bg-indigo-50' : 'text-slate-500'}`}>
                                   <Smile size={18} />
                                </button>
                                <div className="flex-1" />
                             </div>
                             {showEmojiPicker && (
                                <div className="absolute left-10 top-12 w-64 bg-white border shadow-xl rounded-2xl z-50 p-3 grid grid-cols-6 gap-2 animate-in zoom-in-95">
                                   {EMOJIS.map(e => (
                                      <button key={e} onClick={() => { insertTextAtCursor(e); setShowEmojiPicker(false); }} className="w-8 h-8 flex items-center justify-center hover:bg-slate-100 rounded-lg text-xl">{e}</button>
                                   ))}
                                </div>
                             )}
                             <textarea ref={textAreaRef} value={postContent} onChange={e => setPostContent(e.target.value)} rows={6} placeholder="Message body..." className="w-full p-8 bg-slate-50 border border-t-0 rounded-b-[2rem] focus:bg-white transition-all outline-none font-medium resize-none shadow-inner" />
                          </div>
                       )}

                       {/* EXPERIENCES CATEGORY */}
                       {postCategory === 'experiences' && (
                          <div className="space-y-4 p-6 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-2xl border border-indigo-100">
                             <div className="flex items-center gap-2 mb-4">
                                <span className="text-2xl">✨</span>
                                <span className="text-sm font-bold text-indigo-700 uppercase tracking-wider">Experience Story</span>
                             </div>
                             <div className="grid grid-cols-3 gap-4">
                                <input type="text" value={postParticipantName} onChange={e => setPostParticipantName(e.target.value)} placeholder="Participant Name *" className="h-12 px-4 bg-white border border-indigo-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500/20" />
                                <input type="text" value={postWorkshopName} onChange={e => setPostWorkshopName(e.target.value)} placeholder="Workshop Name" className="h-12 px-4 bg-white border border-indigo-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500/20" />
                                <input type="text" value={postBatchName} onChange={e => setPostBatchName(e.target.value)} placeholder="Batch Name/Number" className="h-12 px-4 bg-white border border-indigo-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500/20" />
                             </div>
                             <textarea value={postExperienceDetails} onChange={e => setPostExperienceDetails(e.target.value)} rows={5} placeholder="Share the experience story... What happened? How did they feel? What changed?" className="w-full p-4 bg-white border border-indigo-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none" />
                          </div>
                       )}

                       {/* TIPS & TRICKS CATEGORY */}
                       {postCategory === 'tips' && (
                          <div className="space-y-4 p-6 bg-gradient-to-br from-yellow-50 to-orange-50 rounded-2xl border border-yellow-200">
                             <div className="flex items-center gap-2 mb-4">
                                <span className="text-2xl">💡</span>
                                <span className="text-sm font-bold text-orange-700 uppercase tracking-wider">Tips & Tricks</span>
                             </div>
                             <input type="text" value={postProblemHeading} onChange={e => setPostProblemHeading(e.target.value)} placeholder="Problem/Tip Heading *" className="w-full h-12 px-4 bg-white border border-yellow-300 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-yellow-500/20" />
                             <textarea value={postProblemDescription} onChange={e => setPostProblemDescription(e.target.value)} rows={3} placeholder="Describe the problem or situation..." className="w-full p-4 bg-white border border-yellow-300 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-yellow-500/20 resize-none" />
                             <textarea value={postTipsDetails} onChange={e => setPostTipsDetails(e.target.value)} rows={4} placeholder="Share the tips and tricks to solve this problem..." className="w-full p-4 bg-white border border-yellow-300 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-yellow-500/20 resize-none" />
                          </div>
                       )}

                       {/* TRANSFORMATIONS CATEGORY */}
                       {postCategory === 'transformations' && (
                          <div className="space-y-4 p-6 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl border border-emerald-200">
                             <div className="flex items-center gap-2 mb-4">
                                <span className="text-2xl">🦋</span>
                                <span className="text-sm font-bold text-emerald-700 uppercase tracking-wider">Transformation Story</span>
                             </div>
                             <div className="grid grid-cols-3 gap-4">
                                <input type="text" value={postParticipantName} onChange={e => setPostParticipantName(e.target.value)} placeholder="Participant Name *" className="h-12 px-4 bg-white border border-emerald-300 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-500/20" />
                                <input type="text" value={postWorkshopName} onChange={e => setPostWorkshopName(e.target.value)} placeholder="Workshop Name" className="h-12 px-4 bg-white border border-emerald-300 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-500/20" />
                                <input type="text" value={postBatchName} onChange={e => setPostBatchName(e.target.value)} placeholder="Batch Name/Number" className="h-12 px-4 bg-white border border-emerald-300 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-500/20" />
                             </div>
                             <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                   <label className="text-xs font-bold text-red-600 uppercase tracking-wider flex items-center gap-1">
                                      <span>⬅️</span> Before
                                   </label>
                                   <textarea value={postBeforeStory} onChange={e => setPostBeforeStory(e.target.value)} rows={4} placeholder="What was their situation before? What challenges did they face?" className="w-full p-4 bg-red-50 border border-red-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-red-500/20 resize-none" />
                                </div>
                                <div className="space-y-2">
                                   <label className="text-xs font-bold text-green-600 uppercase tracking-wider flex items-center gap-1">
                                      <span>➡️</span> After
                                   </label>
                                   <textarea value={postAfterStory} onChange={e => setPostAfterStory(e.target.value)} rows={4} placeholder="What is their situation now? How have they transformed?" className="w-full p-4 bg-green-50 border border-green-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-green-500/20 resize-none" />
                                </div>
                             </div>
                          </div>
                       )}

                       {/* QUESTIONS CATEGORY */}
                       {postCategory === 'questions' && (
                          <div className="space-y-4 p-6 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl border border-blue-200">
                             <div className="flex items-center gap-2 mb-4">
                                <span className="text-2xl">❓</span>
                                <span className="text-sm font-bold text-blue-700 uppercase tracking-wider">Q&A Post</span>
                             </div>
                             <div className="grid grid-cols-3 gap-4">
                                <input type="text" value={postParticipantName} onChange={e => setPostParticipantName(e.target.value)} placeholder="Participant Name" className="h-12 px-4 bg-white border border-blue-300 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/20" />
                                <input type="text" value={postWorkshopName} onChange={e => setPostWorkshopName(e.target.value)} placeholder="Workshop Name" className="h-12 px-4 bg-white border border-blue-300 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/20" />
                                <input type="text" value={postBatchName} onChange={e => setPostBatchName(e.target.value)} placeholder="Batch Name/Number" className="h-12 px-4 bg-white border border-blue-300 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/20" />
                             </div>
                             <div className="space-y-2">
                                <label className="text-xs font-bold text-blue-700 uppercase tracking-wider">Question</label>
                                <textarea value={postQuestion} onChange={e => setPostQuestion(e.target.value)} rows={3} placeholder="What is the question?" className="w-full p-4 bg-white border border-blue-300 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/20 resize-none" />
                             </div>
                             <div className="space-y-2">
                                <label className="text-xs font-bold text-green-700 uppercase tracking-wider">Answer</label>
                                <textarea value={postAnswer} onChange={e => setPostAnswer(e.target.value)} rows={4} placeholder="What is the answer?" className="w-full p-4 bg-green-50 border border-green-300 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-green-500/20 resize-none" />
                             </div>
                          </div>
                       )}

                    </section>
                    <section className="bg-white p-10 rounded-[2rem] border shadow-sm space-y-8">
                       <div className="flex items-center justify-between">
                          <h3 className="text-sm font-bold uppercase tracking-widest">3. Call to Actions</h3>
                          <button onClick={addPostButton} className="h-10 px-5 bg-indigo-50 text-indigo-700 rounded-xl font-bold text-[10px] uppercase border hover:bg-indigo-600 hover:text-white transition-all"><Plus size={14} className="inline mr-2" /> Add Button</button>
                       </div>
                       <div className="space-y-4">
                          {postButtons.map(btn => (
                             <div key={btn.id} className="p-8 bg-slate-50 border rounded-[2rem] flex items-center gap-8">
                                <input type="text" value={btn.label} onChange={e => updatePostButton(btn.id, { label: e.target.value })} className="flex-1 h-12 px-5 rounded-xl border text-sm font-bold" placeholder="Label" />
                                <input type="text" value={btn.url} onChange={e => updatePostButton(btn.id, { url: e.target.value })} className="flex-1 h-12 px-5 rounded-xl border text-sm font-bold" placeholder="URL" />
                                <button onClick={() => removePostButton(btn.id)} className="p-3 text-slate-300 hover:text-red-500"><Trash2 size={20} /></button>
                             </div>
                          ))}
                       </div>
                    </section>
                    <section id="scheduling-section" className="bg-white p-10 rounded-[2rem] border shadow-sm space-y-8">
                       <div className="flex items-center justify-between">
                          <h3 className="text-sm font-bold uppercase tracking-widest">4. Scheduling</h3>
                          <div className="flex gap-3">
                             <button 
                                onClick={() => {
                                   setPostScheduledAt('');
                                   createAdminPost();
                                }} 
                                className="h-10 px-5 bg-emerald-600 text-white rounded-xl font-bold text-[10px] uppercase hover:bg-emerald-700 transition-all flex items-center gap-2"
                             >
                                <Send size={14} /> Post Now
                             </button>
                             {postScheduledAt && (
                                <button onClick={() => setPostScheduledAt('')} className="text-[10px] font-bold text-red-500 hover:text-red-600 uppercase px-3">Clear</button>
                             )}
                          </div>
                       </div>
                       <div className="flex gap-4 items-center">
                          <div className="relative flex-1">
                             <Calendar className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                             <input 
                                type="datetime-local" 
                                value={postScheduledAt || new Date().toISOString().slice(0, 16)} 
                                onChange={e => setPostScheduledAt(e.target.value)}
                                className="w-full pl-14 pr-6 h-14 bg-slate-50 border rounded-2xl font-bold text-xs outline-none focus:bg-white transition-all"
                             />
                          </div>
                          <div className="text-xs text-slate-400 font-medium">
                             {postScheduledAt ? `Scheduled: ${new Date(postScheduledAt).toLocaleString()}` : 'Click "Post Now" or set schedule time'}
                          </div>
                       </div>
                    </section>

                    <section className="bg-white p-10 rounded-[2rem] border shadow-sm space-y-8">
                       <h3 className="text-sm font-bold uppercase tracking-widest">5. Distribution Channels</h3>
                       <div className="flex gap-6">
                          <label className="flex items-center gap-3 cursor-pointer">
                             <input type="checkbox" checked={crossPostMedia} onChange={e => setCrossPostMedia(e.target.checked)} className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                             <span className="text-sm font-bold text-slate-700">Media Library</span>
                          </label>
                          <label className="flex items-center gap-3 cursor-pointer">
                             <input type="checkbox" checked={crossPostSocial} onChange={e => setCrossPostSocial(e.target.checked)} className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                             <span className="text-sm font-bold text-slate-700">Social Media</span>
                          </label>
                       </div>
                    </section>
                 </div>
                 <div className="w-[500px] bg-slate-100 border-l flex flex-col items-center p-12 gap-8 overflow-y-auto">
                    {/* Preview Controls */}
                    <div className="w-full flex items-center justify-between bg-white px-6 py-4 rounded-[2rem] shadow-sm border">
                       <div className="flex p-1 bg-slate-100 rounded-xl">
                          <button onClick={() => setPreviewWidth('mobile')} className={`px-6 py-2 rounded-lg text-[10px] font-bold uppercase transition-all ${previewWidth === 'mobile' ? 'bg-white shadow text-indigo-600' : 'text-slate-400'}`}>Mobile</button>
                          <button onClick={() => setPreviewWidth('tablet')} className={`px-6 py-2 rounded-lg text-[10px] font-bold uppercase transition-all ${previewWidth === 'tablet' ? 'bg-white shadow text-indigo-600' : 'text-slate-400'}`}>Wide</button>
                       </div>
                       <div className="flex items-center gap-4">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Scale</span>
                          <input type="range" min="0.5" max="1.2" step="0.1" value={previewZoom} onChange={e => setPreviewZoom(parseFloat(e.target.value))} className="w-20 accent-indigo-600" />
                       </div>
                    </div>

                    <div 
                       className="bg-white rounded-[3rem] shadow-2xl border-[10px] border-slate-900 overflow-hidden relative transition-all duration-500 origin-top"
                       style={{ 
                          width: previewWidth === 'mobile' ? '360px' : '480px', 
                          maxWidth: '100%',
                          aspectRatio: previewWidth === 'mobile' ? '9/19' : '16/10',
                          transform: `scale(${previewZoom})`
                       }}
                    >
                       <div className="h-10 flex items-center justify-between px-8 text-xs font-black">9:41</div>
                       <div className="p-6 space-y-5 overflow-y-auto max-h-[calc(100%-40px)]">
                          <div className="bg-white border border-slate-200 rounded-[2.5rem] shadow-sm overflow-hidden group p-6">
                             
                             {/* WhatsApp Style 1: Header (Heading) */}
                             <div className="mb-4">
                                {postHeader && (
                                   <h3 className="text-xl font-black text-slate-900 mb-2 leading-tight tracking-tight">
                                      {postHeader}
                                   </h3>
                                )}
                                <div className="flex items-center gap-2 opacity-50">
                                   <div className="w-5 h-5 bg-gradient-to-br from-orange-500 to-red-500 rounded-full flex items-center justify-center text-white font-bold text-[8px] border border-white">
                                      A
                                   </div>
                                   <p className="text-[8px] font-black text-slate-800 uppercase tracking-tighter">admincrm • {new Date().toLocaleDateString()}</p>
                                </div>
                             </div>

                             {/* WhatsApp Style 2: Image Display - AWS S3 */}
                             {postType === 'image' && (postImageUrls[0] || localImagePreview || uploading) && (
                                <div className="relative w-full aspect-video bg-slate-50 overflow-hidden flex items-center justify-center rounded-[1.5rem] mb-4 border border-slate-100 shadow-inner">
                                   {uploading && (
                                      <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center gap-2">
                                         <Loader className="animate-spin text-emerald-600" size={24} />
                                         <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest animate-pulse">Uploading to S3...</span>
                                      </div>
                                   )}
                                   {(postImageUrls[0] || localImagePreview) ? (
                                      <img 
                                         src={postImageUrls[0] ? postImageUrls[0].trim() : localImagePreview || ''} 
                                         alt="Preview"
                                         className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-700 bg-slate-950"
                                         onError={(e) => {
                                            if (localImagePreview) {
                                               (e.target as HTMLImageElement).src = localImagePreview;
                                            }
                                         }}
                                      />
                                   ) : (
                                      <div className="flex flex-col items-center gap-2">
                                         <ImageIcon className="text-slate-200" size={48} />
                                         <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest text-center px-8 leading-relaxed">Your professional image<br/>will appear here</p>
                                      </div>
                                   )}
                                </div>
                             )}

                             {postType === 'video' && postVideoUrl && (
                                <div className="relative w-full aspect-video bg-slate-900 overflow-hidden border border-slate-100 rounded-[1.5rem] mb-4 shadow-sm">
                                   <video src={postVideoUrl} className="w-full h-full object-cover" controls />
                                </div>
                             )}

                             {/* WhatsApp Style 3: Body (Text) */}
                             <div className="mb-6">
                                <div className="text-sm text-slate-700 leading-relaxed font-medium whitespace-pre-wrap">
                                   {postCategory === 'general' 
                                      ? renderFormattedText(postContent)
                                      : renderFormattedText(buildCategoryContent())
                                   }
                                </div>
                             </div>

                             {/* WhatsApp Style 4: Footer */}
                             {postFooter && (
                                <div className="mb-6 p-4 bg-emerald-50 rounded-2xl border-l-4 border-emerald-500">
                                   <p className="text-[10px] text-slate-600 italic font-medium leading-relaxed">
                                      {postFooter}
                                   </p>
                                </div>
                             )}

                             {/* WhatsApp Style 5: Blue Buttons */}
                             {postButtons.length > 0 && (
                                <div className="space-y-2 mb-6">
                                   {postButtons.map(b => (
                                      <div key={b.id} className="w-full py-3 bg-[#0070f3] text-white rounded-full text-[10px] font-black uppercase tracking-widest text-center shadow-lg shadow-blue-100 cursor-pointer hover:bg-blue-700 transition-all hover:-translate-y-0.5 active:scale-95">
                                         {b.label}
                                      </div>
                                   ))}
                                </div>
                             )}

                             {/* Engagement Stats */}
                             <div className="flex gap-8 text-[10px] font-black border-t border-slate-100 pt-6">
                                <div className="flex items-center gap-2 text-slate-400">
                                   <Heart size={14} className="fill-red-500 text-red-500" />
                                   <span className="text-red-600">0 Likes</span>
                                </div>
                                <div className="flex items-center gap-2 text-slate-400">
                                   <MessageCircle size={14} />
                                   <span>0 Comments</span>
                                </div>
                                <div className="flex items-center gap-2 text-slate-400 ml-auto uppercase tracking-widest">
                                   <Share2 size={14} />
                                   <span>Share</span>
                                </div>
                             </div>
                          </div>
                       </div>
                    </div>
                    {previewZoom !== 1 && (
                       <button onClick={() => setPreviewZoom(1)} className="text-[10px] font-bold text-indigo-600 hover:underline">Reset Scale</button>
                    )}
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* Other Modals (Add Member, Permissions, Message, etc.) */}
      {showAddMemberModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-6">
           <div className="bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden">
              <div className="p-10 border-b flex items-center justify-between bg-slate-50/30">
                 <h2 className="text-xl font-bold tracking-tight">Onboard Member</h2>
                 <button onClick={() => setShowAddMemberModal(false)} className="p-2 text-slate-400"><Plus className="rotate-45" size={20} /></button>
              </div>
              <div className="p-10 space-y-8">
                 <div className="flex p-1.5 bg-slate-100 rounded-xl">
                    <button onClick={() => setAddMode('search')} className={`flex-1 py-3 rounded-lg font-bold text-xs ${addMode === 'search' ? 'bg-white shadow-md' : 'text-slate-400'}`}>Search</button>
                    <button onClick={() => setAddMode('manual')} className={`flex-1 py-3 rounded-lg font-bold text-xs ${addMode === 'manual' ? 'bg-white shadow-md' : 'text-slate-400'}`}>Manual</button>
                 </div>
                 {addMode === 'search' ? (
                   <div className="space-y-6">
                      <div className="relative">
                         <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                         <input type="text" placeholder="Identity..." value={searchUserQuery} onChange={e => setSearchUserQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && searchUser()} className="w-full h-14 pl-12 pr-6 bg-slate-50 border rounded-2xl outline-none" />
                      </div>
                      {foundUser && <div className="p-4 bg-indigo-50 border rounded-xl flex justify-between items-center"><p className="font-bold">{foundUser.name}</p><p className="text-xs text-slate-500">{foundUser.mobile}</p></div>}
                   </div>
                 ) : (
                   <div className="space-y-4">
                      <input type="text" placeholder="Name" value={manualMember.name} onChange={e => setManualMember({...manualMember, name: e.target.value})} className="w-full h-14 px-6 bg-slate-50 border rounded-2xl" />
                      <input type="text" placeholder="Mobile" value={manualMember.mobile} onChange={e => setManualMember({...manualMember, mobile: e.target.value})} className="w-full h-14 px-6 bg-slate-50 border rounded-2xl" />
                   </div>
                 )}
              </div>
              <div className="p-10 border-t flex gap-4">
                 <button onClick={() => setShowAddMemberModal(false)} className="flex-1 py-4 font-bold text-xs uppercase border rounded-2xl hover:bg-slate-50">Cancel</button>
                 <button onClick={addMemberToCommunity} disabled={addingMember} className="flex-1 py-4 font-bold text-xs uppercase bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-600/20">{addingMember ? '...' : 'Add Member'}</button>
              </div>
           </div>
        </div>
      )}

      {showChatPermModal && selectedMember && (
         <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-6">
            <div className="bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl overflow-hidden">
               <div className="p-10 border-b flex justify-between items-center">
                  <h2 className="text-xl font-bold uppercase tracking-tighter">Permissions: {selectedMember.name}</h2>
                  <button onClick={() => setShowChatPermModal(false)}><Plus className="rotate-45" /></button>
               </div>
               <div className="p-10 space-y-4">
                  <button onClick={() => setChatEnabled(!chatEnabled)} className={`w-full p-6 rounded-2xl border flex justify-between items-center ${chatEnabled ? 'bg-indigo-600 text-white' : 'bg-slate-50'}`}>
                     <span className="font-bold text-xs">GLOBAL CHAT ENABLED</span>
                     <div className={`w-8 h-4 rounded-full relative ${chatEnabled ? 'bg-indigo-400' : 'bg-slate-300'}`}><div className={`absolute w-3 h-3 bg-white rounded-full top-0.5 transition-all ${chatEnabled ? 'right-0.5' : 'left-0.5'}`}/></div>
                  </button>
                  <div className="grid grid-cols-2 gap-3">
                     {[ { l: 'Send Msgs', v: canSend, s: setCanSend }, { l: 'Links', v: allowLinks, s: setAllowLinks }, { l: 'Images', v: allowImages, s: setAllowImages }, { l: 'Videos', v: allowVideos, s: setAllowVideos } ].map(i => (
                        <button key={i.l} onClick={() => i.s(!i.v)} className={`p-4 rounded-xl border flex items-center gap-3 text-xs font-bold ${i.v ? 'border-indigo-500 text-indigo-700 bg-indigo-50/50' : 'opacity-50'}`}>
                           <div className={`w-4 h-4 rounded border flex items-center justify-center ${i.v ? 'bg-indigo-600 text-white' : 'bg-white'}`}>{i.v && <CheckCircle size={10}/>}</div> {i.l}
                        </button>
                     ))}
                  </div>
               </div>
               <div className="p-10 border-t flex gap-4">
                  <button onClick={() => setShowChatPermModal(false)} className="flex-1 py-4 border rounded-2xl font-bold text-xs">CLOSE</button>
                  <button onClick={saveChatPermissions} className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-bold text-xs shadow-xl">{chatPermSaving ? 'SAVING...' : 'SAVE CHANGES'}</button>
               </div>
            </div>
         </div>
      )}

      {showMessageModal && selectedMember && (
         <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-6">
            <div className="bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl p-10 space-y-8">
               <h2 className="text-xl font-bold">Direct Message to {selectedMember.name}</h2>
               <textarea value={messageText} onChange={e => setMessageText(e.target.value)} rows={6} className="w-full p-6 bg-slate-50 border rounded-2xl outline-none focus:bg-white transition-all font-medium" placeholder="Type your message..." />
               <div className="flex gap-4">
                  <button onClick={() => setShowMessageModal(false)} className="flex-1 py-4 border rounded-2xl font-bold text-xs uppercase">Cancel</button>
                  <button onClick={() => { alert('Sent to ' + selectedMember.mobile); setShowMessageModal(false); setMessageText(''); }} className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-bold text-xs uppercase shadow-xl shadow-indigo-600/20">Send Now</button>
               </div>
            </div>
         </div>
      )}

      {editingCommunityName && (
         <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-6">
            <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl p-10 space-y-6">
               <h2 className="text-lg font-bold">Rename Collection</h2>
               <input type="text" value={newCommunityName} onChange={e => setNewCommunityName(e.target.value)} className="w-full h-14 p-6 bg-slate-50 border rounded-2xl focus:bg-white" />
               <div className="flex gap-3">
                  <button onClick={() => setEditingCommunityName(false)} className="flex-1 py-3 border rounded-xl text-xs font-bold uppercase">Discard</button>
                  <button onClick={updateCommunityName} className="flex-1 py-3 bg-indigo-600 text-white rounded-xl text-xs font-bold uppercase shadow-lg">Update</button>
               </div>
            </div>
         </div>
      )}

      {/* Bulk Invite Modal */}
      {showBulkInviteModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-8 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">📨 Bulk Community Invite</h2>
                <p className="text-sm text-slate-500 mt-1">Invite old participants to join {currentCommunity?.name || 'community'}</p>
              </div>
              <button onClick={() => setShowBulkInviteModal(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-all">
                <Plus className="rotate-45" size={24} />
              </button>
            </div>

            {/* Content */}
            <div className="p-8 space-y-6 overflow-y-auto flex-1">
              {/* Target Community */}
              <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                <p className="text-xs font-bold text-indigo-600 uppercase mb-1">Inviting to Community</p>
                <p className="text-lg font-bold text-indigo-900">{currentCommunity?.icon} {currentCommunity?.name}</p>
                <p className="text-xs text-indigo-600 mt-1">{currentCommunity?.joinLink}</p>
              </div>

              {/* Source Selection */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-3">Select Source</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setBulkInviteSource('leads')}
                    className={`p-4 rounded-xl border-2 transition-all text-left ${
                      bulkInviteSource === 'leads'
                        ? 'border-indigo-500 bg-indigo-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <p className="font-bold text-slate-800">📋 CRM Leads</p>
                    <p className="text-xs text-slate-500 mt-1">Past workshop participants from CRM</p>
                  </button>
                  <button
                    onClick={() => setBulkInviteSource('community')}
                    className={`p-4 rounded-xl border-2 transition-all text-left ${
                      bulkInviteSource === 'community'
                        ? 'border-indigo-500 bg-indigo-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <p className="font-bold text-slate-800">👥 Other Community</p>
                    <p className="text-xs text-slate-500 mt-1">Members from another community</p>
                  </button>
                </div>
              </div>

              {/* Workshop Filter (for leads) */}
              {bulkInviteSource === 'leads' && (
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Filter by Workshop (Optional)</label>
                  <select 
                    value={bulkInviteWorkshop}
                    onChange={(e) => setBulkInviteWorkshop(e.target.value)}
                    className="w-full h-12 px-4 border border-slate-200 rounded-xl font-medium bg-white"
                  >
                    <option value="all">All Workshops</option>
                    <option value="Swar Yoga">Swar Yoga</option>
                    <option value="Aham Bramhasmi">Aham Bramhasmi</option>
                    <option value="Astavakra">Astavakra</option>
                    <option value="Shivoham">Shivoham</option>
                    <option value="I am Fit">I am Fit</option>
                  </select>
                </div>
              )}

              {/* Custom Message */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Custom Message (Optional)</label>
                <textarea
                  value={bulkInviteMessage}
                  onChange={(e) => setBulkInviteMessage(e.target.value)}
                  className="w-full p-4 border border-slate-200 rounded-xl font-medium resize-none"
                  rows={4}
                  placeholder="Leave empty to use default invite message..."
                />
              </div>

              {/* Preview Button */}
              <button
                onClick={async () => {
                  setBulkInviteLoading(true);
                  try {
                    const res = await fetch('/api/admin/community/bulk-invite', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                      },
                      body: JSON.stringify({
                        targetCommunityId: selectedCommunity,
                        useLeads: bulkInviteSource === 'leads',
                        workshopFilter: bulkInviteWorkshop !== 'all' ? bulkInviteWorkshop : undefined,
                        customMessage: bulkInviteMessage || undefined,
                      }),
                    });
                    const data = await res.json();
                    if (data.success) {
                      setBulkInvitePreview(data.data);
                    } else {
                      alert('❌ ' + data.error);
                    }
                  } catch (e: any) {
                    alert('❌ Error: ' + e.message);
                  } finally {
                    setBulkInviteLoading(false);
                  }
                }}
                disabled={bulkInviteLoading}
                className="w-full py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2"
              >
                {bulkInviteLoading ? (
                  <>
                    <Loader size={18} className="animate-spin" /> Loading Preview...
                  </>
                ) : (
                  <>
                    <Eye size={18} /> Preview Recipients
                  </>
                )}
              </button>

              {/* Preview Results */}
              {bulkInvitePreview && (
                <div className="bg-emerald-50 p-5 rounded-xl border border-emerald-200 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-emerald-800">✅ Ready to Send</p>
                      <p className="text-2xl font-black text-emerald-900">{bulkInvitePreview.phoneCount} Recipients</p>
                    </div>
                    <div className="text-right text-xs text-emerald-700">
                      <p>Target: {bulkInvitePreview.targetCommunity}</p>
                      <p className="font-mono text-[10px]">{bulkInvitePreview.joinLink}</p>
                    </div>
                  </div>
                  
                  {/* Sample phones */}
                  <div className="max-h-32 overflow-y-auto bg-white p-3 rounded-lg border border-emerald-100">
                    <p className="text-[10px] font-bold text-slate-500 uppercase mb-2">Sample Recipients:</p>
                    <div className="space-y-1">
                      {bulkInvitePreview.phones?.slice(0, 10).map((p: any, i: number) => (
                        <div key={i} className="flex justify-between text-xs">
                          <span className="text-slate-700">{p.name}</span>
                          <span className="font-mono text-slate-500">{p.fullPhone}</span>
                        </div>
                      ))}
                      {bulkInvitePreview.phoneCount > 10 && (
                        <p className="text-xs text-slate-400 italic">...and {bulkInvitePreview.phoneCount - 10} more</p>
                      )}
                    </div>
                  </div>

                  {/* Message Preview */}
                  <div className="bg-white p-3 rounded-lg border border-emerald-100">
                    <p className="text-[10px] font-bold text-slate-500 uppercase mb-2">Message Preview:</p>
                    <p className="text-xs text-slate-600 whitespace-pre-wrap">{bulkInvitePreview.messagePreview}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-slate-100 flex gap-4 shrink-0">
              <button 
                onClick={() => {
                  setShowBulkInviteModal(false);
                  setBulkInvitePreview(null);
                }}
                className="flex-1 py-4 border border-slate-200 rounded-xl font-bold text-sm hover:bg-slate-50 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (!bulkInvitePreview) {
                    alert('Please preview recipients first');
                    return;
                  }
                  // Copy phones to clipboard for use in broadcast page
                  const phones = bulkInvitePreview.phones?.map((p: any) => p.fullPhone).join('\n');
                  navigator.clipboard.writeText(phones);
                  alert(`✅ ${bulkInvitePreview.phoneCount} phone numbers copied to clipboard!\n\nGo to CRM > Broadcast page to send the invite using a template.`);
                }}
                disabled={!bulkInvitePreview || bulkInviteLoading}
                className="flex-1 py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2"
              >
                <Copy size={18} /> Copy Phones & Go to Broadcast
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
