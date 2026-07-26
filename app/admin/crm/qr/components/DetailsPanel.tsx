'use client';

import React, { useState } from 'react';
import { X, Phone, Video, MessageSquare, Hash, Info, Calendar, Users, Pencil, LogOut, Loader2, Save, Link2, Copy, RotateCcw, Lock, ChevronUp, ChevronDown, UserMinus, UserPlus, Shield, Crown, Tag, Funnel, Download, CheckSquare, Square, Trash2 } from 'lucide-react';
import type { ChatItem, MessageItem, FunnelStage, LabelPreset, GroupInfo } from '../types';
import { formatPhoneNumber, getAvatarColor, getInitials } from '../utils';
import { TeamInboxSection } from './TeamInboxSection';

export interface DetailsPanelProps {
  selectedChat: string;
  chats: ChatItem[];
  messages: MessageItem[];
  profilePics: Record<string, string | null>;
  isConnected: boolean;
  contactAbout: string | null;
  chatFunnels: Record<string, string>;
  chatLabels: Record<string, string[]>;
  funnelStages: FunnelStage[];
  labelPresets: LabelPreset[];
  groupInfo: GroupInfo | null;
  loadingGroupInfo: boolean;
  editingDesc: boolean;
  setEditingDesc: (v: boolean) => void;
  editDescText: string;
  setEditDescText: (v: string) => void;
  savingDesc: boolean;
  updateGroupDesc: () => void;
  groupInviteLink: string | null;
  loadingInvite: boolean;
  fetchGroupInvite: () => void;
  revokeGroupInvite: () => void;
  groupSettingsLoading: string | null;
  updateGroupSetting: (setting: string) => void;
  updateGroupParticipant: (participantJid: string, action: 'promote' | 'demote' | 'remove') => void;
  addGroupParticipants?: (phones: string[]) => Promise<void>;
  bulkRemoveParticipants?: (participantJids: string[]) => Promise<void>;
  handleRenameGroup: (newName: string) => void;
  handleLeaveGroup: () => void;
  setDetailsPanel: (v: boolean) => void;
  setLightboxImage: (v: string | null) => void;
  token?: string | null;
}

