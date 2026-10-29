'use client';

import React, { useState, useCallback } from 'react';

declare global {
  interface Window {
    SwarYoga?: {
      share: (title: string, message: string, url: string) => void;
      [key: string]: unknown;
    };
  }
}

interface ShareButtonProps {
  /** Page title for sharing */
  title?: string;
  /** Description / message text */
  description?: string;
  /** URL to share (defaults to current page URL) */
  url?: string;
  /** Button style variant */
  variant?: 'icon' | 'button' | 'fab';
  /** Custom class names */
  className?: string;
  /** Button size */
  size?: 'sm' | 'md' | 'lg';
  /** Custom label text (for 'button' variant) */
  label?: string;
}

/**
 * Universal Share Button
 * - Uses native Android SwarYoga.share() bridge when in the app
 * - Falls back to Web Share API on supported browsers
 * - Falls back to clipboard copy if neither available
 */
export default function ShareButton({
  title,
  description,
  url,
  variant = 'icon',
  className = '',
  size = 'md',
  label = 'Share',
}: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleShare = useCallback(async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    e?.preventDefault();
    const shareTitle = title || (typeof document !== 'undefined' ? document.title : '') || 'Swar Yoga';
    const shareDescription = description || '';
    const shareUrl = url || (typeof window !== 'undefined' ? window.location.href : 'https://swaryoga.com');

    // 1. Try native Android bridge (inside SwarYoga app)
    if (window.SwarYoga?.share) {
      try {
        window.SwarYoga.share(shareTitle, shareDescription, shareUrl);
        return;
      } catch (e) {
        console.warn('[ShareButton] Native share failed:', e);
      }
    }

    // 2. Try Web Share API (Android Chrome, Safari, etc.)
    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareDescription,
          url: shareUrl,
        });
        return;
      } catch (e) {
        // User cancelled or share failed - fall through to clipboard
        if ((e as DOMException)?.name === 'AbortError') return;
        console.warn('[ShareButton] Web Share failed:', e);
      }
    }

    // 3. Fallback: Copy to clipboard
    try {
      const shareText = shareDescription
        ? `${shareTitle}\n${shareDescription}\n${shareUrl}`
        : `${shareTitle}\n${shareUrl}`;
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      // Last resort: prompt
      window.prompt('Copy this link:', shareUrl);
    }
  }, [title, description, url]);

  const sizeClasses = {
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-12 h-12 text-lg',
  };

  // Share icon SVG
  const ShareIcon = () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-6 h-6' : 'w-5 h-5'}
    >
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  );

  const CheckIcon = () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-6 h-6' : 'w-5 h-5'}
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );

  if (variant === 'fab') {
    return (
      <button
        onClick={handleShare}
        title={copied ? 'Link copied!' : 'Share this page'}
        className={`
          fixed bottom-20 right-4 z-40
          w-14 h-14 rounded-full
          bg-green-600 text-white
          shadow-lg hover:bg-green-700 active:scale-95
          flex items-center justify-center
          transition-all duration-200
          ${className}
        `}
        aria-label="Share"
      >
        {copied ? <CheckIcon /> : <ShareIcon />}
      </button>
    );
  }

  if (variant === 'button') {
    return (
      <button
        onClick={handleShare}
        className={`
          inline-flex items-center gap-2 px-4 py-2 rounded-lg
          bg-green-600 text-white font-medium
          hover:bg-green-700 active:scale-95
          transition-all duration-200
          ${className}
        `}
      >
        {copied ? <CheckIcon /> : <ShareIcon />}
        <span>{copied ? 'Link Copied!' : label}</span>
      </button>
    );
  }

  // Default: icon variant
  return (
    <button
      onClick={handleShare}
      title={copied ? 'Link copied!' : 'Share this page'}
      className={`
        ${sizeClasses[size]}
        rounded-full
        flex items-center justify-center
        text-gray-600 hover:text-green-600 hover:bg-green-50
        active:scale-90
        transition-all duration-200
        ${copied ? 'text-green-600 bg-green-50' : ''}
        ${className}
      `}
      aria-label="Share"
    >
      {copied ? <CheckIcon /> : <ShareIcon />}
    </button>
  );
}
