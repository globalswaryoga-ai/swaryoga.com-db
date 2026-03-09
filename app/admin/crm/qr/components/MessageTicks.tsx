'use client';

import React from 'react';

/** Message delivery tick marks (Baileys status codes) */
export function MessageTicks({ status }: { status?: number }) {
  if (status === undefined || status === null) return null;
  // 0=error, 1=pending, 2=server_ack (sent), 3=delivery_ack, 4=read, 5=played
  if (status <= 1) return <span className="inline-block ml-1" title="Sending"><svg width="14" height="10" viewBox="0 0 16 11" fill="none"><path d="M1 5.5L5.5 10L14.5 1" stroke="#999" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg></span>;
  if (status === 2) return <span className="inline-block ml-1" title="Sent"><svg width="14" height="10" viewBox="0 0 16 11" fill="none"><path d="M1 5.5L5.5 10L14.5 1" stroke="#667781" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg></span>;
  if (status === 3) return <span className="inline-block ml-1" title="Delivered"><svg width="18" height="10" viewBox="0 0 21 11" fill="none"><path d="M1 5.5L5.5 10L14.5 1" stroke="#667781" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/><path d="M6 5.5L10.5 10L19.5 1" stroke="#667781" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg></span>;
  // status >= 4 (read/played)
  return <span className="inline-block ml-1" title="Read"><svg width="18" height="10" viewBox="0 0 21 11" fill="none"><path d="M1 5.5L5.5 10L14.5 1" stroke="#53bdeb" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/><path d="M6 5.5L10.5 10L19.5 1" stroke="#53bdeb" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg></span>;
}
