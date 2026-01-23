'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { getSession } from '@/lib/sessionManager';
import { ExternalLink } from 'lucide-react';

type PostComment = {
  userId: string;
  text: string;
  createdAt: string;
};

type PostData = {
  id: string;
  communityId: string;
  userId: string;
  content: string;
  images: string[];
  likesCount: number;
  likedByMe: boolean;
  comments: PostComment[];
  createdAt: string;
};

export default function CommunityPostPage() {
  const params = useParams();
  const router = useRouter();
  const postId = useMemo(() => String((params as any)?.postId || ''), [params]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [post, setPost] = useState<PostData | null>(null);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});

  const getToken = () => getSession()?.token || localStorage.getItem('token') || '';

  // Get proxied URL for S3 images
  const getSignedImageUrl = async (imageUrl: string): Promise<string> => {
    if (imageUrl.startsWith('/api/s3/image') || imageUrl.startsWith('data:')) {
      return imageUrl;
    }
    if (signedUrls[imageUrl]) {
      return signedUrls[imageUrl];
    }
    
    let key = imageUrl;
    if (imageUrl.includes('amazonaws.com')) {
      try {
        const url = new URL(imageUrl);
        key = url.pathname.slice(1);
      } catch {}
    }
    
    // Use the proxy endpoint
    const proxyUrl = `/api/s3/image?key=${encodeURIComponent(key)}`;
    setSignedUrls(prev => ({ ...prev, [imageUrl]: proxyUrl }));
    return proxyUrl;
  };

  // WhatsApp formatting: *bold*, _italic_, ~strikethrough~
  const formatWhatsAppText = (text: string) => {
    if (!text) return '';
    let formatted = text
      .replace(/\*([^*]+)\*/g, '<strong>$1</strong>')
      .replace(/_([^_]+)_/g, '<em>$1</em>')
      .replace(/~([^~]+)~/g, '<del>$1</del>')
      .replace(/\n/g, '<br/>');
    return formatted;
  };

  // Get body content without header/footer
  const getPostBodyContent = (postData: PostData) => {
    let content = postData.content || '';
    const metadata = (postData as any).metadata;
    
    if (metadata?.originalBody) {
      return metadata.originalBody;
    }
    
    // Strip header and footer from content
    if (metadata?.originalHeader) {
      content = content.replace(new RegExp(`^\\*${escapeRegex(metadata.originalHeader)}\\*\\n?`, 'i'), '');
    }
    if (metadata?.originalFooter) {
      content = content.replace(new RegExp(`\\n?_${escapeRegex(metadata.originalFooter)}_$`, 'i'), '');
    }
    
    return content.trim();
  };

  const escapeRegex = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  const load = async () => {
    // Use public endpoint for published posts - no auth required
    const res = await fetch(`/api/community/post/public?postId=${encodeURIComponent(postId)}` as string, {
      cache: 'no-store',
    });

    const json = await res.json().catch(() => null);

    if (res.status === 401) {
      router.push('/signin');
      return;
    }

    if (res.status === 403) {
      router.push('/community');
      return;
    }

    if (res.status === 404) {
      router.push('/community');
      return;
    }

    if (!res.ok) {
      throw new Error(json?.error || 'Failed to load post');
    }

    setPost(json.data as PostData);
  };

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        setLoading(true);
        setError('');
        await load();
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    if (postId) run();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId]);

  // Fetch signed URLs for images when post loads
  useEffect(() => {
    if (post?.images && post.images.length > 0) {
      post.images.forEach(imageUrl => {
        if (!signedUrls[imageUrl] && !imageUrl.includes('X-Amz-Signature')) {
          getSignedImageUrl(imageUrl);
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [post]);

  const onToggleLike = async () => {
    if (!post) return;

    const token = getToken();
    if (!token) {
      router.push('/signin');
      return;
    }

    try {
      const res = await fetch('/api/community/post/like', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ postId: post.id }),
      });

      const json = await res.json().catch(() => null);

      if (res.status === 401) {
        router.push('/signin');
        return;
      }

      if (res.status === 403) {
        router.push('/community');
        return;
      }

      if (!res.ok) {
        setError(json?.error || 'Failed to like post');
        return;
      }

      setPost((prev) =>
        prev
          ? {
              ...prev,
              likesCount: Number(json?.data?.likesCount || 0),
              likedByMe: Boolean(json?.data?.likedByMe),
            }
          : prev
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to like post');
    }
  };

  const onAddComment = async () => {
    if (!post) return;

    const text = commentText.trim();
    if (!text) return;

    const token = getToken();
    if (!token) {
      router.push('/signin');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/community/post/comment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ postId: post.id, text }),
      });

      const json = await res.json().catch(() => null);

      if (res.status === 401) {
        router.push('/signin');
        return;
      }

      if (res.status === 403) {
        router.push('/community');
        return;
      }

      if (!res.ok) {
        throw new Error(json?.error || 'Failed to add comment');
      }

      setCommentText('');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Navigation />
      <main className="min-h-screen pt-20 bg-swar-bg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between gap-4">
            <h1 className="text-2xl font-extrabold text-swar-text">Post</h1>
            <button
              type="button"
              onClick={() => router.push('/community')}
              className="rounded-lg bg-swar-primary-light text-swar-text px-4 py-2 text-sm font-bold hover:bg-swar-primary-light"
            >
              Back
            </button>
          </div>

          {loading && <p className="mt-6 text-sm text-swar-text-secondary">Loading...</p>}

          {!loading && error && (
            <div className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-swar-primary">{error}</div>
          )}

          {!loading && !error && post && (
            <div className="mt-8 flex justify-center">
              <div className="w-full max-w-4xl space-y-6">
                {/* Main Post Card */}
                <div className="rounded-[3rem] border border-gray-100 bg-white shadow-2xl shadow-slate-200/50 overflow-hidden">
                  {/* 1. Header Section (Heading first in WhatsApp Style) */}
                  <div className="p-8 sm:p-12 pb-6">
                    {(post as any).metadata?.originalHeader ? (
                       <h2 className="text-4xl sm:text-5xl font-black text-emerald-700 leading-tight mb-4 tracking-tight">
                         {(post as any).metadata.originalHeader}
                       </h2>
                    ) : (
                      <h2 className="text-3xl font-black text-emerald-700 leading-tight mb-4 tracking-tight">
                        {post.content.split('\n')[0].replace(/^\*|\*$/g, '').substring(0, 120)}
                      </h2>
                    )}
                    
                    <p className="text-xs text-gray-400">
                      {post.createdAt ? new Date(post.createdAt).toLocaleDateString() : ''}
                    </p>
                  </div>

                  {/* 2. Image Section */}
                  {post.images && post.images.length > 0 && (
                    <div className="border-y border-gray-50 bg-gray-50 flex flex-col gap-1 p-2">
                      {post.images.map((img, idx) => {
                        const imageUrl = signedUrls[img] || (img.includes('X-Amz-Signature') ? img : null);
                        return (
                          <div key={idx} className="overflow-hidden rounded-3xl mb-1 shadow-sm min-h-[200px] flex items-center justify-center bg-gradient-to-br from-emerald-50 to-teal-50">
                            {imageUrl ? (
                              <img 
                                src={imageUrl}
                                alt=""
                                className="w-full h-auto block max-h-[800px] object-contain mx-auto transition-transform duration-700 hover:scale-105"
                                onError={(e) => {
                                  const imgEl = e.target as HTMLImageElement;
                                  imgEl.style.display = 'none';
                                }}
                              />
                            ) : (
                              <div className="text-emerald-400 animate-pulse">Loading image...</div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* 3. Body Content Area */}
                  <div className="p-8 sm:p-12 space-y-10">
                    <div 
                      className="text-xl sm:text-2xl text-slate-700 leading-relaxed font-medium"
                      dangerouslySetInnerHTML={{ __html: formatWhatsAppText(getPostBodyContent(post)) }}
                    />

                    {/* Footer - By Mohan Sir */}
                    <div className="p-6 bg-emerald-50 rounded-2xl border-l-4 border-emerald-500">
                      <p className="text-lg text-emerald-700 italic font-medium">By - Mohan Sir</p>
                    </div>

                    {/* Blue Buttons (if any) */}
                    {(post as any).metadata?.buttons && Array.isArray((post as any).metadata.buttons) && (post as any).metadata.buttons.length > 0 && (
                      <div className="flex flex-wrap gap-4 pt-4">
                        {(post as any).metadata.buttons.map((btn: any, idx: number) => (
                          <button 
                            key={idx}
                            onClick={() => { if(btn.url) window.open(btn.url, '_blank') }}
                            className="flex-1 min-w-[250px] py-6 px-10 bg-[#0070f3] hover:bg-[#0051af] text-white rounded-full font-black text-sm sm:text-lg uppercase tracking-widest shadow-2xl shadow-blue-200 transition-all hover:-translate-y-2 active:scale-95 text-center flex items-center justify-center gap-3"
                          >
                            {btn.label || btn.text} <ExternalLink className="w-6 h-6" />
                          </button>
                        ))}
                      </div>
                    )}

                    {/* 4. Footer / Interactions */}
                    <div className="pt-10 border-t border-gray-50 flex flex-col sm:flex-row items-center justify-between gap-6">
                      <div className="flex gap-4 sm:gap-8 w-full sm:w-auto">
                        <button
                          type="button"
                          onClick={onToggleLike}
                          className={`flex-1 sm:flex-none group flex items-center justify-center gap-3 py-4 px-8 rounded-full text-base font-black transition-all ${
                            post.likedByMe
                              ? 'bg-red-50 text-red-600 shadow-inner'
                              : 'bg-slate-50 text-slate-400 hover:bg-slate-100 shadow-sm'
                          }`}
                        >
                          <span className={`text-2xl transition-transform group-hover:scale-125 ${post.likedByMe ? 'text-red-500' : ''}`}>
                             {post.likedByMe ? '❤️' : '🤍'}
                          </span>
                          <span>{post.likesCount} Likes</span>
                        </button>
                        
                        <div className="flex-1 sm:flex-none flex items-center justify-center gap-3 py-4 px-8 rounded-2xl bg-slate-50 text-slate-400 text-sm font-black shadow-sm">
                           <span className="text-xl">💬</span>
                           <span>{post.comments.length} Comments</span>
                        </div>
                      </div>

                      <button 
                        onClick={() => {
                          if (navigator.share) {
                            navigator.share({
                              title: 'Swar Yoga Post',
                              text: post.content.substring(0, 100),
                              url: window.location.href
                            });
                          }
                        }}
                        className="w-full sm:w-auto py-5 px-10 bg-emerald-600 text-white rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-emerald-200 hover:bg-emerald-700 transition-all hover:-translate-y-1 active:translate-y-0"
                      >
                        Share Post
                      </button>
                    </div>
                  </div>
                </div>

                {/* Comments Section */}
                <div className="rounded-[2rem] border border-gray-100 bg-white p-8 shadow-xl shadow-slate-200/50">
                  <h3 className="text-xl font-black text-gray-900 border-b pb-6 mb-6">Discussion</h3>

                  {post.comments.length === 0 && (
                    <div className="py-12 text-center">
                       <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No comments yet. Start the conversation!</p>
                    </div>
                  )}

                  {post.comments.length > 0 && (
                    <div className="space-y-4 mb-8">
                      {post.comments
                        .slice()
                        .reverse()
                        .map((c, idx) => (
                          <div key={`${c.createdAt}-${idx}`} className="p-6 rounded-2xl bg-slate-50 border border-slate-100 relative group">
                            <div className="flex items-center gap-3 mb-2">
                               <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs uppercase">
                                  {(c.userId || 'A').charAt(0)}
                               </div>
                               <p className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">
                                  {c.userId || 'Anonymous'} • {c.createdAt ? new Date(c.createdAt).toLocaleDateString() : ''}
                               </p>
                            </div>
                            <div className="text-sm text-slate-700 font-medium leading-relaxed whitespace-pre-wrap">{c.text}</div>
                          </div>
                        ))}
                    </div>
                  )}

                  <div className="mt-4 bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Join the conversation</label>
                    <textarea
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      rows={3}
                      className="w-full rounded-2xl border border-slate-100 px-6 py-4 text-sm font-medium focus:ring-2 focus:ring-emerald-500 outline-none transition-all shadow-inner"
                      placeholder="Write your thoughts..."
                    />
                    <div className="mt-4 flex justify-end">
                      <button
                        type="button"
                        disabled={submitting || !commentText.trim()}
                        onClick={onAddComment}
                        className="rounded-2xl bg-emerald-600 text-white px-8 py-4 text-xs font-black uppercase tracking-widest hover:bg-emerald-700 disabled:opacity-50 shadow-lg shadow-emerald-100 transition-all hover:scale-105"
                      >
                        {submitting ? 'Posting...' : 'Post Comment'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
