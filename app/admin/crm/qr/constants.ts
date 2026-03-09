import type { FunnelStage, LabelPreset } from './types';

/**
 * QR WhatsApp page constants
 */

// Funnel color palette for new stages
export const FUNNEL_COLORS = [
  'bg-indigo-50 text-indigo-700 border-indigo-300',
  'bg-green-50 text-green-700 border-green-300',
  'bg-red-50 text-red-700 border-red-300',
  'bg-purple-50 text-purple-700 border-purple-300',
  'bg-yellow-50 text-yellow-700 border-yellow-300',
  'bg-orange-50 text-orange-700 border-orange-300',
  'bg-pink-50 text-pink-700 border-pink-300',
  'bg-teal-50 text-teal-700 border-teal-300',
  'bg-cyan-50 text-cyan-700 border-cyan-300',
  'bg-indigo-50 text-indigo-700 border-indigo-300',
];

// Label color palette for new labels
export const LABEL_COLORS = [
  'bg-amber-100 text-amber-800',
  'bg-cyan-100 text-cyan-800',
  'bg-emerald-100 text-emerald-800',
  'bg-orange-100 text-orange-800',
  'bg-indigo-100 text-indigo-800',
  'bg-pink-100 text-pink-800',
  'bg-violet-100 text-violet-800',
  'bg-rose-100 text-rose-800',
  'bg-lime-100 text-lime-800',
  'bg-sky-100 text-sky-800',
];

// Common emoji grid for quick picker
export const EMOJI_LIST = [
  '😀','😃','😄','😁','😆','😅','🤣','😂','🙂','😊',
  '😇','🥰','😍','🤩','😘','😗','😚','😙','🥲','😋',
  '🤔','🤫','🤭','😏','😌','😔','😪','🤤','😴','🤧',
  '🙏','👍','👎','👏','🤝','✌️','🤞','❤️','🔥','⭐',
  '💯','✅','❌','⚠️','📌','🎯','💪','🏆','🎉','🙌',
  '👋','🤙','📞','📱','💬','📝','📅','🕐','💰','🧘',
];

// Quick reply presets
export const QUICK_REPLIES = [
  'Thank you for your interest! 🙏',
  'Please share your details.',
  'Our classes start at 6 AM and 7 PM.',
  'Visit swaryoga.com for more info.',
  'I will get back to you shortly.',
  'Namaste! How can I help you? 🙏',
  'Would you like to join a free demo class?',
  'Payment received. Thank you! ✅',
];

// Template presets
export const TEMPLATES = [
  { name: '🙏 Welcome', text: 'Welcome to Swar Yoga! 🙏 We are glad to have you. Our classes are available online and offline. Visit swaryoga.com for details.' },
  { name: '📞 Follow Up', text: 'Hi! Just checking in. Would you like to know more about our yoga programs? Feel free to ask any questions.' },
  { name: '💰 Payment Reminder', text: 'Gentle reminder: Your payment is due. Please complete it at your earliest convenience. Thank you! 🙏' },
  { name: '📅 Class Schedule', text: 'Our class schedule:\n🌅 Morning: 6:00 AM - 7:00 AM\n🌙 Evening: 7:00 PM - 8:00 PM\n\nJoin us! 🧘' },
  { name: '🎉 Special Offer', text: 'Special offer! Enroll now and get 20% off on our annual yoga program. Limited time only! 🎯' },
];

export const DEFAULT_FUNNEL_STAGES: FunnelStage[] = [
  { key: 'all', label: 'All', color: 'bg-gray-100 text-gray-700 border-gray-300' },
  { key: 'new_lead', label: 'New Lead', color: 'bg-indigo-50 text-indigo-700 border-indigo-300' },
  { key: 'contacted', label: 'Contacted', color: 'bg-sky-50 text-sky-700 border-sky-300' },
  { key: 'interested', label: 'Interested', color: 'bg-cyan-50 text-cyan-700 border-cyan-300' },
  { key: 'demo_trial', label: 'Demo / Trial', color: 'bg-purple-50 text-purple-700 border-purple-300' },
  { key: 'negotiation', label: 'Negotiation', color: 'bg-amber-50 text-amber-700 border-amber-300' },
  { key: 'enrolled', label: 'Enrolled', color: 'bg-emerald-50 text-emerald-700 border-emerald-300' },
  { key: 'completed', label: 'Completed', color: 'bg-rose-50 text-rose-700 border-rose-300' },
  { key: 'inactive', label: 'Inactive', color: 'bg-gray-50 text-gray-600 border-gray-300' },
  { key: 'repeater', label: 'Repeater', color: 'bg-orange-50 text-orange-700 border-orange-300' },
  { key: 'old_sadhak', label: 'Old Sadhak', color: 'bg-teal-50 text-teal-700 border-teal-300' },
  { key: 'only_for_post', label: 'Only for Post', color: 'bg-indigo-50 text-indigo-700 border-indigo-300' },
];

export const DEFAULT_LABEL_PRESETS: LabelPreset[] = [
  { key: 'vip', label: 'VIP', color: 'bg-amber-100 text-amber-800' },
  { key: 'follow_up', label: 'Follow Up', color: 'bg-cyan-100 text-cyan-800' },
  { key: 'paid', label: 'Paid', color: 'bg-emerald-100 text-emerald-800' },
  { key: 'pending', label: 'Pending', color: 'bg-orange-100 text-orange-800' },
  { key: 'new', label: 'New', color: 'bg-indigo-100 text-indigo-800' },
];

export const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];
