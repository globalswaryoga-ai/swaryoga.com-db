'use client';

import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot, User, ArrowRight } from 'lucide-react';
import Link from 'next/link';

/* ─── Knowledge base for auto-guide ─── */
interface QA {
  keywords: string[];
  answer: string;
  link?: { label: string; href: string };
}

const KNOWLEDGE: QA[] = [
  {
    keywords: ['price', 'pricing', 'cost', 'plan', 'plans', 'how much', 'subscription', 'free'],
    answer:
      'We offer 5 plans — Free (₹0), Basic (₹999/mo), Starter (₹1,999/mo), Growth (₹4,999/mo), and Professional (₹9,999/mo). All plans include every feature — you only choose your lead limit. Every plan starts with a 15-day free trial.',
    link: { label: 'View Pricing', href: '/crm-site/pricing' },
  },
  {
    keywords: ['feature', 'features', 'what can', 'whatsapp', 'ai voice', 'payment', 'community'],
    answer:
      'Every plan includes WhatsApp messaging, AI voice calls, payment collection (PayU + Cashfree), community management, chatbot flows, bulk campaigns, certificates, and more — 17+ features on every plan.',
    link: { label: 'Explore Features', href: '/crm-site/product' },
  },
  {
    keywords: ['signup', 'sign up', 'register', 'create account', 'get started', 'start'],
    answer:
      'You can create your CRM account in under 2 minutes. Just fill in your business details, pick a plan, and you\'re live — no credit card required for the free trial.',
    link: { label: 'Sign Up Now', href: '/crm-site/signup' },
  },
  {
    keywords: ['chatbot', 'chatbot flow', 'bot', 'automation', 'auto reply'],
    answer:
      'Chatbot flows let you automate WhatsApp conversations. Free plan includes 1 flow, Basic gets 5, Starter gets 10, and Growth/Professional have unlimited flows.',
    link: { label: 'See Plans', href: '/crm-site/pricing' },
  },
  {
    keywords: ['trial', 'free trial', 'demo', 'try'],
    answer:
      'Every plan comes with a 15-day free trial — no credit card needed. You get full access to all features during the trial period.',
    link: { label: 'Start Free Trial', href: '/crm-site/signup' },
  },
  {
    keywords: ['lead', 'leads', 'contact', 'contacts', 'crm'],
    answer:
      'Our CRM helps you manage leads with a powerful pipeline view, custom tags, WhatsApp integration, and bulk actions. Lead limits vary by plan — from 250 (Free) up to Unlimited (Professional).',
    link: { label: 'View Plans', href: '/crm-site/pricing' },
  },
  {
    keywords: ['storage', 'file', 'media', 'upload'],
    answer:
      'Storage is billed separately on a pay-per-use basis — ₹35/GB (or $0.45/GB) in 5MB increments. You only pay for what you use.',
  },
  {
    keywords: ['support', 'help', 'contact', 'bug', 'issue'],
    answer:
      'Need help? Reach out through our contact page or email us directly. We\'re here to support you every step of the way.',
    link: { label: 'Contact Support', href: '/crm-site/contact' },
  },
  {
    keywords: ['refund', 'cancel', 'cancellation', 'money back'],
    answer:
      'All plans are non-refundable. You can cancel anytime and your plan stays active until the end of the billing period. Check our refund policy for full details.',
    link: { label: 'Refund Policy', href: '/refunds-and-cancellations' },
  },
  {
    keywords: ['billing', 'cycle', 'annual', 'monthly', 'yearly', 'discount'],
    answer:
      'We offer 3-month (minimum, no discount), 6-month (10% off), and 1-year (20% off) billing cycles. All plans are non-refundable.',
    link: { label: 'Pricing Details', href: '/crm-site/pricing' },
  },
  {
    keywords: ['yoga', 'wellness', 'studio', 'gym', 'fitness'],
    answer:
      'Swar Yoga CRM is purpose-built for wellness businesses — yoga studios, gyms, coaching centres, retreat organizers, and wellness practitioners. Everything you need in one platform.',
    link: { label: 'Learn More', href: '/crm-site' },
  },
];

