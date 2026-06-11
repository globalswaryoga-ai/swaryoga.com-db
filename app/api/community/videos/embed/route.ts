import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { getYouTubeAgent } from '@/lib/youtube-auth';

export const dynamic = 'force-dynamic';


/**
 * GET /api/community/videos/embed?v=VIDEO_DB_ID&token=JWT
 *
 * Secure video embed page:
 * 1. Resolves video CDN URL server-side via ytdl-core (no YouTube reference to client)
 * 2. Returns HTML5 <video> player with custom controls + dynamic watermark
 * 3. Falls back to our stream proxy if CDN URL fails on the client (IP mismatch)
 * 4. Falls back to YouTube iframe embed if ytdl-core itself fails on the server
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const videoDbId = searchParams.get('v');
    const token = searchParams.get('token');

    if (!videoDbId || !token) {
      return htmlRes(errorPage('Missing parameters'), 400);
    }

    const decoded = await verifyToken(token);
    if (!decoded) {
      return htmlRes(errorPage('Session expired. Please refresh.'), 401);
    }

    await connectDB();
    const { getCommunityVideo, CommunityMember } = await import('@/lib/db');
    const CommunityVideo = getCommunityVideo();
    const video = await CommunityVideo.findById(videoDbId);

    if (!video || !video.youtubeVideoId) {
      return htmlRes(errorPage('Video not found'), 404);
    }

    const d = decoded as any;
    // A community tempToken already had its membership verified when minted,
    // and is scoped to a communityId — trust it for that same community.
    const trustedTemp = d.tempToken === true && d.communityId && d.communityId === video.communityId;

    if (!d.isAdmin && !trustedTemp) {
      // Match the SAME way the token route does (by userId, mobile, OR email)
      const orConds: any[] = [
        { userId: decoded.userId },
        { mobile: decoded.userId },
      ];
      if (d.email) {
        orConds.push({ email: d.email });
        orConds.push({ userId: d.email });
      }
      const membership = await CommunityMember.findOne({
        communityId: video.communityId,
        $or: orConds,
        status: 'active',
      });
      if (!membership) return htmlRes(errorPage('Access denied'), 403);
    }

    await CommunityVideo.findByIdAndUpdate(videoDbId, { $inc: { views: 1 } });

    // --- Watermark text from user identity ---
    const uid = (decoded.userId || d.odId || '').toString();
    const uname = d.name || d.firstName || '';
    const wmRaw = uname ? `${uname} · ${uid.slice(-6)}` : `ID:${uid.slice(-8)}`;
    const wm = escJS(wmRaw);

    // Stream proxy fallback URL (server pipes video bytes, works even if CDN URL is IP-locked)
    const streamUrl = `/api/community/videos/stream?v=${videoDbId}&token=${encodeURIComponent(token)}`;

    // --- Try to resolve direct CDN URL (zero YouTube reference to client) ---
    let cdnUrl = '';
    let qualities: Array<{ label: string; url: string; height?: number }> = [];
    let ytdlError = '';

    try {
      const ytdl = (await import('@distube/ytdl-core')).default;
      const watchUrl = `https://www.youtube.com/watch?v=${video.youtubeVideoId}`;
      let info;

      // Use the invited account's session cookies (swarsakshi9@gmail.com) so
      // ytdl can fetch PRIVATE videos. Falls back to anonymous for public videos.
      const agent = await getYouTubeAgent();

      try {
        info = agent
          ? await ytdl.getInfo(watchUrl, { agent })
          : await ytdl.getInfo(watchUrl);
      } catch (firstError: any) {
        const errMsg = (firstError as Error).message || '';
        const isPrivateError =
          errMsg.includes('Private video') ||
          errMsg.includes('private') ||
          errMsg.includes('unavailable') ||
          errMsg.includes('Sign in') ||
          errMsg.includes('login') ||
          errMsg.includes('unauthorized') ||
          errMsg.includes('restricted');

        if (isPrivateError && !agent) {
          // Private video but no cookies configured
          console.error('[embed] Private video but YOUTUBE_COOKIES not set');
          return htmlRes(
            privateVideoErrorPage(
              'This private video needs the invited YouTube account session. Admin must add YOUTUBE_COOKIES (cookies from swarsakshi9@gmail.com) to enable playback.'
            ),
            403
          );
        }
        if (isPrivateError && agent) {
          // We had cookies but still blocked — likely expired or wrong account
          console.error('[embed] Cookie agent failed on private video:', errMsg);
          return htmlRes(
            privateVideoErrorPage(
              'Cannot access this private video. The saved YouTube session may have expired — admin needs to refresh YOUTUBE_COOKIES (re-export from swarsakshi9@gmail.com). Also confirm this account was invited to the video.'
            ),
            403
          );
        }
        throw firstError;
      }

      // Collect video formats at different qualities
      const qualityMap = new Map<number, { label: string; url: string; height: number }>();

      for (const fmt of info.formats) {
        if (!fmt.hasVideo || !fmt.hasAudio) continue;
        const height = fmt.height || 0;

        if (height && !qualityMap.has(height)) {
          const label = height >= 1080 ? '1080p' : height >= 720 ? '720p' : height >= 480 ? '480p' : height >= 360 ? '360p' : `${height}p`;
          qualityMap.set(height, { label, url: fmt.url, height });
        }
      }

      // Sort by height descending and create quality options
      const sortedQualities = Array.from(qualityMap.values())
        .sort((a, b) => b.height - a.height)
        .slice(0, 5); // Limit to top 5 qualities

      if (sortedQualities.length > 0) {
        qualities = sortedQualities;
        cdnUrl = sortedQualities[0].url; // Default to highest
      }
    } catch (e) {
      const errMsg = (e as Error).message || '';
      ytdlError = errMsg;
      console.warn('[embed] ytdl resolve failed:', errMsg);

      // Generic error fallback
      return htmlRes(errorPage('Failed to load video. Please try again.'), 500);
    }

    if (cdnUrl) {
      return htmlRes(nativePlayerHtml(escJS(cdnUrl), wm, escJS(streamUrl), qualities), 200);
    }

    // Fallback: YouTube iframe embed (if ytdl-core failed on server)
    // Note: This will also fail for private videos
    const ytEmbed = `https://www.youtube-nocookie.com/embed/${video.youtubeVideoId}?autoplay=1&modestbranding=1&rel=0&showinfo=0&iv_load_policy=3&cc_load_policy=0&fs=0&playsinline=1&controls=1`;
    return htmlRes(iframeFallbackHtml(ytEmbed, wm), 200);
  } catch (error: any) {
    console.error('Video embed error:', error);
    return htmlRes(errorPage('Failed to load video'), 500);
  }
}

// ── Response helper ─────────────────────────────────────
function htmlRes(html: string, status: number) {
  return new NextResponse(html, {
    status,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store, no-cache, must-revalidate, private',
      'Pragma': 'no-cache',
      'Expires': '0',
      'X-Frame-Options': 'SAMEORIGIN',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
    },
  });
}

/** Escape a string for safe embedding inside a JS single-quoted string literal */
function escJS(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/</g, '\\x3c');
}

