'use client';

import React from 'react';
import { QR_MESSAGE_STATUS } from '@/lib/qrMessageStatus';

/** Message delivery ticks using the canonical persisted QR status scale. */
export function MessageTicks({ status }: { status?: number }) {
  if (status === undefined || status === null) return null;
  if (status === QR_MESSAGE_STATUS.FAILED) return <span className="inline-block ml-1 text-red-500" title="Failed">!</span>;
  if (status === QR_MESSAGE_STATUS.PENDING) return <span className="inline-block ml-1 text-gray-400" title="Sending">◷</span>;
  if (status === QR_MESSAGE_STATUS.SENT) return <span className="inline-block ml-1" title="Sent"><svg width="14" height="10" viewBox="0 0 16 11" fill="none"><path d="M1 5.5L5.5 10L14.5 1" stroke="#667781" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg></span>;
  if (status === QR_MESSAGE_STATUS.DELIVERED) return <span className="inline-block ml-1" title="Delivered"><svg width="18" height="10" viewBox="0 0 21 11" fill="none"><path d="M1 5.5L5.5 10L14.5 1" stroke="#667781" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/><path d="M6 5.5L10.5 10L19.5 1" stroke="#667781" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg></span>;
  return <span className="inline-block ml-1" title="Read"><svg width="18" height="10" viewBox="0 0 21 11" fill="none"><path d="M1 5.5L5.5 10L14.5 1" stroke="#53bdeb" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/><path d="M6 5.5L10.5 10L19.5 1" stroke="#53bdeb" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg></span>;
}