const QUICK_QUESTIONS = [
  'What plans do you offer?',
  'What features are included?',
  'How do I get started?',
  'Tell me about chatbot flows',
  'Is there a free trial?',
];

interface Message {
  role: 'bot' | 'user';
  text: string;
  link?: { label: string; href: string };
}

const GREETING: Message = {
  role: 'bot',
  text: 'Hi! 👋 I\'m your Swar Yoga CRM guide. Ask me anything about our features, pricing, or how to get started!',
};

function findAnswer(input: string): { answer: string; link?: { label: string; href: string } } {
  const lower = input.toLowerCase();

  for (const qa of KNOWLEDGE) {
    if (qa.keywords.some((kw) => lower.includes(kw))) {
      return { answer: qa.answer, link: qa.link };
    }
  }

  return {
    answer:
      'I\'m not sure about that, but our team can help! Visit the contact page or try asking about pricing, features, chatbots, or getting started.',
    link: { label: 'Contact Us', href: '/crm-site/contact' },
  };
}

export default function AiGuideChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([GREETING]);
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = (text?: string) => {
    const q = (text || input).trim();
    if (!q) return;

    const userMsg: Message = { role: 'user', text: q };
    const { answer, link } = findAnswer(q);
    const botMsg: Message = { role: 'bot', text: answer, link };

    setMessages((prev) => [...prev, userMsg, botMsg]);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(!open)}
        className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-all duration-300 ${
          open
            ? 'bg-gray-700 hover:bg-gray-800 rotate-0'
            : 'bg-swar-primary hover:bg-swar-primary-hover scale-100 hover:scale-110'
        }`}
        aria-label={open ? 'Close guide' : 'Open AI guide'}
      >
        {open ? (
          <X className="h-6 w-6 text-white" />
        ) : (
          <MessageCircle className="h-6 w-6 text-white" />
        )}
      </button>

      {/* Pulse ring when closed */}
      {!open && (
        <span className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full animate-ping bg-swar-primary/30 pointer-events-none" />
      )}

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-[360px] max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden animate-in slide-in-from-bottom-4">
          {/* Header */}
          <div className="bg-gradient-to-r from-swar-primary to-swar-primary-hover px-5 py-4 flex items-center gap-3">
            <div className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center">
              <Bot className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-white font-semibold text-sm">CRM Guide</h3>
              <p className="text-white/70 text-xs">Ask me anything</p>
            </div>
          </div>

          {/* Messages */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto px-4 py-4 space-y-3 max-h-[360px] min-h-[200px] bg-gray-50"
          >
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'bot' && (
                  <div className="w-7 h-7 rounded-full bg-swar-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Bot className="h-4 w-4 text-swar-primary" />
                  </div>
                )}
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-swar-primary text-white rounded-br-md'
                      : 'bg-white text-gray-700 border border-gray-100 shadow-sm rounded-bl-md'
                  }`}
                >
                  <p>{msg.text}</p>
                  {msg.link && (
                    <Link
                      href={msg.link.href}
                      onClick={() => setOpen(false)}
                      className="inline-flex items-center gap-1 mt-2 text-xs font-semibold text-swar-primary hover:underline"
                    >
                      {msg.link.label} <ArrowRight className="h-3 w-3" />
                    </Link>
                  )}
                </div>
                {msg.role === 'user' && (
                  <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <User className="h-4 w-4 text-gray-500" />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Quick questions (show when only greeting visible) */}
          {messages.length <= 1 && (
            <div className="px-4 pb-3 flex flex-wrap gap-2">
              {QUICK_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => handleSend(q)}
                  className="text-xs px-3 py-1.5 bg-swar-primary/10 text-swar-primary rounded-full hover:bg-swar-primary/20 transition font-medium"
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="border-t border-gray-100 px-4 py-3 bg-white">
            <div className="flex items-center gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about pricing, features…"
                className="flex-1 text-sm px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-swar-primary/30 focus:border-swar-primary outline-none transition"
              />
              <button
                onClick={() => handleSend()}
                disabled={!input.trim()}
                className="w-9 h-9 bg-swar-primary hover:bg-swar-primary-hover text-white rounded-xl flex items-center justify-center transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