export function DetailsPanel({
  selectedChat, chats, messages, profilePics, isConnected,
  contactAbout, chatFunnels, chatLabels, funnelStages, labelPresets,
  groupInfo, loadingGroupInfo,
  editingDesc, setEditingDesc, editDescText, setEditDescText,
  savingDesc, updateGroupDesc,
  groupInviteLink, loadingInvite, fetchGroupInvite, revokeGroupInvite,
  groupSettingsLoading, updateGroupSetting, updateGroupParticipant,
  addGroupParticipants,
  bulkRemoveParticipants,
  handleRenameGroup, handleLeaveGroup,
  setDetailsPanel, setLightboxImage,
  token,
}: DetailsPanelProps) {
  const selectedChatInfo = chats.find(c => c.id === selectedChat);
  const isGroupChat = selectedChat.endsWith('@g.us') || selectedChat.endsWith('@lid');
  const chatName = isGroupChat
    ? (selectedChatInfo?.name || selectedChat.split('@')[0])
    : selectedChat.replace('@s.whatsapp.net', '');
  const avatarColor = getAvatarColor(chatName);
  const initials = getInitials(chatName);
  const stage = chatFunnels[selectedChat];
  const stageInfo = funnelStages.find(s => s.key === stage);
  const labels = chatLabels[selectedChat] || [];
  const phone = selectedChat.replace('@s.whatsapp.net', '').replace('@g.us', '');

  return (
    <div className="w-80 border-l bg-white flex flex-col overflow-y-auto">
      {/* Panel Header */}
      <div className="px-4 py-3 border-b flex items-center justify-between bg-gray-50">
        <h3 className="text-sm font-semibold text-gray-700">{isGroupChat ? 'Group Info' : 'Contact Info'}</h3>
        <button onClick={() => setDetailsPanel(false)} className="p-1 rounded hover:bg-gray-200">
          <X className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      {/* Profile Section */}
      <div className="flex flex-col items-center py-6 px-4 border-b">
        {isGroupChat ? (
          <>
            {profilePics[selectedChat] ? (
              <img
                src={profilePics[selectedChat]!}
                alt={chatName}
                className="w-24 h-24 rounded-full object-cover cursor-pointer hover:opacity-80 transition ring-2 ring-white shadow-lg"
                onClick={() => setLightboxImage(profilePics[selectedChat]!)}
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden'); }}
              />
            ) : null}
            <div className={`w-24 h-24 rounded-full flex items-center justify-center text-white ${avatarColor} ${profilePics[selectedChat] ? 'hidden' : ''}`}>
              <Users className="w-10 h-10" />
            </div>
          </>
        ) : (
          <>
            {profilePics[selectedChat] ? (
              <img
                src={profilePics[selectedChat]!}
                alt={chatName}
                className="w-24 h-24 rounded-full object-cover cursor-pointer hover:opacity-80 transition ring-2 ring-white shadow-lg"
                onClick={() => setLightboxImage(profilePics[selectedChat]!)}
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden'); }}
              />
            ) : null}
            <div className={`w-24 h-24 rounded-full flex items-center justify-center text-white font-bold text-2xl ${avatarColor} ${profilePics[selectedChat] ? 'hidden' : ''}`}>
              {initials || '👤'}
            </div>
          </>
        )}
        <h4 className="mt-3 text-base font-semibold text-gray-900 text-center">
          {isGroupChat ? chatName : formatPhoneNumber(chatName)}
        </h4>
        {!isGroupChat && (
          <p className="text-xs text-gray-500 mt-0.5">+{phone}</p>
        )}
        {isGroupChat && groupInfo && (
          <p className="text-xs text-gray-500 mt-0.5">{groupInfo.size || groupInfo.participants?.length || 0} members visible</p>
        )}
        <span className={`mt-1 inline-flex items-center gap-1 text-[11px] font-medium ${isConnected ? 'text-green-600' : 'text-gray-400'}`}>
          <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-gray-400'}`}></span>
          {isConnected ? 'Online' : 'Offline'}
        </span>
      </div>

      {/* Call Buttons */}
      <div className="flex items-center justify-center gap-6 py-4 border-b">
        <button
          onClick={() => window.open(`tel:+${phone}`, '_blank')}
          className="flex flex-col items-center gap-1 group"
          title="Voice Call"
        >
          <div className="w-10 h-10 rounded-full bg-green-50 group-hover:bg-green-100 flex items-center justify-center transition">
            <Phone className="w-5 h-5 text-green-600" />
          </div>
          <span className="text-[10px] text-gray-500">Audio</span>
        </button>
        <button
          onClick={() => window.open(`https://wa.me/${phone}?video=true`, '_blank')}
          className="flex flex-col items-center gap-1 group"
          title="Video Call"
        >
          <div className="w-10 h-10 rounded-full bg-indigo-50 group-hover:bg-indigo-100 flex items-center justify-center transition">
            <Video className="w-5 h-5 text-indigo-600" />
          </div>
          <span className="text-[10px] text-gray-500">Video</span>
        </button>
        <button
          onClick={() => window.open(`https://wa.me/${phone}`, '_blank')}
          className="flex flex-col items-center gap-1 group"
          title="Open in WhatsApp"
        >
          <div className="w-10 h-10 rounded-full bg-emerald-50 group-hover:bg-emerald-100 flex items-center justify-center transition">
            <MessageSquare className="w-5 h-5 text-emerald-600" />
          </div>
          <span className="text-[10px] text-gray-500">Chat</span>
        </button>
      </div>

      {/* Team Inbox: assignment, claim, internal notes */}
      {token && <TeamInboxSection chatJid={selectedChat} token={token} />}

      {/* Contact About / Bio */}
      {!isGroupChat && contactAbout && (
        <div className="px-4 py-3 border-b">
          <h5 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1">About</h5>
          <p className="text-sm text-gray-700">{contactAbout}</p>
        </div>
      )}

      {/* Details Section */}
      <div className="px-4 py-3 border-b space-y-3">
        <h5 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Details</h5>
        {!isGroupChat && (
          <>
            <div className="flex items-center gap-3">
              <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-500">Phone</p>
                <p className="text-sm text-gray-900 font-medium">{formatPhoneNumber(phone)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Hash className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-500">WhatsApp JID</p>
                <p className="text-[11px] text-gray-600 font-mono">{selectedChat}</p>
              </div>
            </div>
          </>
        )}
        {isGroupChat && groupInfo && (
          <>
            {/* Editable Group Description */}
            <div className="flex items-start gap-3">
              <Info className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-500">Description</p>
                  {!editingDesc && (
                    <button
                      onClick={() => { setEditingDesc(true); setEditDescText(groupInfo.desc || ''); }}
                      className="text-[10px] text-indigo-600 hover:text-indigo-700 font-medium"
                    >
                      Edit
                    </button>
                  )}
                </div>
                {editingDesc ? (
                  <div className="mt-1 space-y-1.5">
                    <textarea
                      value={editDescText}
                      onChange={(e) => setEditDescText(e.target.value)}
                      rows={3}
                      className="w-full text-sm border border-gray-300 rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-green-500 focus:border-green-500 resize-none"
                      placeholder="Group description..."
                    />
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => updateGroupDesc()}
                        disabled={savingDesc}
                        className="flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-md bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                      >
                        {savingDesc ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                        Save
                      </button>
                      <button
                        onClick={() => setEditingDesc(false)}
                        className="text-[10px] px-2.5 py-1 rounded-md bg-gray-100 text-gray-600 hover:bg-gray-200"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-700 whitespace-pre-wrap mt-0.5">{groupInfo.desc || <span className="italic text-gray-400">No description</span>}</p>
                )}
              </div>
            </div>
            {groupInfo.creation && (
              <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-500">Created</p>
                  <p className="text-sm text-gray-700">{new Date(groupInfo.creation * 1000).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-3">
              <Hash className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-500">Group JID</p>
                <p className="text-[11px] text-gray-600 font-mono">{selectedChat}</p>
              </div>
            </div>
            {/* Rename Group */}
            <div className="flex items-center gap-3">
              <Pencil className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <button
                onClick={() => {
                  const newName = prompt('New group name:', groupInfo?.subject || '');
                  if (newName && newName.trim()) handleRenameGroup(newName);
                }}
                className="text-xs text-indigo-600 hover:text-indigo-800 hover:underline"
              >
                Rename Group
              </button>
            </div>
            {/* Leave Group */}
            <div className="flex items-center gap-3">
              <LogOut className="w-4 h-4 text-red-400 flex-shrink-0" />
              <button
                onClick={handleLeaveGroup}
                className="text-xs text-red-600 hover:text-red-800 hover:underline"
              >
                Leave Group
              </button>
            </div>
          </>
        )}
      </div>

      {/* Group Invite Link */}
      {isGroupChat && (
        <div className="px-4 py-3 border-b space-y-2">
          <h5 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Invite Link</h5>
          {groupInviteLink ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-2.5 py-2">
                <Link2 className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
                <p className="text-[11px] text-gray-700 font-mono truncate flex-1">{groupInviteLink}</p>
              </div>
              <div className="flex gap-1.5">
                <button
                  onClick={() => { navigator.clipboard.writeText(groupInviteLink); }}
                  className="flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-600 hover:bg-indigo-100"
                >
                  <Copy className="w-3 h-3" /> Copy
                </button>
                <button
                  onClick={() => revokeGroupInvite()}
                  className="flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-md bg-red-50 text-red-600 hover:bg-red-100"
                >
                  <RotateCcw className="w-3 h-3" /> Revoke
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => fetchGroupInvite()}
              disabled={loadingInvite}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md bg-green-50 text-green-700 hover:bg-green-100 disabled:opacity-50"
            >
              {loadingInvite ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Link2 className="w-3.5 h-3.5" />}
              Get Invite Link
            </button>
          )}
        </div>
      )}

      {/* Group Settings */}
      {isGroupChat && (
        <div className="px-4 py-3 border-b space-y-2">
          <h5 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Group Settings</h5>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-3.5 h-3.5 text-gray-400" />
                <span className="text-xs text-gray-700">Only admins can send messages</span>
              </div>
              <button
                onClick={() => updateGroupSetting(groupInfo?.announce ? 'not_announcement' : 'announcement')}
                disabled={!!groupSettingsLoading}
                className={`relative w-9 h-5 rounded-full transition-colors ${groupInfo?.announce ? 'bg-green-500' : 'bg-gray-300'} ${groupSettingsLoading ? 'opacity-50' : ''}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${groupInfo?.announce ? 'translate-x-4' : 'translate-x-0'}`} />
              </button>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lock className="w-3.5 h-3.5 text-gray-400" />
                <span className="text-xs text-gray-700">Only admins can edit group info</span>
              </div>
              <button
                onClick={() => updateGroupSetting(groupInfo?.restrict ? 'not_locked' : 'locked')}
                disabled={!!groupSettingsLoading}
                className={`relative w-9 h-5 rounded-full transition-colors ${groupInfo?.restrict ? 'bg-green-500' : 'bg-gray-300'} ${groupSettingsLoading ? 'opacity-50' : ''}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${groupInfo?.restrict ? 'translate-x-4' : 'translate-x-0'}`} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Funnel & Labels */}
      <div className="px-4 py-3 border-b space-y-2">
        <h5 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">CRM</h5>
        <div className="flex items-center gap-2">
          <Funnel className="w-3.5 h-3.5 text-gray-400" />
          <span className="text-xs text-gray-500">Stage:</span>
          {stageInfo ? (
            <span className={`text-[10px] px-2 py-0.5 rounded-full border ${stageInfo.color}`}>{stageInfo.label}</span>
          ) : (
            <span className="text-[10px] text-gray-400 italic">None</span>
          )}
        </div>
        {labels.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <Tag className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-xs text-gray-500">Labels:</span>
            {labels.map(lbl => {
              const li = labelPresets.find(l => l.key === lbl);
              return li ? (
                <span key={lbl} className={`text-[9px] px-1.5 py-0.5 rounded ${li.color}`}>{li.label}</span>
              ) : null;
            })}
          </div>
        )}
        <div className="flex items-center gap-2">
          <MessageSquare className="w-3.5 h-3.5 text-gray-400" />
          <span className="text-xs text-gray-500">Messages:</span>
          <span className="text-xs text-gray-700 font-medium">{messages.length}</span>
        </div>
      </div>

      {/* Group Participants */}
      {isGroupChat && (
        <div className="px-4 py-3 space-y-2 flex-1">
          <BulkMemberManager
            groupInfo={groupInfo}
            loadingGroupInfo={loadingGroupInfo}
            chats={chats}
            selectedChat={selectedChat}
            updateGroupParticipant={updateGroupParticipant}
            addGroupParticipants={addGroupParticipants}
            bulkRemoveParticipants={bulkRemoveParticipants}
          />
        </div>
      )}
    </div>
  );
}

/* ── Bulk Member Manager (internal sub-component) ── */
function BulkMemberManager({ groupInfo, loadingGroupInfo, chats, selectedChat, updateGroupParticipant, addGroupParticipants, bulkRemoveParticipants }: {
  groupInfo: GroupInfo | null;
  loadingGroupInfo: boolean;
  chats: ChatItem[];
  selectedChat: string;
  updateGroupParticipant: (jid: string, action: 'promote' | 'demote' | 'remove') => void;
  addGroupParticipants?: (phones: string[]) => Promise<void>;
  bulkRemoveParticipants?: (jids: string[]) => Promise<void>;
}) {
  const [selectedJids, setSelectedJids] = useState<Set<string>>(new Set());
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkRemoving, setBulkRemoving] = useState(false);
  const [showAddInput, setShowAddInput] = useState(false);
  const [addInput, setAddInput] = useState('');
  const [adding, setAdding] = useState(false);

  const removableParticipants = (groupInfo?.participants || []).filter(p => p.admin !== 'superadmin');
  const allSelected = removableParticipants.length > 0 && removableParticipants.every(p => selectedJids.has(p.id));

  const toggleAll = () => {
    if (allSelected) {
      setSelectedJids(new Set());
    } else {
      setSelectedJids(new Set(removableParticipants.map(p => p.id)));
    }
  };

  const toggleOne = (id: string) => {
    setSelectedJids(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleAddMembers = async () => {
    const phones = addInput.split(/[,;\n]+/).map(p => p.trim()).filter(Boolean);
    if (phones.length === 0 || !addGroupParticipants) return;
    setAdding(true);
    try {
      await addGroupParticipants(phones);
      setAddInput('');
      setShowAddInput(false);
    } finally {
      setAdding(false);
    }
  };

  const handleBulkRemove = async () => {
    if (selectedJids.size === 0) return;
    if (!confirm(`Remove ${selectedJids.size} member${selectedJids.size !== 1 ? 's' : ''} from this group?`)) return;
    setBulkRemoving(true);
    try {
      if (bulkRemoveParticipants) {
        await bulkRemoveParticipants(Array.from(selectedJids));
      }
      setSelectedJids(new Set());
      setBulkMode(false);
    } finally {
      setBulkRemoving(false);
    }
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <h5 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
          Members ({groupInfo?.size || groupInfo?.participants?.length || 0} visible)
        </h5>
        <div className="flex items-center gap-1">
          {addGroupParticipants && (
            <button
              onClick={() => { setShowAddInput(!showAddInput); setAddInput(''); }}
              className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded-md font-medium transition border ${showAddInput ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100' : 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100'}`}
              title={showAddInput ? 'Cancel' : 'Add members to this group'}
            >
              {showAddInput ? <><X className="w-3 h-3" /> Cancel</> : <><UserPlus className="w-3 h-3" /> Add</>}
            </button>
          )}
          {groupInfo && groupInfo.participants.length > 0 && (
            <>
              <button
                onClick={() => { setBulkMode(!bulkMode); setSelectedJids(new Set()); }}
                className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded-md font-medium transition border ${bulkMode ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100' : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'}`}
                title={bulkMode ? 'Cancel bulk select' : 'Bulk select members'}
              >
                {bulkMode ? <><X className="w-3 h-3" /> Cancel</> : <><CheckSquare className="w-3 h-3" /> Select</>}
              </button>
              <button
                onClick={() => {
                  const chatObj = chats.find(c => c.id === selectedChat);
                  const groupName = chatObj?.name || groupInfo.subject || 'group';
                  const rows = groupInfo.participants.map(p => {
                    const pId = p.id || '';
                    const isLid = pId.endsWith('@lid');
                    const rawPhone = pId.replace('@s.whatsapp.net', '').replace('@lid', '');
                    const phone = isLid ? '' : (rawPhone.length >= 7 ? `+${rawPhone}` : rawPhone);
                    const name = isLid ? `Member ${rawPhone.slice(-4)}` : formatPhoneNumber(rawPhone);
                    const role = p.admin === 'superadmin' ? 'Owner' : p.admin === 'admin' ? 'Admin' : 'Member';
                    return { name, phone, role };
                  });
                  const csvHeader = 'Name,Phone,Role';
                  const csvRows = rows.map(r => `"${r.name}","${r.phone}","${r.role}"`);
                  const csv = [csvHeader, ...csvRows].join('\n');
                  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `${groupName.replace(/[^a-zA-Z0-9 _-]/g, '')}_contacts.csv`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-md bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 font-medium transition"
                title="Download group contacts as CSV"
              >
                <Download className="w-3 h-3" /> Download
              </button>
            </>
          )}
        </div>
      </div>
      {/* Add members input */}
      {showAddInput && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-2 space-y-2">
          <textarea
            value={addInput}
            onChange={e => setAddInput(e.target.value)}
            placeholder="Phone numbers with country code, e.g. +91 98765 43210, +61 431 290 148 (comma, semicolon or new line separated)"
            className="w-full text-xs px-2 py-1.5 rounded border border-indigo-200 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-400 resize-none"
            rows={2}
          />
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-indigo-600">
              {addInput.split(/[,;\n]+/).map(p => p.trim()).filter(Boolean).length} number(s) — added slowly to avoid WhatsApp bans
            </span>
            <button
              onClick={handleAddMembers}
              disabled={adding || addInput.trim().length === 0}
              className="flex items-center gap-1 text-[10px] px-3 py-1.5 rounded-md bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 font-medium transition"
            >
              {adding ? <Loader2 className="w-3 h-3 animate-spin" /> : <UserPlus className="w-3 h-3" />}
              {adding ? 'Adding…' : 'Add'}
            </button>
          </div>
        </div>
      )}
      {/* Bulk action bar */}
      {bulkMode && selectedJids.size > 0 && (
        <div className="flex items-center justify-between bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          <span className="text-xs text-red-700 font-medium">{selectedJids.size} selected</span>
          <button
            onClick={handleBulkRemove}
            disabled={bulkRemoving}
            className="flex items-center gap-1 text-[10px] px-3 py-1.5 rounded-md bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 font-medium transition"
          >
            {bulkRemoving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
            Remove {selectedJids.size}
          </button>
        </div>
      )}
      {loadingGroupInfo ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
        </div>
      ) : groupInfo ? (
        <div className="space-y-1 max-h-64 overflow-y-auto">
          {groupInfo.participants.length <= 3 && (
            <p className="text-[10px] text-gray-400 italic px-2 pb-1">WhatsApp shows limited members for linked devices. More members appear as they send messages.</p>
          )}
          {/* Select all toggle */}
          {bulkMode && removableParticipants.length > 0 && (
            <button
              onClick={toggleAll}
              className="flex items-center gap-2 w-full px-2 py-1.5 text-[10px] text-gray-500 hover:bg-gray-50 rounded transition"
            >
              {allSelected ? <CheckSquare className="w-3.5 h-3.5 text-red-500" /> : <Square className="w-3.5 h-3.5" />}
              {allSelected ? 'Deselect all' : 'Select all (except owner)'}
            </button>
          )}
          {groupInfo.participants
            .sort((a, b) => {
              const order: Record<string, number> = { superadmin: 0, admin: 1 };
              const aOrder = a.admin ? (order[a.admin] ?? 2) : 2;
              const bOrder = b.admin ? (order[b.admin] ?? 2) : 2;
              return aOrder - bOrder;
            })
            .map(p => {
              const pId = p.id || '';
              const isLidId = pId.endsWith('@lid');
              const pPhone = pId.replace('@s.whatsapp.net', '').replace('@lid', '');
              const pColor = getAvatarColor(pPhone);
              const displayName = isLidId ? `Member ${pPhone.slice(-4)}` : formatPhoneNumber(pPhone);
              const isSuperAdmin = p.admin === 'superadmin';
              const isAdmin = p.admin === 'admin';
              return (
                <div key={p.id} className={`flex items-center gap-2 py-1.5 px-2 rounded hover:bg-gray-50 group/participant ${bulkMode && selectedJids.has(pId) ? 'bg-red-50' : ''}`}>
                  {bulkMode && !isSuperAdmin && (
                    <button onClick={() => toggleOne(pId)} className="flex-shrink-0">
                      {selectedJids.has(pId) ? <CheckSquare className="w-4 h-4 text-red-500" /> : <Square className="w-4 h-4 text-gray-400" />}
                    </button>
                  )}
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-semibold ${pColor}`}>
                    {pPhone.slice(-2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-800 truncate">{displayName}</p>
                  </div>
                  {isSuperAdmin && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-700 flex items-center gap-0.5">
                      <Crown className="w-2.5 h-2.5" /> Owner
                    </span>
                  )}
                  {isAdmin && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 flex items-center gap-0.5">
                      <Shield className="w-2.5 h-2.5" /> Admin
                    </span>
                  )}
                  {/* Admin actions - visible on hover (hidden in bulk mode) */}
                  {!isSuperAdmin && !bulkMode && (
                    <div className="hidden group-hover/participant:flex items-center gap-0.5">
                      {isAdmin ? (
                        <button
                          onClick={() => updateGroupParticipant(pId, 'demote')}
                          className="p-1 rounded hover:bg-orange-100 text-gray-400 hover:text-orange-600" title="Demote from admin"
                        >
                          <ChevronDown className="w-3 h-3" />
                        </button>
                      ) : (
                        <button
                          onClick={() => updateGroupParticipant(pId, 'promote')}
                          className="p-1 rounded hover:bg-indigo-100 text-gray-400 hover:text-indigo-600" title="Make admin"
                        >
                          <ChevronUp className="w-3 h-3" />
                        </button>
                      )}
                      <button
                        onClick={() => updateGroupParticipant(pId, 'remove')}
                        className="p-1 rounded hover:bg-red-100 text-gray-400 hover:text-red-600" title="Remove from group"
                      >
                        <UserMinus className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      ) : (
        <p className="text-xs text-gray-400 text-center py-4">Could not load participants</p>
      )}
    </>
  );
}
