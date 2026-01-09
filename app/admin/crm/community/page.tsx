'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import {
  Users, MessageSquare, Send, Mail, Phone, MoreVertical, Trash2, Edit, Shield,
  Search, ChevronDown, Plus, Filter, Download, ArrowRight, CheckCircle, AlertCircle,
  Clock, User, Settings, Loader, Globe, Upload, Bold, Italic, Strikethrough, Code, Smile, Wand2,
  Calendar, MapPin, Link as LinkIcon, Image as ImageIcon, Video as VideoIcon, FileText
} from 'lucide-react';

type CommunityButton = {
  id: string;
  label: string;
  actionType: 'link' | 'phone' | 'text';
  url?: string;
  phoneNumber?: string;
};

interface CommunityMember {
  _id: string;
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
  name: string;
  icon: string;
  memberCount: number;
  joinLink?: string;
}

const COMMUNITIES: Community[] = [
  { id: 'general', name: 'Global Community for General', icon: '🌍', memberCount: 0, joinLink: 'https://swaryoga.com/community?join=general' },
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

export default function AdminCommunityPage() {
  const router = useRouter();
  const token = useAuth();
  const [selectedCommunity, setSelectedCommunity] = useState('general');
  const [members, setMembers] = useState<CommunityMember[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'banned'>('all');
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
  const [postSelectedCommunityIds, setPostSelectedCommunityIds] = useState<Set<string>>(new Set(['general']));
  const [crossPostMedia, setCrossPostMedia] = useState(false);
  const [crossPostSocial, setCrossPostSocial] = useState(false);
  const [postVideoUrl, setPostVideoUrl] = useState('');
  const [postDocUrl, setPostDocUrl] = useState('');
  const [postExtraLinks, setPostExtraLinks] = useState('');
  const [postType, setPostType] = useState<'text' | 'image' | 'video' | 'document' | 'link'>('text');
  const [postImageUrls, setPostImageUrls] = useState<string[]>([]);
  
  const [editingCommunityName, setEditingCommunityName] = useState(false);
  const [newCommunityName, setNewCommunityName] = useState('');
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
        setPostImageUrls(prev => [...prev, json.data.url]);
      } else if (type === 'video') {
        setPostVideoUrl(json.data.url);
      } else if (type === 'document') {
        setPostDocUrl(json.data.url);
      }

      alert(`✅ Asset ${file.name} successfully registered.`);
    } catch (err: any) {
      alert('❌ Upload failed: ' + err.message);
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

  const createAdminPost = async () => {
    if (!postHeader.trim() && !postContent.trim() && postImageUrls.length === 0) {
      alert('Post content required');
      return;
    }
    if (!token) return;
    const communityIds = postTargetMode === 'all' ? COMMUNITIES.map((c) => c.id) : [...postSelectedCommunityIds];
    try {
      const response = await fetch('/api/admin/crm/community/posts/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ communityIds, headerText: postHeader, content: postContent, footerText: postFooter, buttons: postButtons, type: postType, videoUrl: postVideoUrl, docUrl: postDocUrl, imageUrls: postImageUrls, crossPost: { media: crossPostMedia, socialMedia: crossPostSocial } }),
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

  const updateCommunityName = async () => {
    if (!token) return;
    try {
      const response = await fetch(`/api/community/admin/${selectedCommunity}/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ name: newCommunityName }),
      });
      if (!response.ok) throw new Error();
      setEditedCommunities(prev => ({ ...prev, [selectedCommunity]: newCommunityName }));
      setEditingCommunityName(false);
      alert('✅ Updated!');
    } catch (err) {
      alert('❌ Failed');
    }
  };

  useEffect(() => {
    if (!token) return;
    const fetchMembers = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/community/members?communityId=${selectedCommunity}&status=${statusFilter}&limit=200`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        
        if (res.status === 401 || res.status === 403) {
          console.error('[CRM Community] Auth failure:', res.status);
          // Only clear and redirect if we're sure it's an auth failure
          localStorage.removeItem('adminToken');
          localStorage.removeItem('admin_token');
          router.push('/admin/login');
          return;
        }

        const json = await res.json();
        setMembers(Array.isArray(json?.data?.members) ? json.data.members : []);
      } catch (error) {
        console.error('[CRM Community] Fetch error:', error);
        setMembers([]);
      } finally {
        setLoading(false);
      }
    };
    fetchMembers();
  }, [selectedCommunity, statusFilter, token]);

  const filteredMembers = members.filter(member => 
    (member.name.toLowerCase().includes(searchQuery.toLowerCase()) || member.mobile.includes(searchQuery)) && 
    (statusFilter === 'all' || member.status === statusFilter)
  );

  const currentCommunity = COMMUNITIES.find(c => c.id === selectedCommunity);

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
          {COMMUNITIES.map((community) => {
            const isActive = selectedCommunity === community.id;
            return (
              <button key={community.id} onClick={() => setSelectedCommunity(community.id)} className={`w-full text-left px-5 py-4 rounded-xl transition-all flex items-center gap-4 ${isActive ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 shadow-lg' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'}`}>
                <span className="text-xl">{community.icon}</span>
                <span className="font-semibold text-[13px] truncate">{community.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="bg-white border-b border-slate-200/60 p-10 z-10">
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-8">
              <div className="w-20 h-20 bg-slate-50 rounded-[1.75rem] flex items-center justify-center text-4xl shadow-inner border border-slate-100/80">
                {currentCommunity?.icon}
              </div>
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl font-bold text-slate-900 tracking-tight">{editedCommunities[selectedCommunity] || currentCommunity?.name}</h1>
                  <button onClick={() => { setEditingCommunityName(true); setNewCommunityName(currentCommunity?.name || ''); }} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"><Edit size={16} /></button>
                </div>
                <p className="text-xs font-bold text-indigo-600 uppercase tracking-widest">{members.length} Active Members</p>
              </div>
            </div>
            <div className="flex gap-4">
              <button onClick={() => setShowPostModal(true)} className="h-14 px-8 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all flex items-center gap-3 shadow-xl shadow-indigo-600/20 text-sm tracking-tight border border-indigo-500/50"><Send size={18} /> Run Campaign</button>
              <button onClick={() => setShowAddMemberModal(true)} className="h-14 px-8 bg-white hover:bg-slate-50 text-slate-900 rounded-xl font-bold transition-all flex items-center gap-3 shadow-lg text-sm border border-slate-200"><Plus size={18} className="text-indigo-600" /> New Member</button>
            </div>
          </div>
          <div className="flex gap-5 items-center">
            <div className="flex-1 relative">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input type="text" placeholder="Search registry..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-14 pr-7 h-14 bg-slate-50/50 text-slate-900 rounded-2xl border border-slate-200/60 font-medium text-sm outline-none" />
            </div>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)} className="px-6 h-14 bg-white text-slate-700 rounded-2xl border border-slate-200/60 font-bold text-xs uppercase cursor-pointer min-w-[160px]">
              <option value="all">Display All</option>
              <option value="active">Verified</option>
              <option value="inactive">Waitlist</option>
              <option value="banned">Excluded</option>
            </select>
          </div>
        </div>

        <div className="flex-1 overflow-auto bg-slate-50/80 p-10">
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
                         <th className="pl-10 px-6 py-5">Profile</th>
                         <th className="px-6 py-5">Connectivity</th>
                         <th className="px-6 py-5">Status</th>
                         <th className="px-6 py-5">Interaction</th>
                         <th className="pr-10 px-6 py-5 text-right">Ops</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-50">
                      {filteredMembers.map(member => (
                        <tr key={member._id} className="hover:bg-indigo-50/[0.15] group transition-all">
                           <td className="pl-10 px-6 py-6">
                              <div className="flex items-center gap-5">
                                 <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-lg">{member.name.charAt(0)}</div>
                                 <div>
                                    <p className="font-bold text-slate-900 text-sm uppercase tracking-tight">{member.name}</p>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">ID: {member._id.slice(-4)}</p>
                                 </div>
                              </div>
                           </td>
                           <td className="px-6 py-6 font-semibold text-sm text-slate-600">{member.mobile}</td>
                           <td className="px-6 py-6">
                              <span className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest ${member.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-50 text-slate-500'}`}>{member.status}</span>
                           </td>
                           <td className="px-6 py-6">
                              <div className="flex gap-4">
                                 <div className="bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100 text-center min-w-[50px]">
                                    <p className="text-xs font-bold text-slate-800">{member.messageCount}</p>
                                    <p className="text-[8px] font-bold text-slate-400 uppercase">Posts</p>
                                 </div>
                              </div>
                           </td>
                           <td className="pr-10 px-6 py-6 text-right opacity-0 group-hover:opacity-100 transition-all">
                              <div className="flex justify-end gap-2">
                                 <button onClick={() => openChatPermissions(member)} className="p-2 hover:bg-slate-900 hover:text-white rounded-lg transition-all text-slate-400 border border-slate-100"><Shield size={16}/></button>
                                 <button onClick={() => { setSelectedMember(member); setShowMessageModal(true); }} className="p-2 hover:bg-indigo-600 hover:text-white rounded-lg transition-all text-slate-400 border border-slate-100"><Send size={16}/></button>
                                 <button className="p-2 hover:bg-red-500 hover:text-white rounded-lg transition-all text-slate-400 border border-slate-100"><Trash2 size={16}/></button>
                              </div>
                           </td>
                        </tr>
                      ))}
                   </tbody>
                </table>
             </div>
           )}
        </div>
      </div>

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
                   <Send size={18} /> Deploy Campaign
                 </button>
              </div>
              <div className="flex-1 flex overflow-hidden bg-slate-50/50">
                 <div className="flex-1 overflow-y-auto p-16 space-y-16">
                    <section className="bg-white p-10 rounded-[2rem] border shadow-sm space-y-8">
                       <h3 className="text-sm font-bold uppercase tracking-widest">1. Audience</h3>
                       <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                          {COMMUNITIES.map(c => (
                             <label key={c.id} className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${postSelectedCommunityIds.has(c.id) ? 'bg-indigo-50 border-indigo-200' : 'bg-white'}`}>
                                <input type="checkbox" className="hidden" checked={postSelectedCommunityIds.has(c.id)} onChange={e => {
                                   const next = new Set(postSelectedCommunityIds);
                                   if(e.target.checked) next.add(c.id); else next.delete(c.id);
                                   setPostSelectedCommunityIds(next);
                                }} />
                                <span>{c.icon}</span>
                                <span className="text-xs font-bold truncate">{c.name}</span>
                             </label>
                          ))}
                       </div>
                    </section>
                    <section className="bg-white p-10 rounded-[2rem] border shadow-sm space-y-8">
                       <h3 className="text-sm font-bold uppercase tracking-widest">2. Content</h3>
                       <div className="grid grid-cols-2 gap-8">
                          <input type="text" value={postHeader} onChange={e => setPostHeader(e.target.value)} placeholder="Headline" className="h-14 px-6 bg-slate-50 border rounded-xl font-semibold outline-none focus:bg-white" />
                          <input type="text" value={postFooter} onChange={e => setPostFooter(e.target.value)} placeholder="Footer" className="h-14 px-6 bg-slate-50 border rounded-xl font-semibold outline-none focus:bg-white" />
                       </div>
                       <div className="grid grid-cols-5 gap-2 p-1.5 bg-slate-50 rounded-2xl">
                          {['text', 'image', 'video', 'document', 'link'].map((t: any) => (
                             <button key={t} onClick={() => setPostType(t)} className={`h-11 rounded-xl text-[10px] font-bold uppercase border ${postType === t ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>{t}</button>
                          ))}
                       </div>
                       {postType === 'image' && (
                          <div className="flex gap-3">
                             <input type="text" value={postImageUrls.join(', ')} onChange={e => setPostImageUrls(e.target.value.split(','))} placeholder="Image URL..." className="flex-1 h-14 px-6 bg-slate-50 border rounded-xl font-semibold" />
                             <label className="h-14 px-6 bg-white border rounded-xl flex items-center justify-center gap-2 cursor-pointer font-bold text-xs"><Upload size={16}/> {uploading ? '...' : 'Upload'}<input type="file" className="hidden" onChange={e => handleFileUpload(e, 'image')} /></label>
                          </div>
                       )}
                       {postType === 'video' && (
                          <div className="flex gap-3">
                             <input type="text" value={postVideoUrl} onChange={e => setPostVideoUrl(e.target.value)} placeholder="Video URL..." className="flex-1 h-14 px-6 bg-slate-50 border rounded-xl font-semibold" />
                             <label className="h-14 px-6 bg-white border rounded-xl flex items-center justify-center gap-2 cursor-pointer font-bold text-xs"><Upload size={16}/> Upload<input type="file" className="hidden" accept="video/*" onChange={e => handleFileUpload(e, 'video')} /></label>
                          </div>
                       )}

                       <div className="relative group">
                          {/* Rich Text Toolbar */}
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
                             
                             <div className="relative">
                                <button onClick={() => setShowToolsDropdown(!showToolsDropdown)} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all ${showToolsDropdown ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                                   <Wand2 size={14} /> Tools <ChevronDown size={14} className={`transition-transform ${showToolsDropdown ? 'rotate-180' : ''}`} />
                                </button>
                                
                                {showToolsDropdown && (
                                   <>
                                      <div className="fixed inset-0 z-40" onClick={() => setShowToolsDropdown(false)} />
                                      <div className="absolute right-0 top-full mt-2 w-64 bg-white border rounded-2xl shadow-xl z-50 overflow-hidden py-2 animate-in fade-in slide-in-from-top-2">
                                         <div className="px-4 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Global Tools</div>
                                         <button onClick={() => { insertTextAtCursor('{{name}}'); setShowToolsDropdown(false); }} className="w-full px-4 py-3 flex items-center gap-3 hover:bg-slate-50 text-left transition-colors">
                                            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600"><User size={14}/></div>
                                            <div>
                                               <div className="text-sm font-bold">Personalized Name</div>
                                               <div className="text-[10px] text-slate-400">Inserts dynamic member name</div>
                                            </div>
                                         </button>
                                         <button onClick={() => { setShowPostModal(true); setShowToolsDropdown(false); }} className="w-full px-4 py-3 flex items-center gap-3 hover:bg-slate-50 text-left transition-colors">
                                            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600"><Calendar size={14}/></div>
                                            <div>
                                               <div className="text-sm font-bold">Schedule Campaign</div>
                                               <div className="text-[10px] text-slate-400">Pick date & time for broadcast</div>
                                            </div>
                                         </button>
                                         <button onClick={() => { setPostType('link'); setShowToolsDropdown(false); }} className="w-full px-4 py-3 flex items-center gap-3 hover:bg-slate-50 text-left transition-colors">
                                            <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center text-orange-600"><LinkIcon size={14}/></div>
                                            <div>
                                               <div className="text-sm font-bold">Trackable Link</div>
                                               <div className="text-[10px] text-slate-400">Add click-counting URL</div>
                                            </div>
                                         </button>
                                         <div className="h-px bg-slate-100 my-1" />
                                         <div className="px-4 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Media Quick-Add</div>
                                         <div className="grid grid-cols-3 gap-1 px-3 pb-2">
                                            <button onClick={() => setPostType('image')} className="flex flex-col items-center gap-1 p-2 rounded-xl hover:bg-slate-50 group">
                                               <ImageIcon size={16} className="text-slate-400 group-hover:text-indigo-600"/>
                                               <span className="text-[9px] font-bold">Photo</span>
                                            </button>
                                            <button onClick={() => setPostType('video')} className="flex flex-col items-center gap-1 p-2 rounded-xl hover:bg-slate-50 group">
                                               <VideoIcon size={16} className="text-slate-400 group-hover:text-indigo-600"/>
                                               <span className="text-[9px] font-bold">Video</span>
                                            </button>
                                            <button onClick={() => setPostType('document')} className="flex flex-col items-center gap-1 p-2 rounded-xl hover:bg-slate-50 group">
                                               <FileText size={16} className="text-slate-400 group-hover:text-indigo-600"/>
                                               <span className="text-[9px] font-bold">PDF</span>
                                            </button>
                                         </div>
                                      </div>
                                   </>
                                )}
                             </div>
                          </div>

                          {showEmojiPicker && (
                             <div className="absolute left-10 top-12 w-64 bg-white border shadow-xl rounded-2xl z-50 p-3 grid grid-cols-6 gap-2 animate-in zoom-in-95">
                                {EMOJIS.map(e => (
                                   <button key={e} onClick={() => { insertTextAtCursor(e); setShowEmojiPicker(false); }} className="w-8 h-8 flex items-center justify-center hover:bg-slate-100 rounded-lg text-xl">
                                      {e}
                                   </button>
                                ))}
                             </div>
                          )}

                          <textarea 
                             ref={textAreaRef}
                             value={postContent} 
                             onChange={e => setPostContent(e.target.value)} 
                             rows={6} 
                             placeholder="Message body..." 
                             className="w-full p-8 bg-slate-50 border border-t-0 rounded-b-[2rem] focus:bg-white transition-all outline-none font-medium resize-none shadow-inner" 
                          />
                       </div>
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
                    <section className="bg-white p-10 rounded-[2rem] border shadow-sm space-y-8">
                       <h3 className="text-sm font-bold uppercase tracking-widest">4. Distribution Channels</h3>
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
                 <div className="w-[450px] bg-slate-100 p-16 flex flex-col items-center justify-center">
                    <div className="bg-white rounded-[3rem] shadow-2xl border-[10px] border-slate-900 w-full aspect-[9/19] overflow-hidden relative">
                       <div className="h-10 flex items-center justify-between px-8 text-xs font-black">9:41</div>
                       <div className="p-6 space-y-5">
                          <div className="flex items-center gap-3 border-b pb-4">
                             <div className="w-10 h-10 bg-indigo-600 rounded-full" />
                             <p className="text-[10px] font-bold uppercase tracking-tighter">System Admin</p>
                          </div>
                          {postHeader && <h4 className="text-xl font-bold font-serif leading-tight">{postHeader}</h4>}
                          {postType === 'image' && postImageUrls[0] && <div className="aspect-square rounded-2xl bg-slate-100 overflow-hidden"><img src={postImageUrls[0]} className="w-full h-full object-cover" /></div>}
                          {postType === 'video' && postVideoUrl && <div className="aspect-video rounded-2xl bg-slate-100 overflow-hidden"><video src={postVideoUrl} className="w-full h-full object-cover" controls /></div>}
                          <p className="text-sm text-slate-600 leading-relaxed italic">{postContent || 'Content Preview...'}</p>
                          <div className="space-y-2">
                             {postButtons.map(b => <div key={b.id} className="w-full py-3 bg-indigo-600 text-white rounded-xl text-[10px] font-bold uppercase text-center">{b.label}</div>)}
                          </div>
                       </div>
                    </div>
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
    </div>
  );
}
