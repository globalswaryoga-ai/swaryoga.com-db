// Swar Yoga WhatsApp CRM — content script, injected into web.whatsapp.com.
//
// Renders a sidebar with CRM lead info, quick replies, and AI Fix/Reply —
// all wired to our own backend via the background service worker (see
// background.js — network calls happen there, not here, to avoid CORS).
//
// Chat detection: WhatsApp Web's DOM is an unofficial surface that changes
// between versions, so detection here is best-effort with graceful
// degradation — if auto-detect fails, there's always a manual phone-number
// input so the sidebar stays usable.

(function () {
  const sendMessage = (msg) => new Promise((resolve) => chrome.runtime.sendMessage(msg, resolve));

  let state = { loggedIn: false, allowed: false, currentPhone: '', quickReplies: [], templates: [], lead: null };

  function el(tag, cls, html) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html !== undefined) e.innerHTML = html;
    return e;
  }

  // ── Find WhatsApp's own message compose box ──────────────────────────────
  function findComposeBox() {
    // Several selector strategies, tried in order — WA Web's DOM attributes
    // for the compose box have shifted across versions; footer contenteditable
    // is the most stable anchor.
    const candidates = [
      'footer div[contenteditable="true"][data-tab]',
      'div[data-testid="conversation-compose-box-input"]',
      'footer div[contenteditable="true"]',
    ];
    for (const sel of candidates) {
      const found = document.querySelector(sel);
      if (found) return found;
    }
    return null;
  }

  // Reliable way to programmatically set text into WA's contenteditable
  // compose box so React's own state (not just the DOM) picks it up.
  function setComposeText(text) {
    const box = findComposeBox();
    if (!box) return false;
    box.focus();
    document.execCommand('selectAll', false, undefined);
    document.execCommand('insertText', false, text);
    return true;
  }

  function getComposeText() {
    const box = findComposeBox();
    return box ? box.innerText || '' : '';
  }

  // ── Detect the currently open chat's phone number ─────────────────────────
  function looksLikePhone(text) {
    const digits = (text || '').replace(/\D/g, '');
    return digits.length >= 10 && digits.length <= 15;
  }

  function detectPhoneFromHeader() {
    const headerSelectors = [
      'header span[dir="auto"][title]',
      'header ._21S-L span',
      'header span.x1lliihq',
    ];
    for (const sel of headerSelectors) {
      const nodes = document.querySelectorAll(sel);
      for (const n of nodes) {
        const text = (n.getAttribute('title') || n.textContent || '').trim();
        if (looksLikePhone(text)) return text.replace(/\D/g, '');
      }
    }
    return '';
  }

  function detectLastInboundMessage() {
    const inbound = document.querySelectorAll('.message-in, div[data-testid="msg-container"].message-in');
    if (!inbound.length) return '';
    const last = inbound[inbound.length - 1];
    const textNode = last.querySelector('span.selectable-text, span[dir="ltr"], span[dir="rtl"]');
    return textNode ? textNode.textContent || '' : '';
  }

  // ── Sidebar rendering ──────────────────────────────────────────────────
  let sidebarEl = null;
  let collapsed = false;

  function render() {
    if (!sidebarEl) return;
    const body = sidebarEl.querySelector('.sy-body');
    body.innerHTML = '';

    if (!state.loggedIn) {
      body.appendChild(el('div', 'sy-locked', 'Not logged in.<br>Click the extension icon in your toolbar to sign in.'));
      return;
    }
    if (!state.allowed) {
      body.appendChild(el('div', 'sy-locked', 'Your admin hasn\'t approved extension access for your account yet. Ask them to enable it in QR WhatsApp → Settings.'));
      return;
    }

    // ── Lead card ──
    const leadSection = el('div', 'sy-section');
    leadSection.appendChild(el('div', 'sy-section-title', 'Contact'));

    const phoneInput = el('input');
    phoneInput.type = 'text';
    phoneInput.placeholder = 'Phone number (auto-detect or type manually)';
    phoneInput.value = state.currentPhone || '';
    phoneInput.addEventListener('change', () => {
      state.currentPhone = phoneInput.value.replace(/\D/g, '');
      loadLead();
    });
    leadSection.appendChild(phoneInput);

    if (state.lead === undefined) {
      leadSection.appendChild(el('div', 'sy-empty', 'Loading…'));
    } else if (!state.lead || !state.lead.found) {
      leadSection.appendChild(el('div', 'sy-empty', state.currentPhone ? 'No CRM lead found for this number.' : 'Open a chat, or type a number above.'));
    } else {
      const card = el('div', 'sy-lead-card');
      card.appendChild(el('div', 'sy-lead-name', state.lead.name || 'Unknown'));
      card.appendChild(el('div', 'sy-lead-meta', `#${state.lead.leadNumber || ''} · ${state.lead.email || 'no email'}`));
      if (state.lead.status) card.appendChild(el('span', 'sy-badge', state.lead.status));
      if (state.lead.notes) {
        const notes = el('div', '', state.lead.notes);
        notes.style.marginTop = '6px';
        notes.style.color = '#6b7280';
        card.appendChild(notes);
      }
      leadSection.appendChild(card);
    }
    body.appendChild(leadSection);

    // ── AI toolbar ──
    const aiSection = el('div', 'sy-section');
    aiSection.appendChild(el('div', 'sy-section-title', 'AI'));
    const aiRow = el('div', 'sy-btn-row');

    const fixBtn = el('button', 'sy-btn', '✏️ Fix spelling');
    fixBtn.addEventListener('click', async () => {
      const text = getComposeText();
      if (!text.trim()) return;
      fixBtn.textContent = 'Fixing…';
      const res = await sendMessage({ type: 'AI_FIX', text });
      fixBtn.textContent = '✏️ Fix spelling';
      if (res.ok && res.data?.success && res.data.result) {
        setComposeText(res.data.result);
      }
    });
    aiRow.appendChild(fixBtn);

    const replyBtn = el('button', 'sy-btn sy-primary', '✨ AI reply');
    replyBtn.addEventListener('click', async () => {
      const context = detectLastInboundMessage();
      replyBtn.textContent = 'Thinking…';
      const res = await sendMessage({ type: 'AI_REPLY', context });
      replyBtn.textContent = '✨ AI reply';
      if (res.ok && res.data?.success && res.data.result) {
        setComposeText(res.data.result);
      }
    });
    aiRow.appendChild(replyBtn);

    aiSection.appendChild(aiRow);
    body.appendChild(aiSection);

    // ── Quick replies ──
    const qrSection = el('div', 'sy-section');
    qrSection.appendChild(el('div', 'sy-section-title', 'Quick Replies'));
    if (!state.quickReplies.length) {
      qrSection.appendChild(el('div', 'sy-empty', 'No quick replies saved yet — add some in the CRM.'));
    } else {
      for (const qr of state.quickReplies) {
        const item = el('div', 'sy-quick-reply');
        item.appendChild(el('div', 'sy-quick-reply-title', qr.title));
        item.appendChild(el('div', 'sy-quick-reply-text', qr.content));
        item.addEventListener('click', () => setComposeText(qr.content));
        qrSection.appendChild(item);
      }
    }
    body.appendChild(qrSection);

    // ── Templates ── (fuller library: headers/images/buttons, from QR + Meta templates)
    const tplSection = el('div', 'sy-section');
    tplSection.appendChild(el('div', 'sy-section-title', 'Templates'));
    if (!state.templates.length) {
      tplSection.appendChild(el('div', 'sy-empty', 'No templates saved yet — create some in the CRM.'));
    } else {
      for (const tpl of state.templates) {
        const item = el('div', 'sy-quick-reply');
        const titleRow = el('div', 'sy-quick-reply-title', `${tpl.name} `);
        const badge = el('span', 'sy-badge', tpl.provider === 'qr' ? 'QR' : 'Meta');
        badge.style.marginLeft = '4px';
        badge.style.fontSize = '9px';
        titleRow.appendChild(badge);
        item.appendChild(titleRow);
        item.appendChild(el('div', 'sy-quick-reply-text', tpl.text));
        if (tpl.imageUrl) {
          const imgNote = el('div', 'sy-empty', '🖼️ Has an image header — inserts text only; attach the image manually in WhatsApp.');
          imgNote.style.marginTop = '3px';
          item.appendChild(imgNote);
        }
        item.addEventListener('click', () => setComposeText(tpl.text));
        tplSection.appendChild(item);
      }
    }
    body.appendChild(tplSection);
  }

  function buildSidebar() {
    sidebarEl = el('div');
    sidebarEl.id = 'swaryoga-crm-sidebar';

    const toggle = el('div', '', '☰');
    toggle.id = 'swaryoga-crm-toggle';
    toggle.addEventListener('click', () => {
      collapsed = !collapsed;
      sidebarEl.classList.toggle('swaryoga-collapsed', collapsed);
    });
    sidebarEl.appendChild(toggle);

    const header = el('div', 'sy-header');
    header.appendChild(el('span', '', 'Swar Yoga CRM'));
    sidebarEl.appendChild(header);

    const body = el('div', 'sy-body');
    sidebarEl.appendChild(body);

    document.body.appendChild(sidebarEl);
  }

  async function loadLead() {
    if (!state.currentPhone) {
      state.lead = null;
      render();
      return;
    }
    state.lead = undefined;
    render();
    const res = await sendMessage({ type: 'GET_LEAD', phone: state.currentPhone });
    state.lead = res.ok ? res.data : null;
    render();
  }

  async function loadQuickReplies() {
    const res = await sendMessage({ type: 'GET_QUICK_REPLIES' });
    if (res.ok && res.data?.success) {
      state.quickReplies = res.data.replies || [];
      render();
    }
  }

  async function loadTemplates() {
    const res = await sendMessage({ type: 'GET_TEMPLATES' });
    if (res.ok && res.data?.success) {
      state.templates = res.data.templates || [];
      render();
    }
  }

  async function refreshAuthState() {
    const s = await sendMessage({ type: 'GET_STATE' });
    state.loggedIn = !!s.loggedIn;
    state.allowed = !!s.allowed;
    render();
    if (state.loggedIn && state.allowed) {
      loadQuickReplies();
      loadTemplates();
    }
  }

  // Poll for the open chat changing — a MutationObserver on the header is
  // more efficient, but WA Web's header gets torn down/rebuilt on chat
  // switch often enough that a light interval is more reliable in practice.
  function watchOpenChat() {
    let lastPhone = '';
    setInterval(() => {
      const detected = detectPhoneFromHeader();
      if (detected && detected !== lastPhone) {
        lastPhone = detected;
        state.currentPhone = detected;
        loadLead();
      }
    }, 1500);
  }

  function init() {
    buildSidebar();
    render();
    refreshAuthState();
    watchOpenChat();
    // Re-check login/approval state periodically in case the user logs in
    // via the popup while this tab is already open.
    setInterval(refreshAuthState, 15000);
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(init, 1000);
  } else {
    window.addEventListener('load', () => setTimeout(init, 1000));
  }
})();
