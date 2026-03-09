/**
 * Tests for QR WhatsApp types
 * Validates type contracts and shape with runtime checks
 * @module app/admin/crm/qr/types
 */
import type {
  ConnectionStatus,
  BridgeStatus,
  QRResponse,
  FunnelStage,
  LabelPreset,
  ChatItem,
  MessageItem,
  ChatFilter,
  GroupParticipant,
  GroupInfo,
} from '@/app/admin/crm/qr/types';

describe('QR Types - runtime shape validation', () => {
  it('ConnectionStatus accepts valid values', () => {
    const values: ConnectionStatus[] = ['disconnected', 'connecting', 'connected'];
    expect(values).toHaveLength(3);
  });

  it('BridgeStatus has required fields', () => {
    const status: BridgeStatus = {
      connected: true,
      status: 'connected',
    };
    expect(status.connected).toBe(true);
    expect(status.status).toBe('connected');
  });

  it('BridgeStatus supports optional fields', () => {
    const status: BridgeStatus = {
      connected: true,
      status: 'connected',
      phone: { id: '919876543210', name: 'Test' },
      qrAvailable: false,
      retryCount: 0,
      uptime: 3600,
    };
    expect(status.phone?.name).toBe('Test');
    expect(status.uptime).toBe(3600);
  });

  it('QRResponse has required fields', () => {
    const resp: QRResponse = {
      connected: false,
      qr: 'data:image/png;base64,ABC',
    };
    expect(resp.qr).toBeTruthy();
  });

  it('FunnelStage has key, label, and color', () => {
    const stage: FunnelStage = {
      key: 'new_lead',
      label: 'New Lead',
      color: 'bg-indigo-50 text-indigo-700 border-indigo-300',
    };
    expect(stage.key).toBe('new_lead');
  });

  it('LabelPreset has key, label, and color', () => {
    const preset: LabelPreset = {
      key: 'vip',
      label: 'VIP',
      color: 'bg-amber-100 text-amber-800',
    };
    expect(preset.key).toBe('vip');
  });

  it('ChatItem has required fields', () => {
    const chat: ChatItem = {
      id: '919876543210@s.whatsapp.net',
      name: 'Test User',
      isGroup: false,
      unreadCount: 5,
      lastMessageTime: '2024-01-01T00:00:00Z',
    };
    expect(chat.id).toContain('@s.whatsapp.net');
    expect(chat.unreadCount).toBe(5);
  });

  it('ChatItem supports optional CRM fields', () => {
    const chat: ChatItem = {
      id: '919876543210@s.whatsapp.net',
      name: 'Test',
      isGroup: false,
      unreadCount: 0,
      lastMessageTime: null,
      resolvedPhone: '919876543210',
      funnelStage: 'new_lead',
      labels: ['vip', 'paid'],
    };
    expect(chat.funnelStage).toBe('new_lead');
    expect(chat.labels).toHaveLength(2);
  });

  it('MessageItem has required fields', () => {
    const msg: MessageItem = {
      id: 'msg_001',
      from: '919876543210@s.whatsapp.net',
      fromMe: false,
      text: 'Hello',
      type: 'text',
      timestamp: 1700000000,
      status: 2,
    };
    expect(msg.fromMe).toBe(false);
    expect(msg.type).toBe('text');
  });

  it('MessageItem supports media fields', () => {
    const msg: MessageItem = {
      id: 'msg_002',
      from: 'me',
      fromMe: true,
      text: '',
      type: 'image',
      timestamp: 1700000000,
      status: 3,
      hasMedia: true,
      mediaUrl: 'https://cdn.example.com/img.jpg',
      mediaMimetype: 'image/jpeg',
      mediaFileName: 'photo.jpg',
    };
    expect(msg.hasMedia).toBe(true);
    expect(msg.mediaMimetype).toContain('image/');
  });

  it('MessageItem supports reply/reaction fields', () => {
    const msg: MessageItem = {
      id: 'msg_003',
      from: 'me',
      fromMe: true,
      text: 'Reply text',
      type: 'text',
      timestamp: 1700000000,
      status: 2,
      quoted: { id: 'msg_001', text: 'Original message' },
      reactions: { 'user1@s.whatsapp.net': '👍', 'user2@s.whatsapp.net': '❤️' },
    };
    expect(msg.quoted?.text).toBe('Original message');
    expect(Object.keys(msg.reactions!)).toHaveLength(2);
  });

  it('ChatFilter accepts valid values', () => {
    const filters: ChatFilter[] = ['all', 'unread', 'read', 'groups'];
    expect(filters).toHaveLength(4);
  });

  it('GroupParticipant has required fields', () => {
    const admin: GroupParticipant = { id: '919876543210@s.whatsapp.net', admin: 'admin' };
    const owner: GroupParticipant = { id: '919876543211@s.whatsapp.net', admin: 'superadmin' };
    const member: GroupParticipant = { id: '919876543212@s.whatsapp.net', admin: null };
    
    expect(admin.admin).toBe('admin');
    expect(owner.admin).toBe('superadmin');
    expect(member.admin).toBeNull();
  });

  it('GroupInfo has required fields', () => {
    const info: GroupInfo = {
      id: '120363123456@g.us',
      subject: 'Test Group',
      desc: 'A test group',
      size: 3,
      participants: [
        { id: '919876543210@s.whatsapp.net', admin: 'superadmin' },
        { id: '919876543211@s.whatsapp.net', admin: 'admin' },
        { id: '919876543212@s.whatsapp.net', admin: null },
      ],
    };
    expect(info.subject).toBe('Test Group');
    expect(info.participants).toHaveLength(3);
    expect(info.size).toBe(3);
  });

  it('GroupInfo supports optional fields', () => {
    const info: GroupInfo = {
      id: '120363123456@g.us',
      subject: 'Test',
      desc: '',
      size: 2,
      participants: [],
      creation: 1700000000,
      announce: true,
      restrict: false,
      owner: '919876543210@s.whatsapp.net',
    };
    expect(info.creation).toBe(1700000000);
    expect(info.announce).toBe(true);
    expect(info.restrict).toBe(false);
  });
});
