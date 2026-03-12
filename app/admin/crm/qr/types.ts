/**
 * Types and interfaces for QR WhatsApp page
 */

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'qr';

export type BridgeStatus = {
  connected: boolean;
  status: ConnectionStatus;
  phone?: { id: string; name: string } | null;
  qrAvailable?: boolean;
  hasQr?: boolean;
  retryCount?: number;
  uptime?: number;
  sessionReady?: boolean;
  hasOwnBridge?: boolean;
};

export type QRResponse = {
  connected: boolean;
  qr: string | null;
  qrString?: string;
  message?: string;
};

export type FunnelStage = { key: string; label: string; color: string };
export type LabelPreset = { key: string; label: string; color: string };

export type ChatItem = {
  id: string;
  name: string;
  isGroup: boolean;
  isLid?: boolean;
  resolvedPhone?: string;
  unreadCount: number;
  lastMessageTime: string | null;
  lastMessage?: string;
  funnelStage?: string;
  labels?: string[];
  leadStatus?: string; // CRM lead status (new_lead, contacted, enrolled, etc.)
};

export type MessageItem = {
  id: string;
  from: string;
  fromMe: boolean;
  text: string;
  type: string;
  timestamp: number;
  status: number;
  participant?: string;
  pushName?: string;
  hasMedia?: boolean;
  mediaUrl?: string | null;
  mediaMimetype?: string | null;
  mediaFileName?: string | null;
  quoted?: { id: string; participant?: string; text: string } | null;
  reactions?: Record<string, string>; // jid → emoji
  quotedId?: string;
};

export type ChatFilter = 'all' | 'unread' | 'read' | 'groups';

export type GroupParticipant = { id: string; lid?: string; admin: 'admin' | 'superadmin' | null };
export type GroupInfo = {
  id: string; subject: string; subjectOwner?: string;
  desc: string; owner?: string; creation?: number;
  size: number; participants: GroupParticipant[];
  announce?: boolean; restrict?: boolean;
};