// ══════════════════════════════════════════════════════════
// ── Native HTML5 Video Player (no YouTube reference)
// ══════════════════════════════════════════════════════════
interface Quality {
  label: string;
  url: string;
  height?: number;
}

function nativePlayerHtml(cdnSrc: string, watermark: string, streamFallback: string, qualities: Quality[] = []): string {
  const qualitiesJson = JSON.stringify(qualities.map(q => ({ label: q.label, url: escJS(q.url) })));
  return `<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>Swar Yoga</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:100%;height:100%;overflow:hidden;background:#000}
body{-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}
.wrap{position:relative;width:100%;height:100%;display:flex;align-items:center;justify-content:center}
video{width:100%;height:100%;object-fit:contain;background:#000;outline:none}

/* Watermark overlay */
.wm{position:absolute;inset:0;pointer-events:none;z-index:5;overflow:hidden}
.wm span{position:absolute;color:rgba(255,255,255,0.06);font:600 14px/1 system-ui,-apple-system,sans-serif;white-space:nowrap;transform:rotate(-25deg);letter-spacing:0.5px}

/* Custom controls */
.ctl{position:absolute;bottom:0;left:0;right:0;background:linear-gradient(transparent,rgba(0,0,0,0.8));padding:14px 12px 8px;opacity:0;transition:opacity 0.3s;z-index:10}
.wrap:hover .ctl,.wrap.show-ctl .ctl{opacity:1}

.seek{width:100%;height:4px;background:rgba(255,255,255,0.2);border-radius:2px;cursor:pointer;margin-bottom:8px;position:relative;transition:height 0.15s}
.seek:hover{height:7px}
.seek-buf{position:absolute;top:0;left:0;height:100%;background:rgba(255,255,255,0.12);border-radius:2px;pointer-events:none}
.seek-fill{height:100%;background:#10b981;border-radius:2px;position:relative;pointer-events:none}
.seek-fill::after{content:'';position:absolute;right:-6px;top:50%;transform:translateY(-50%);width:13px;height:13px;background:#10b981;border-radius:50%;opacity:0;transition:opacity 0.15s;box-shadow:0 0 4px rgba(0,0,0,0.4)}
.seek:hover .seek-fill::after{opacity:1}

.row{display:flex;align-items:center;justify-content:space-between}
.row-l,.row-r{display:flex;align-items:center;gap:5px}
.btn{background:none;border:none;color:#fff;cursor:pointer;padding:5px;border-radius:4px;display:flex;align-items:center;justify-content:center;transition:background 0.2s}
.btn:hover{background:rgba(255,255,255,0.12)}
.btn svg{width:22px;height:22px;fill:#fff}
.tm{color:rgba(255,255,255,0.85);font:12px/1 system-ui;padding:0 6px;white-space:nowrap}

/* Loading spinner */
.ld{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.4);z-index:20}
.sp{width:46px;height:46px;border:3px solid rgba(255,255,255,0.12);border-top-color:#10b981;border-radius:50%;animation:spin 0.7s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}

/* Error state */
.err{position:absolute;inset:0;display:none;flex-direction:column;align-items:center;justify-content:center;background:#111;z-index:20;color:#fff;font-family:system-ui}
.err h3{font-size:1rem;margin-bottom:8px}
.err p{opacity:0.5;font-size:0.85rem;margin-bottom:16px}
.err button{padding:8px 20px;background:#10b981;color:#fff;border:none;border-radius:8px;cursor:pointer;font:600 13px/1 system-ui}
.err button:hover{background:#059669}
.hid{display:none!important}

/* Quality selector */
.qm{position:relative}
.qb{position:relative}
.qd{position:absolute;bottom:100%;right:0;background:rgba(0,0,0,0.95);border:1px solid rgba(255,255,255,0.15);border-radius:6px;padding:4px;margin-bottom:8px;min-width:90px;display:none;z-index:11}
.qd.show{display:block}
.qd button{width:100%;text-align:right;padding:6px 12px;background:none;border:none;color:#fff;font:12px/1 system-ui;cursor:pointer;white-space:nowrap;transition:background 0.2s}
.qd button:hover,.qd button.sel{background:rgba(16,185,129,0.3)}
.qb::after{content:'';position:absolute;top:50%;right:2px;transform:translateY(-50%);width:4px;height:4px;background:#10b981;border-radius:50%}
</style>
</head>
<body>
<div class="wrap" id="W">
  <video id="V" preload="auto" playsinline disablepictureinpicture controlslist="nodownload noremoteplayback"></video>

  <div class="wm" id="wm"></div>

  <div class="ld" id="ld"><div class="sp"></div></div>

  <div class="err" id="er">
    <h3>Video Unavailable</h3>
    <p>Please try again in a moment</p>
    <button onclick="go()">Retry</button>
  </div>

  <div class="ctl" id="ct">
    <div class="seek" id="sk">
      <div class="seek-buf" id="sb"></div>
      <div class="seek-fill" id="sf"></div>
    </div>
    <div class="row">
      <div class="row-l">
        <button class="btn" id="pp" title="Play/Pause">
          <svg viewBox="0 0 24 24" id="pi"><path d="M8 5v14l11-7z"/></svg>
        </button>
        <button class="btn" id="mu" title="Mute">
          <svg viewBox="0 0 24 24" id="vi">
            <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
          </svg>
        </button>
        <span class="tm" id="tm">0:00 / 0:00</span>
      </div>
      <div class="row-r">
        <div class="qm" id="qm" style="display:none">
          <button class="btn qb" id="qb" title="Quality">
            <svg viewBox="0 0 24 24"><path fill="#fff" d="M19.43 12.98c.04-.32.07-.64.07-.98s-.03-.66-.07-.98l2.11-1.65c.19-.16.24-.41.12-.64l-2-3.46c-.12-.22-.37-.29-.59-.22l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65C14.46 2.18 14.25 2 14 2h-4c-.25 0-.46.18-.49.52l-.38 2.65c-.61.25-1.17.59-1.69.98l-2.49-1c-.23-.09-.47 0-.59.22L2.74 8.87c-.12.22-.07.47.12.64l2.11 1.65c-.04.32-.07.65-.07.98s.03.66.07.98l-2.11 1.65c-.19.16-.24.41-.12.64l2 3.46c.12.22.37.29.59.22l2.49-1c.52.4 1.08.73 1.69.98l.38 2.65c.03.34.24.52.49.52h4c.25 0 .46-.18.49-.52l.38-2.65c.61-.25 1.17-.59 1.69-.98l2.49 1c.23.09.47 0 .59-.22l2-3.46c.12-.22.07-.47-.12-.64l-2.11-1.65zM12 15.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z"/></svg>
          </button>
          <div class="qd" id="qd"></div>
        </div>
        <button class="btn" id="fs" title="Fullscreen">
          <svg viewBox="0 0 24 24"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>
        </button>
      </div>
    </div>
  </div>
</div>

<script>
// Block right-click & dev shortcuts
document.addEventListener('contextmenu', function(e){ e.preventDefault(); });
document.addEventListener('keydown', function(e){
  if((e.ctrlKey||e.metaKey)&&'usUS'.indexOf(e.key)!==-1) e.preventDefault();
  if(e.key==='F12') e.preventDefault();
});

var V  = document.getElementById('V');
var W  = document.getElementById('W');
var ld = document.getElementById('ld');
var er = document.getElementById('er');
var pp = document.getElementById('pp');
var pi = document.getElementById('pi');
var mu = document.getElementById('mu');
var vi = document.getElementById('vi');
var tm = document.getElementById('tm');
var sk = document.getElementById('sk');
var sf = document.getElementById('sf');
var sb = document.getElementById('sb');
var fs = document.getElementById('fs');
var wm = document.getElementById('wm');
var qm = document.getElementById('qm');
var qb = document.getElementById('qb');
var qd = document.getElementById('qd');

var SRC       = '${cdnSrc}';
var FALLBACK  = '${streamFallback}';
var WM        = '${watermark}';
var QUALITIES = ${qualitiesJson};
var usedFallback = false;
var currentTime = 0;

/* ── Watermark generator ── */
function mkWm(){
  wm.innerHTML='';
  var bw=W.clientWidth, bh=W.clientHeight;
  for(var y=-60; y<bh+100; y+=190){
    for(var x=-140; x<bw+200; x+=250){
      var s=document.createElement('span');
      s.textContent=WM;
      s.style.left=x+'px';
      s.style.top=y+'px';
      wm.appendChild(s);
    }
  }
}

/* ── Time formatter ── */
function ft(sec){
  if(!sec||isNaN(sec)) return '0:00';
  var m=Math.floor(sec/60), s=Math.floor(sec%60);
  return m+':'+(s<10?'0':'')+s;
}

/* ── Setup quality selector ── */
function setupQualities(){
  if(!QUALITIES || QUALITIES.length<2){
    qm.style.display='none';
    return;
  }
  qm.style.display='block';
  qd.innerHTML='';
  QUALITIES.forEach(function(q,i){
    var btn=document.createElement('button');
    btn.textContent=q.label;
    if(i===0) btn.classList.add('sel');
    btn.onclick=function(e){
      e.stopPropagation();
      switchQuality(q.url, btn);
    };
    qd.appendChild(btn);
  });
}

function switchQuality(url, btn){
  currentTime=V.currentTime;
  var wasPlaying=!V.paused;
  V.src=url;
  V.currentTime=currentTime;
  if(wasPlaying) V.play().catch(function(){});
  document.querySelectorAll('.qd button').forEach(function(b){ b.classList.remove('sel'); });
  btn.classList.add('sel');
  qd.classList.remove('show');
}

/* ── Load video ── */
function go(){
  er.style.display='none';
  ld.classList.remove('hid');
  usedFallback=false;
  setupQualities();
  V.src=SRC;
  V.load();
}

/* ── Events ── */
V.addEventListener('canplay', function(){
  ld.classList.add('hid');
  V.play().catch(function(){});
  mkWm();
});
V.addEventListener('waiting', function(){ ld.classList.remove('hid'); });
V.addEventListener('playing', function(){ ld.classList.add('hid'); });

V.addEventListener('error', function(){
  // If CDN URL failed, try stream proxy fallback
  if(!usedFallback && FALLBACK){
    usedFallback=true;
    V.src=FALLBACK;
    V.load();
    return;
  }
  ld.classList.add('hid');
  er.style.display='flex';
});

/* ── Play / Pause ── */
pp.onclick = function(){ V.paused ? V.play() : V.pause(); };
V.onclick  = function(){ V.paused ? V.play() : V.pause(); };

V.addEventListener('play', function(){
  pi.innerHTML='<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>';
});
V.addEventListener('pause', function(){
  pi.innerHTML='<path d="M8 5v14l11-7z"/>';
});

/* ── Mute ── */
mu.onclick = function(){
  V.muted=!V.muted;
  vi.innerHTML = V.muted
    ? '<path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51A8.96 8.96 0 0021 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71 0 1.56-.5 3-1.37 4.18zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06a9 9 0 003.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>'
    : '<path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>';
};

/* ── Progress / Seek ── */
V.addEventListener('timeupdate', function(){
  var pct = (V.currentTime / V.duration * 100) || 0;
  sf.style.width = pct+'%';
  tm.textContent = ft(V.currentTime)+' / '+ft(V.duration);
});
V.addEventListener('progress', function(){
  if(V.buffered.length>0){
    sb.style.width = (V.buffered.end(V.buffered.length-1)/V.duration*100)+'%';
  }
});
sk.onclick = function(e){
  var r=sk.getBoundingClientRect();
  V.currentTime = ((e.clientX-r.left)/r.width) * V.duration;
};

/* ── Quality selector ── */
qb.onclick = function(e){
  e.stopPropagation();
  qd.classList.toggle('show');
};
document.addEventListener('click', function(){
  qd.classList.remove('show');
});

/* ── Fullscreen ── */
fs.onclick = function(){
  if(document.fullscreenElement) document.exitFullscreen().catch(function(){});
  else W.requestFullscreen().catch(function(){});
};
document.addEventListener('fullscreenchange', mkWm);

/* ── Keyboard shortcuts ── */
document.addEventListener('keydown', function(e){
  switch(e.key){
    case ' ': case 'k': e.preventDefault(); V.paused?V.play():V.pause(); break;
    case 'ArrowLeft':  V.currentTime=Math.max(0,V.currentTime-10); break;
    case 'ArrowRight': V.currentTime=Math.min(V.duration||0,V.currentTime+10); break;
    case 'f': fs.onclick(); break;
    case 'm': mu.onclick(); break;
  }
});

/* ── Auto-hide controls after 3s ── */
var ht;
W.addEventListener('mousemove', function(){
  W.classList.add('show-ctl');
  clearTimeout(ht);
  ht=setTimeout(function(){ W.classList.remove('show-ctl'); }, 3000);
});

window.addEventListener('resize', mkWm);

// Start
go();
</script>
</body></html>`;
}

