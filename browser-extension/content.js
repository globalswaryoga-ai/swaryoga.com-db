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
  // Set once the extension is reloaded/updated while this tab was already
  // open — chrome.runtime.id disappears from the stale content script's
  // perspective, and any chrome.runtime.* call throws "Extension context
  // invalidated." Checked before every call so we fail with one clear
  // on-page banner + stop all polling, instead of throwing that same error
  // repeatedly forever (previously: an uncaught rejection every 1.2s).
  let extensionContextLost = false;
  const activeIntervals = [];

  function trackInterval(id) { activeIntervals.push(id); return id; }

  function markContextLost() {
    if (extensionContextLost) return;
    extensionContextLost = true;
    for (const id of activeIntervals) clearInterval(id);
    showContextLostBanner();
  }

  function showContextLostBanner() {
    if (document.getElementById('swaryoga-context-lost-banner')) return;
    const banner = document.createElement('div');
    banner.id = 'swaryoga-context-lost-banner';
    banner.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:999999;background:#b45309;color:#fff;padding:8px 14px;font:600 13px -apple-system,sans-serif;text-align:center;';
    banner.textContent = '🔄 Swar Yoga CRM extension was updated — refresh this page to keep using it.';
    const btn = document.createElement('button');
    btn.textContent = 'Refresh now';
    btn.style.cssText = 'margin-left:12px;padding:3px 10px;border-radius:5px;border:none;background:#fff;color:#b45309;font-weight:700;cursor:pointer;';
    btn.addEventListener('click', () => location.reload());
    banner.appendChild(btn);
    document.body.appendChild(banner);
  }

  // chrome.runtime.sendMessage always returns a Promise internally in MV3,
  // even when a callback is also passed — that internal promise can still
  // reject with "Extension context invalidated" and surface as an uncaught
  // rejection completely bypassing a try/catch wrapped only around the
  // synchronous call. Using plain async/await here instead routes the
  // rejection through this function's own try/catch correctly.
  const sendMessage = async (msg) => {
    if (extensionContextLost || !chrome.runtime?.id) {
      markContextLost();
      return { ok: false, error: 'Extension was updated — please refresh this page.' };
    }
    try {
      const response = await chrome.runtime.sendMessage(msg);
      return response;
    } catch (err) {
      markContextLost();
      return { ok: false, error: err?.message || String(err) };
    }
  };

  // Loaded from /api/extension/funnel-stages (built-in list + this user's
  // own custom stages) — see loadFunnelStages().
  let funnelStages = [];

  let state = {
    loggedIn: false, allowed: false, currentPhone: '', currentGroupName: '', currentChatKey: '',
    quickReplies: [], templates: [], lead: null,
    labelPresets: [], chatLabels: {}, // { chatKey: [labelKey, ...] }
  };

  // Collapsed by default — keeps the sidebar short until the user wants to browse.
  let sectionOpen = { quickReplies: false, templates: false, dashboards: false, labels: false };

  // Grows as you open chats — funnel-tab filtering only knows about chats
  // looked up this way (no bulk lookup for the whole chat list; that would
  // mean N API calls just to render filter tabs).
  let chatFunnelCache = {}; // { chatKey: status }

  // Multi-select for bulk scheduling, keyed by chatKey; value is 'phone' | 'group'.
  let selectedChats = new Map();

  // Which header-injected tab is active: null = All, {kind:'label', key} or {kind:'funnel', key}.
  let activeChatFilter = null;

  function el(tag, cls, html) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html !== undefined) e.innerHTML = html;
    return e;
  }

  /** Renders WhatsApp's own markdown (*bold*, _italic_, ~strike~) plus real
   *  line breaks as HTML, for previews only — click-to-insert always uses
   *  the raw markdown text via setComposeText, never this HTML. */
  function formatWA(text) {
    return String(text || '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/\*(.+?)\*/g, '<strong>$1</strong>')
      .replace(/_(.+?)_/g, '<em>$1</em>')
      .replace(/~(.+?)~/g, '<del>$1</del>')
      .replace(/\n/g, '<br>');
  }

  /** A collapsible section with a title, optional "+" add button, and a
   *  chevron that toggles sectionOpen[key] (persisted across re-renders). */
  function makeCollapsibleSection(key, title, opts = {}) {
    const section = el('div', 'sy-section');
    const header = el('div', 'sy-section-header');
    header.appendChild(el('span', 'sy-section-title', title));

    const controls = el('div', 'sy-section-controls');
    if (opts.onAdd) {
      const addBtn = el('span', 'sy-add-btn', '+');
      addBtn.title = opts.addTitle || 'Add new';
      addBtn.addEventListener('click', (e) => { e.stopPropagation(); opts.onAdd(); });
      controls.appendChild(addBtn);
    }
    controls.appendChild(el('span', 'sy-chevron', sectionOpen[key] ? '▾' : '▸'));
    header.appendChild(controls);

    const body = el('div');
    body.style.display = sectionOpen[key] ? 'block' : 'none';
    header.addEventListener('click', () => {
      sectionOpen[key] = !sectionOpen[key];
      render();
    });

    section.appendChild(header);
    section.appendChild(body);
    return { section, body };
  }

  /** Centered popup modal (Schedule Message / Schedule Groups). Click outside or × to close. */
  function openModal(title) {
    const overlay = el('div', 'sy-modal-overlay');
    const modal = el('div', 'sy-modal');
    const header = el('div', 'sy-modal-header');
    header.appendChild(el('span', '', title));
    const closeBtn = el('button', 'sy-modal-close', '×');
    closeBtn.addEventListener('click', () => overlay.remove());
    header.appendChild(closeBtn);
    modal.appendChild(header);
    const body = el('div', 'sy-modal-body');
    modal.appendChild(body);
    overlay.appendChild(modal);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
    document.body.appendChild(overlay);
    return { overlay, body };
  }

  /**
   * Runs a list of {type, value} targets through SCHEDULE_MESSAGE, each
   * staggered 3-7 min apart starting at sendAt. Group targets are gated by
   * the same server-enforced group-op limit as Add/Remove Member; phone
   * targets are exempt. Returns a summary object for the popup to show.
   * Shared by the Schedule Message / Schedule Groups / Schedule Selected modals.
   */
  async function scheduleTargets(targets, text, sendAt) {
    let cumulativeMs = 0;
    let scheduled = 0;
    const failed = [];
    for (let i = 0; i < targets.length; i++) {
      if (i > 0) cumulativeMs += humanGapMs();
      const t = targets[i];
      if (t.type === 'group') {
        const gate = await reserveGroupOp();
        if (!gate.allowed) { failed.push(`${t.value} (${gate.error})`); continue; }
      }
      const res = await sendMessage({
        type: 'SCHEDULE_MESSAGE',
        targetType: t.type,
        phone: t.type === 'phone' ? t.value : undefined,
        groupName: t.type === 'group' ? t.value : undefined,
        text,
        sendAt: sendAt + cumulativeMs,
      });
      if (res.ok) scheduled++; else failed.push(t.value);
    }
    return { scheduled, failed, lastAt: new Date(sendAt + cumulativeMs) };
  }

  // ── Message formatting toolbar (Bold/Italic/Strike + emoji), matching the
  // admin CRM's Schedule/Template forms — shared by every popup that has a
  // message textarea. ──
  const EMOJI_QUICK = ['😊', '🙏', '✅', '📌', '🔥', '🎉', '📞', '📍', '💰', '🎯', '⭐', '💪'];

  function wrapSelection(textarea, l, r) {
    const s = textarea.selectionStart ?? textarea.value.length;
    const e = textarea.selectionEnd ?? textarea.value.length;
    const val = textarea.value;
    textarea.value = `${val.slice(0, s)}${l}${val.slice(s, e)}${r}${val.slice(e)}`;
    const cursor = e + l.length + r.length;
    textarea.focus();
    textarea.setSelectionRange(cursor, cursor);
  }

  function insertAtCursor(textarea, text) {
    const s = textarea.selectionStart ?? textarea.value.length;
    const e = textarea.selectionEnd ?? textarea.value.length;
    const val = textarea.value;
    textarea.value = `${val.slice(0, s)}${text}${val.slice(e)}`;
    const cursor = s + text.length;
    textarea.focus();
    textarea.setSelectionRange(cursor, cursor);
  }

  function addFormatToolbar(container, textarea) {
    const bar = el('div', 'sy-fmt-toolbar');
    const boldBtn = el('button', 'sy-fmt-btn', 'B');
    boldBtn.type = 'button'; boldBtn.title = 'Bold (*text*)';
    boldBtn.addEventListener('click', () => wrapSelection(textarea, '*', '*'));
    const italicBtn = el('button', 'sy-fmt-btn sy-fmt-italic', 'I');
    italicBtn.type = 'button'; italicBtn.title = 'Italic (_text_)';
    italicBtn.addEventListener('click', () => wrapSelection(textarea, '_', '_'));
    const strikeBtn = el('button', 'sy-fmt-btn sy-fmt-strike', 'S');
    strikeBtn.type = 'button'; strikeBtn.title = 'Strikethrough (~text~)';
    strikeBtn.addEventListener('click', () => wrapSelection(textarea, '~', '~'));
    bar.appendChild(boldBtn);
    bar.appendChild(italicBtn);
    bar.appendChild(strikeBtn);
    container.appendChild(bar);

    const emojiRow = el('div', 'sy-emoji-row');
    for (const em of EMOJI_QUICK) {
      const btn = el('button', 'sy-emoji-btn', em);
      btn.type = 'button';
      btn.addEventListener('click', () => insertAtCursor(textarea, em));
      emojiRow.appendChild(btn);
    }
    container.appendChild(emojiRow);
    container.appendChild(el('div', 'sy-fmt-hint', 'Format: *bold* · _italic_ · ~strike~'));
  }

  // ── "Repeat on these days" block — same shape as the admin Group
  // Scheduler (start date + block size + a day checklist), shared by the
  // Schedule Message / Schedule Groups / Schedule Selected popups. Off by
  // default (single Send-at time); when turned on, one alarm gets queued
  // per checked day via scheduleTargets, same 3-7 min per-target pacing. ──
  function todayPlusDateStr(daysAhead) {
    const d = new Date();
    d.setDate(d.getDate() + daysAhead);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function genDateList(startStr, count) {
    const [y, m, d] = (startStr || todayPlusDateStr(1)).split('-').map(Number);
    const base = new Date(y, (m || 1) - 1, d || 1);
    const out = [];
    for (let i = 0; i < count; i++) {
      const dt = new Date(base);
      dt.setDate(base.getDate() + i);
      out.push(`${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`);
    }
    return out;
  }

  function fmtDayLabel(dateStr) {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, (m || 1) - 1, d || 1).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
  }

  function addRepeatBlock(mbody) {
    const toggleLabel = el('label', 'sy-repeat-toggle');
    const toggleCb = document.createElement('input');
    toggleCb.type = 'checkbox';
    toggleLabel.appendChild(toggleCb);
    toggleLabel.appendChild(document.createTextNode('🔁 Repeat on these days'));
    mbody.appendChild(toggleLabel);

    const panel = el('div');
    panel.style.display = 'none';

    panel.appendChild(el('div', 'sy-modal-label', 'Time (IST)'));
    const timeInput = document.createElement('input');
    timeInput.type = 'time';
    timeInput.value = '18:00';
    panel.appendChild(timeInput);

    const row = el('div', 'sy-repeat-row');
    const startWrap = el('div', 'sy-repeat-col');
    startWrap.appendChild(el('div', 'sy-modal-label', 'Start date'));
    const startInput = document.createElement('input');
    startInput.type = 'date';
    startInput.value = todayPlusDateStr(1);
    startWrap.appendChild(startInput);
    row.appendChild(startWrap);

    const blockWrap = el('div', 'sy-repeat-col-narrow');
    blockWrap.appendChild(el('div', 'sy-modal-label', 'Block size (days)'));
    const blockInput = document.createElement('input');
    blockInput.type = 'text';
    blockInput.value = '15';
    blockWrap.appendChild(blockInput);
    row.appendChild(blockWrap);
    panel.appendChild(row);

    const actionsRow = el('div', 'sy-repeat-actions');
    const selectAllBtn = el('button', 'sy-modal-btn', 'Select all');
    selectAllBtn.type = 'button';
    const clearAllBtn = el('button', 'sy-modal-btn', 'Clear all');
    clearAllBtn.type = 'button';
    actionsRow.appendChild(selectAllBtn);
    actionsRow.appendChild(clearAllBtn);
    panel.appendChild(actionsRow);

    const daysGrid = el('div', 'sy-repeat-days');
    panel.appendChild(daysGrid);
    panel.appendChild(el('div', 'sy-fmt-hint', 'One schedule per checked day, at the time above — this Chrome window needs to stay open for each to fire.'));

    function renderDays() {
      daysGrid.innerHTML = '';
      const count = Math.max(1, Math.min(60, parseInt(blockInput.value, 10) || 15));
      const dates = genDateList(startInput.value, count);
      for (const d of dates) {
        const chip = document.createElement('label');
        chip.className = 'sy-day-chip';
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.checked = true;
        cb.dataset.date = d;
        chip.appendChild(cb);
        chip.appendChild(document.createTextNode(fmtDayLabel(d)));
        daysGrid.appendChild(chip);
      }
    }
    renderDays();
    startInput.addEventListener('change', renderDays);
    blockInput.addEventListener('change', renderDays);
    selectAllBtn.addEventListener('click', () => daysGrid.querySelectorAll('input[type="checkbox"]').forEach((c) => { c.checked = true; }));
    clearAllBtn.addEventListener('click', () => daysGrid.querySelectorAll('input[type="checkbox"]').forEach((c) => { c.checked = false; }));
    toggleCb.addEventListener('change', () => { panel.style.display = toggleCb.checked ? 'block' : 'none'; });
    mbody.appendChild(panel);

    return {
      isEnabled: () => toggleCb.checked,
      getTimestamps: () => {
        const [hh, mm] = (timeInput.value || '18:00').split(':').map(Number);
        return Array.from(daysGrid.querySelectorAll('input[type="checkbox"]:checked'))
          .map((c) => c.dataset.date)
          .map((d) => {
            const [y, m, dd] = d.split('-').map(Number);
            return new Date(y, (m || 1) - 1, dd || 1, hh || 0, mm || 0, 0, 0).getTime();
          })
          .sort((a, b) => a - b);
      },
    };
  }

  /** Runs scheduleTargets once (single send) or once per repeat day (if repeat is enabled). */
  async function runScheduleWithRepeat(targets, text, repeat, singleSendAt) {
    if (repeat.isEnabled()) {
      const timestamps = repeat.getTimestamps();
      if (!timestamps.length) return { scheduled: 0, failed: ['No days selected'], days: 0 };
      let scheduled = 0;
      const failed = [];
      let lastAt = null;
      for (const ts of timestamps) {
        const r = await scheduleTargets(targets, text, ts);
        scheduled += r.scheduled;
        failed.push(...r.failed);
        lastAt = r.lastAt;
      }
      return { scheduled, failed, days: timestamps.length, lastAt };
    }
    const r = await scheduleTargets(targets, text, singleSendAt);
    return { ...r, days: 1 };
  }

  /** A <select> of saved templates ("Custom message" first) that fills `textarea` on change. */
  function addTemplatePicker(container, textarea) {
    container.appendChild(el('div', 'sy-modal-label', 'Template (optional)'));
    const select = document.createElement('select');
    const customOpt = document.createElement('option');
    customOpt.value = '';
    customOpt.textContent = '— Custom message —';
    select.appendChild(customOpt);
    for (const tpl of state.templates) {
      const opt = document.createElement('option');
      opt.value = tpl._id;
      opt.textContent = `${tpl.name} (${tpl.provider === 'qr' ? 'QR' : 'Meta'})`;
      select.appendChild(opt);
    }
    select.addEventListener('change', () => {
      const tpl = state.templates.find((t) => t._id === select.value);
      if (tpl) textarea.value = tpl.text;
    });
    container.appendChild(select);
    return select;
  }

  /**
   * Best-effort scrape of GROUP chats currently rendered in the left chat
   * list (WhatsApp Web virtualizes long lists, so this only sees what's
   * scrolled into view — scroll the chat list first to load more before
   * opening this if a group you need isn't showing up).
   */
  function scanVisibleGroupChats() {
    const rows = Array.from(document.querySelectorAll('div[role="listitem"], div[data-testid="cell-frame-container"]'));
    const names = new Set();
    for (const row of rows) {
      const titleEl = row.querySelector('span[dir="auto"][title]');
      if (!titleEl) continue;
      const name = (titleEl.getAttribute('title') || titleEl.textContent || '').trim();
      if (!name || looksLikePhone(name)) continue;
      const hasGroupIcon = !!row.querySelector('span[data-icon="default-group"], span[data-icon="community-default"], span[data-icon="group"]');
      const subtitle = row.querySelector('span.copyable-text, div._21S-L span, span[dir="ltr"]')?.textContent || '';
      const looksGroupish = hasGroupIcon || /:\s/.test(subtitle); // "SenderName: last message" pattern only shows for groups
      if (looksGroupish) names.add(name);
    }
    return Array.from(names);
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
    document.execCommand('delete', false, undefined);

    // WhatsApp Web's compose box runs on its own rich-text editor (Lexical),
    // not a plain contenteditable — document.execCommand('insertLineBreak')
    // is a legacy API that editor frequently ignores, which silently drops
    // every line break and flattens multi-paragraph templates into one
    // run-on line (confirmed: a template with correct blank lines in the DB
    // arrived on WhatsApp as a single paragraph). Real users get line breaks
    // by typing or by pasting, and WhatsApp's own paste handler correctly
    // turns \n in pasted plain text into real message line breaks — so we
    // simulate a paste instead of chaining execCommand calls.
    try {
      const dt = new DataTransfer();
      dt.setData('text/plain', text);
      box.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
      if ((box.innerText || '').trim()) return true;
    } catch (e) {
      // fall through to the legacy method below
    }

    // Fallback for environments where the simulated paste didn't take.
    const lines = text.split('\n');
    lines.forEach((line, i) => {
      if (i > 0) document.execCommand('insertLineBreak', false, undefined);
      if (line) document.execCommand('insertText', false, line);
    });
    return true;
  }

  function getComposeText() {
    const box = findComposeBox();
    return box ? box.innerText || '' : '';
  }

  function findSendButton() {
    const candidates = [
      'button[aria-label="Send"]',
      'span[data-icon="send"]',
      'span[data-icon="wds-ic-send-filled"]',
    ];
    for (const sel of candidates) {
      const found = document.querySelector(sel);
      if (found) return found.closest('button') || found;
    }
    return null;
  }

  /** Clicks WhatsApp's own Send button — used by AI/template/quick-reply
   *  insert-then-send flows (scheduling) that run with nobody at the
   *  keyboard. Manual use of Fix/AI-reply/templates never calls this —
   *  the user still reviews and presses Send themselves. */
  function sendCurrentMessage() {
    const btn = findSendButton();
    if (btn) { btn.click(); return true; }
    // Fallback: dispatch a real Enter keydown on the compose box, which
    // WhatsApp's own listener treats as "send" (Shift+Enter is the one
    // that's a newline — handled separately by setComposeText above).
    const box = findComposeBox();
    if (!box) return false;
    box.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true }));
    return true;
  }

  function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

  /** Poll for an element matching selector (optionally filtered by text) to appear, up to timeoutMs. */
  async function waitFor(selector, { text, timeoutMs = 6000, intervalMs = 200 } = {}) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const nodes = Array.from(document.querySelectorAll(selector));
      const match = text
        ? nodes.find((n) => (n.textContent || '').trim().toLowerCase().includes(text.toLowerCase()))
        : nodes[0];
      if (match) return match;
      await sleep(intervalMs);
    }
    return null;
  }

  /** Find a clickable element (button/role=button/li) whose visible text matches, case-insensitive substring. */
  async function waitForClickableText(text, { timeoutMs = 6000 } = {}) {
    return waitFor('button, div[role="button"], li, span[role="button"]', { text, timeoutMs });
  }

  /** Find the currently-focused/visible search input in whatever WA panel is open (new chat/group participant picker, etc). */
  function findVisibleSearchInput() {
    const candidates = [
      'div[contenteditable="true"][data-tab][aria-label]',
      'input[type="text"][aria-label]',
      'div[contenteditable="true"][role="textbox"]',
    ];
    for (const sel of candidates) {
      const nodes = Array.from(document.querySelectorAll(sel));
      const visible = nodes.find((n) => n.offsetParent !== null && n !== findComposeBox());
      if (visible) return visible;
    }
    return null;
  }

  function typeIntoSearch(box, text) {
    box.focus();
    document.execCommand('selectAll', false, undefined);
    document.execCommand('delete', false, undefined);
    document.execCommand('insertText', false, text);
    // WA's search is debounced — its own keyup/input listeners already fired
    // from execCommand's synthetic input event, so no extra dispatch needed.
  }

  /**
   * Search for a contact by phone/name in whatever picker panel is
   * currently open, and click the first matching result row.
   * Returns true if a result was clicked.
   */
  async function searchAndSelectContact(query) {
    const searchBox = findVisibleSearchInput();
    if (!searchBox) return false;
    typeIntoSearch(searchBox, query);
    await sleep(700); // let WA's own debounced search render results
    const resultRow = await waitFor('div[role="listitem"], div[data-testid="cell-frame-container"]', { timeoutMs: 3000 });
    if (!resultRow) return false;
    resultRow.click();
    return true;
  }

  /**
   * Reopen a chat (used for groups, which have no click-to-chat URL like 1:1
   * numbers do) by searching the main chat list on the left and clicking the
   * first match. Returns true if a matching chat was opened.
   */
  async function openChatByName(name) {
    const mainSearchBox =
      document.querySelector('[aria-label="Search input textbox"]') ||
      document.querySelector('div[contenteditable="true"][data-tab="3"]');
    if (!mainSearchBox) return false;
    typeIntoSearch(mainSearchBox, name);
    await sleep(700);
    const resultRow = await waitFor('div[role="listitem"], div[data-testid="cell-frame-container"]', { timeoutMs: 3000 });
    if (!resultRow) return false;
    resultRow.click();
    await sleep(500);
    // Clear the search so the chat list returns to normal.
    mainSearchBox.focus();
    document.execCommand('selectAll', false, undefined);
    document.execCommand('delete', false, undefined);
    return true;
  }

  // ── Detect the currently open chat's phone number ─────────────────────────
  function looksLikePhone(text) {
    const digits = (text || '').replace(/\D/g, '');
    return digits.length >= 10 && digits.length <= 15;
  }

  const HEADER_TITLE_SELECTORS = [
    'header span[dir="auto"][title]',
    'header ._21S-L span',
    'header span.x1lliihq',
  ];

  function readHeaderTitle() {
    for (const sel of HEADER_TITLE_SELECTORS) {
      const nodes = document.querySelectorAll(sel);
      for (const n of nodes) {
        const text = (n.getAttribute('title') || n.textContent || '').trim();
        if (text) return text;
      }
    }
    return '';
  }

  function detectPhoneFromHeader() {
    const text = readHeaderTitle();
    return looksLikePhone(text) ? text.replace(/\D/g, '') : '';
  }

  /** A group chat's header shows its name, not a phone number — used to
   *  target group scheduling, since groups have no "phone" to detect. */
  function detectGroupNameFromHeader() {
    const text = readHeaderTitle();
    if (!text || looksLikePhone(text)) return '';
    // Groups (vs. a saved 1:1 contact name) show a member-list subtitle
    // ("You, X, Y...") right under the header title — use that as the signal.
    const subtitle = document.querySelector('header span[title]')?.parentElement?.nextElementSibling?.textContent || '';
    const isGroupish = /,/.test(subtitle) || /you/i.test(subtitle);
    return isGroupish ? text : '';
  }

  function detectLastInboundMessage() {
    const inbound = document.querySelectorAll('.message-in, div[data-testid="msg-container"].message-in');
    if (!inbound.length) return '';
    const last = inbound[inbound.length - 1];
    const textNode = last.querySelector('span.selectable-text, span[dir="ltr"], span[dir="rtl"]');
    return textNode ? textNode.textContent || '' : '';
  }

  // ── WhatsApp feature automation ──────────────────────────────────────────
  // Everything below drives WhatsApp Web's own real UI (clicks + typed
  // input via the same execCommand technique as the compose box) rather than
  // WhatsApp's internal/undocumented JS modules — more verifiable and more
  // maintainable if a selector needs updating later. Each step reports
  // clearly if it couldn't find what it expected, instead of failing silently.

  /** 3-7 min random gap, matching the same human-paced safety window used
   *  server-side for QR group operations (lib/safeGroupMergeV2.ts) — bulk
   *  participant adds are exactly the pattern that gets accounts flagged. */
  function humanGapMs() {
    return Math.floor(Math.random() * (420000 - 180000) + 180000);
  }

  /**
   * Server-enforced cap for GROUP operations only (member add/remove, group
   * creation, group-targeted scheduled sends): 150/day, 15/hour, 5:00 AM -
   * 10:30 PM IST. Call once immediately before each individual group action
   * — never batch-reserve ahead of time. Returns {allowed, error}. 1:1
   * messages never call this — they're intentionally unrestricted.
   */
  async function reserveGroupOp() {
    const res = await sendMessage({ type: 'RESERVE_GROUP_OP' });
    if (!res.ok) return { allowed: false, error: res.data?.error || res.error || 'Rate-limit check failed' };
    return { allowed: !!res.data?.allowed, error: res.data?.error };
  }

  function startNewChat(phone) {
    const digits = phone.replace(/\D/g, '');
    if (!digits) return false;
    // WhatsApp Web's own documented click-to-chat URL — opens the chat
    // in-place if already logged in, far more reliable than simulating the
    // "New chat" button + search flow.
    location.href = `https://web.whatsapp.com/send?phone=${digits}`;
    return true;
  }

  async function openNewChatPanel() {
    const newChatBtn =
      document.querySelector('[aria-label="New chat"]') ||
      document.querySelector('span[data-icon="new-chat-outline"]')?.closest('button') ||
      document.querySelector('span[data-icon="chat"]')?.closest('button');
    if (!newChatBtn) return false;
    newChatBtn.click();
    return true;
  }

  /**
   * Creates a new group with the given name and participant phone numbers,
   * via WhatsApp's own "New chat → New group" flow.
   */
  async function createNewGroup(name, phones, onProgress) {
    onProgress?.('Opening new chat panel…');
    if (!(await openNewChatPanel())) return { ok: false, error: "Couldn't find the New Chat button." };
    await sleep(400);

    onProgress?.('Opening New Group…');
    const newGroupEntry = await waitForClickableText('New group', { timeoutMs: 4000 });
    if (!newGroupEntry) return { ok: false, error: "Couldn't find \"New group\" in the menu — WhatsApp Web's layout may differ on your version." };
    newGroupEntry.click();
    await sleep(600);

    const added = [];
    const failed = [];
    for (let i = 0; i < phones.length; i++) {
      if (i > 0) { onProgress?.(`Waiting before adding ${phones[i]}…`); await sleep(humanGapMs()); }
      const gate = await reserveGroupOp();
      if (!gate.allowed) { onProgress?.(`Stopped: ${gate.error}`); break; }
      onProgress?.(`Adding ${phones[i]} (${i + 1}/${phones.length})…`);
      const found = await searchAndSelectContact(phones[i]);
      if (found) added.push(phones[i]); else failed.push(phones[i]);
    }
    if (added.length === 0 && failed.length === 0) {
      return { ok: false, error: "Group-op limit reached before any participants could be added — see status above." };
    }

    onProgress?.('Confirming participant selection…');
    const nextBtn = document.querySelector('[aria-label="Next"]') || (await waitForClickableText('Next', { timeoutMs: 3000 }));
    if (!nextBtn) return { ok: false, error: "Selected participants but couldn't find the Next/confirm button.", added, failed };
    nextBtn.click();
    await sleep(600);

    onProgress?.('Naming the group…');
    const nameBox = findVisibleSearchInput();
    if (!nameBox) return { ok: false, error: "Couldn't find the group name field.", added, failed };
    typeIntoSearch(nameBox, name);
    await sleep(300);

    const createBtn = document.querySelector('[aria-label="Create group"]') || (await waitForClickableText('Create', { timeoutMs: 3000 }));
    if (!createBtn) return { ok: false, error: "Named the group but couldn't find the Create button.", added, failed };
    createBtn.click();

    return { ok: true, added, failed };
  }

  async function openGroupInfoPanel() {
    const header = document.querySelector('header');
    const titleEl = header?.querySelector('span[dir="auto"][title], span[dir="auto"]');
    if (!titleEl) return false;
    titleEl.click();
    await sleep(500);
    return true;
  }

  /** Adds participants (phone numbers) to whichever group chat is currently open. */
  async function addParticipantsToOpenGroup(phones, onProgress) {
    onProgress?.('Opening group info…');
    if (!(await openGroupInfoPanel())) return { ok: false, error: "Couldn't open group info for the current chat — make sure a group chat is open." };

    const addBtn = await waitForClickableText('Add participant', { timeoutMs: 4000 });
    if (!addBtn) return { ok: false, error: "Couldn't find \"Add participant\" — make sure you're an admin of this group and a group chat is open." };
    addBtn.click();
    await sleep(500);

    const added = [];
    const failed = [];
    for (let i = 0; i < phones.length; i++) {
      if (i > 0) { onProgress?.(`Waiting before adding ${phones[i]}…`); await sleep(humanGapMs()); }
      const gate = await reserveGroupOp();
      if (!gate.allowed) { onProgress?.(`Stopped: ${gate.error}`); break; }
      onProgress?.(`Adding ${phones[i]} (${i + 1}/${phones.length})…`);
      const found = await searchAndSelectContact(phones[i]);
      if (found) added.push(phones[i]); else failed.push(phones[i]);
    }
    if (added.length === 0 && failed.length === 0) {
      return { ok: false, error: "Group-op limit reached before any participants could be added — see status above." };
    }

    onProgress?.('Confirming…');
    const confirmBtn =
      document.querySelector('[aria-label="Add"]') ||
      document.querySelector('span[data-icon="checkmark-medium"]')?.closest('button') ||
      (await waitForClickableText('Add', { timeoutMs: 3000 }));
    if (confirmBtn) confirmBtn.click();

    return { ok: true, added, failed };
  }

  /** Leaves (and, if you're the only member left, effectively deletes) the currently open group. */
  async function leaveAndDeleteOpenGroup(onProgress) {
    const gate = await reserveGroupOp();
    if (!gate.allowed) return { ok: false, error: gate.error };

    onProgress?.('Opening group info…');
    if (!(await openGroupInfoPanel())) return { ok: false, error: "Couldn't open group info — make sure a group chat is open." };

    const exitBtn = await waitForClickableText('Exit group', { timeoutMs: 4000 });
    if (!exitBtn) return { ok: false, error: "Couldn't find \"Exit group\"." };
    exitBtn.click();
    await sleep(400);

    // WhatsApp shows a confirm dialog — click its own "Exit"/"Leave" confirm button.
    const confirmBtn = await waitForClickableText('Exit', { timeoutMs: 3000 });
    if (confirmBtn) confirmBtn.click();

    return { ok: true };
  }

  /**
   * Removes specific members (by phone/name) from the currently open group,
   * one at a time via the group info participant list's own row menu.
   * Paced + rate-limited same as adding members.
   */
  async function removeParticipantsFromOpenGroup(queries, onProgress) {
    onProgress?.('Opening group info…');
    if (!(await openGroupInfoPanel())) return { ok: false, error: "Couldn't open group info — make sure a group chat is open." };
    await sleep(400);

    const removed = [];
    const failed = [];
    for (let i = 0; i < queries.length; i++) {
      if (i > 0) { onProgress?.(`Waiting before removing ${queries[i]}…`); await sleep(humanGapMs()); }
      const gate = await reserveGroupOp();
      if (!gate.allowed) { onProgress?.(`Stopped: ${gate.error}`); break; }

      onProgress?.(`Removing ${queries[i]} (${i + 1}/${queries.length})…`);
      const query = queries[i].toLowerCase();
      const rows = Array.from(document.querySelectorAll('div[role="listitem"]'));
      const row = rows.find((r) => (r.textContent || '').toLowerCase().includes(query));
      if (!row) { failed.push(queries[i]); continue; }

      row.click(); // most WA versions open a per-participant action sheet on click
      await sleep(400);
      const removeOption = await waitForClickableText('Remove', { timeoutMs: 2500 });
      if (!removeOption) { failed.push(queries[i]); continue; }
      removeOption.click();
      await sleep(300);
      const confirmOption = await waitForClickableText('Remove', { timeoutMs: 2500 });
      if (confirmOption) confirmOption.click();
      removed.push(queries[i]);
      await sleep(400);
    }

    if (removed.length === 0 && failed.length === 0) {
      return { ok: false, error: "Group-op limit reached before any members could be removed — see status above." };
    }
    return { ok: true, removed, failed };
  }

  /** Posts a plain text WhatsApp Status update. */
  async function postTextStatus(text, onProgress) {
    onProgress?.('Opening Status…');
    const statusNav =
      document.querySelector('[aria-label="Status"]') ||
      document.querySelector('span[data-icon="status-refreshed"]')?.closest('button');
    if (!statusNav) return { ok: false, error: "Couldn't find the Status tab in the left navigation." };
    statusNav.click();
    await sleep(500);

    const addBtn = await waitForClickableText('Add status', { timeoutMs: 4000 });
    if (!addBtn) return { ok: false, error: "Couldn't find \"Add status\"." };
    addBtn.click();
    await sleep(500);

    // Text-status composer is a separate contenteditable, distinct from the chat compose box.
    const textBox = findVisibleSearchInput();
    if (!textBox) return { ok: false, error: "Opened status composer but couldn't find the text field — WhatsApp may have defaulted to photo/video status instead of text." };
    typeIntoSearch(textBox, text);
    await sleep(300);

    const sendBtn = findSendButton() || (await waitForClickableText('Send', { timeoutMs: 3000 }));
    if (!sendBtn) return { ok: false, error: "Typed the status but couldn't find the Send button." };
    sendBtn.click();

    return { ok: true };
  }

  // ── Header tabs (injected into WhatsApp's own chat-list header) + row
  // checkboxes for bulk-select — the riskier surface: this adds NEW
  // persistent elements into WhatsApp's own layout (everything else in this
  // file only clicks WhatsApp's existing buttons), so it's more likely to
  // need adjustment if WhatsApp changes their DOM. Both are re-applied on an
  // interval since WhatsApp virtualizes the chat list (rows get recycled as
  // you scroll, silently dropping anything injected into them).
  let headerTabsEl = null;

  function findChatListHeaderInsertionPoint() {
    // Prefer inserting right after WhatsApp's own native filter chips row
    // ("All/Unread/Favourites/Groups") if present; else right after the
    // search box, which is a more stable anchor across versions.
    const nativeFilters = document.querySelector('div[aria-label="Chat list filters"]');
    if (nativeFilters?.parentElement) return { after: nativeFilters };
    const searchBox = document.querySelector('[aria-label="Search input textbox"]');
    const searchContainer = searchBox?.closest('div[class]')?.parentElement;
    if (searchContainer) return { after: searchContainer };
    return null;
  }

  function renderHeaderTabs() {
    const insertion = findChatListHeaderInsertionPoint();
    if (!insertion) return; // will retry on next interval tick

    if (!headerTabsEl || !document.body.contains(headerTabsEl)) {
      headerTabsEl = el('div');
      headerTabsEl.id = 'swaryoga-header-tabs';
    }
    headerTabsEl.innerHTML = '';

    function makeTabRow(items, activeKind) {
      const row = el('div', 'sy-header-tab-row');
      const allTab = el('span', 'sy-header-tab', 'All');
      if (!activeChatFilter || activeChatFilter.kind !== activeKind) allTab.classList.add('sy-active');
      allTab.addEventListener('click', () => { activeChatFilter = null; renderHeaderTabs(); });
      row.appendChild(allTab);
      for (const item of items) {
        const tab = el('span', 'sy-header-tab', `${item.label}${item.count !== undefined ? ` (${item.count})` : ''}`);
        if (item.color) tab.style.borderColor = item.color;
        if (activeChatFilter?.kind === activeKind && activeChatFilter.key === item.key) {
          tab.classList.add('sy-active');
          if (item.color) tab.style.background = item.color;
        }
        tab.addEventListener('click', () => { activeChatFilter = { kind: activeKind, key: item.key }; renderHeaderTabs(); });
        row.appendChild(tab);
      }
      return row;
    }

    if (state.labelPresets.length) {
      const counts = {};
      for (const labels of Object.values(state.chatLabels)) {
        for (const k of labels) counts[k] = (counts[k] || 0) + 1;
      }
      headerTabsEl.appendChild(makeTabRow(
        state.labelPresets.map((p) => ({ key: p.key, label: `🏷️ ${p.label}`, color: p.color, count: counts[p.key] || 0 })),
        'label'
      ));
    }

    const funnelCounts = {};
    for (const status of Object.values(chatFunnelCache)) funnelCounts[status] = (funnelCounts[status] || 0) + 1;
    const funnelWithChats = Object.keys(funnelCounts);
    if (funnelWithChats.length) {
      headerTabsEl.appendChild(makeTabRow(
        funnelWithChats.map((key) => ({ key, label: key.replace(/_/g, ' '), count: funnelCounts[key] })),
        'funnel'
      ));
    }

    if (headerTabsEl.children.length === 0) return; // nothing to show yet

    if (!document.body.contains(headerTabsEl)) {
      insertion.after.insertAdjacentElement('afterend', headerTabsEl);
    }
    applyChatListFilter();
  }

  /** Returns the same "whatever WhatsApp shows as the title" key used for labels/funnel-cache lookups. */
  function chatKeyForRow(row) {
    const titleEl = row.querySelector('span[dir="auto"][title]');
    if (!titleEl) return '';
    return (titleEl.getAttribute('title') || titleEl.textContent || '').trim();
  }

  function isGroupRow(row) {
    return !!row.querySelector('span[data-icon="default-group"], span[data-icon="community-default"], span[data-icon="group"]');
  }

  /** Hides/shows currently-rendered chat rows per the active header-tab filter. Re-run often — WA recycles rows on scroll. */
  function applyChatListFilter() {
    const rows = document.querySelectorAll('div[role="listitem"], div[data-testid="cell-frame-container"]');
    for (const row of rows) {
      const target = row.closest('div[role="listitem"]') || row;
      if (!activeChatFilter) { target.style.display = ''; continue; }
      const key = chatKeyForRow(row);
      let matches = false;
      if (activeChatFilter.kind === 'label') {
        matches = (state.chatLabels[key] || []).includes(activeChatFilter.key);
      } else if (activeChatFilter.kind === 'funnel') {
        matches = chatFunnelCache[key] === activeChatFilter.key;
      }
      target.style.display = matches ? '' : 'none';
    }
  }

  /** Adds a small checkbox to each visible chat row for bulk-select → Schedule Selected. */
  function injectRowCheckboxes() {
    const rows = document.querySelectorAll('div[role="listitem"], div[data-testid="cell-frame-container"]');
    for (const row of rows) {
      const target = row.closest('div[role="listitem"]') || row;
      const key = chatKeyForRow(row);
      if (!key) continue;

      const existing = target.querySelector('.sy-row-checkbox');
      // WhatsApp recycles row DOM nodes during virtualized scrolling — a
      // checkbox created for a previous chat can end up sitting on a row
      // that now shows a DIFFERENT chat. Recreate it whenever the row's
      // current chat key doesn't match what the checkbox was built for,
      // instead of trusting a stale "already injected" checkbox blindly.
      if (existing && existing.dataset.syChatkey === key) continue;
      existing?.remove();

      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.className = 'sy-row-checkbox';
      cb.dataset.syChatkey = key;
      cb.checked = selectedChats.has(key);
      cb.addEventListener('click', (e) => e.stopPropagation());
      cb.addEventListener('change', (e) => {
        e.stopPropagation();
        if (cb.checked) selectedChats.set(key, isGroupRow(row) ? 'group' : 'phone');
        else selectedChats.delete(key);
        renderSelectedBar();
      });

      if (getComputedStyle(target).position === 'static') target.style.position = 'relative';
      target.style.paddingLeft = '26px';
      cb.style.cssText = 'position:absolute;left:4px;top:50%;transform:translateY(-50%);z-index:5;width:15px;height:15px;';
      target.insertBefore(cb, target.firstChild);
    }
  }

  /** Floating "Schedule Selected (N)" bar shown once 1+ chats are checked. */
  let selectedBarEl = null;
  function renderSelectedBar() {
    if (selectedChats.size === 0) {
      selectedBarEl?.remove();
      selectedBarEl = null;
      return;
    }
    if (!selectedBarEl) {
      selectedBarEl = el('div');
      selectedBarEl.id = 'swaryoga-selected-bar';
      document.body.appendChild(selectedBarEl);
    }
    selectedBarEl.innerHTML = '';
    const btn = el('button', 'sy-btn sy-primary', `📅 Schedule Selected (${selectedChats.size})`);
    btn.addEventListener('click', () => openScheduleSelectedModal());
    const clearBtn = el('button', 'sy-btn', 'Clear');
    clearBtn.addEventListener('click', () => { selectedChats.clear(); renderSelectedBar(); injectRowCheckboxes(); });
    selectedBarEl.appendChild(btn);
    selectedBarEl.appendChild(clearBtn);
  }

  function openScheduleSelectedModal() {
    const { overlay, body: mbody } = openModal(`📅 Schedule to ${selectedChats.size} selected`);
    const list = el('div', 'sy-empty', Array.from(selectedChats.keys()).join(', '));
    mbody.appendChild(list);

    const textarea = document.createElement('textarea');
    textarea.placeholder = 'Message text';
    addTemplatePicker(mbody, textarea);
    mbody.appendChild(el('div', 'sy-modal-label', 'Message'));
    addFormatToolbar(mbody, textarea);
    mbody.appendChild(textarea);

    mbody.appendChild(el('div', 'sy-modal-label', 'Send at'));
    const whenInput = document.createElement('input');
    whenInput.type = 'datetime-local';
    mbody.appendChild(whenInput);

    const repeat = addRepeatBlock(mbody);

    const msg = el('div', 'sy-modal-msg');
    const footer = el('div', 'sy-modal-footer');
    const cancelBtn = el('button', 'sy-modal-btn', 'Cancel');
    cancelBtn.addEventListener('click', () => overlay.remove());
    const submitBtn = el('button', 'sy-modal-btn sy-primary', 'Schedule All');
    submitBtn.addEventListener('click', async () => {
      const text = textarea.value.trim();
      const sendAt = whenInput.value ? new Date(whenInput.value).getTime() : NaN;
      if (!text) { msg.className = 'sy-modal-msg sy-error'; msg.textContent = 'Enter a message or pick a template.'; return; }
      if (!repeat.isEnabled() && (isNaN(sendAt) || sendAt <= Date.now())) {
        msg.className = 'sy-modal-msg sy-error'; msg.textContent = 'Pick a valid future date/time, or turn on Repeat.'; return;
      }

      submitBtn.disabled = true;
      const targets = Array.from(selectedChats.entries()).map(([value, type]) => ({ type, value }));
      const { scheduled, failed } = await runScheduleWithRepeat(targets, text, repeat, sendAt);
      submitBtn.disabled = false;
      if (scheduled) {
        selectedChats.clear();
        renderSelectedBar();
        injectRowCheckboxes();
        overlay.remove();
      } else {
        msg.className = 'sy-modal-msg sy-error';
        msg.textContent = `Failed: ${failed.join(', ') || 'unknown error'}`;
      }
    });
    footer.appendChild(cancelBtn);
    footer.appendChild(submitBtn);
    mbody.appendChild(msg);
    mbody.appendChild(footer);
  }

  /**
   * "Create Template" popup — same shape as the admin's Create Template page
   * (name/language/category, header type, body with the formatting toolbar,
   * footer, up to 3 buttons), but always QR / auto-approved. Saves via
   * CREATE_TEMPLATE, then reloads the sidebar's Templates list.
   */
  function openCreateTemplateModal() {
    const { overlay, body: mbody } = openModal('📝 Create Template');

    mbody.appendChild(el('div', 'sy-modal-label', 'Template Name'));
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.placeholder = 'welcome_message';
    mbody.appendChild(nameInput);

    const metaRow = el('div', 'sy-repeat-row');
    const langCol = el('div', 'sy-repeat-col');
    langCol.appendChild(el('div', 'sy-modal-label', 'Language'));
    const langSelect = document.createElement('select');
    for (const [v, label] of [['en', 'English'], ['hi', 'Hindi'], ['mr', 'Marathi'], ['gu', 'Gujarati'], ['ta', 'Tamil'], ['te', 'Telugu']]) {
      const opt = document.createElement('option'); opt.value = v; opt.textContent = label; langSelect.appendChild(opt);
    }
    langCol.appendChild(langSelect);
    metaRow.appendChild(langCol);

    const catCol = el('div', 'sy-repeat-col');
    catCol.appendChild(el('div', 'sy-modal-label', 'Category'));
    const catSelect = document.createElement('select');
    for (const v of ['MARKETING', 'UTILITY', 'OTP', 'ACCOUNT_UPDATE']) {
      const opt = document.createElement('option'); opt.value = v; opt.textContent = v; catSelect.appendChild(opt);
    }
    catCol.appendChild(catSelect);
    metaRow.appendChild(catCol);
    mbody.appendChild(metaRow);

    mbody.appendChild(el('div', 'sy-modal-label', 'Header (optional)'));
    const headerTypeRow = el('div', 'sy-header-type-row');
    let headerType = 'NONE';
    const headerBtns = {};
    for (const t of ['NONE', 'TEXT', 'IMAGE', 'VIDEO', 'DOCUMENT']) {
      const btn = el('button', 'sy-header-type-btn' + (t === 'NONE' ? ' sy-active' : ''), t === 'NONE' ? '× None' : t.charAt(0) + t.slice(1).toLowerCase());
      btn.type = 'button';
      btn.addEventListener('click', () => {
        headerType = t;
        for (const k in headerBtns) headerBtns[k].classList.toggle('sy-active', k === t);
        headerTextWrap.style.display = t === 'TEXT' ? 'block' : 'none';
        headerMediaWrap.style.display = (t === 'IMAGE' || t === 'VIDEO' || t === 'DOCUMENT') ? 'block' : 'none';
      });
      headerBtns[t] = btn;
      headerTypeRow.appendChild(btn);
    }
    mbody.appendChild(headerTypeRow);

    const headerTextWrap = el('div');
    headerTextWrap.style.display = 'none';
    const headerTextInput = document.createElement('input');
    headerTextInput.type = 'text';
    headerTextInput.placeholder = 'Header text';
    headerTextWrap.appendChild(headerTextInput);
    mbody.appendChild(headerTextWrap);

    const headerMediaWrap = el('div');
    headerMediaWrap.style.display = 'none';
    const headerMediaInput = document.createElement('input');
    headerMediaInput.type = 'text';
    headerMediaInput.placeholder = 'Paste a hosted image/video/document URL';
    headerMediaWrap.appendChild(headerMediaInput);
    mbody.appendChild(headerMediaWrap);

    mbody.appendChild(el('div', 'sy-modal-label', 'Message Body'));
    const bodyTextarea = document.createElement('textarea');
    bodyTextarea.placeholder = 'Type your message here… Use *bold*, _italic_, ~strikethrough~';
    addFormatToolbar(mbody, bodyTextarea);
    mbody.appendChild(bodyTextarea);

    mbody.appendChild(el('div', 'sy-modal-label', 'Footer Text (optional)'));
    const footerInput = document.createElement('input');
    footerInput.type = 'text';
    footerInput.placeholder = 'Optional footer';
    mbody.appendChild(footerInput);

    mbody.appendChild(el('div', 'sy-modal-label', 'Buttons (max 3)'));
    const buttonsWrap = el('div');
    mbody.appendChild(buttonsWrap);
    const addButtonBtn = el('button', 'sy-modal-btn', '+ Add Button');
    addButtonBtn.type = 'button';
    addButtonBtn.addEventListener('click', () => {
      if (buttonsWrap.children.length >= 3) return;
      const row = el('div', 'sy-button-row');
      const titleInput = document.createElement('input');
      titleInput.type = 'text';
      titleInput.placeholder = 'Button label';
      titleInput.className = 'sy-button-title';
      const typeSelect = document.createElement('select');
      typeSelect.className = 'sy-button-type';
      for (const v of ['QUICK_REPLY', 'URL', 'PHONE_NUMBER']) {
        const opt = document.createElement('option'); opt.value = v; opt.textContent = v.replace('_', ' '); typeSelect.appendChild(opt);
      }
      const valueInput = document.createElement('input');
      valueInput.type = 'text';
      valueInput.placeholder = 'URL or phone number';
      valueInput.className = 'sy-button-value';
      valueInput.style.display = 'none';
      typeSelect.addEventListener('change', () => {
        valueInput.style.display = typeSelect.value === 'QUICK_REPLY' ? 'none' : 'block';
        valueInput.placeholder = typeSelect.value === 'URL' ? 'https://…' : 'Phone number';
      });
      const removeBtn = el('button', 'sy-button-remove', '×');
      removeBtn.type = 'button';
      removeBtn.addEventListener('click', () => row.remove());
      row.appendChild(titleInput);
      row.appendChild(typeSelect);
      row.appendChild(valueInput);
      row.appendChild(removeBtn);
      buttonsWrap.appendChild(row);
      addButtonBtn.style.display = buttonsWrap.children.length >= 3 ? 'none' : 'inline-flex';
    });
    mbody.appendChild(addButtonBtn);

    const msg = el('div', 'sy-modal-msg');
    const footer = el('div', 'sy-modal-footer');
    const cancelBtn = el('button', 'sy-modal-btn', 'Cancel');
    cancelBtn.addEventListener('click', () => overlay.remove());
    const submitBtn = el('button', 'sy-modal-btn sy-primary', 'Create Template');
    submitBtn.addEventListener('click', async () => {
      const templateName = nameInput.value.trim();
      const templateContent = bodyTextarea.value.trim();
      if (!templateName) { msg.className = 'sy-modal-msg sy-error'; msg.textContent = 'Template name is required.'; return; }
      if (!templateContent) { msg.className = 'sy-modal-msg sy-error'; msg.textContent = 'Message body is required.'; return; }

      const buttons = Array.from(buttonsWrap.querySelectorAll('.sy-button-row')).map((row) => {
        const title = row.querySelector('.sy-button-title').value.trim();
        const type = row.querySelector('.sy-button-type').value;
        const value = row.querySelector('.sy-button-value').value.trim();
        const out = { title, type };
        if (type === 'URL' && value) out.url = value;
        if (type === 'PHONE_NUMBER' && value) out.phoneNumber = value;
        return out;
      }).filter((b) => b.title);

      const template = {
        templateName,
        language: langSelect.value,
        category: catSelect.value,
        templateContent,
        footerText: footerInput.value.trim(),
        buttons,
      };
      if (headerType === 'TEXT' && headerTextInput.value.trim()) {
        template.headerFormat = 'TEXT';
        template.headerContent = headerTextInput.value.trim();
      } else if ((headerType === 'IMAGE' || headerType === 'VIDEO' || headerType === 'DOCUMENT') && headerMediaInput.value.trim()) {
        template.headerFormat = headerType;
        template.headerContent = headerMediaInput.value.trim();
      }

      submitBtn.disabled = true;
      const res = await sendMessage({ type: 'CREATE_TEMPLATE', template });
      submitBtn.disabled = false;
      if (res.ok && res.data?.success) {
        sectionOpen.templates = true;
        loadTemplates();
        overlay.remove();
      } else {
        msg.className = 'sy-modal-msg sy-error';
        msg.textContent = res.data?.error || 'Failed to create template.';
      }
    });
    footer.appendChild(cancelBtn);
    footer.appendChild(submitBtn);
    mbody.appendChild(msg);
    mbody.appendChild(footer);
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

    // ── Tools (compact icon strip, kept up top) ──
    const toolsSection = el('div', 'sy-section');
    const statusBox = el('div', 'sy-empty');
    statusBox.style.display = 'none';
    const setToolStatus = (msg, isError) => {
      if (!msg) { statusBox.style.display = 'none'; return; }
      statusBox.style.display = 'block';
      statusBox.style.fontStyle = 'normal';
      statusBox.style.color = isError ? '#b91c1c' : '#374151';
      statusBox.textContent = msg;
    };

    // Applies to New Group / Add Members / Remove Member — these drive a
    // regular WhatsApp Group's UI and are not built for WhatsApp Communities
    // (announcement group + linked sub-groups, up to 5000 members) — those
    // have a different structure entirely, and grow via invite link, not
    // admin-add.
    const MAX_ADD_MEMBERS = 30;

    const iconRow = el('div', 'sy-icon-row');

    function addIconTool(icon, title, onClick) {
      const btn = el('button', 'sy-icon-btn', icon);
      btn.title = title;
      btn.addEventListener('click', onClick);
      iconRow.appendChild(btn);
      return btn;
    }

    addIconTool('💬', 'New Chat', () => {
      const phone = prompt('Phone number to start a chat with:');
      if (phone && phone.trim()) startNewChat(phone.trim());
    });

    const newGroupBtn = addIconTool('👥', 'New Group — regular WhatsApp Group only, not a Community', async () => {
      const name = prompt('Group name:');
      if (!name || !name.trim()) return;
      const raw = prompt(`Participant phone numbers — comma separated (max ${MAX_ADD_MEMBERS}):`);
      if (!raw || !raw.trim()) return;
      const phones = raw.split(',').map((p) => p.trim()).filter(Boolean);
      if (phones.length > MAX_ADD_MEMBERS) {
        setToolStatus(`❌ ${phones.length} numbers is too many (max ${MAX_ADD_MEMBERS}) — create the group with a few people, then use Add Members to grow it gradually.`, true);
        return;
      }
      newGroupBtn.disabled = true;
      const result = await createNewGroup(name.trim(), phones, (msg) => setToolStatus(msg));
      newGroupBtn.disabled = false;
      setToolStatus(
        result.ok
          ? `✅ Group created. Added ${result.added?.length || 0}/${phones.length}${result.failed?.length ? `, failed: ${result.failed.join(', ')}` : ''}.`
          : `❌ ${result.error}`,
        !result.ok
      );
    });

    const mergeBtn = addIconTool('➕', 'Add Members — to the currently open GROUP (not a Community), paced 3-7 min apart', async () => {
      const raw = prompt(
        `Add to the CURRENTLY OPEN group — phone numbers, comma separated (max ${MAX_ADD_MEMBERS} at a time):\n\n` +
        'This is for a regular WhatsApp Group, NOT a Community (Communities/5000-member entities have a different structure this doesn\'t support — use the invite link to grow those instead).\n\n' +
        'Paced 3-7 min apart to protect this WhatsApp number — a large list will take a while. You can close this tab; it will just stop where it is.'
      );
      if (!raw || !raw.trim()) return;
      const phones = raw.split(',').map((p) => p.trim()).filter(Boolean);
      if (phones.length > MAX_ADD_MEMBERS) {
        setToolStatus(`❌ ${phones.length} numbers is too many for this tool (max ${MAX_ADD_MEMBERS}) — this isn't meant for large-scale growth (that's what invite links are for).`, true);
        return;
      }
      mergeBtn.disabled = true;
      const result = await addParticipantsToOpenGroup(phones, (msg) => setToolStatus(msg));
      mergeBtn.disabled = false;
      setToolStatus(
        result.ok
          ? `✅ Added ${result.added?.length || 0}/${phones.length}${result.failed?.length ? `, failed: ${result.failed.join(', ')}` : ''}.`
          : `❌ ${result.error}`,
        !result.ok
      );
    });

    const removeMemberBtn = addIconTool('➖', 'Remove Member — from the currently open group, paced 3-7 min apart', async () => {
      const raw = prompt(`Remove from the CURRENTLY OPEN group — phone numbers or names, comma separated (max ${MAX_ADD_MEMBERS}):`);
      if (!raw || !raw.trim()) return;
      const queries = raw.split(',').map((p) => p.trim()).filter(Boolean);
      if (queries.length > MAX_ADD_MEMBERS) {
        setToolStatus(`❌ ${queries.length} is too many for this tool (max ${MAX_ADD_MEMBERS}).`, true);
        return;
      }
      removeMemberBtn.disabled = true;
      const result = await removeParticipantsFromOpenGroup(queries, (msg) => setToolStatus(msg));
      removeMemberBtn.disabled = false;
      setToolStatus(
        result.ok
          ? `✅ Removed ${result.removed?.length || 0}/${queries.length}${result.failed?.length ? `, failed: ${result.failed.join(', ')}` : ''}.`
          : `❌ ${result.error}`,
        !result.ok
      );
    });

    const deleteGroupBtn = addIconTool('🗑️', 'Leave/Delete Group — regular WhatsApp Group only, not a Community', async () => {
      if (!confirm('Leave the currently open group? This removes you from it (deletes it if you were the last member).')) return;
      deleteGroupBtn.disabled = true;
      const result = await leaveAndDeleteOpenGroup((msg) => setToolStatus(msg));
      deleteGroupBtn.disabled = false;
      setToolStatus(result.ok ? '✅ Left the group.' : `❌ ${result.error}`, !result.ok);
    });

    const statusBtn = addIconTool('📸', 'Post Status', async () => {
      const text = prompt('Status text:');
      if (!text || !text.trim()) return;
      statusBtn.disabled = true;
      const result = await postTextStatus(text.trim(), (msg) => setToolStatus(msg));
      statusBtn.disabled = false;
      setToolStatus(result.ok ? '✅ Status posted.' : `❌ ${result.error}`, !result.ok);
    });

    const scheduleBtn = el('button', 'sy-icon-btn sy-primary', '📅');
    scheduleBtn.title = 'Schedule Message — pick a contact, a template (optional), and a time';
    scheduleBtn.addEventListener('click', () => {
      const { overlay, body: mbody } = openModal('📅 Schedule Message');

      mbody.appendChild(el('div', 'sy-modal-label', 'Contact phone number'));
      const phoneInput = document.createElement('input');
      phoneInput.type = 'text';
      phoneInput.placeholder = '91XXXXXXXXXX';
      phoneInput.value = state.currentPhone || '';
      mbody.appendChild(phoneInput);

      const textarea = document.createElement('textarea');
      textarea.placeholder = 'Message text';
      addTemplatePicker(mbody, textarea);
      mbody.appendChild(el('div', 'sy-modal-label', 'Message'));
      addFormatToolbar(mbody, textarea);
      mbody.appendChild(textarea);

      mbody.appendChild(el('div', 'sy-modal-label', 'Send at'));
      const whenInput = document.createElement('input');
      whenInput.type = 'datetime-local';
      mbody.appendChild(whenInput);

      const repeat = addRepeatBlock(mbody);

      const msg = el('div', 'sy-modal-msg');
      const footer = el('div', 'sy-modal-footer');
      const cancelBtn = el('button', 'sy-modal-btn', 'Cancel');
      cancelBtn.addEventListener('click', () => overlay.remove());
      const submitBtn = el('button', 'sy-modal-btn sy-primary', 'Schedule');
      submitBtn.addEventListener('click', async () => {
        const phone = phoneInput.value.replace(/\D/g, '');
        const text = textarea.value.trim();
        const sendAt = whenInput.value ? new Date(whenInput.value).getTime() : NaN;
        if (!phone) { msg.className = 'sy-modal-msg sy-error'; msg.textContent = 'Enter a phone number.'; return; }
        if (!text) { msg.className = 'sy-modal-msg sy-error'; msg.textContent = 'Enter a message or pick a template.'; return; }
        if (!repeat.isEnabled() && (isNaN(sendAt) || sendAt <= Date.now())) {
          msg.className = 'sy-modal-msg sy-error'; msg.textContent = 'Pick a valid future date/time, or turn on Repeat.'; return;
        }

        submitBtn.disabled = true;
        const { scheduled, failed, days } = await runScheduleWithRepeat([{ type: 'phone', value: phone }], text, repeat, sendAt);
        submitBtn.disabled = false;
        if (scheduled) {
          setToolStatus(`✅ Scheduled ${scheduled} send${scheduled > 1 ? 's' : ''}${days > 1 ? ` across ${days} days` : ` for ${new Date(sendAt).toLocaleString()}`}. Keep this Chrome window open so it can fire.`);
          overlay.remove();
        } else {
          msg.className = 'sy-modal-msg sy-error';
          msg.textContent = `Failed: ${failed.join(', ') || 'unknown error'}`;
        }
      });
      footer.appendChild(cancelBtn);
      footer.appendChild(submitBtn);
      mbody.appendChild(msg);
      mbody.appendChild(footer);
    });
    iconRow.appendChild(scheduleBtn);

    const scheduleGroupsBtn = el('button', 'sy-icon-btn sy-primary', '📅👥');
    scheduleGroupsBtn.title = 'Schedule Groups — select multiple groups, a template (optional), and a time; paced 3-7 min apart, same limits as Add Members';
    scheduleGroupsBtn.addEventListener('click', () => {
      const { overlay, body: mbody } = openModal('📅 Schedule to Groups');

      mbody.appendChild(el('div', 'sy-modal-label', 'Groups (scanned from your currently visible chat list — scroll the chat list first if a group you need isn\'t showing)'));
      const checklist = el('div', 'sy-modal-checklist');
      const detected = scanVisibleGroupChats();
      if (!detected.length) {
        checklist.appendChild(el('div', 'sy-empty', 'No groups detected in the visible chat list — scroll it, then reopen this, or add names manually below.'));
      } else {
        for (const name of detected) {
          const label = document.createElement('label');
          const cb = document.createElement('input');
          cb.type = 'checkbox';
          cb.value = name;
          label.appendChild(cb);
          label.appendChild(document.createTextNode(name));
          checklist.appendChild(label);
        }
      }
      mbody.appendChild(checklist);

      mbody.appendChild(el('div', 'sy-modal-label', 'Also add manually (optional) — group names, comma separated'));
      const manualInput = document.createElement('input');
      manualInput.type = 'text';
      mbody.appendChild(manualInput);

      const textarea = document.createElement('textarea');
      textarea.placeholder = 'Message text';
      addTemplatePicker(mbody, textarea);
      mbody.appendChild(el('div', 'sy-modal-label', 'Message'));
      addFormatToolbar(mbody, textarea);
      mbody.appendChild(textarea);

      mbody.appendChild(el('div', 'sy-modal-label', 'Send at (first group — rest follow 3-7 min apart)'));
      const whenInput = document.createElement('input');
      whenInput.type = 'datetime-local';
      mbody.appendChild(whenInput);

      const repeat = addRepeatBlock(mbody);

      const msg = el('div', 'sy-modal-msg');
      const footer = el('div', 'sy-modal-footer');
      const cancelBtn = el('button', 'sy-modal-btn', 'Cancel');
      cancelBtn.addEventListener('click', () => overlay.remove());
      const submitBtn = el('button', 'sy-modal-btn sy-primary', 'Schedule All');
      submitBtn.addEventListener('click', async () => {
        const checked = Array.from(checklist.querySelectorAll('input[type="checkbox"]:checked')).map((c) => c.value);
        const manual = manualInput.value.split(',').map((s) => s.trim()).filter(Boolean);
        const groupNames = Array.from(new Set([...checked, ...manual]));
        const text = textarea.value.trim();
        const sendAt = whenInput.value ? new Date(whenInput.value).getTime() : NaN;
        if (!groupNames.length) { msg.className = 'sy-modal-msg sy-error'; msg.textContent = 'Select or type at least one group.'; return; }
        if (!text) { msg.className = 'sy-modal-msg sy-error'; msg.textContent = 'Enter a message or pick a template.'; return; }
        if (!repeat.isEnabled() && (isNaN(sendAt) || sendAt <= Date.now())) {
          msg.className = 'sy-modal-msg sy-error'; msg.textContent = 'Pick a valid future date/time, or turn on Repeat.'; return;
        }

        submitBtn.disabled = true;
        const targets = groupNames.map((value) => ({ type: 'group', value }));
        const { scheduled, failed, days } = await runScheduleWithRepeat(targets, text, repeat, sendAt);
        submitBtn.disabled = false;
        if (scheduled) {
          setToolStatus(`✅ Scheduled ${scheduled} send${scheduled > 1 ? 's' : ''} across ${groupNames.length} group(s)${days > 1 ? ` × ${days} days` : ''}${failed.length ? `, failed: ${failed.join(', ')}` : ''}. Keep this Chrome window open.`, failed.length > 0);
          overlay.remove();
        } else {
          msg.className = 'sy-modal-msg sy-error';
          msg.textContent = `Failed: ${failed.join(', ') || 'unknown error'}`;
        }
      });
      footer.appendChild(cancelBtn);
      footer.appendChild(submitBtn);
      mbody.appendChild(msg);
      mbody.appendChild(footer);
    });
    iconRow.appendChild(scheduleGroupsBtn);

    // Dashboards — one icon, dropdown menu (full table/kanban/chart pages don't fit a 300px sidebar).
    const dashWrap = el('div', 'sy-dropdown-wrap');
    const dashBtn = el('button', 'sy-icon-btn', '📊');
    dashBtn.title = 'CRM Dashboards';
    const dashMenu = el('div', 'sy-dropdown-menu');
    dashMenu.style.display = 'none';
    const dashLinks = [
      ['📋 QR Leads', '/admin/crm/qr/leads'],
      ['🔻 QR Funnel', '/admin/crm/qr/funnel'],
      ['⚙️ QR Manage', '/admin/crm/qr/manage'],
      ['📊 QR Reports', '/admin/crm/qr/agent-report'],
    ];
    for (const [label, path] of dashLinks) {
      const a = document.createElement('a');
      a.href = `https://swaryoga.com${path}`;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.textContent = label;
      dashMenu.appendChild(a);
    }
    dashBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      dashMenu.style.display = dashMenu.style.display === 'none' ? 'block' : 'none';
    });
    document.addEventListener('click', () => { dashMenu.style.display = 'none'; });
    dashWrap.appendChild(dashBtn);
    dashWrap.appendChild(dashMenu);
    iconRow.appendChild(dashWrap);

    toolsSection.appendChild(iconRow);

    const limitsNote = el('div', 'sy-empty', 'Group actions: max 150/day, 15/hour, 5:00 AM-10:30 PM IST. 1:1 messages unlimited, any time. Need more? Use Meta WhatsApp Business API.');
    limitsNote.style.marginTop = '6px';
    toolsSection.appendChild(limitsNote);
    toolsSection.appendChild(statusBox);
    body.appendChild(toolsSection);

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

    if (state.currentGroupName && !state.currentPhone) {
      leadSection.appendChild(el('div', 'sy-empty', `👥 Group open: ${state.currentGroupName} (leads don't apply to groups — but Schedule Message below works for this group)`));
    } else if (state.lead === undefined) {
      leadSection.appendChild(el('div', 'sy-empty', 'Loading…'));
    } else if (!state.lead || !state.lead.found) {
      leadSection.appendChild(el('div', 'sy-empty', state.currentPhone ? 'No CRM lead found for this number.' : 'Open a chat, or type a number above.'));
    } else {
      const card = el('div', 'sy-lead-card');
      card.appendChild(el('div', 'sy-lead-name', state.lead.name || 'Unknown'));
      card.appendChild(el('div', 'sy-lead-meta', `#${state.lead.leadNumber || ''} · ${state.lead.email || 'no email'}`));

      const funnelSelect = document.createElement('select');
      funnelSelect.style.cssText = 'margin-top:4px;width:100%;padding:4px 6px;border:1px solid #d1d5db;border-radius:6px;font-size:11px;';
      const stageList = funnelStages.length ? funnelStages : (state.lead.status ? [state.lead.status] : []);
      for (const s of stageList) {
        const opt = document.createElement('option');
        opt.value = s;
        opt.textContent = s.replace(/_/g, ' ');
        if (s === state.lead.status) opt.selected = true;
        funnelSelect.appendChild(opt);
      }
      const addStageOpt = document.createElement('option');
      addStageOpt.value = '__add_new__';
      addStageOpt.textContent = '+ Add new stage…';
      funnelSelect.appendChild(addStageOpt);

      const funnelError = el('div', 'sy-empty');
      funnelError.style.cssText = 'display:none;color:#b91c1c;margin-top:3px;';
      funnelSelect.addEventListener('change', async () => {
        const prevStatus = state.lead.status;
        let newStatus = funnelSelect.value;

        if (newStatus === '__add_new__') {
          funnelSelect.value = prevStatus || '';
          const newStage = prompt('New funnel stage name:');
          if (!newStage || !newStage.trim()) return;
          const createRes = await sendMessage({ type: 'CREATE_FUNNEL_STAGE', stage: newStage.trim() });
          if (!createRes.ok || !createRes.data?.success) {
            alert(`Couldn't create stage: ${createRes.data?.error || 'unknown error'}`);
            return;
          }
          await loadFunnelStages();
          newStatus = newStage.trim();
        }

        funnelSelect.disabled = true;
        funnelError.style.display = 'none';
        const res = await sendMessage({ type: 'UPDATE_LEAD_STATUS', leadId: state.lead._id, status: newStatus });
        funnelSelect.disabled = false;
        if (res.ok && res.data?.success) {
          state.lead.status = newStatus;
          render();
        } else {
          funnelSelect.value = prevStatus;
          funnelError.textContent = `❌ Couldn't update: ${res.data?.error || 'unknown error'}`;
          funnelError.style.display = 'block';
        }
      });
      card.appendChild(funnelSelect);
      card.appendChild(funnelError);

      if (state.lead.notes) {
        const notes = el('div', '', state.lead.notes);
        notes.style.marginTop = '6px';
        notes.style.color = '#6b7280';
        card.appendChild(notes);
      }
      leadSection.appendChild(card);
    }
    body.appendChild(leadSection);

    // ── Labels (also shown as filter tabs injected into WhatsApp's own header) ──
    if (state.currentChatKey) {
      const { section: labelSection, body: labelBody } = makeCollapsibleSection('labels', 'Labels', {
        addTitle: 'Create a new label',
        onAdd: async () => {
          const label = prompt('New label name:');
          if (!label || !label.trim()) return;
          const res = await sendMessage({ type: 'CREATE_LABEL_PRESET', label: label.trim() });
          if (res.ok && res.data?.success) {
            sectionOpen.labels = true;
            loadLabels();
          } else {
            alert(`Couldn't create label: ${res.data?.error || 'unknown error'}`);
          }
        },
      });
      const assigned = state.chatLabels[state.currentChatKey] || [];
      if (!state.labelPresets.length) {
        labelBody.appendChild(el('div', 'sy-empty', 'No labels yet — click + to create one.'));
      } else {
        const chipRow = el('div', 'sy-btn-row');
        for (const preset of state.labelPresets) {
          const on = assigned.includes(preset.key);
          const chip = el('button', 'sy-btn', (on ? '✓ ' : '') + preset.label);
          chip.style.borderColor = preset.color;
          if (on) { chip.style.background = preset.color; chip.style.color = '#fff'; }
          chip.addEventListener('click', async () => {
            chip.disabled = true;
            const res = await sendMessage({ type: 'ASSIGN_LABEL', chatKey: state.currentChatKey, labelKey: preset.key, on: !on });
            chip.disabled = false;
            if (res.ok && res.data?.success) {
              state.chatLabels[state.currentChatKey] = res.data.labels;
              render();
              renderHeaderTabs();
            }
          });
          chipRow.appendChild(chip);
        }
        labelBody.appendChild(chipRow);
      }
      body.appendChild(labelSection);
    }

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

    // ── Quick Replies (collapsible, "+" to add) ──
    const { section: qrSection, body: qrBody } = makeCollapsibleSection('quickReplies', `Quick Replies (${state.quickReplies.length})`, {
      addTitle: 'Add a new quick reply',
      onAdd: async () => {
        const title = prompt('Quick reply title:');
        if (!title || !title.trim()) return;
        const content = prompt('Message text (WhatsApp formatting: *bold*, _italic_, ~strike~):');
        if (!content || !content.trim()) return;
        const res = await sendMessage({ type: 'CREATE_QUICK_REPLY', title: title.trim(), content: content.trim() });
        if (res.ok && res.data?.success) {
          sectionOpen.quickReplies = true;
          loadQuickReplies();
        } else {
          alert(`Couldn't save: ${res.data?.error || 'unknown error'}`);
        }
      },
    });
    if (!state.quickReplies.length) {
      qrBody.appendChild(el('div', 'sy-empty', 'No quick replies saved yet — click + to add one.'));
    } else {
      for (const qr of state.quickReplies) {
        const item = el('div', 'sy-quick-reply');
        item.appendChild(el('div', 'sy-quick-reply-title', qr.title));
        item.appendChild(el('div', 'sy-quick-reply-text', formatWA(qr.content)));
        item.addEventListener('click', () => setComposeText(qr.content));
        qrBody.appendChild(item);
      }
    }
    body.appendChild(qrSection);

    // ── Templates (collapsible) ── fuller library: headers/images/buttons, from QR + Meta templates
    const { section: tplSection, body: tplBody } = makeCollapsibleSection('templates', `Templates (${state.templates.length})`, {
      addTitle: 'Create a new template',
      onAdd: () => openCreateTemplateModal(),
    });
    if (!state.templates.length) {
      tplBody.appendChild(el('div', 'sy-empty', 'No templates saved yet — create some in the CRM.'));
    } else {
      for (const tpl of state.templates) {
        const item = el('div', 'sy-quick-reply');
        const titleRow = el('div', 'sy-quick-reply-title', `${tpl.name} `);
        const badge = el('span', 'sy-badge', tpl.provider === 'qr' ? 'QR' : 'Meta');
        badge.style.marginLeft = '4px';
        badge.style.fontSize = '9px';
        titleRow.appendChild(badge);
        item.appendChild(titleRow);

        // Structured blocks (header/body/footer/buttons) instead of one
        // flowing paragraph — matches the template's actual message shape.
        function addBlock(label, text) {
          if (!text) return;
          const block = el('div', 'sy-tpl-block');
          block.appendChild(el('div', 'sy-tpl-block-label', label));
          block.appendChild(el('div', 'sy-tpl-block-text', formatWA(text)));
          item.appendChild(block);
        }
        if (tpl.imageUrl) {
          addBlock('Header', '🖼️ Image — inserts text only; attach the image manually in WhatsApp.');
        } else if (tpl.headerText) {
          addBlock('Header', tpl.headerText);
        }
        addBlock('Body', tpl.body);
        addBlock('Footer', tpl.footer);
        if (tpl.buttons && tpl.buttons.length) {
          const btnBlock = el('div', 'sy-tpl-block');
          btnBlock.appendChild(el('div', 'sy-tpl-block-label', 'Buttons'));
          const chipRow = el('div', 'sy-tpl-buttons');
          for (const b of tpl.buttons) chipRow.appendChild(el('span', 'sy-tpl-button-chip', b));
          btnBlock.appendChild(chipRow);
          item.appendChild(btnBlock);
        }

        item.addEventListener('click', () => setComposeText(tpl.text));
        tplBody.appendChild(item);
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
    // Feeds the Funnel header-tab filter — it only knows about chats opened
    // this way, not the whole contact list (no bulk lookup to keep this cheap).
    if (state.lead?.found && state.lead.status && state.currentChatKey) {
      chatFunnelCache[state.currentChatKey] = state.lead.status;
    }
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

  async function loadFunnelStages() {
    const res = await sendMessage({ type: 'GET_FUNNEL_STAGES' });
    if (res.ok && res.data?.success) {
      funnelStages = [...(res.data.builtIn || []), ...(res.data.custom || [])];
      render();
    }
  }

  async function loadLabels() {
    const res = await sendMessage({ type: 'GET_LABELS' });
    if (res.ok && res.data?.success) {
      state.labelPresets = res.data.presets || [];
      state.chatLabels = res.data.chatLabels || {};
      render();
      renderHeaderTabs();
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
      loadFunnelStages();
      loadLabels();
    }
  }

  // Poll for the open chat changing — a MutationObserver on the header is
  // more efficient, but WA Web's header gets torn down/rebuilt on chat
  // switch often enough that a light interval is more reliable in practice.
  function watchOpenChat() {
    let lastPhone = '';
    let lastGroupName = '';
    trackInterval(setInterval(() => {
      const detectedPhone = detectPhoneFromHeader();
      if (detectedPhone && detectedPhone !== lastPhone) {
        lastPhone = detectedPhone;
        lastGroupName = '';
        state.currentPhone = detectedPhone;
        state.currentGroupName = '';
        state.currentChatKey = detectedPhone;
        loadLead();
        render();
      } else if (!detectedPhone) {
        const detectedGroup = detectGroupNameFromHeader();
        if (detectedGroup && detectedGroup !== lastGroupName) {
          lastGroupName = detectedGroup;
          lastPhone = '';
          state.currentGroupName = detectedGroup;
          state.currentPhone = '';
          state.currentChatKey = detectedGroup;
          state.lead = null;
          render();
        }
      }
    }, 1500));
  }

  // ── Scheduled sends (fired from background.js's chrome.alarms) ──────────
  // Opening a 1:1 chat via the click-to-chat URL is a real page navigation
  // (WhatsApp Web isn't routed client-side for that URL from outside its own
  // app), which destroys this script's execution context mid-flight — so a
  // navigation-requiring 1:1 send can't complete within the same message
  // handler. Instead: if already on the right chat, send immediately;
  // otherwise stash the pending send in storage and let the *next* page load
  // (checkPendingScheduledSend, called from init()) finish it. Groups don't
  // have this problem — openChatByName() searches/clicks in-app with no
  // reload, so a group send can always complete in one go.
  async function runScheduledSend(job) {
    const text = job.text;

    if (job.targetType === 'group') {
      if (detectGroupNameFromHeader() !== job.groupName) {
        const opened = await openChatByName(job.groupName);
        if (!opened) return { ok: false, error: `Couldn't find group "${job.groupName}" in the chat list.` };
        await sleep(500);
      }
      if (!findComposeBox()) return { ok: false, error: 'Group opened but compose box not found.' };
      setComposeText(text);
      await sleep(300);
      sendCurrentMessage();
      return { ok: true, navigating: false };
    }

    const digits = job.phone.replace(/\D/g, '');
    if (detectPhoneFromHeader() === digits && findComposeBox()) {
      setComposeText(text);
      await sleep(300);
      sendCurrentMessage();
      return { ok: true, navigating: false };
    }
    await chrome.storage.local.set({ pendingScheduledSend: { phone: digits, text } });
    location.href = `https://web.whatsapp.com/send?phone=${digits}`;
    return { ok: true, navigating: true };
  }

  async function checkPendingScheduledSend() {
    const { pendingScheduledSend } = await chrome.storage.local.get(['pendingScheduledSend']);
    if (!pendingScheduledSend) return;
    await chrome.storage.local.remove('pendingScheduledSend');
    const box = await waitFor('footer div[contenteditable="true"]', { timeoutMs: 15000 });
    if (!box) return;
    await sleep(1000);
    setComposeText(pendingScheduledSend.text);
    await sleep(300);
    sendCurrentMessage();
  }

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg.type === 'RUN_SCHEDULED_SEND') {
      runScheduledSend(msg).then(sendResponse);
      return true;
    }
    return false;
  });

  function init() {
    buildSidebar();
    render();
    refreshAuthState();
    watchOpenChat();
    checkPendingScheduledSend();
    // Re-check login/approval state periodically in case the user logs in
    // via the popup while this tab is already open.
    trackInterval(setInterval(refreshAuthState, 15000));
    // WhatsApp virtualizes the chat list (rows are recycled as you scroll,
    // silently dropping our injected checkboxes/filter state) and its own
    // header can get torn down/rebuilt — re-apply everything on a short
    // interval rather than relying on one-time DOM mutation events.
    trackInterval(setInterval(() => {
      if (!state.loggedIn || !state.allowed) return;
      renderHeaderTabs();
      injectRowCheckboxes();
      applyChatListFilter();
    }, 1200));
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(init, 1000);
  } else {
    window.addEventListener('load', () => setTimeout(init, 1000));
  }
})();