// ══════════════════════════════════════════════════════════
// ── YouTube iframe fallback (used when ytdl-core fails)
// ══════════════════════════════════════════════════════════
function iframeFallbackHtml(embedUrl: string, watermark: string): string {
  return `<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>Swar Yoga</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:100%;height:100%;overflow:hidden;background:#000}
body{-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}
.wrap{position:relative;width:100%;height:100%}
iframe{width:100%;height:100%;border:none}
.cv-tr{position:absolute;top:0;right:0;width:120px;height:50px;background:#000;z-index:10;pointer-events:none}
.cv-tl{position:absolute;top:0;left:0;right:120px;height:30px;background:#000;z-index:10;pointer-events:none}
.cv-br{position:absolute;bottom:0;right:0;width:220px;height:40px;background:#000;z-index:10;pointer-events:none}
.wm{position:absolute;inset:0;pointer-events:none;z-index:8;overflow:hidden}
.wm span{position:absolute;color:rgba(255,255,255,0.06);font:600 14px/1 system-ui,-apple-system,sans-serif;white-space:nowrap;transform:rotate(-25deg);letter-spacing:0.5px}
</style>
<script>
document.addEventListener('contextmenu', function(e){ e.preventDefault(); });
document.addEventListener('keydown', function(e){
  if((e.ctrlKey||e.metaKey)&&'usUS'.indexOf(e.key)!==-1) e.preventDefault();
  if(e.key==='F12') e.preventDefault();
});
</script>
</head>
<body>
<div class="wrap" id="W">
  <iframe
    src="${embedUrl}"
    allow="accelerometer;autoplay;encrypted-media;gyroscope"
    referrerpolicy="no-referrer"
    sandbox="allow-scripts allow-same-origin allow-presentation"
  ></iframe>
  <div class="cv-tr"></div>
  <div class="cv-tl"></div>
  <div class="cv-br"></div>
  <div class="wm" id="wm"></div>
</div>
<script>
var W=document.getElementById('W'), wm=document.getElementById('wm'), WM='${watermark}';
function mkWm(){
  wm.innerHTML='';
  var bw=W.clientWidth, bh=W.clientHeight;
  for(var y=-60; y<bh+100; y+=190){
    for(var x=-140; x<bw+200; x+=250){
      var s=document.createElement('span');
      s.textContent=WM;
      s.style.left=x+'px';
      s.style.top=y+'px';
      wm.appendChild(s);
    }
  }
}
mkWm();
window.addEventListener('resize', mkWm);
</script>
</body></html>`;
}

// ══════════════════════════════════════════════════════════
// ── Error page
// ══════════════════════════════════════════════════════════
function errorPage(msg: string): string {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
body{margin:0;height:100vh;display:flex;align-items:center;justify-content:center;background:#111;color:#fff;font-family:system-ui,-apple-system,sans-serif}
.m{text-align:center}
.m h2{font-size:1.1rem;margin-bottom:0.4rem}
.m p{opacity:0.6;font-size:0.85rem}
</style>
</head><body>
<div class="m">
  <h2>🔒 ${msg}</h2>
  <p>This video is for Swar Yoga community members only.</p>
</div>
</body></html>`;
}

// ══════════════════════════════════════════════════════════
// ── Private Video Error (needs OAuth setup)
// ══════════════════════════════════════════════════════════
function privateVideoErrorPage(message: string): string {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
body{margin:0;height:100vh;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg, #667eea 0%, #764ba2 100%);color:#fff;font-family:system-ui,-apple-system,sans-serif;padding:20px}
.container{max-width:500px;text-align:center;background:rgba(0,0,0,0.3);padding:40px;border-radius:12px;backdrop-filter:blur(10px)}
h1{font-size:2rem;margin-bottom:1rem;color:#fff}
.icon{font-size:3rem;margin-bottom:1rem}
p{opacity:0.9;margin:0.5rem 0;line-height:1.6}
.info{background:rgba(59,130,246,0.2);border-left:4px solid #3b82f6;padding:12px;border-radius:4px;margin-top:1.5rem;font-size:0.9rem}
</style>
</head><body>
<div class="container">
  <div class="icon">🔐</div>
  <h1>Private Video</h1>
  <p>${message}</p>
  <div class="info">
    <strong>Admin Action:</strong> Connect your YouTube account in Settings → Social Media Setup → YouTube OAuth to enable private video sharing.
  </div>
</div>
</body></html>`;
}
