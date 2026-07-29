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

  /** Calls any existing admin CRM API route (leads, broadcast-runs,
   *  qr-broadcast-schedule, broadcast reports, the QR bridge's chat list…)
   *  through the background worker with the same login token — see the
   *  ADMIN_API case in background.js for why this is safe. */
  async function adminApi(path, method = 'GET', body) {
    const res = await sendMessage({ type: 'ADMIN_API', path, method, body });
    return res;
  }

  // Loaded from /api/extension/funnel-stages (built-in list + this user's
  // own custom stages) — see loadFunnelStages().
  let funnelStages = [];

  let state = {
    loggedIn: false, allowed: false, currentPhone: '', currentGroupName: '', currentChatKey: '',
    quickReplies: [], templates: [], lead: null,
    labelPresets: [], chatLabels: {}, // { chatKey: [labelKey, ...] }
    name: '', userId: '', isSuperAdmin: false,
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
  function openModal(title, opts = {}) {
    const overlay = el('div', 'sy-modal-overlay');
    const modal = el('div', opts.large ? 'sy-modal sy-modal-lg' : 'sy-modal');
    const header = el('div', 'sy-modal-header');
    header.appendChild(el('span', '', title));
    const closeBtn = el('button', 'sy-modal-close', '×');
    closeBtn.addEventListener('click', () => overlay.remove());
    header.appendChild(closeBtn);
    modal.appendChild(header);
    const body = el('div', 'sy-modal-body');
    modal.appendChild(body);
    overlay.appendChild(modal);

    // Drag-to-move via the header. The modal is normally centered by the
    // overlay's flexbox with no explicit position — switching to
    // position:fixed with explicit left/top (computed from wherever it
    // currently sits) only happens on the first drag, so it doesn't move
    // until you actually grab it.
    let dragging = false;
    let dragStartX = 0, dragStartY = 0, modalStartLeft = 0, modalStartTop = 0;
    function onDragMove(e) {
      if (!document.body.contains(overlay)) {
        document.removeEventListener('mousemove', onDragMove);
        document.removeEventListener('mouseup', onDragEnd);
        return;
      }
      if (!dragging) return;
      modal.style.left = `${Math.max(0, modalStartLeft + (e.clientX - dragStartX))}px`;
      modal.style.top = `${Math.max(0, modalStartTop + (e.clientY - dragStartY))}px`;
    }
    function onDragEnd() {
      if (dragging) { dragging = false; header.style.cursor = 'grab'; }
    }
    header.addEventListener('mousedown', (e) => {
      if (e.target === closeBtn) return;
      const rect = modal.getBoundingClientRect();
      if (modal.style.position !== 'fixed') {
        modal.style.position = 'fixed';
        modal.style.margin = '0';
        modal.style.left = `${rect.left}px`;
        modal.style.top = `${rect.top}px`;
      }
      dragging = true;
      dragStartX = e.clientX;
      dragStartY = e.clientY;
      modalStartLeft = rect.left;
      modalStartTop = rect.top;
      header.style.cursor = 'grabbing';
      e.preventDefault();
    });
    document.addEventListener('mousemove', onDragMove);
    document.addEventListener('mouseup', onDragEnd);

    // "Click outside to close" — but a click event fires based on where the
    // mouse is released, not where it was pressed. Dragging the modal's
    // native CSS resize handle (bottom-right corner) can end with the
    // cursor resolving to the overlay backdrop even though the drag
    // started ON the modal, which was closing the popup mid-resize.
    // Requiring BOTH mousedown and click to land on the overlay itself
    // (not just the click) fixes that without disabling click-to-close.
    let overlayPressedOnSelf = false;
    overlay.addEventListener('mousedown', (e) => { overlayPressedOnSelf = (e.target === overlay); });
    overlay.addEventListener('click', (e) => { if (e.target === overlay && overlayPressedOnSelf) overlay.remove(); });
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

  // Applies to New Group / Add Members (DOM-automation path only) — these
  // drive a regular WhatsApp Group's UI and are not built for WhatsApp
  // Communities (announcement group + linked sub-groups, up to 5000
  // members), which grow via invite link, not admin-add.
  const MAX_ADD_MEMBERS = 30;

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

  /** A <select> of saved templates that returns the chosen template OBJECT
   *  (with its real _id) rather than filling a textarea — used by Broadcast,
   *  where the backend needs templateId, not raw text. */
  function addTemplateIdPicker(container) {
    container.appendChild(el('div', 'sy-modal-label', 'Template'));
    const select = document.createElement('select');
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = state.templates.length ? '— Select a template —' : 'No templates yet — create one first (Templates section, +)';
    select.appendChild(placeholder);
    for (const tpl of state.templates) {
      const opt = document.createElement('option');
      opt.value = tpl._id;
      opt.textContent = `${tpl.name} (${tpl.provider === 'qr' ? 'QR' : 'Meta'})`;
      select.appendChild(opt);
    }
    container.appendChild(select);
    const preview = el('div', 'sy-tpl-block-text');
    preview.style.cssText = 'margin-top:6px;max-height:80px;overflow-y:auto;';
    container.appendChild(preview);
    select.addEventListener('change', () => {
      const tpl = state.templates.find((t) => t._id === select.value);
      preview.innerHTML = tpl ? formatWA(tpl.text) : '';
    });
    return { getSelected: () => state.templates.find((t) => t._id === select.value) || null };
  }

  /** Search-and-checklist recipient picker (leads), backed by
   *  /api/admin/crm/leads — shared by Broadcast and Funnel "add people".
   *  Selections persist across searches (Map keyed by leadId). */
  function addLeadPicker(container, opts = {}) {
    const selected = new Map(); // leadId -> lead
    container.appendChild(el('div', 'sy-modal-label', opts.label || 'Search & select recipients'));
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.placeholder = 'Search by name or phone…';
    container.appendChild(searchInput);

    const actionsRow = el('div', 'sy-repeat-actions');
    const selectAllBtn = el('button', 'sy-modal-btn', 'Select all');
    selectAllBtn.type = 'button';
    const clearAllBtn = el('button', 'sy-modal-btn', 'Clear all');
    clearAllBtn.type = 'button';
    actionsRow.appendChild(selectAllBtn);
    actionsRow.appendChild(clearAllBtn);
    container.appendChild(actionsRow);

    const resultsBox = el('div', 'sy-modal-checklist');
    container.appendChild(resultsBox);
    const countLine = el('div', 'sy-fmt-hint', '0 selected');
    container.appendChild(countLine);

    let lastLeads = [];

    function updateCount() { countLine.textContent = `${selected.size} selected`; }

    function renderResults(leads) {
      lastLeads = leads;
      resultsBox.innerHTML = '';
      if (!leads.length) { resultsBox.appendChild(el('div', 'sy-empty', 'No matches.')); return; }
      for (const lead of leads) {
        const label = document.createElement('label');
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.checked = selected.has(lead._id);
        cb.addEventListener('change', () => {
          if (cb.checked) selected.set(lead._id, lead); else selected.delete(lead._id);
          updateCount();
        });
        label.appendChild(cb);
        const statusTxt = lead.status ? ` (${String(lead.status).replace(/_/g, ' ')})` : '';
        label.appendChild(document.createTextNode(`${lead.name || 'Unnamed'} — ${lead.phoneNumber || ''}${statusTxt}`));
        resultsBox.appendChild(label);
      }
    }

    selectAllBtn.addEventListener('click', () => {
      for (const lead of lastLeads) selected.set(lead._id, lead);
      resultsBox.querySelectorAll('input[type="checkbox"]').forEach((c) => { c.checked = true; });
      updateCount();
    });
    clearAllBtn.addEventListener('click', () => {
      for (const lead of lastLeads) selected.delete(lead._id);
      resultsBox.querySelectorAll('input[type="checkbox"]').forEach((c) => { c.checked = false; });
      updateCount();
    });

    let searchTimer = null;
    async function runSearch() {
      resultsBox.innerHTML = '';
      resultsBox.appendChild(el('div', 'sy-empty', 'Searching…'));
      const params = new URLSearchParams({ qrOnly: '1', limit: '50', selectAll: 'true', fields: 'name,phoneNumber,status' });
      const q = searchInput.value.trim();
      if (q) params.set('q', q);
      if (opts.status) params.set('status', opts.status);
      const res = await adminApi(`/api/admin/crm/leads?${params.toString()}`);
      const leads = res.ok ? (res.data?.data?.leads || []) : [];
      renderResults(leads);
    }
    searchInput.addEventListener('input', () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(runSearch, 350);
    });
    runSearch();

    return {
      getSelectedIds: () => Array.from(selected.keys()),
      getSelectedCount: () => selected.size,
    };
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
    // run-on line. Real users get line breaks by typing or by pasting, and
    // WhatsApp's own paste handler correctly turns \n in pasted plain text
    // into real message line breaks — so we simulate a paste instead.
    //
    // Deliberately NOT falling back to execCommand if this "doesn't look
    // like it worked" — WhatsApp's paste handler can finish updating the
    // DOM asynchronously (after this function returns), so a synchronous
    // "did it work?" check reads stale state and looks like it failed even
    // when the paste is still landing. Running the execCommand fallback in
    // that case doesn't replace the pasted text, it runs ALONGSIDE it once
    // the paste catches up — which is what put every message out twice
    // (once flattened via execCommand, once correctly via the delayed
    // paste). Trust the paste; it's the one that's actually reliable here.
    const dt = new DataTransfer();
    dt.setData('text/plain', text);
    box.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
    return true;
  }

  function getComposeText() {
    const box = findComposeBox();
    return box ? box.innerText || '' : '';
  }

  /** WhatsApp mounts a hidden <input type="file"> for image/video attach
   *  whether or not the attach menu is open — no need to click through
   *  the paperclip → "Photos & videos" UI, which would also pop the native
   *  OS file picker if driven by a real click. Setting .files directly and
   *  firing 'change' drives the same flow without that dialog appearing. */
  function findAttachFileInput() {
    const candidates = [
      'input[type="file"][accept*="image"]',
      'input[type="file"][multiple]',
      'input[type="file"]',
    ];
    for (const sel of candidates) {
      const found = document.querySelector(sel);
      if (found) return found;
    }
    return null;
  }

  /**
   * Attaches a template's image as a real WhatsApp image message (with
   * `caption` in WA's own caption box), instead of the old behavior of
   * only inserting the caption text and leaving the image for manual
   * attach. Best-effort: WhatsApp's attach/caption DOM isn't a documented
   * API, so this can fail on a WhatsApp Web layout change — always returns
   * a clear ok/error result so the caller can tell the user exactly what
   * happened rather than failing silently.
   */
  async function attachImageToCompose(imageUrl, caption) {
    const fetchRes = await sendMessage({ type: 'FETCH_IMAGE_DATA_URL', url: imageUrl });
    if (!fetchRes.ok) return { ok: false, error: fetchRes.error || 'Failed to download the image.' };

    const input = findAttachFileInput();
    if (!input) return { ok: false, error: "Couldn't find WhatsApp's attach input on this page." };

    try {
      const blob = await (await fetch(fetchRes.dataUrl)).blob();
      const filename = (imageUrl.split('/').pop() || 'image.jpg').split('?')[0];
      const file = new File([blob], filename, { type: fetchRes.mimeType || 'image/jpeg' });
      const dt = new DataTransfer();
      dt.items.add(file);
      input.files = dt.files;
      input.dispatchEvent(new Event('change', { bubbles: true }));

      // WhatsApp opens an image-preview panel with its OWN caption box
      // (a different contenteditable than the normal compose box) —
      // wait for it, then paste the caption text in the same way
      // setComposeText does for the regular compose box.
      const captionBox = await waitFor('div[contenteditable="true"][data-tab]', { timeoutMs: 6000 });
      if (!captionBox) return { ok: false, error: 'Image attached, but the caption box never appeared — add the caption manually.' };
      if (caption) {
        captionBox.focus();
        const cdt = new DataTransfer();
        cdt.setData('text/plain', caption);
        captionBox.dispatchEvent(new ClipboardEvent('paste', { clipboardData: cdt, bubbles: true, cancelable: true }));
      }
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e?.message || String(e) };
    }
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

  /** Same "Status" entry point as postTextStatus, but attaches an image via
   *  WhatsApp's file input (same technique as attachImageToCompose) instead
   *  of typing into the text composer, then adds `caption` in the resulting
   *  preview's caption box before sending. */
  /** Opens WhatsApp's Status composer (shared by URL- and local-file-based
   *  status posting), leaving it ready for a file to be attached. */
  async function openStatusComposer() {
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
    return { ok: true };
  }

  /** Sets `file` as the Status attachment, adds `caption`, and sends. */
  async function attachFileToStatusAndSend(file, caption) {
    const input = findAttachFileInput();
    if (!input) return { ok: false, error: "Couldn't find WhatsApp's attach input for status." };
    try {
      const dt = new DataTransfer();
      dt.items.add(file);
      input.files = dt.files;
      input.dispatchEvent(new Event('change', { bubbles: true }));

      const captionBox = await waitFor('div[contenteditable="true"][data-tab]', { timeoutMs: 6000 });
      if (captionBox && caption) {
        captionBox.focus();
        const cdt = new DataTransfer();
        cdt.setData('text/plain', caption);
        captionBox.dispatchEvent(new ClipboardEvent('paste', { clipboardData: cdt, bubbles: true, cancelable: true }));
        await sleep(300);
      }

      const sendBtn = findSendButton() || (await waitForClickableText('Send', { timeoutMs: 3000 }));
      if (!sendBtn) return { ok: false, error: 'Attached the media but could not find the Send button.' };
      sendBtn.click();
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e?.message || String(e) };
    }
  }

  async function postMediaStatus(imageUrl, caption) {
    const opened = await openStatusComposer();
    if (!opened.ok) return opened;

    const fetchRes = await sendMessage({ type: 'FETCH_IMAGE_DATA_URL', url: imageUrl });
    if (!fetchRes.ok) return { ok: false, error: fetchRes.error || 'Failed to download the media.' };

    try {
      const blob = await (await fetch(fetchRes.dataUrl)).blob();
      const filename = (imageUrl.split('/').pop() || 'status.jpg').split('?')[0];
      const file = new File([blob], filename, { type: fetchRes.mimeType || 'image/jpeg' });
      return await attachFileToStatusAndSend(file, caption);
    } catch (e) {
      return { ok: false, error: e?.message || String(e) };
    }
  }

  /** Same as postMediaStatus, but for a file picked from the user's own
   *  device (input type=file) — no download step needed, the File object
   *  is already local. Only usable for Post Now: a raw File can't survive
   *  being persisted for a later chrome.alarms firing the way a URL can. */
  async function postMediaStatusFromFile(file, caption) {
    const opened = await openStatusComposer();
    if (!opened.ok) return opened;
    return attachFileToStatusAndSend(file, caption);
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

  /**
   * Quick-access row (🔻 Funnel · 📈 Report · 📣 Broadcast · ⚙️ Settings)
   * injected into the OPEN CHAT's own header — not the chat-list header —
   * placed before whatever WhatsApp/other extensions already put there
   * (e.g. a third-party "Add to list" button), by prepending to the
   * header's action-icon row. Best-effort: WhatsApp's conversation header
   * structure isn't a documented API, so this silently no-ops if it can't
   * find a sane insertion point, same pattern as the chat-list header tabs.
   */
  let conversationHeaderActionsEl = null;
  // document.querySelector('header') alone is ambiguous — WhatsApp Web has
  // TWO <header> elements on screen at once (the chat-LIST panel's own
  // "WhatsApp" title bar, and the open conversation's header), and
  // querySelector always returns whichever comes first in DOM order. That
  // was silently grabbing the wrong one, so nothing ever appeared where
  // expected. Anchoring on the same title element phone/group detection
  // already relies on (HEADER_TITLE_SELECTORS, proven reliable) and walking
  // up to ITS closest <header> guarantees we're in the open chat's header.
  function findConversationHeaderInsertionAnchor() {
    // #main is WhatsApp Web's own stable container ID for the OPEN
    // CONVERSATION panel, distinct from the left chat-list panel — a bare
    // `header` or a title-selector query (both tried before) can match
    // elements in EITHER panel depending on DOM order, and had twice landed
    // this row in the chat-list panel instead, squeezing/hiding its native
    // search, filter, and menu icons there instead of sitting in the
    // conversation header where it belongs. Scoping to `#main header`
    // makes that ambiguity structurally impossible.
    const header = document.querySelector('#main header');
    if (!header) { console.warn('[SwarYogaCRM] header actions: no #main header found — no chat open, or WhatsApp changed its container id'); return null; }
    const lastChild = header.lastElementChild;
    if (!lastChild) { console.warn('[SwarYogaCRM] header actions: #main header has no children to insert before'); return null; }
    return { header, before: lastChild };
  }

  // Monochrome stroke-based icons (currentColor) sized/styled to match
  // WhatsApp's own black/gray header icon buttons, instead of colorful
  // emoji that stand out against WA's native icon row.
  const SVG_ICON = {
    // Same stroke-only 24x24 set throughout, so the row stays monochrome and
    // matches WhatsApp's own header icons rather than mixing in emoji.
    template: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="8" y1="13" x2="16" y2="13"></line><line x1="8" y1="17" x2="13" y2="17"></line></svg>',
    merge: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 21V9a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v12"></path><polyline points="8 7 12 3 16 7"></polyline></svg>',
    groupSchedule: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"></rect><line x1="3" y1="10" x2="21" y2="10"></line><circle cx="9" cy="15" r="1.6"></circle><circle cx="14" cy="15" r="1.6"></circle></svg>',
    schedule: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>',
    remove: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path><path d="M10 11v6"></path><path d="M14 11v6"></path></svg>',
    status: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"></circle><path d="M4.9 4.9a10 10 0 0 0 0 14.2"></path><path d="M19.1 4.9a10 10 0 0 1 0 14.2"></path></svg>',
    funnel: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="4 4 20 4 14 12 14 19 10 21 10 12 4 4"></polygon></svg>',
    report: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>',
    broadcast: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11v2a1 1 0 0 0 1 1h1l5 4V6l-5 4H4a1 1 0 0 0-1 1z"></path><path d="M15 8a3 3 0 0 1 0 8"></path><path d="M17.5 5.5a7 7 0 0 1 0 13"></path></svg>',
    settings: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>',
    leads: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>',
    sales: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>',
  };

  function renderConversationHeaderActions() {
    const anchor = findConversationHeaderInsertionAnchor();
    if (!anchor) return;
    if (conversationHeaderActionsEl && document.body.contains(conversationHeaderActionsEl) && anchor.header.contains(conversationHeaderActionsEl)) return;
    conversationHeaderActionsEl = el('div', 'sy-conv-header-actions');
    // Every tool in this row is a monochrome black/white icon with a
    // native hover tooltip (title attribute) — matching WhatsApp's own
    // icon buttons (video call, phone, search, menu) instead of standing
    // out as colorful emoji or plain text links.
    // Kept in step with the CRM's header row so the same actions are present
    // on both surfaces — Template, Merge, Schedule and Remove members were
    // previously only reachable from the sidebar or the compose popup.
    const items = [
      [SVG_ICON.template, 'Template', () => openTemplatesModal()],
      [SVG_ICON.merge, 'Merge Groups', () => openMergeGroupsModal()],
      [SVG_ICON.report, 'Report', () => openReportModal()],
      [SVG_ICON.funnel, 'Funnel', () => openFunnelModal()],
      [SVG_ICON.broadcast, 'Broadcast', () => openBroadcastModal()],
      [SVG_ICON.leads, 'Leads', () => openLeadsModal()],
      [SVG_ICON.sales, 'Sales', () => openSalesModal()],
      [SVG_ICON.remove, 'Remove Members', () => openRemoveMemberModal()],
      [SVG_ICON.schedule, 'Schedule Message', () => openScheduleMessageModal()],
      [SVG_ICON.groupSchedule, 'Group Schedule', () => openScheduleGroupsModal()],
      [SVG_ICON.status, 'My Status', () => openMyStatusModal()],
      [SVG_ICON.settings, 'Settings', () => openSettingsModal()],
    ];
    for (const [svg, title, handler] of items) {
      const btn = el('button', 'sy-conv-header-btn', svg);
      btn.type = 'button';
      btn.title = title;
      btn.addEventListener('click', handler);
      conversationHeaderActionsEl.appendChild(btn);
    }
    anchor.header.insertBefore(conversationHeaderActionsEl, anchor.before);
  }

  /**
   * "⚡ Actions" button injected into the compose footer — a fast path to
   * Quick message / Template / Schedule message / Chatbot flow without
   * opening the full sidebar, matching the pattern of competitor tools
   * (eazybe etc.) that put one action button right next to the message box.
   */
  async function runAiFix() {
    const text = getComposeText();
    if (!text.trim()) return { ok: false };
    const res = await sendMessage({ type: 'AI_FIX', text });
    if (res.ok && res.data?.success && res.data.result) setComposeText(res.data.result);
    return res;
  }

  async function runAiReply() {
    const context = detectLastInboundMessage();
    const res = await sendMessage({ type: 'AI_REPLY', context });
    if (res.ok && res.data?.success && res.data.result) setComposeText(res.data.result);
    return res;
  }

  /** Text-labeled Spell/AI reply buttons injected right into the compose
   *  footer near the mic/send icon, so they're reachable while typing
   *  instead of needing the sidebar open. */
  function injectComposeAiButtons() {
    const box = findComposeBox();
    if (!box) return;
    const footer = box.closest('footer');
    if (!footer) return;

    // Re-entrant: this runs from a MutationObserver, and on the first pass
    // WhatsApp has often not rendered the mic yet. Previously the mere
    // existence of the row caused an early return, so that first fallback
    // placement (below the composer, on the left) was locked in permanently
    // and never corrected once the mic appeared. Only stop early once the row
    // is actually anchored beside the mic.
    const existingRow = footer.querySelector('#swaryoga-compose-ai-row');
    if (existingRow && existingRow.dataset.anchored === 'mic') return;

    const row = existingRow || document.createElement('div');
    if (existingRow) {
      placeComposeAiRow(row, box, footer);
      return;
    }
    row.id = 'swaryoga-compose-ai-row';

    const fixBtn = document.createElement('button');
    fixBtn.type = 'button';
    fixBtn.className = 'sy-compose-ai-btn';
    fixBtn.textContent = '✏️ Spell';
    fixBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      fixBtn.disabled = true;
      fixBtn.textContent = '…';
      await runAiFix();
      fixBtn.disabled = false;
      fixBtn.textContent = '✏️ Spell';
    });

    const replyBtn = document.createElement('button');
    replyBtn.type = 'button';
    replyBtn.className = 'sy-compose-ai-btn sy-compose-ai-primary';
    replyBtn.textContent = '✨ AI reply';
    replyBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      replyBtn.disabled = true;
      replyBtn.textContent = '…';
      await runAiReply();
      replyBtn.disabled = false;
      replyBtn.textContent = '✨ AI reply';
    });

    row.appendChild(fixBtn);
    row.appendChild(replyBtn);

    placeComposeAiRow(row, box, footer);
  }

  /**
   * Puts the Spell/AI-reply row inside the composer's own flex row, directly
   * left of the mic. Anchoring is structural rather than by icon name, since
   * WhatsApp renames data-icon values between releases. Marks the row as
   * anchored only on success, so a fallback placement is retried on the next
   * observer pass instead of becoming permanent.
   */
  function placeComposeAiRow(row, box, footer) {
    const micOrSend = footer.querySelector(
      '[data-icon="ptt"], [data-icon="mic"], [data-icon="send"], [data-icon="ptt-inline"], [data-icon="audio-send"], button[aria-label*="Voice" i], button[aria-label*="Send" i]'
    );

    if (micOrSend) {
      let container = box.parentElement;
      while (container && container !== footer && !container.contains(micOrSend)) {
        container = container.parentElement;
      }
      if (container) {
        let micWrapper = micOrSend;
        while (micWrapper.parentElement && micWrapper.parentElement !== container) {
          micWrapper = micWrapper.parentElement;
        }
        if (micWrapper.parentElement === container) {
          if (row.nextElementSibling !== micWrapper || row.parentElement !== container) {
            container.insertBefore(row, micWrapper);
          }
          row.dataset.anchored = 'mic';
          return;
        }
      }
    }

    // Mic not in the DOM yet (or renamed). Park the row at the end of the
    // compose box's row so it still reads on the right, and leave it
    // un-anchored so the next pass can move it once the mic renders.
    const composeRow = box.parentElement?.parentElement;
    const fallbackParent = composeRow && composeRow !== footer ? composeRow : footer;
    if (row.parentElement !== fallbackParent) fallbackParent.appendChild(row);
  }

  function injectComposeActionButton() {
    const box = findComposeBox();
    if (!box) return;
    const footer = box.closest('footer');
    if (!footer) return;
    if (footer.querySelector('#swaryoga-compose-action-btn')) return;
    const btn = document.createElement('button');
    btn.id = 'swaryoga-compose-action-btn';
    btn.type = 'button';
    btn.title = 'Swar Yoga CRM — Quick message / Template / Schedule / Chatbot';
    btn.textContent = '⚡';
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleComposeActionsPopup(btn);
    });
    footer.insertBefore(btn, footer.firstChild);
  }

  let composeActionsPopupEl = null;
  function closeComposeActionsPopup() {
    composeActionsPopupEl?.remove();
    composeActionsPopupEl = null;
  }

  function toggleComposeActionsPopup(anchorBtn) {
    if (composeActionsPopupEl) { closeComposeActionsPopup(); return; }

    const popup = el('div');
    popup.id = 'swaryoga-compose-actions-popup';
    const header = el('div', 'sy-actions-popup-header');
    header.appendChild(el('span', 'sy-actions-popup-title', 'ACTIONS'));
    const closeBtn = el('button', 'sy-modal-close-sm', '×');
    closeBtn.addEventListener('click', closeComposeActionsPopup);
    header.appendChild(closeBtn);
    popup.appendChild(header);

    const list = el('div', 'sy-actions-popup-list');
    const items = [
      ['⚡', 'Quick message', () => { closeComposeActionsPopup(); openQuickReplyModal(); }],
      ['📅', 'Schedule message', () => { closeComposeActionsPopup(); openScheduleMessageModal(); }],
      ['📋', 'Template', () => { closeComposeActionsPopup(); openTemplatesModal(); }],
      ['🤖', 'Chatbot flow', () => showChatbotFlowsInPopup(popup)],
    ];
    for (const [icon, label, handler] of items) {
      const row = el('div', 'sy-actions-popup-item');
      row.appendChild(el('span', 'sy-actions-popup-icon', icon));
      row.appendChild(el('span', '', label));
      row.addEventListener('click', handler);
      list.appendChild(row);
    }
    popup.appendChild(list);
    document.body.appendChild(popup);

    const rect = anchorBtn.getBoundingClientRect();
    popup.style.left = `${Math.round(rect.left)}px`;
    popup.style.bottom = `${Math.round(window.innerHeight - rect.top + 8)}px`;
    composeActionsPopupEl = popup;

    setTimeout(() => {
      document.addEventListener('click', function onDocClick(e) {
        if (composeActionsPopupEl && !composeActionsPopupEl.contains(e.target) && e.target !== anchorBtn) {
          closeComposeActionsPopup();
        }
        document.removeEventListener('click', onDocClick);
      }, { once: true });
    }, 0);
  }

  /**
   * Replaces the ⚡ popup's contents with a list of this user's QR chatbot
   * flows and a "▶ Start" button per flow — same shape as the Meta WhatsApp
   * inbox's inline chatbot-flow picker (fetch flows, click Start), instead
   * of redirecting to the chatbot builder page. QR flows are trigger-keyword
   * based (not a stateful node-by-node engine like Meta's Cloud API flows),
   * so "starting" one here means: insert its opening message into the
   * compose box for the currently open chat, ready to review and send —
   * the same click-to-insert convention as Templates/Quick Replies.
   */
  /** Fetches this user's QR chatbot flows and renders a Start-button list
   *  into `list` — shared by the ⚡ compose popup and the standalone
   *  Chatbot modal. `onStart(flow)` fires after inserting the flow's
   *  opening message, so each caller can close its own container. */
  async function renderChatbotFlowsList(list, onStart) {
    list.innerHTML = '';
    list.appendChild(el('div', 'sy-empty', 'Loading your chatbot flows…'));

    const res = await adminApi('/api/admin/crm/qr/chatbot-flows?limit=50');
    const flows = res.ok ? (res.data?.data?.flows || res.data?.flows || []) : [];
    list.innerHTML = '';

    if (!flows.length) {
      list.appendChild(el('div', 'sy-empty', res.ok ? 'No chatbot flows yet.' : (res.data?.error || 'Failed to load flows.')));
    } else {
      for (const flow of flows) {
        const row = el('div', 'sy-actions-popup-item sy-actions-popup-flow');
        const label = el('span', '', flow.name || '(unnamed flow)');
        const startBtn = el('button', 'sy-modal-btn sy-primary', '▶ Start');
        startBtn.type = 'button';
        startBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          const startNode = (flow.nodes || []).find((n) => n.nodeId === flow.startNodeId) || (flow.nodes || [])[0];
          const text = startNode?.messageText || startNode?.questionText || '';
          if (text) setComposeText(text);
          else alert(`"${flow.name}" has no opening message text to insert — open it in the Chatbot Builder to check its first node.`);
          onStart?.(flow);
        });
        row.appendChild(label);
        row.appendChild(startBtn);
        list.appendChild(row);
      }
    }

    const createLink = document.createElement('a');
    createLink.href = 'https://swaryoga.com/admin/crm/qr/chatbot';
    createLink.target = '_blank';
    createLink.rel = 'noopener noreferrer';
    createLink.className = 'sy-actions-popup-create-link';
    createLink.textContent = '+ Create a new flow in Chatbot Builder →';
    list.appendChild(createLink);
  }

  function showChatbotFlowsInPopup(popup) {
    const list = popup.querySelector('.sy-actions-popup-list');
    renderChatbotFlowsList(list, () => closeComposeActionsPopup());
  }

  /** Standalone "Chatbot" modal — same flow list + Start button, reachable
   *  from the sidebar icon row without needing to be mid-compose. */
  function openChatbotFlowsModal() {
    const { overlay, body: mbody } = openModal('🤖 Chatbot flows');
    const list = el('div', 'sy-actions-popup-list');
    list.style.padding = '0';
    mbody.appendChild(list);
    renderChatbotFlowsList(list, () => overlay.remove());
    const footer = el('div', 'sy-modal-footer');
    const closeBtn = el('button', 'sy-modal-btn sy-primary', 'Close');
    closeBtn.addEventListener('click', () => overlay.remove());
    footer.appendChild(closeBtn);
    mbody.appendChild(footer);
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
    const funnelBtn = el('button', 'sy-btn', `🔻 Add to Funnel (${selectedChats.size})`);
    funnelBtn.addEventListener('click', () => openBulkFunnelModal());
    const labelBtn = el('button', 'sy-btn', `🏷️ Add to Label (${selectedChats.size})`);
    labelBtn.addEventListener('click', () => openBulkLabelModal());
    const clearBtn = el('button', 'sy-btn', 'Clear');
    clearBtn.addEventListener('click', () => { selectedChats.clear(); renderSelectedBar(); injectRowCheckboxes(); });
    selectedBarEl.appendChild(btn);
    selectedBarEl.appendChild(funnelBtn);
    selectedBarEl.appendChild(labelBtn);
    selectedBarEl.appendChild(clearBtn);
  }

  /** Bulk-assigns a funnel stage to every selected chat — resolves/creates
   *  a CRM lead per phone-type selection (groups are skipped, funnel
   *  stages apply to individual leads, not groups). */
  function openBulkFunnelModal() {
    const targets = Array.from(selectedChats.entries()).filter(([, type]) => type === 'phone').map(([key]) => key);
    const skippedGroups = selectedChats.size - targets.length;
    const { overlay, body: mbody } = openModal(`🔻 Add ${targets.length} to Funnel`);
    if (skippedGroups) mbody.appendChild(el('div', 'sy-fmt-hint', `${skippedGroups} group chat(s) in the selection skipped — funnel stages apply to individual contacts.`));

    mbody.appendChild(el('div', 'sy-modal-label', 'Stage'));
    const stageSelect = document.createElement('select');
    const stageList = funnelStages.length ? funnelStages : ['new'];
    for (const s of stageList) {
      const opt = document.createElement('option');
      opt.value = s;
      opt.textContent = s.replace(/_/g, ' ');
      stageSelect.appendChild(opt);
    }
    mbody.appendChild(stageSelect);

    const msg = el('div', 'sy-modal-msg');
    const footer = el('div', 'sy-modal-footer');
    const cancelBtn = el('button', 'sy-modal-btn', 'Cancel');
    cancelBtn.addEventListener('click', () => overlay.remove());
    const submitBtn = el('button', 'sy-modal-btn sy-primary', 'Apply');
    submitBtn.addEventListener('click', async () => {
      if (!targets.length) { msg.className = 'sy-modal-msg sy-error'; msg.textContent = 'No individual contacts in the selection.'; return; }
      submitBtn.disabled = true;
      let ok = 0;
      const failed = [];
      for (const phone of targets) {
        const { leadId, error } = await resolveOrCreateLeadId(phone);
        if (!leadId) { failed.push(`${phone} (${error})`); continue; }
        const res = await sendMessage({ type: 'UPDATE_LEAD_STATUS', leadId, status: stageSelect.value });
        if (res.ok && res.data?.success) ok++; else failed.push(phone);
      }
      submitBtn.disabled = false;
      if (ok) {
        msg.className = 'sy-modal-msg sy-ok';
        msg.textContent = `✅ Added ${ok}/${targets.length} to "${stageSelect.value.replace(/_/g, ' ')}"${failed.length ? `, failed: ${failed.join(', ')}` : ''}.`;
        setTimeout(() => overlay.remove(), 1800);
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

  /** Bulk-assigns a label to every selected chat (phone or group — labels
   *  are chat-scoped, unlike funnel stages). */
  function openBulkLabelModal() {
    const { overlay, body: mbody } = openModal(`🏷️ Add ${selectedChats.size} to Label`);

    mbody.appendChild(el('div', 'sy-modal-label', 'Label'));
    const labelSelect = document.createElement('select');
    if (!state.labelPresets.length) {
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = 'No labels yet — create one in the sidebar Labels section first';
      labelSelect.appendChild(opt);
    } else {
      for (const preset of state.labelPresets) {
        const opt = document.createElement('option');
        opt.value = preset.key;
        opt.textContent = preset.label;
        labelSelect.appendChild(opt);
      }
    }
    mbody.appendChild(labelSelect);

    const msg = el('div', 'sy-modal-msg');
    const footer = el('div', 'sy-modal-footer');
    const cancelBtn = el('button', 'sy-modal-btn', 'Cancel');
    cancelBtn.addEventListener('click', () => overlay.remove());
    const submitBtn = el('button', 'sy-modal-btn sy-primary', 'Apply');
    submitBtn.addEventListener('click', async () => {
      const labelKey = labelSelect.value;
      if (!labelKey) { msg.className = 'sy-modal-msg sy-error'; msg.textContent = 'Pick a label.'; return; }
      submitBtn.disabled = true;
      let ok = 0;
      for (const chatKey of selectedChats.keys()) {
        const res = await sendMessage({ type: 'ASSIGN_LABEL', chatKey, labelKey, on: true });
        if (res.ok && res.data?.success) {
          ok++;
          state.chatLabels[chatKey] = res.data.labels;
        }
      }
      submitBtn.disabled = false;
      if (ok) {
        msg.className = 'sy-modal-msg sy-ok';
        msg.textContent = `✅ Labeled ${ok}/${selectedChats.size}.`;
        renderHeaderTabs();
        setTimeout(() => overlay.remove(), 1500);
      } else {
        msg.className = 'sy-modal-msg sy-error';
        msg.textContent = 'Failed to apply the label.';
      }
    });
    footer.appendChild(cancelBtn);
    footer.appendChild(submitBtn);
    mbody.appendChild(msg);
    mbody.appendChild(footer);
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
        if (t === 'IMAGE' || t === 'VIDEO' || t === 'DOCUMENT') {
          headerFileInput.accept = t === 'IMAGE' ? 'image/*' : t === 'VIDEO' ? 'video/*' : '.pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document';
          headerFileInput.click();
        }
        updatePreview?.();
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
    headerMediaInput.placeholder = 'Paste a hosted URL, or upload below';
    headerMediaWrap.appendChild(headerMediaInput);
    const headerUploadBtn = el('button', 'sy-modal-btn', '📁 Upload a file instead');
    headerUploadBtn.type = 'button';
    headerUploadBtn.addEventListener('click', () => headerFileInput.click());
    headerMediaWrap.appendChild(headerUploadBtn);
    const headerFileInput = document.createElement('input');
    headerFileInput.type = 'file';
    headerFileInput.style.display = 'none';
    const headerUploadStatus = el('div', 'sy-fmt-hint', '');
    headerFileInput.addEventListener('change', async () => {
      const file = headerFileInput.files?.[0];
      if (!file) return;
      headerUploadStatus.textContent = `⏳ Uploading ${file.name}…`;
      const res = await sendMessage({ type: 'UPLOAD_MEDIA', file });
      if (res.ok && res.data?.success !== false && res.data?.url) {
        headerMediaInput.value = res.data.url;
        headerUploadStatus.textContent = `✅ Uploaded: ${file.name}`;
      } else {
        headerUploadStatus.textContent = `❌ ${res.data?.error || 'Upload failed'} — paste a URL instead.`;
      }
      updatePreview?.();
    });
    headerMediaWrap.appendChild(headerFileInput);
    headerMediaWrap.appendChild(headerUploadStatus);
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
      updatePreview?.();
    });
    mbody.appendChild(addButtonBtn);

    // ── Live WhatsApp-style preview ──
    mbody.appendChild(el('div', 'sy-modal-label', 'Preview'));
    const previewWrap = el('div', 'sy-wa-preview-wrap');
    const previewBubble = el('div', 'sy-wa-preview-bubble');
    const previewImage = document.createElement('img');
    previewImage.className = 'sy-wa-preview-image';
    previewImage.style.display = 'none';
    const previewHeaderText = el('div', 'sy-wa-preview-headertext');
    previewHeaderText.style.display = 'none';
    const previewBody = el('div', 'sy-wa-preview-body');
    const previewFooter = el('div', 'sy-wa-preview-footer');
    previewFooter.style.display = 'none';
    const previewButtons = el('div', 'sy-wa-preview-buttons');
    const previewTime = el('div', 'sy-wa-preview-time', `${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ✓✓`);
    previewBubble.appendChild(previewImage);
    previewBubble.appendChild(previewHeaderText);
    previewBubble.appendChild(previewBody);
    previewBubble.appendChild(previewFooter);
    previewBubble.appendChild(previewButtons);
    previewBubble.appendChild(previewTime);
    previewWrap.appendChild(previewBubble);
    mbody.appendChild(previewWrap);

    function updatePreview() {
      if (headerType === 'IMAGE' && headerMediaInput.value.trim()) {
        previewImage.src = headerMediaInput.value.trim();
        previewImage.style.display = 'block';
      } else {
        previewImage.style.display = 'none';
      }
      if (headerType === 'VIDEO' && headerMediaInput.value.trim()) {
        previewHeaderText.style.display = 'block';
        previewHeaderText.textContent = '🎥 Video attachment';
      } else if (headerType === 'DOCUMENT' && headerMediaInput.value.trim()) {
        previewHeaderText.style.display = 'block';
        previewHeaderText.textContent = '📄 Document attachment';
      } else if (headerType === 'TEXT' && headerTextInput.value.trim()) {
        previewHeaderText.style.display = 'block';
        previewHeaderText.innerHTML = formatWA(headerTextInput.value.trim());
      } else {
        previewHeaderText.style.display = 'none';
      }
      previewBody.innerHTML = formatWA(bodyTextarea.value.trim()) || '<span class="sy-empty">Your message…</span>';
      if (footerInput.value.trim()) {
        previewFooter.style.display = 'block';
        previewFooter.textContent = footerInput.value.trim();
      } else {
        previewFooter.style.display = 'none';
      }
      previewButtons.innerHTML = '';
      Array.from(buttonsWrap.querySelectorAll('.sy-button-row')).forEach((row) => {
        const title = row.querySelector('.sy-button-title').value.trim();
        if (title) previewButtons.appendChild(el('div', 'sy-wa-preview-btn', title));
      });
    }
    headerTextInput.addEventListener('input', updatePreview);
    headerMediaInput.addEventListener('input', updatePreview);
    bodyTextarea.addEventListener('input', updatePreview);
    footerInput.addEventListener('input', updatePreview);
    buttonsWrap.addEventListener('input', updatePreview);
    buttonsWrap.addEventListener('click', () => setTimeout(updatePreview, 0));
    updatePreview();

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

  /**
   * "Schedule Groups" popup — rebuilt on top of /api/admin/crm/qr-broadcast-schedule,
   * the SAME server-side engine (real WhatsApp group IDs from the QR bridge,
   * a cron-driven processor, native day-by-day repeat) the admin CRM's Group
   * Scheduler page uses — not DOM automation scraping visible chat names, so
   * it survives this Chrome tab closing and matches "same as QR WhatsApp".
   */
  function openScheduleGroupsModal() {
    const { overlay, body: mbody } = openModal('📅👥 Schedule Groups');
    mbody.appendChild(el('div', 'sy-fmt-hint', 'Runs via the QR bridge (server-side) — same engine as CRM → QR Group Scheduler. This Chrome tab does not need to stay open.'));

    mbody.appendChild(el('div', 'sy-modal-label', 'Groups'));
    const checklist = el('div', 'sy-modal-checklist');
    checklist.appendChild(el('div', 'sy-empty', 'Loading your groups…'));
    mbody.appendChild(checklist);

    (async () => {
      const res = await adminApi(`/api/admin/crm/whatsapp/qr-bridge?${new URLSearchParams({ path: '/chats' }).toString()}`);
      const raw = res.ok ? (res.data?.data ?? res.data) : null;
      const arr = Array.isArray(raw) ? raw : (Array.isArray(raw?.chats) ? raw.chats : []);
      const groups = arr.filter((c) => c.id?.endsWith?.('@g.us') || c.isGroup === true || c.isGroupChat === true || c.groupMetadata !== undefined);
      checklist.innerHTML = '';
      if (!groups.length) {
        checklist.appendChild(el('div', 'sy-empty', res.ok ? 'No groups found on your connected QR WhatsApp account.' : (res.data?.error || 'Failed to load groups.')));
        return;
      }
      for (const g of groups) {
        const label = document.createElement('label');
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.value = g.id;
        label.appendChild(cb);
        label.appendChild(document.createTextNode(g.name || g.id));
        checklist.appendChild(label);
      }
    })();

    const textarea = document.createElement('textarea');
    textarea.placeholder = 'Message text';
    mbody.appendChild(el('div', 'sy-modal-label', 'Message'));
    addFormatToolbar(mbody, textarea);
    mbody.appendChild(textarea);

    mbody.appendChild(el('div', 'sy-modal-label', 'Media URL (optional — image/video/document)'));
    const mediaInput = document.createElement('input');
    mediaInput.type = 'text';
    mediaInput.placeholder = 'https://…';
    mbody.appendChild(mediaInput);

    mbody.appendChild(el('div', 'sy-modal-label', 'Time (IST)'));
    const timeInput = document.createElement('input');
    timeInput.type = 'time';
    timeInput.value = '18:00';
    mbody.appendChild(timeInput);

    mbody.appendChild(el('div', 'sy-modal-label', 'Schedule name'));
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.placeholder = `Extension Group Schedule — ${new Date().toLocaleDateString()}`;
    mbody.appendChild(nameInput);

    const row = el('div', 'sy-repeat-row');
    const startWrap = el('div', 'sy-repeat-col');
    startWrap.appendChild(el('div', 'sy-modal-label', 'Start date'));
    const startInput = document.createElement('input');
    startInput.type = 'date';
    startInput.value = todayPlusDateStr(1);
    startWrap.appendChild(startInput);
    row.appendChild(startWrap);
    const blockWrap = el('div', 'sy-repeat-col-narrow');
    blockWrap.appendChild(el('div', 'sy-modal-label', 'Days'));
    const blockInput = document.createElement('input');
    blockInput.type = 'text';
    blockInput.value = '1';
    blockWrap.appendChild(blockInput);
    row.appendChild(blockWrap);
    mbody.appendChild(row);

    const actionsRow = el('div', 'sy-repeat-actions');
    const selectAllBtn = el('button', 'sy-modal-btn', 'Select all days');
    selectAllBtn.type = 'button';
    const clearAllBtn = el('button', 'sy-modal-btn', 'Clear all days');
    clearAllBtn.type = 'button';
    actionsRow.appendChild(selectAllBtn);
    actionsRow.appendChild(clearAllBtn);
    mbody.appendChild(actionsRow);

    const daysGrid = el('div', 'sy-repeat-days');
    mbody.appendChild(daysGrid);
    mbody.appendChild(el('div', 'sy-fmt-hint', 'One send per checked day, in a ~30 min window starting at the time above.'));

    function renderDays() {
      daysGrid.innerHTML = '';
      const count = Math.max(1, Math.min(60, parseInt(blockInput.value, 10) || 1));
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

    const msg = el('div', 'sy-modal-msg');
    const footer = el('div', 'sy-modal-footer');
    const cancelBtn = el('button', 'sy-modal-btn', 'Cancel');
    cancelBtn.addEventListener('click', () => overlay.remove());
    const submitBtn = el('button', 'sy-modal-btn sy-primary', 'Schedule');
    submitBtn.addEventListener('click', async () => {
      const groupIds = Array.from(checklist.querySelectorAll('input[type="checkbox"]:checked')).map((c) => c.value);
      const text = textarea.value.trim();
      const dates = Array.from(daysGrid.querySelectorAll('input[type="checkbox"]:checked')).map((c) => c.dataset.date);
      const [hh, mm] = (timeInput.value || '18:00').split(':').map(Number);
      const endTime = `${String(hh).padStart(2, '0')}:${String((mm + 30) % 60).padStart(2, '0')}`;
      if (!groupIds.length) { msg.className = 'sy-modal-msg sy-error'; msg.textContent = 'Select at least one group.'; return; }
      if (!text) { msg.className = 'sy-modal-msg sy-error'; msg.textContent = 'Enter a message.'; return; }
      if (!dates.length) { msg.className = 'sy-modal-msg sy-error'; msg.textContent = 'Select at least one day.'; return; }

      submitBtn.disabled = true;
      submitBtn.textContent = 'Scheduling…';
      const res = await adminApi('/api/admin/crm/qr-broadcast-schedule', 'POST', {
        name: nameInput.value.trim() || `Extension Group Schedule — ${new Date().toLocaleString()}`,
        messageText: text,
        mediaUrls: mediaInput.value.trim() ? [mediaInput.value.trim()] : [],
        groupIds,
        frequency: 'custom',
        customScheduleDates: dates,
        startTime: timeInput.value || '18:00',
        endTime,
      });
      submitBtn.disabled = false;
      submitBtn.textContent = 'Schedule';
      if (res.ok && res.data?.success) {
        msg.className = 'sy-modal-msg sy-ok';
        msg.textContent = `✅ Scheduled ${groupIds.length} group(s) × ${dates.length} day(s).`;
        setTimeout(() => overlay.remove(), 1600);
      } else {
        msg.className = 'sy-modal-msg sy-error';
        msg.textContent = res.data?.error || 'Failed to schedule.';
      }
    });
    footer.appendChild(cancelBtn);
    footer.appendChild(submitBtn);
    mbody.appendChild(msg);
    mbody.appendChild(footer);
  }

  /** Finds this phone's existing CRM lead, or creates a bare one — needed
   *  because /api/admin/crm/broadcast-runs always targets lead IDs, never a
   *  raw phone number. */
  async function resolveOrCreateLeadId(phone, name) {
    const lookup = await sendMessage({ type: 'GET_LEAD', phone });
    if (lookup.ok && lookup.data?.found && lookup.data?._id) return { leadId: lookup.data._id, error: null };
    const created = await adminApi('/api/admin/crm/leads', 'POST', {
      name: name || 'WhatsApp Contact', phoneNumber: phone, status: 'new', source: 'extension',
    });
    if (created.ok && created.data?.success && created.data?.data?._id) {
      return { leadId: created.data.data._id, error: null };
    }
    if (created.data?.duplicate && created.data?.existingLead?._id) {
      return { leadId: created.data.existingLead._id, error: null };
    }
    return { leadId: null, error: created.data?.error || 'Could not resolve a CRM lead for this number.' };
  }

  /**
   * "Schedule Message" popup — 1:1 messaging, rebuilt on top of
   * /api/admin/crm/broadcast-runs (Send Now / Schedule / Repeat all
   * server-side via the QR bridge) instead of chrome.alarms + DOM
   * automation. Either pick a saved template (keeps its real header
   * image/video/document + buttons) or type custom text, which gets saved
   * as a one-off template behind the scenes so it can go through the same
   * reliable pipeline.
   */
  function openScheduleMessageModal(setToolStatus) {
    const { overlay, body: mbody } = openModal('📅 Schedule Message');
    mbody.appendChild(el('div', 'sy-fmt-hint', 'Runs via the QR bridge (server-side) — same engine as CRM → QR Broadcast. This Chrome tab does not need to stay open.'));

    mbody.appendChild(el('div', 'sy-modal-label', 'Contact phone number'));
    const phoneInput = document.createElement('input');
    phoneInput.type = 'text';
    phoneInput.placeholder = '91XXXXXXXXXX';
    phoneInput.value = state.currentPhone || '';
    mbody.appendChild(phoneInput);

    const tplPicker = addTemplateIdPicker(mbody);
    mbody.appendChild(el('div', 'sy-fmt-hint', '— or type a one-off message below (used instead of the template above) —'));

    const textarea = document.createElement('textarea');
    textarea.placeholder = 'Custom message text (optional if a template is picked above)';
    mbody.appendChild(el('div', 'sy-modal-label', 'Message'));
    addFormatToolbar(mbody, textarea);
    mbody.appendChild(textarea);

    mbody.appendChild(el('div', 'sy-modal-label', 'When'));
    const modeWrap = el('div', 'sy-repeat-row');
    const nowLabel = el('label', 'sy-radio-label');
    const nowRadio = document.createElement('input');
    nowRadio.type = 'radio'; nowRadio.name = 'sy-sm-mode'; nowRadio.value = 'now'; nowRadio.checked = true;
    nowLabel.appendChild(nowRadio);
    nowLabel.appendChild(document.createTextNode('Send now'));
    const laterLabel = el('label', 'sy-radio-label');
    const laterRadio = document.createElement('input');
    laterRadio.type = 'radio'; laterRadio.name = 'sy-sm-mode'; laterRadio.value = 'schedule';
    laterLabel.appendChild(laterRadio);
    laterLabel.appendChild(document.createTextNode('Schedule'));
    modeWrap.appendChild(nowLabel);
    modeWrap.appendChild(laterLabel);
    mbody.appendChild(modeWrap);

    const whenInput = document.createElement('input');
    whenInput.type = 'datetime-local';
    whenInput.style.display = 'none';
    mbody.appendChild(whenInput);
    laterRadio.addEventListener('change', () => { whenInput.style.display = 'block'; });
    nowRadio.addEventListener('change', () => { whenInput.style.display = 'none'; });

    const repeat = addRepeatBlock(mbody);

    const msg = el('div', 'sy-modal-msg');
    const footer = el('div', 'sy-modal-footer');
    const cancelBtn = el('button', 'sy-modal-btn', 'Cancel');
    cancelBtn.addEventListener('click', () => overlay.remove());
    const submitBtn = el('button', 'sy-modal-btn sy-primary', 'Schedule');
    submitBtn.addEventListener('click', async () => {
      const phone = phoneInput.value.replace(/\D/g, '');
      const text = textarea.value.trim();
      const pickedTpl = tplPicker.getSelected();
      const mode = laterRadio.checked ? 'schedule' : 'now';
      if (!phone) { msg.className = 'sy-modal-msg sy-error'; msg.textContent = 'Enter a phone number.'; return; }
      if (!pickedTpl && !text) { msg.className = 'sy-modal-msg sy-error'; msg.textContent = 'Pick a template or type a message.'; return; }
      if (!repeat.isEnabled() && mode === 'schedule' && !whenInput.value) {
        msg.className = 'sy-modal-msg sy-error'; msg.textContent = 'Pick a date/time, choose Send now, or turn on Repeat.'; return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = 'Working…';

      const { leadId, error: leadErr } = await resolveOrCreateLeadId(phone);
      if (!leadId) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Schedule';
        msg.className = 'sy-modal-msg sy-error';
        msg.textContent = leadErr;
        return;
      }

      let templateId = pickedTpl?._id;
      if (!templateId) {
        const created = await sendMessage({
          type: 'CREATE_TEMPLATE',
          template: { templateName: `adhoc_${Date.now()}`, category: 'MARKETING', language: 'en', templateContent: text },
        });
        if (!created.ok || !created.data?.success) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Schedule';
          msg.className = 'sy-modal-msg sy-error';
          msg.textContent = created.data?.error || 'Failed to save message.';
          return;
        }
        templateId = created.data.template._id;
      }

      const sendOne = async (scheduleAt) => adminApi('/api/admin/crm/broadcast-runs', 'POST', {
        name: `Extension Schedule Message — ${new Date().toLocaleString()}`,
        templateId,
        mode: scheduleAt ? 'schedule' : 'now',
        provider: 'qr',
        scheduleAt,
        target: { leadIds: [leadId] },
      });

      let okCount = 0;
      const errors = [];
      if (repeat.isEnabled()) {
        const timestamps = repeat.getTimestamps();
        if (!timestamps.length) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Schedule';
          msg.className = 'sy-modal-msg sy-error';
          msg.textContent = 'No days selected for Repeat.';
          return;
        }
        for (const ts of timestamps) {
          const res = await sendOne(new Date(ts).toISOString());
          if (res.ok && res.data?.success) okCount++; else errors.push(res.data?.error || 'failed');
        }
      } else {
        const scheduleAt = mode === 'schedule' ? new Date(whenInput.value).toISOString() : undefined;
        const createRes = await sendOne(scheduleAt);
        if (createRes.ok && createRes.data?.success) {
          okCount = 1;
          if (mode === 'now') {
            const runId = createRes.data.data?._id;
            if (runId) await adminApi('/api/admin/crm/broadcast-runs/run', 'POST', { runId });
          }
        } else {
          errors.push(createRes.data?.error || 'failed');
        }
      }

      submitBtn.disabled = false;
      submitBtn.textContent = 'Schedule';
      if (okCount) {
        setToolStatus?.(`✅ ${mode === 'now' && !repeat.isEnabled() ? 'Sent' : 'Scheduled'} ${okCount} message(s) to ${phone}${errors.length ? `, ${errors.length} failed` : ''}.`, errors.length > 0);
        overlay.remove();
      } else {
        msg.className = 'sy-modal-msg sy-error';
        msg.textContent = errors[0] || 'Failed.';
      }
    });
    footer.appendChild(cancelBtn);
    footer.appendChild(submitBtn);
    mbody.appendChild(msg);
    mbody.appendChild(footer);
  }

  /**
   * "Broadcast" popup — template + recipient picker + Send Now/Schedule,
   * same shape as the admin's New QR Broadcast wizard. Runs entirely through
   * /api/admin/crm/broadcast-runs (the QR bridge, server-side) — not DOM
   * automation — so pacing/anti-ban and delivery tracking are the same code
   * the CRM's own Broadcast page uses, and it doesn't need this Chrome tab
   * to stay open.
   */
  /**
   * "My Status" popup — text and/or an image/video URL, Post now or
   * Schedule/Repeat (chrome.alarms-based, same as Schedule Selected — best
   * effort, needs this Chrome window open at the scheduled time; there's
   * no server-side equivalent for Status the way there is for chats).
   */
  function openMyStatusModal() {
    const { overlay, body: mbody } = openModal('📸 My Status');
    overlay.querySelector('.sy-modal-header')?.classList.add('sy-modal-header-status');

    mbody.appendChild(el('div', 'sy-modal-label', 'Status Text'));
    const textarea = document.createElement('textarea');
    textarea.placeholder = "What's on your mind?";
    addFormatToolbar(mbody, textarea);
    mbody.appendChild(textarea);

    mbody.appendChild(el('div', 'sy-modal-label', 'Image / Video URL (optional)'));
    const mediaInput = document.createElement('input');
    mediaInput.type = 'text';
    mediaInput.placeholder = 'https://…';
    mbody.appendChild(mediaInput);

    mbody.appendChild(el('div', 'sy-fmt-hint', '— or —'));
    const fileRow = el('div', 'sy-status-file-row');
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*,video/*';
    fileInput.id = 'sy-status-file-input';
    fileInput.style.display = 'none';
    const filePickBtn = el('button', 'sy-modal-btn', '📁 Upload from your computer');
    filePickBtn.type = 'button';
    filePickBtn.addEventListener('click', () => fileInput.click());
    const fileNameLabel = el('span', 'sy-fmt-hint', '');
    let selectedFile = null;
    fileInput.addEventListener('change', () => {
      selectedFile = fileInput.files?.[0] || null;
      fileNameLabel.textContent = selectedFile ? selectedFile.name : '';
      if (selectedFile) {
        mediaInput.value = '';
        mediaInput.disabled = true;
        nowRadio.checked = true;
        laterRadio.disabled = true;
        whenInput.style.display = 'none';
      }
    });
    const clearFileBtn = el('button', 'sy-modal-btn', '×');
    clearFileBtn.type = 'button';
    clearFileBtn.title = 'Remove uploaded file';
    clearFileBtn.addEventListener('click', () => {
      selectedFile = null;
      fileInput.value = '';
      fileNameLabel.textContent = '';
      mediaInput.disabled = false;
      laterRadio.disabled = false;
    });
    fileRow.appendChild(filePickBtn);
    fileRow.appendChild(fileNameLabel);
    fileRow.appendChild(clearFileBtn);
    fileRow.appendChild(fileInput);
    mbody.appendChild(fileRow);
    mbody.appendChild(el('div', 'sy-fmt-hint', 'An uploaded file can only Post now — Schedule/Repeat needs a URL instead, since a local file can\'t be saved for later.'));

    mbody.appendChild(el('div', 'sy-modal-label', 'When'));
    const modeWrap = el('div', 'sy-repeat-row');
    const nowLabel = el('label', 'sy-radio-label');
    const nowRadio = document.createElement('input');
    nowRadio.type = 'radio'; nowRadio.name = 'sy-status-mode'; nowRadio.value = 'now'; nowRadio.checked = true;
    nowLabel.appendChild(nowRadio);
    nowLabel.appendChild(document.createTextNode('Post now'));
    const laterLabel = el('label', 'sy-radio-label');
    const laterRadio = document.createElement('input');
    laterRadio.type = 'radio'; laterRadio.name = 'sy-status-mode'; laterRadio.value = 'schedule';
    laterLabel.appendChild(laterRadio);
    laterLabel.appendChild(document.createTextNode('Schedule'));
    modeWrap.appendChild(nowLabel);
    modeWrap.appendChild(laterLabel);
    mbody.appendChild(modeWrap);

    const whenInput = document.createElement('input');
    whenInput.type = 'datetime-local';
    whenInput.style.display = 'none';
    mbody.appendChild(whenInput);
    laterRadio.addEventListener('change', () => { whenInput.style.display = 'block'; });
    nowRadio.addEventListener('change', () => { whenInput.style.display = 'none'; });

    const repeat = addRepeatBlock(mbody);
    mbody.appendChild(el('div', 'sy-fmt-hint', 'Scheduled/repeated posts fire from this browser — keep this Chrome window open at the scheduled time(s).'));

    const msg = el('div', 'sy-modal-msg');
    const footer = el('div', 'sy-modal-footer');
    const cancelBtn = el('button', 'sy-modal-btn', 'Cancel');
    cancelBtn.addEventListener('click', () => overlay.remove());
    const submitBtn = el('button', 'sy-modal-btn sy-status-primary', '📸 Post Status');
    submitBtn.addEventListener('click', async () => {
      const text = textarea.value.trim();
      const mediaUrl = mediaInput.value.trim();
      const mode = laterRadio.checked ? 'schedule' : 'now';
      if (!text && !mediaUrl && !selectedFile) { msg.className = 'sy-modal-msg sy-error'; msg.textContent = 'Add status text, a media URL, or upload a file.'; return; }
      if (selectedFile && (mode !== 'now' || repeat.isEnabled())) {
        msg.className = 'sy-modal-msg sy-error';
        msg.textContent = 'An uploaded file can only Post now — remove it, or switch to Post now with Repeat off.';
        return;
      }

      if (mode === 'now' && !repeat.isEnabled()) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Posting…';
        const result = selectedFile
          ? await postMediaStatusFromFile(selectedFile, text)
          : mediaUrl ? await postMediaStatus(mediaUrl, text) : await postTextStatus(text);
        submitBtn.disabled = false;
        submitBtn.textContent = '📸 Post Status';
        if (result.ok) {
          msg.className = 'sy-modal-msg sy-ok';
          msg.textContent = '✅ Status posted.';
          setTimeout(() => overlay.remove(), 1400);
        } else {
          msg.className = 'sy-modal-msg sy-error';
          msg.textContent = `❌ ${result.error}`;
        }
        return;
      }

      let timestamps = [];
      if (repeat.isEnabled()) {
        timestamps = repeat.getTimestamps();
        if (!timestamps.length) { msg.className = 'sy-modal-msg sy-error'; msg.textContent = 'No days selected for Repeat.'; return; }
      } else {
        if (!whenInput.value) { msg.className = 'sy-modal-msg sy-error'; msg.textContent = 'Pick a date/time, or choose Post now.'; return; }
        const t = new Date(whenInput.value).getTime();
        if (isNaN(t) || t <= Date.now()) { msg.className = 'sy-modal-msg sy-error'; msg.textContent = 'Pick a valid future date/time.'; return; }
        timestamps = [t];
      }

      submitBtn.disabled = true;
      let scheduled = 0;
      for (const ts of timestamps) {
        const res = await sendMessage({ type: 'SCHEDULE_STATUS', text, mediaUrl, sendAt: ts });
        if (res.ok) scheduled++;
      }
      submitBtn.disabled = false;
      submitBtn.textContent = '📸 Post Status';
      if (scheduled) {
        msg.className = 'sy-modal-msg sy-ok';
        msg.textContent = `✅ Scheduled ${scheduled} status post(s). Keep this Chrome window open at the scheduled time(s).`;
        setTimeout(() => overlay.remove(), 1800);
      } else {
        msg.className = 'sy-modal-msg sy-error';
        msg.textContent = 'Failed to schedule.';
      }
    });
    footer.appendChild(cancelBtn);
    footer.appendChild(submitBtn);
    mbody.appendChild(msg);
    mbody.appendChild(footer);
  }

  function openBroadcastModal() {
    const { overlay, body: mbody } = openModal('📣 Broadcast');
    mbody.appendChild(el('div', 'sy-fmt-hint', 'Runs via the QR bridge (server-side, auto-paced) — same engine as CRM → QR Broadcast.'));

    const tplPicker = addTemplateIdPicker(mbody);
    const leadPicker = addLeadPicker(mbody, { label: 'Recipients' });

    mbody.appendChild(el('div', 'sy-modal-label', 'When'));
    const modeWrap = el('div', 'sy-repeat-row');
    const nowLabel = el('label', 'sy-radio-label');
    const nowRadio = document.createElement('input');
    nowRadio.type = 'radio'; nowRadio.name = 'sy-bc-mode'; nowRadio.value = 'now'; nowRadio.checked = true;
    nowLabel.appendChild(nowRadio);
    nowLabel.appendChild(document.createTextNode('Send now'));
    const laterLabel = el('label', 'sy-radio-label');
    const laterRadio = document.createElement('input');
    laterRadio.type = 'radio'; laterRadio.name = 'sy-bc-mode'; laterRadio.value = 'schedule';
    laterLabel.appendChild(laterRadio);
    laterLabel.appendChild(document.createTextNode('Schedule'));
    modeWrap.appendChild(nowLabel);
    modeWrap.appendChild(laterLabel);
    mbody.appendChild(modeWrap);

    const whenInput = document.createElement('input');
    whenInput.type = 'datetime-local';
    whenInput.style.display = 'none';
    mbody.appendChild(whenInput);
    laterRadio.addEventListener('change', () => { whenInput.style.display = laterRadio.checked ? 'block' : 'none'; });
    nowRadio.addEventListener('change', () => { whenInput.style.display = laterRadio.checked ? 'block' : 'none'; });

    const msg = el('div', 'sy-modal-msg');
    const footer = el('div', 'sy-modal-footer');
    const cancelBtn = el('button', 'sy-modal-btn', 'Cancel');
    cancelBtn.addEventListener('click', () => overlay.remove());
    const submitBtn = el('button', 'sy-modal-btn sy-primary', 'Send Broadcast');
    submitBtn.addEventListener('click', async () => {
      const tpl = tplPicker.getSelected();
      const leadIds = leadPicker.getSelectedIds();
      const mode = laterRadio.checked ? 'schedule' : 'now';
      if (!tpl) { msg.className = 'sy-modal-msg sy-error'; msg.textContent = 'Pick a template.'; return; }
      if (!leadIds.length) { msg.className = 'sy-modal-msg sy-error'; msg.textContent = 'Select at least one recipient.'; return; }
      let scheduleAt;
      if (mode === 'schedule') {
        if (!whenInput.value) { msg.className = 'sy-modal-msg sy-error'; msg.textContent = 'Pick a date/time, or choose Send now.'; return; }
        scheduleAt = new Date(whenInput.value).toISOString();
      }

      submitBtn.disabled = true;
      submitBtn.textContent = 'Sending…';
      const createRes = await adminApi('/api/admin/crm/broadcast-runs', 'POST', {
        name: `Extension Broadcast — ${new Date().toLocaleString()}`,
        templateId: tpl._id,
        mode,
        provider: 'qr',
        scheduleAt,
        target: { leadIds },
      });
      if (!createRes.ok || !createRes.data?.success) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Send Broadcast';
        msg.className = 'sy-modal-msg sy-error';
        msg.textContent = createRes.data?.error || 'Failed to create broadcast.';
        return;
      }
      const runId = createRes.data?.data?._id;
      if (mode === 'now' && runId) {
        await adminApi('/api/admin/crm/broadcast-runs/run', 'POST', { runId });
      }
      submitBtn.disabled = false;
      submitBtn.textContent = 'Send Broadcast';
      msg.className = 'sy-modal-msg sy-ok';
      msg.textContent = `✅ Broadcast ${mode === 'now' ? 'started' : 'scheduled'} for ${leadIds.length} recipient(s). Check Report for progress.`;
      setTimeout(() => overlay.remove(), 1800);
    });
    footer.appendChild(cancelBtn);
    footer.appendChild(submitBtn);
    mbody.appendChild(msg);
    mbody.appendChild(footer);
  }

  /**
   * "Funnel" popup — list people currently in each funnel stage (real data
   * from the leads API, not just chats you happen to have opened), move
   * people into a stage, and send a message to everyone in a stage. The
   * "send to stage" path reuses Broadcast's engine with a status filter
   * instead of explicit lead IDs, so it doesn't need to fetch/select
   * thousands of leads client-side.
   */
  function openFunnelModal() {
    const { overlay, body: mbody } = openModal('🔻 Funnel', { large: true });

    mbody.appendChild(el('div', 'sy-modal-label', 'Stage'));
    const stageSelect = document.createElement('select');
    const stageList = funnelStages.length ? funnelStages : ['new'];
    for (const s of stageList) {
      const opt = document.createElement('option');
      opt.value = s;
      opt.textContent = s.replace(/_/g, ' ');
      stageSelect.appendChild(opt);
    }
    mbody.appendChild(stageSelect);

    const countLine = el('div', 'sy-fmt-hint', 'Loading…');
    mbody.appendChild(countLine);
    const listBox = el('div', 'sy-modal-checklist');
    mbody.appendChild(listBox);

    async function loadStage() {
      countLine.textContent = 'Loading…';
      listBox.innerHTML = '';
      const params = new URLSearchParams({ qrOnly: '1', limit: '30', selectAll: 'true', fields: 'name,phoneNumber', status: stageSelect.value });
      const res = await adminApi(`/api/admin/crm/leads?${params.toString()}`);
      const leads = res.ok ? (res.data?.data?.leads || []) : [];
      const total = res.ok ? (res.data?.data?.total ?? leads.length) : 0;
      countLine.textContent = `${total} in this stage${total > leads.length ? ` (showing first ${leads.length})` : ''}`;
      if (!leads.length) {
        listBox.appendChild(el('div', 'sy-empty', 'No one in this stage yet.'));
      } else {
        for (const lead of leads) {
          listBox.appendChild(el('div', 'sy-quick-reply', `${lead.name || 'Unnamed'} — ${lead.phoneNumber || ''}`));
        }
      }
    }
    stageSelect.addEventListener('change', loadStage);
    loadStage();

    mbody.appendChild(el('div', 'sy-modal-label', 'Add a person to this stage'));
    const addRow = el('div', 'sy-button-row');
    const addPhoneInput = document.createElement('input');
    addPhoneInput.type = 'text';
    addPhoneInput.placeholder = 'Phone number';
    addPhoneInput.style.cssText = 'width:auto;flex:1;min-width:0;margin-bottom:0;';
    const addNameInput = document.createElement('input');
    addNameInput.type = 'text';
    addNameInput.placeholder = 'Name (optional)';
    addNameInput.style.cssText = 'width:auto;flex:1;min-width:0;margin-bottom:0;';
    const addBtn = el('button', 'sy-modal-btn', 'Add');
    addBtn.type = 'button';
    addRow.appendChild(addPhoneInput);
    addRow.appendChild(addNameInput);
    addRow.appendChild(addBtn);
    mbody.appendChild(addRow);

    const addMsg = el('div', 'sy-modal-msg');
    mbody.appendChild(addMsg);
    addBtn.addEventListener('click', async () => {
      const phone = addPhoneInput.value.replace(/\D/g, '');
      if (!phone) { addMsg.className = 'sy-modal-msg sy-error'; addMsg.textContent = 'Enter a phone number.'; return; }
      addBtn.disabled = true;
      const res = await adminApi('/api/admin/crm/leads', 'POST', {
        name: addNameInput.value.trim() || 'Unnamed',
        phoneNumber: phone,
        status: stageSelect.value,
        source: 'extension',
      });
      addBtn.disabled = false;
      if (res.ok && (res.data?.success !== false)) {
        addMsg.className = 'sy-modal-msg sy-ok';
        addMsg.textContent = '✅ Added.';
        addPhoneInput.value = '';
        addNameInput.value = '';
        loadStage();
      } else {
        addMsg.className = 'sy-modal-msg sy-error';
        addMsg.textContent = res.data?.error || 'Failed to add — they may already be in the CRM; edit their stage from the Contact card instead.';
      }
    });

    mbody.appendChild(el('div', 'sy-modal-label', 'Send a message to everyone in this stage'));
    const tplPicker = addTemplateIdPicker(mbody);
    mbody.appendChild(el('div', 'sy-fmt-hint', '— or create a one-off message below (used instead of the template above) —'));

    mbody.appendChild(el('div', 'sy-modal-label', 'Message'));
    const sendTextarea = document.createElement('textarea');
    sendTextarea.placeholder = 'Custom message text (optional if a template is picked above)';
    addFormatToolbar(mbody, sendTextarea);
    mbody.appendChild(sendTextarea);

    mbody.appendChild(el('div', 'sy-modal-label', 'Image / Video / Document (optional)'));
    const sendMediaInput = document.createElement('input');
    sendMediaInput.type = 'text';
    sendMediaInput.placeholder = 'Paste a hosted URL, or upload below';
    mbody.appendChild(sendMediaInput);
    const sendUploadBtn = el('button', 'sy-modal-btn', '📁 Upload a file instead');
    sendUploadBtn.type = 'button';
    sendUploadBtn.addEventListener('click', () => sendFileInput.click());
    mbody.appendChild(sendUploadBtn);
    const sendFileInput = document.createElement('input');
    sendFileInput.type = 'file';
    sendFileInput.style.display = 'none';
    const sendUploadStatus = el('div', 'sy-fmt-hint', '');
    sendFileInput.addEventListener('change', async () => {
      const file = sendFileInput.files?.[0];
      if (!file) return;
      sendUploadStatus.textContent = `⏳ Uploading ${file.name}…`;
      const res = await sendMessage({ type: 'UPLOAD_MEDIA', file });
      if (res.ok && res.data?.success !== false && res.data?.url) {
        sendMediaInput.value = res.data.url;
        sendUploadStatus.textContent = `✅ Uploaded: ${file.name}`;
      } else {
        sendUploadStatus.textContent = `❌ ${res.data?.error || 'Upload failed'} — paste a URL instead.`;
      }
    });
    mbody.appendChild(sendFileInput);
    mbody.appendChild(sendUploadStatus);

    mbody.appendChild(el('div', 'sy-modal-label', 'When'));
    const sendModeWrap = el('div', 'sy-repeat-row');
    const sendNowLabel = el('label', 'sy-radio-label');
    const sendNowRadio = document.createElement('input');
    sendNowRadio.type = 'radio'; sendNowRadio.name = 'sy-funnel-mode'; sendNowRadio.value = 'now'; sendNowRadio.checked = true;
    sendNowLabel.appendChild(sendNowRadio);
    sendNowLabel.appendChild(document.createTextNode('Send now'));
    const sendLaterLabel = el('label', 'sy-radio-label');
    const sendLaterRadio = document.createElement('input');
    sendLaterRadio.type = 'radio'; sendLaterRadio.name = 'sy-funnel-mode'; sendLaterRadio.value = 'schedule';
    sendLaterLabel.appendChild(sendLaterRadio);
    sendLaterLabel.appendChild(document.createTextNode('Schedule'));
    sendModeWrap.appendChild(sendNowLabel);
    sendModeWrap.appendChild(sendLaterLabel);
    mbody.appendChild(sendModeWrap);

    const sendWhenInput = document.createElement('input');
    sendWhenInput.type = 'datetime-local';
    sendWhenInput.style.display = 'none';
    mbody.appendChild(sendWhenInput);
    sendLaterRadio.addEventListener('change', () => { sendWhenInput.style.display = 'block'; });
    sendNowRadio.addEventListener('change', () => { sendWhenInput.style.display = 'none'; });

    const sendRepeat = addRepeatBlock(mbody);

    const sendMsg = el('div', 'sy-modal-msg');
    const sendBtn = el('button', 'sy-modal-btn sy-primary', 'Send to Stage');
    sendBtn.addEventListener('click', async () => {
      const tpl = tplPicker.getSelected();
      const text = sendTextarea.value.trim();
      const mediaUrl = sendMediaInput.value.trim();
      const mode = sendLaterRadio.checked ? 'schedule' : 'now';
      if (!tpl && !text) { sendMsg.className = 'sy-modal-msg sy-error'; sendMsg.textContent = 'Pick a template or type a message.'; return; }
      if (!sendRepeat.isEnabled() && mode === 'schedule' && !sendWhenInput.value) {
        sendMsg.className = 'sy-modal-msg sy-error'; sendMsg.textContent = 'Pick a date/time, choose Send now, or turn on Repeat.'; return;
      }
      if (!confirm(`Send to everyone in "${stageSelect.value.replace(/_/g, ' ')}"?`)) return;

      sendBtn.disabled = true;
      sendBtn.textContent = 'Working…';

      let templateId = tpl?._id;
      if (!templateId) {
        const templatePayload = { templateName: `adhoc_${Date.now()}`, category: 'MARKETING', language: 'en', templateContent: text };
        if (mediaUrl) { templatePayload.headerFormat = 'IMAGE'; templatePayload.headerContent = mediaUrl; }
        const created = await sendMessage({ type: 'CREATE_TEMPLATE', template: templatePayload });
        if (!created.ok || !created.data?.success) {
          sendBtn.disabled = false;
          sendBtn.textContent = 'Send to Stage';
          sendMsg.className = 'sy-modal-msg sy-error';
          sendMsg.textContent = created.data?.error || 'Failed to save message.';
          return;
        }
        templateId = created.data.template._id;
      }

      const sendOne = async (scheduleAt) => adminApi('/api/admin/crm/broadcast-runs', 'POST', {
        name: `Extension Funnel Send — ${stageSelect.value} — ${new Date().toLocaleString()}`,
        templateId,
        mode: scheduleAt ? 'schedule' : 'now',
        provider: 'qr',
        scheduleAt,
        target: { type: 'filters', filters: { status: stageSelect.value } },
      });

      let okCount = 0;
      const errors = [];
      if (sendRepeat.isEnabled()) {
        const timestamps = sendRepeat.getTimestamps();
        if (!timestamps.length) {
          sendBtn.disabled = false;
          sendBtn.textContent = 'Send to Stage';
          sendMsg.className = 'sy-modal-msg sy-error';
          sendMsg.textContent = 'No days selected for Repeat.';
          return;
        }
        for (const ts of timestamps) {
          const res = await sendOne(new Date(ts).toISOString());
          if (res.ok && res.data?.success) okCount++; else errors.push(res.data?.error || 'failed');
        }
      } else {
        const scheduleAt = mode === 'schedule' ? new Date(sendWhenInput.value).toISOString() : undefined;
        const createRes = await sendOne(scheduleAt);
        if (createRes.ok && createRes.data?.success) {
          okCount = 1;
          if (mode === 'now') {
            const runId = createRes.data.data?._id;
            if (runId) await adminApi('/api/admin/crm/broadcast-runs/run', 'POST', { runId });
          }
        } else {
          errors.push(createRes.data?.error || 'failed');
        }
      }

      sendBtn.disabled = false;
      sendBtn.textContent = 'Send to Stage';
      if (okCount) {
        sendMsg.className = 'sy-modal-msg sy-ok';
        sendMsg.textContent = `✅ ${mode === 'now' && !sendRepeat.isEnabled() ? 'Started' : 'Scheduled'} ${okCount} send(s) to "${stageSelect.value.replace(/_/g, ' ')}"${errors.length ? `, ${errors.length} failed` : ''}. Check Report for progress.`;
      } else {
        sendMsg.className = 'sy-modal-msg sy-error';
        sendMsg.textContent = errors[0] || 'Failed.';
      }
    });
    mbody.appendChild(sendMsg);
    const footer = el('div', 'sy-modal-footer');
    const closeBtn = el('button', 'sy-modal-btn', 'Close');
    closeBtn.addEventListener('click', () => overlay.remove());
    footer.appendChild(closeBtn);
    footer.appendChild(sendBtn);
    mbody.appendChild(footer);
  }

  /**
   * "Report" popup — read-only view of QR broadcast delivery status
   * (sent/pending/read/delivered/failed + blocked numbers), pulled straight
   * from the same aggregation the admin CRM's broadcast history uses.
   */
  /**
   * "Leads" popup — native searchable table (not the live admin page),
   * pulling the same /api/admin/crm/leads data already used elsewhere in
   * the extension. Click a row to open that lead's chat.
   */
  function openLeadsModal() {
    const { overlay, body: mbody } = openModal('📋 Leads', { large: true });
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.placeholder = 'Search by name or phone…';
    mbody.appendChild(searchInput);

    const countLine = el('div', 'sy-fmt-hint', 'Loading…');
    mbody.appendChild(countLine);

    const listBox = el('div');
    listBox.style.marginTop = '10px';
    mbody.appendChild(listBox);

    function renderTable(leads, total) {
      countLine.textContent = `${total} lead(s)${total > leads.length ? ` (showing first ${leads.length})` : ''}`;
      listBox.innerHTML = '';
      if (!leads.length) { listBox.appendChild(el('div', 'sy-empty', 'No leads found.')); return; }
      const wrap = el('div', 'sy-report-table-wrap');
      const table = document.createElement('table');
      table.className = 'sy-report-table';
      const thead = document.createElement('thead');
      thead.innerHTML = '<tr><th>Name</th><th>Phone</th><th>Status</th><th>Source</th><th>Created</th></tr>';
      table.appendChild(thead);
      const tbody = document.createElement('tbody');
      for (const lead of leads) {
        const tr = document.createElement('tr');
        tr.style.cursor = 'pointer';
        tr.title = 'Click to open this chat';
        [
          lead.name || 'Unnamed',
          lead.phoneNumber || '',
          (lead.status || '').replace(/_/g, ' '),
          lead.source || '',
          lead.createdAt ? new Date(lead.createdAt).toLocaleDateString() : '',
        ].forEach((val) => {
          const td = document.createElement('td');
          td.textContent = val;
          tr.appendChild(td);
        });
        tr.addEventListener('click', () => {
          if (lead.phoneNumber) { overlay.remove(); startNewChat(lead.phoneNumber); }
        });
        tbody.appendChild(tr);
      }
      table.appendChild(tbody);
      wrap.appendChild(table);
      listBox.appendChild(wrap);
    }

    let searchTimer = null;
    async function runSearch() {
      countLine.textContent = 'Searching…';
      const params = new URLSearchParams({ qrOnly: '1', limit: '50', selectAll: 'true', fields: 'name,phoneNumber,status,source,createdAt' });
      const q = searchInput.value.trim();
      if (q) params.set('q', q);
      const res = await adminApi(`/api/admin/crm/leads?${params.toString()}`);
      if (!res.ok) { countLine.textContent = res.data?.error || 'Failed to load leads.'; return; }
      const leads = res.data?.data?.leads || [];
      const total = res.data?.data?.total ?? leads.length;
      renderTable(leads, total);
    }
    searchInput.addEventListener('input', () => { clearTimeout(searchTimer); searchTimer = setTimeout(runSearch, 350); });
    runSearch();

    const footer = el('div', 'sy-modal-footer');
    const closeBtn = el('button', 'sy-modal-btn sy-primary', 'Close');
    closeBtn.addEventListener('click', () => overlay.remove());
    footer.appendChild(closeBtn);
    mbody.appendChild(footer);
  }

  /**
   * "Sales" popup — the REAL admin Sales page (uploads, Tally sync, PDF
   * extraction, bulk import — too complex to meaningfully rebuild) shown
   * in an iframe. Requires swaryoga.com's middleware to specifically allow
   * framing this one path from web.whatsapp.com's origin (see
   * EXTENSION_EMBEDDABLE_PATHS in middleware.ts) — every other admin page
   * still blocks framing entirely. You need to already be logged into
   * swaryoga.com in this browser for the iframe to show real data.
   */
  function openSalesModal() {
    const { overlay, body: mbody } = openModal('💰 Sales', { large: true });

    const iframe = document.createElement('iframe');
    iframe.src = 'https://swaryoga.com/admin/crm/sales';
    iframe.className = 'sy-embed-iframe';
    const loadingMsg = el('div', 'sy-empty', 'Loading… (you need to already be logged into swaryoga.com in this browser)');
    mbody.appendChild(loadingMsg);
    iframe.addEventListener('load', () => loadingMsg.remove());
    mbody.appendChild(iframe);

    const footer = el('div', 'sy-modal-footer');
    const openTabBtn = el('button', 'sy-modal-btn', 'Open in new tab instead');
    openTabBtn.addEventListener('click', () => window.open('https://swaryoga.com/admin/crm/sales', '_blank', 'noopener,noreferrer'));
    const closeBtn = el('button', 'sy-modal-btn sy-primary', 'Close');
    closeBtn.addEventListener('click', () => overlay.remove());
    footer.appendChild(openTabBtn);
    footer.appendChild(closeBtn);
    mbody.appendChild(footer);
  }

  function openReportModal() {
    const { overlay, body: mbody } = openModal('📈 QR Broadcast Report', { large: true });
    const summaryBox = el('div', 'sy-empty', 'Loading…');
    mbody.appendChild(summaryBox);
    const runsBox = el('div');
    mbody.appendChild(runsBox);

    (async () => {
      const [runsRes, blockedRes] = await Promise.all([
        adminApi('/api/admin/crm/broadcast-runs?provider=qr&limit=25'),
        adminApi('/api/admin/crm/whatsapp/qr/broadcast-blocked'),
      ]);

      if (!runsRes.ok || !runsRes.data?.success) {
        summaryBox.textContent = runsRes.data?.error || 'Failed to load report.';
        return;
      }
      const summary = runsRes.data.data?.summary || {};
      const runs = runsRes.data.data?.runs || [];
      const blockedCount = Array.isArray(blockedRes.data?.data) ? blockedRes.data.data.length
        : Array.isArray(blockedRes.data?.blocked) ? blockedRes.data.blocked.length : 0;

      summaryBox.className = '';
      summaryBox.innerHTML = '';
      const statLabels = [
        ['sent', 'Sent'], ['delivered', 'Delivered'], ['read', 'Read'],
        ['pending', 'Pending'], ['failed', 'Failed'], ['skipped', 'Skipped'],
      ];
      const grid = el('div', 'sy-report-grid');
      grid.style.gridTemplateColumns = 'repeat(7, 1fr)';
      for (const [key, label] of statLabels) {
        const card = el('div', 'sy-report-card');
        card.appendChild(el('div', 'sy-report-num', String(summary[key] || 0)));
        card.appendChild(el('div', 'sy-report-label', label));
        grid.appendChild(card);
      }
      const blockedCard = el('div', 'sy-report-card sy-report-card-warn');
      blockedCard.appendChild(el('div', 'sy-report-num', String(blockedCount)));
      blockedCard.appendChild(el('div', 'sy-report-label', 'Blocked'));
      grid.appendChild(blockedCard);
      summaryBox.appendChild(grid);

      runsBox.appendChild(el('div', 'sy-modal-label', 'Recent broadcasts'));
      if (!runs.length) {
        runsBox.appendChild(el('div', 'sy-empty', 'No broadcasts yet.'));
      } else {
        const wrap = el('div', 'sy-report-table-wrap');
        const table = document.createElement('table');
        table.className = 'sy-report-table';
        const thead = document.createElement('thead');
        thead.innerHTML = '<tr><th>Name</th><th>Status</th><th>Total</th><th>Sent</th><th>Delivered</th><th>Read</th><th>Pending</th><th>Failed</th><th>Blocked</th><th>Created</th></tr>';
        table.appendChild(thead);
        const tbody = document.createElement('tbody');
        for (const run of runs) {
          const s = run.stats || {};
          const tr = document.createElement('tr');
          const cells = [
            run.name || '(unnamed)',
            null, // status pill, built below
            s.total || 0, s.sent || 0, s.delivered || 0, s.read || 0, s.pending || 0, s.failed || 0, s.blocked || 0,
            new Date(run.createdAt).toLocaleString(),
          ];
          cells.forEach((val, i) => {
            const td = document.createElement('td');
            if (i === 1) {
              const pill = el('span', 'sy-report-status-pill', run.status || 'unknown');
              td.appendChild(pill);
            } else {
              td.textContent = String(val);
            }
            tr.appendChild(td);
          });
          tbody.appendChild(tr);
        }
        table.appendChild(tbody);
        wrap.appendChild(table);
        runsBox.appendChild(wrap);
      }
    })();

    const footer = el('div', 'sy-modal-footer');
    const closeBtn = el('button', 'sy-modal-btn sy-primary', 'Close');
    closeBtn.addEventListener('click', () => overlay.remove());
    footer.appendChild(closeBtn);
    mbody.appendChild(footer);
  }

  /** "Settings" popup — extension-level info + quick links to the admin
   *  settings that govern it (access approval, QR account). Actual toggles
   *  (who has extension access) stay admin-only in the CRM, on purpose. */
  function openSettingsModal() {
    const { overlay, body: mbody } = openModal('⚙️ Settings');
    mbody.appendChild(el('div', 'sy-modal-label', 'Signed in as'));
    mbody.appendChild(el('div', 'sy-empty', `${state.name || state.userId || 'Unknown'}${state.isSuperAdmin ? ' (super admin)' : ''}`));

    mbody.appendChild(el('div', 'sy-modal-label', 'Version'));
    mbody.appendChild(el('div', 'sy-empty', chrome.runtime.getManifest?.().version || ''));

    mbody.appendChild(el('div', 'sy-modal-label', 'Manage in CRM'));
    const links = [
      ['🧩 Extension access (who can use this)', '/admin/crm/qr?tab=settings'],
      ['📇 QR WhatsApp account', '/admin/crm/qr'],
      ['🤖 Chatbot flows', '/admin/crm/qr/chatbot'],
    ];
    for (const [label, path] of links) {
      const a = document.createElement('a');
      a.href = `https://swaryoga.com${path}`;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.className = 'sy-settings-link';
      a.textContent = label;
      mbody.appendChild(a);
    }

    const logoutBtn = el('button', 'sy-modal-btn', 'Log out of extension');
    logoutBtn.style.marginTop = '14px';
    logoutBtn.addEventListener('click', async () => {
      if (!confirm('Log out of the Swar Yoga CRM extension?')) return;
      await sendMessage({ type: 'LOGOUT' });
      overlay.remove();
      refreshAuthState();
    });
    mbody.appendChild(logoutBtn);

    const footer = el('div', 'sy-modal-footer');
    const closeBtn = el('button', 'sy-modal-btn sy-primary', 'Close');
    closeBtn.addEventListener('click', () => overlay.remove());
    footer.appendChild(closeBtn);
    mbody.appendChild(footer);
  }

  /**
   * "New Group" popup — replaces the old prompt()/prompt() pair with a real
   * form: Regular Group vs Announcement Group, a name field, and a
   * one-per-line members box. Regular Group runs the existing DOM-automation
   * createNewGroup() unchanged. Announcement Group is refused with an
   * explanation rather than silently failing — WhatsApp's own "New Group"
   * flow (the one this drives) has no such option; Communities/Announcement
   * groups need a different creation flow this doesn't support.
   */
  function openNewGroupModal() {
    const { overlay, body: mbody } = openModal('👥 New Group');

    mbody.appendChild(el('div', 'sy-modal-label', 'Group Type'));
    const typeRow = el('div', 'sy-header-type-row');
    let groupType = 'regular';
    const regularBtn = el('button', 'sy-header-type-btn sy-active', 'Regular Group');
    regularBtn.type = 'button';
    const announceBtn = el('button', 'sy-header-type-btn', 'Announcement Group');
    announceBtn.type = 'button';
    const announceNote = el('div', 'sy-modal-msg sy-error', 'Communities/Announcement groups can\'t be created through automation — WhatsApp\'s own "New Group" flow (which this drives) has no option for it. Create it directly in WhatsApp, then use ➕ Add Members to grow the linked group.');
    announceNote.style.display = 'none';
    regularBtn.addEventListener('click', () => {
      groupType = 'regular';
      regularBtn.classList.add('sy-active');
      announceBtn.classList.remove('sy-active');
      announceNote.style.display = 'none';
    });
    announceBtn.addEventListener('click', () => {
      groupType = 'announcement';
      announceBtn.classList.add('sy-active');
      regularBtn.classList.remove('sy-active');
      announceNote.style.display = 'block';
    });
    typeRow.appendChild(regularBtn);
    typeRow.appendChild(announceBtn);
    mbody.appendChild(typeRow);
    mbody.appendChild(announceNote);

    mbody.appendChild(el('div', 'sy-modal-label', 'Group Name'));
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.placeholder = 'Enter group name';
    mbody.appendChild(nameInput);

    mbody.appendChild(el('div', 'sy-modal-label', `Members (phone numbers, one per line — max ${MAX_ADD_MEMBERS})`));
    const membersArea = document.createElement('textarea');
    membersArea.placeholder = '919876543210\n919876543211';
    mbody.appendChild(membersArea);
    mbody.appendChild(el('div', 'sy-fmt-hint', 'Use full phone numbers with country code (e.g. 919876543210).'));

    const msg = el('div', 'sy-modal-msg');
    const footer = el('div', 'sy-modal-footer');
    const cancelBtn = el('button', 'sy-modal-btn', 'Cancel');
    cancelBtn.addEventListener('click', () => overlay.remove());
    const submitBtn = el('button', 'sy-modal-btn sy-primary', '+ Create Group');
    submitBtn.addEventListener('click', async () => {
      if (groupType === 'announcement') {
        msg.className = 'sy-modal-msg sy-error';
        msg.textContent = "Announcement groups can't be created here — see the note above.";
        return;
      }
      const name = nameInput.value.trim();
      const phones = membersArea.value.split('\n').map((p) => p.trim()).filter(Boolean);
      if (!name) { msg.className = 'sy-modal-msg sy-error'; msg.textContent = 'Enter a group name.'; return; }
      if (!phones.length) { msg.className = 'sy-modal-msg sy-error'; msg.textContent = 'Enter at least one phone number.'; return; }
      if (phones.length > MAX_ADD_MEMBERS) {
        msg.className = 'sy-modal-msg sy-error';
        msg.textContent = `${phones.length} numbers is too many (max ${MAX_ADD_MEMBERS}) — create with a few, then use Add Members to grow it.`;
        return;
      }

      submitBtn.disabled = true;
      const result = await createNewGroup(name, phones, (m) => { msg.className = 'sy-modal-msg'; msg.textContent = m; });
      submitBtn.disabled = false;
      if (result.ok) {
        msg.className = 'sy-modal-msg sy-ok';
        msg.textContent = `✅ Group created. Added ${result.added?.length || 0}/${phones.length}${result.failed?.length ? `, failed: ${result.failed.join(', ')}` : ''}.`;
        setTimeout(() => overlay.remove(), 1800);
      } else {
        msg.className = 'sy-modal-msg sy-error';
        msg.textContent = `❌ ${result.error}`;
      }
    });
    footer.appendChild(cancelBtn);
    footer.appendChild(submitBtn);
    mbody.appendChild(msg);
    mbody.appendChild(footer);
  }

  /**
   * "Remove Group Members" popup — rebuilt on the same server-side engine
   * as CRM → Group Merge V2 (real group list from the QR bridge, ~15/hour
   * paced removal with random gaps via /api/admin/crm/qr/merge-group-v2)
   * instead of only working on whatever group happens to be open in this
   * tab. Pick any group you administer, load its members, select who to
   * remove — runs server-side, survives this tab closing.
   */
  function randomMergeDelayMs() { return Math.floor(Math.random() * (180000 - 60000 + 1)) + 60000; } // 60-180s
  function randomMergeBatchSize() { return Math.floor(Math.random() * 3) + 2; } // 2-4

  /**
   * "Merge Groups" popup — pulls every member of ONE source group into a
   * target group (deduped against the target's current members), via the
   * QR bridge's raw group-participants endpoint, paced in small batches
   * (2-4 people, 60-180s gaps) the same way the admin CRM's Merge Groups
   * page does — but simplified to one source group per run, not several at
   * once. Runs for as long as this modal stays open (this Chrome tab needs
   * to stay open — there's no server-side queue for this the way Remove
   * Member has via merge-group-v2).
   */
  function openMergeGroupsModal() {
    const { overlay, body: mbody } = openModal('⬆️ Merge Groups');
    overlay.querySelector('.sy-modal-header')?.classList.add('sy-modal-header-merge');

    mbody.appendChild(el('div', 'sy-modal-label', 'Merge Into (Target Group)'));
    const targetSelect = document.createElement('select');
    targetSelect.appendChild(new Option('Loading your groups…', ''));
    mbody.appendChild(targetSelect);

    mbody.appendChild(el('div', 'sy-modal-label', 'Merge From (Source Group) — one at a time'));
    const sourceSelect = document.createElement('select');
    sourceSelect.appendChild(new Option('Loading your groups…', ''));
    mbody.appendChild(sourceSelect);

    (async () => {
      const res = await adminApi(`/api/admin/crm/whatsapp/qr-bridge?${new URLSearchParams({ path: '/chats' }).toString()}`);
      const raw = res.ok ? (res.data?.data ?? res.data) : null;
      const arr = Array.isArray(raw) ? raw : (Array.isArray(raw?.chats) ? raw.chats : []);
      const groups = arr.filter((c) => c.id?.endsWith?.('@g.us')).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      for (const sel of [targetSelect, sourceSelect]) {
        sel.innerHTML = '';
        sel.appendChild(new Option(groups.length ? '— Select group —' : 'No groups found', ''));
        for (const g of groups) sel.appendChild(new Option(g.name || g.id, g.id));
      }
    })();

    const removeLabel = el('label', 'sy-radio-label');
    removeLabel.style.marginTop = '10px';
    const removeCb = document.createElement('input');
    removeCb.type = 'checkbox';
    removeLabel.appendChild(removeCb);
    removeLabel.appendChild(document.createTextNode('Remove members from source group after merge'));
    mbody.appendChild(removeLabel);

    const msg = el('div', 'sy-modal-msg');
    const footer = el('div', 'sy-modal-footer');
    const cancelBtn = el('button', 'sy-modal-btn', 'Cancel');
    cancelBtn.addEventListener('click', () => overlay.remove());
    const submitBtn = el('button', 'sy-modal-btn sy-merge-primary', '⬆️ Merge Group into Target');
    submitBtn.addEventListener('click', async () => {
      const targetId = targetSelect.value;
      const sourceId = sourceSelect.value;
      if (!targetId || !sourceId) { msg.className = 'sy-modal-msg sy-error'; msg.textContent = 'Pick both a target and a source group.'; return; }
      if (targetId === sourceId) { msg.className = 'sy-modal-msg sy-error'; msg.textContent = 'Target and source must be different groups.'; return; }
      const targetLabel = targetSelect.options[targetSelect.selectedIndex].text;
      const sourceLabel = sourceSelect.options[sourceSelect.selectedIndex].text;
      if (!confirm(`Merge all members of "${sourceLabel}" into "${targetLabel}"?\n\nPaced in small batches with 1-3 min gaps — this can take a while and needs this Chrome tab to stay open.`)) return;

      submitBtn.disabled = true;
      msg.className = 'sy-modal-msg';
      msg.textContent = 'Fetching group members…';

      const [targetInfoRes, sourceInfoRes] = await Promise.all([
        adminApi(`/api/admin/crm/whatsapp/qr-bridge?${new URLSearchParams({ path: `/group-info/${targetId}` }).toString()}`),
        adminApi(`/api/admin/crm/whatsapp/qr-bridge?${new URLSearchParams({ path: `/group-info/${sourceId}` }).toString()}`),
      ]);
      const targetInfo = targetInfoRes.ok ? (targetInfoRes.data?.data ?? targetInfoRes.data) : null;
      const sourceInfo = sourceInfoRes.ok ? (sourceInfoRes.data?.data ?? sourceInfoRes.data) : null;
      const targetIds = new Set((targetInfo?.participants || []).map((p) => p.id));
      const ids = (sourceInfo?.participants || []).map((p) => p.id).filter((id) => id && !targetIds.has(id));

      if (!ids.length) {
        submitBtn.disabled = false;
        msg.className = 'sy-modal-msg sy-error';
        msg.textContent = 'No new members to merge — everyone in the source group is already in the target (or the source is empty).';
        return;
      }

      // Hand the whole job to the server-side paced queue rather than looping
      // here. A client-side loop dies the moment this tab closes or the laptop
      // sleeps, leaving a half-merged group, and its pacing is independent of
      // every other merge/removal running for the same number — the overlapping
      // -batch pattern that got this number restricted before. merge-group-v2
      // paces ~15/hour with randomised gaps and stops itself on repeated
      // failures, and is the same queue the CRM and Remove Members already use.
      if (ids.length > 300) {
        submitBtn.disabled = false;
        msg.className = 'sy-modal-msg sy-error';
        msg.textContent = `WhatsApp safety cap: max 300 per job. This merge needs ${ids.length} — split it across runs.`;
        return;
      }

      const settingsRes = await adminApi('/api/admin/crm/settings');
      const sessionKey = settingsRes.data?.data?.permanentTenantId || '';
      const hrs = Math.ceil(ids.length / 15);
      if (!confirm(`Merge ${ids.length} member(s) into the target group?\n\nPaced ~15/hour with random gaps (~${hrs} hr total) — runs server-side even if you close this tab.`)) {
        submitBtn.disabled = false;
        msg.textContent = '';
        return;
      }

      const addRes = await adminApi('/api/admin/crm/qr/merge-group-v2', 'POST', {
        sessionKey, targetGroupId: targetId, participantIds: ids, operationType: 'add',
      });

      let removeNote = '';
      if (addRes.ok && removeCb.checked) {
        const remRes = await adminApi('/api/admin/crm/qr/merge-group-v2', 'POST', {
          sessionKey, targetGroupId: sourceId, participantIds: ids, operationType: 'remove',
        });
        removeNote = remRes.ok
          ? ' Removal from the source group is queued behind it.'
          : ' (Could not queue the removal from the source group — run Remove Members separately.)';
      }

      submitBtn.disabled = false;
      if (addRes.ok && addRes.data?.success !== false) {
        msg.className = 'sy-modal-msg sy-ok';
        msg.textContent = `✅ ${addRes.data?.message || `Merge of ${ids.length} member(s) scheduled`} (~${hrs} hr).${removeNote}`;
      } else {
        msg.className = 'sy-modal-msg sy-error';
        msg.textContent = addRes.data?.error || 'Failed to schedule the merge.';
      }
    });
    footer.appendChild(cancelBtn);
    footer.appendChild(submitBtn);
    mbody.appendChild(msg);
    mbody.appendChild(footer);
  }

  function openRemoveMemberModal() {
    const { overlay, body: mbody } = openModal('➖ Remove Group Members', { large: true });
    mbody.appendChild(el('div', 'sy-fmt-hint', 'Runs via the QR bridge (server-side, ~15/hour paced with random gaps) — same engine as CRM → Group Merge V2. Works on any group you administer, not just the one open right now.'));

    mbody.appendChild(el('div', 'sy-modal-label', 'Target Group'));
    const groupSelect = document.createElement('select');
    const loadingOpt = document.createElement('option');
    loadingOpt.textContent = 'Loading your groups…';
    groupSelect.appendChild(loadingOpt);
    mbody.appendChild(groupSelect);

    mbody.appendChild(el('div', 'sy-modal-label', '…or paste a group ID (…@g.us)'));
    const jidInput = document.createElement('input');
    jidInput.type = 'text';
    jidInput.placeholder = '120363xxxxxxxxxxx@g.us';
    mbody.appendChild(jidInput);
    groupSelect.addEventListener('change', () => { if (groupSelect.value) jidInput.value = groupSelect.value; });

    let sessionKey = '';
    (async () => {
      const [chatsRes, settingsRes] = await Promise.all([
        adminApi(`/api/admin/crm/whatsapp/qr-bridge?${new URLSearchParams({ path: '/chats' }).toString()}`),
        adminApi('/api/admin/crm/settings'),
      ]);
      sessionKey = settingsRes.data?.data?.permanentTenantId || '';
      const raw = chatsRes.ok ? (chatsRes.data?.data ?? chatsRes.data) : null;
      const arr = Array.isArray(raw) ? raw : (Array.isArray(raw?.chats) ? raw.chats : []);
      const groups = arr.filter((c) => c.id?.endsWith?.('@g.us'));
      groupSelect.innerHTML = '';
      const opt0 = document.createElement('option');
      opt0.value = '';
      opt0.textContent = groups.length ? '— Pick a group —' : 'No groups found';
      groupSelect.appendChild(opt0);
      for (const g of groups.sort((a, b) => (a.name || '').localeCompare(b.name || ''))) {
        const opt = document.createElement('option');
        opt.value = g.id;
        opt.textContent = g.name || g.id;
        groupSelect.appendChild(opt);
      }
    })();

    const loadBtn = el('button', 'sy-modal-btn', '🔄 Load members');
    loadBtn.type = 'button';
    mbody.appendChild(loadBtn);

    const membersMsg = el('div', 'sy-modal-msg');
    mbody.appendChild(membersMsg);

    const actionsRow = el('div', 'sy-repeat-actions');
    const selectAllBtn = el('button', 'sy-modal-btn', 'Select all');
    selectAllBtn.type = 'button';
    const clearAllBtn = el('button', 'sy-modal-btn', 'Clear all');
    clearAllBtn.type = 'button';
    actionsRow.appendChild(selectAllBtn);
    actionsRow.appendChild(clearAllBtn);
    mbody.appendChild(actionsRow);

    const membersBox = el('div', 'sy-modal-checklist');
    mbody.appendChild(membersBox);
    selectAllBtn.addEventListener('click', () => membersBox.querySelectorAll('input[type="checkbox"]').forEach((c) => { c.checked = true; }));
    clearAllBtn.addEventListener('click', () => membersBox.querySelectorAll('input[type="checkbox"]').forEach((c) => { c.checked = false; }));

    loadBtn.addEventListener('click', async () => {
      const jid = jidInput.value.trim();
      if (!jid.endsWith('@g.us')) { membersMsg.className = 'sy-modal-msg sy-error'; membersMsg.textContent = 'Pick a group or paste a group ID ending in @g.us.'; return; }
      loadBtn.disabled = true;
      membersMsg.className = 'sy-modal-msg';
      membersMsg.textContent = 'Loading…';
      membersBox.innerHTML = '';
      const res = await adminApi(`/api/admin/crm/whatsapp/qr-bridge?${new URLSearchParams({ path: `/group-info/${jid}` }).toString()}`);
      loadBtn.disabled = false;
      const info = res.ok ? (res.data?.data ?? res.data) : null;
      const participants = Array.isArray(info?.participants) ? info.participants : [];
      if (!participants.length) {
        membersMsg.className = 'sy-modal-msg sy-error';
        membersMsg.textContent = res.ok ? 'No members found (besides your own account).' : (res.data?.error || 'Failed to load members.');
        return;
      }
      membersMsg.textContent = '';
      for (const p of participants) {
        const id = String(p.id || '');
        if (!id) continue;
        const digits = id.split('@')[0];
        const label = document.createElement('label');
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.value = id;
        label.appendChild(cb);
        label.appendChild(document.createTextNode(`${digits}${p.admin ? ' (admin)' : ''}`));
        membersBox.appendChild(label);
      }
    });

    const removeMsg = el('div', 'sy-modal-msg');
    const footer = el('div', 'sy-modal-footer');
    const cancelBtn = el('button', 'sy-modal-btn', 'Close');
    cancelBtn.addEventListener('click', () => overlay.remove());
    const removeBtn = el('button', 'sy-modal-btn sy-primary', 'Remove Selected');
    removeBtn.addEventListener('click', async () => {
      const ids = Array.from(membersBox.querySelectorAll('input[type="checkbox"]:checked')).map((c) => c.value);
      const jid = jidInput.value.trim();
      if (!ids.length) { removeMsg.className = 'sy-modal-msg sy-error'; removeMsg.textContent = 'Select at least one member.'; return; }
      if (ids.length > 300) { removeMsg.className = 'sy-modal-msg sy-error'; removeMsg.textContent = `WhatsApp safety cap: max 300 per job. Select up to 300 (you picked ${ids.length}) and run again for the rest.`; return; }
      const hrs = Math.ceil(ids.length / 15);
      if (!confirm(`Remove ${ids.length} member(s) from this group?\n\nPaced ~15/hour with random gaps (~${hrs} hr total) — runs server-side even if you close this tab.`)) return;

      removeBtn.disabled = true;
      const res = await adminApi('/api/admin/crm/qr/merge-group-v2', 'POST', {
        sessionKey, targetGroupId: jid, participantIds: ids, operationType: 'remove',
      });
      removeBtn.disabled = false;
      if (res.ok && (res.data?.message || res.data?.success !== false)) {
        removeMsg.className = 'sy-modal-msg sy-ok';
        removeMsg.textContent = `✅ ${res.data?.message || 'Removal scheduled.'}`;
      } else {
        removeMsg.className = 'sy-modal-msg sy-error';
        removeMsg.textContent = res.data?.error || 'Failed to schedule removal.';
      }
    });
    footer.appendChild(cancelBtn);
    footer.appendChild(removeBtn);
    mbody.appendChild(removeMsg);
    mbody.appendChild(footer);
  }

  /**
   * "Quick Message" popup — replaces the prompt()/prompt() pair (title,
   * then content) with a single multi-line box (Ctrl+Enter to add) plus the
   * full saved list below, matching the reference design: no separate
   * title field shown to the user — one gets auto-derived from the first
   * line of the content, since the backend still requires one.
   */
  function openQuickReplyModal() {
    const { overlay, body: mbody } = openModal('⚡ Quick Message');
    const contextName = state.lead?.name || state.currentGroupName || '';
    if (contextName) mbody.appendChild(el('div', 'sy-modal-context-title', contextName));

    mbody.appendChild(el('div', 'sy-modal-label', 'Manage Quick Replies'));
    const addRow = el('div', 'sy-qr-add-row');
    const textarea = document.createElement('textarea');
    textarea.placeholder = 'Type new quick reply (multi-line supported)…';
    const addBtn = el('button', 'sy-modal-btn sy-primary', 'Add');
    addBtn.type = 'button';
    addRow.appendChild(textarea);
    addRow.appendChild(addBtn);
    mbody.appendChild(addRow);
    mbody.appendChild(el('div', 'sy-fmt-hint', 'Press Ctrl+Enter to add'));

    const msg = el('div', 'sy-modal-msg');
    mbody.appendChild(msg);

    const listBox = el('div');
    mbody.appendChild(listBox);

    function renderList() {
      listBox.innerHTML = '';
      if (!state.quickReplies.length) {
        listBox.appendChild(el('div', 'sy-empty', 'No quick replies saved yet.'));
        return;
      }
      for (const qr of state.quickReplies) {
        const item = el('div', 'sy-quick-reply');
        item.appendChild(el('div', 'sy-quick-reply-text', formatWA(qr.content)));
        item.addEventListener('click', () => { setComposeText(qr.content); overlay.remove(); });
        listBox.appendChild(item);
      }
    }
    renderList();

    async function submitAdd() {
      const content = textarea.value.trim();
      if (!content) return;
      const title = content.split('\n')[0].slice(0, 60) || 'Quick reply';
      addBtn.disabled = true;
      const res = await sendMessage({ type: 'CREATE_QUICK_REPLY', title, content });
      addBtn.disabled = false;
      if (res.ok && res.data?.success) {
        textarea.value = '';
        msg.className = 'sy-modal-msg sy-ok';
        msg.textContent = '✅ Added.';
        await loadQuickReplies();
        renderList();
      } else {
        msg.className = 'sy-modal-msg sy-error';
        msg.textContent = res.data?.error || "Couldn't save.";
      }
    }
    addBtn.addEventListener('click', submitAdd);
    textarea.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); submitAdd(); }
    });

    const footer = el('div', 'sy-modal-footer');
    const closeBtn = el('button', 'sy-modal-btn', 'Close');
    closeBtn.addEventListener('click', () => overlay.remove());
    footer.appendChild(closeBtn);
    mbody.appendChild(footer);
  }

  /**
   * "Message Templates" popup — full-size, search + category/language
   * filters, one card per template with a "▶ Use" button, matching the
   * reference design instead of the cramped collapsible sidebar list.
   */
  function openTemplatesModal() {
    const { overlay, body: mbody } = openModal('📋 Use a Template', { large: true });
    const contextName = state.lead?.name || state.currentGroupName || '';
    if (contextName) mbody.appendChild(el('div', 'sy-modal-context-title', contextName));
    const countLine = el('div', 'sy-fmt-hint', `${state.templates.length} template(s) available`);
    mbody.appendChild(countLine);

    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.placeholder = 'Search templates…';
    mbody.appendChild(searchInput);

    const filterRow = el('div', 'sy-repeat-row');
    const catSelect = document.createElement('select');
    const langSelect = document.createElement('select');
    function fillFilter(select, values, allLabel) {
      select.innerHTML = '';
      const allOpt = document.createElement('option');
      allOpt.value = '';
      allOpt.textContent = allLabel;
      select.appendChild(allOpt);
      for (const v of values) {
        const opt = document.createElement('option');
        opt.value = v;
        opt.textContent = v;
        select.appendChild(opt);
      }
    }
    fillFilter(catSelect, Array.from(new Set(state.templates.map((t) => t.category).filter(Boolean))), 'All Categories');
    fillFilter(langSelect, Array.from(new Set(state.templates.map((t) => t.language).filter(Boolean))), 'All Languages');
    filterRow.appendChild(catSelect);
    filterRow.appendChild(langSelect);
    mbody.appendChild(filterRow);

    const listBox = el('div');
    listBox.style.marginTop = '10px';
    mbody.appendChild(listBox);

    function renderCards() {
      const q = searchInput.value.trim().toLowerCase();
      const cat = catSelect.value;
      const lang = langSelect.value;
      const filtered = state.templates.filter((t) => {
        if (cat && t.category !== cat) return false;
        if (lang && t.language !== lang) return false;
        if (q && !`${t.name} ${t.body}`.toLowerCase().includes(q)) return false;
        return true;
      });
      listBox.innerHTML = '';
      if (!filtered.length) {
        listBox.appendChild(el('div', 'sy-empty', 'No templates match.'));
        return;
      }
      for (const tpl of filtered) {
        const card = el('div', 'sy-tpl-card');
        const topRow = el('div', 'sy-tpl-card-top');
        if (tpl.imageUrl) {
          topRow.appendChild(el('div', 'sy-tpl-card-thumb', '🖼️'));
        }
        const nameCol = el('div', 'sy-tpl-card-namecol');
        nameCol.appendChild(el('div', 'sy-tpl-card-name', tpl.name));
        const badgeRow = el('div', 'sy-tpl-card-badges');
        if (tpl.language) badgeRow.appendChild(el('span', 'sy-badge', tpl.language.toUpperCase()));
        if (tpl.category) badgeRow.appendChild(el('span', 'sy-badge', tpl.category));
        badgeRow.appendChild(el('span', 'sy-badge', tpl.provider === 'qr' ? 'QR' : 'Meta'));
        if (tpl.status) badgeRow.appendChild(el('span', 'sy-badge', tpl.status));
        nameCol.appendChild(badgeRow);
        topRow.appendChild(nameCol);
        const useBtn = el('button', 'sy-modal-btn sy-primary', '▶ Use');
        useBtn.type = 'button';
        useBtn.addEventListener('click', async () => {
          if (!tpl.imageUrl) { setComposeText(tpl.text); overlay.remove(); return; }
          useBtn.disabled = true;
          useBtn.textContent = 'Attaching…';
          const res = await attachImageToCompose(tpl.imageUrl, tpl.text);
          useBtn.disabled = false;
          useBtn.textContent = '▶ Use';
          if (!res.ok) {
            alert(`Couldn't attach the image: ${res.error}\n\nInserting the text only — attach the image manually.`);
            setComposeText(tpl.text);
          }
          overlay.remove();
        });
        topRow.appendChild(useBtn);
        card.appendChild(topRow);
        card.appendChild(el('div', 'sy-tpl-card-body', formatWA(tpl.body)));
        listBox.appendChild(card);
      }
    }
    renderCards();
    searchInput.addEventListener('input', renderCards);
    catSelect.addEventListener('change', renderCards);
    langSelect.addEventListener('change', renderCards);

    const footer = el('div', 'sy-modal-footer');
    // Using a template and authoring one are separate actions. Creating was
    // only reachable from a small "+" in the sidebar, so from here there was
    // no way to add one — this is the bridge, mirroring the "+ Create new"
    // link in the CRM's template picker.
    const createBtn = el('button', 'sy-modal-btn', '＋ Create new template');
    createBtn.type = 'button';
    createBtn.addEventListener('click', () => {
      overlay.remove();
      openCreateTemplateModal();
    });
    footer.appendChild(createBtn);
    const closeBtn = el('button', 'sy-modal-btn', 'Close');
    closeBtn.addEventListener('click', () => overlay.remove());
    footer.appendChild(closeBtn);
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

    addIconTool('👥', 'New Group — regular or Announcement, with a proper form', () => openNewGroupModal());

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

    addIconTool('➖', 'Remove Group Members — any group, server-side paced removal', () => openRemoveMemberModal());
    addIconTool('⬆️', 'Merge Groups — move one group\'s members into another, paced', () => openMergeGroupsModal());

    // Leave/Delete Group and Post Status were dropped — WhatsApp Web already
    // has both natively (group menu → Exit group; the Status tab), so a
    // shortcut for them here was redundant. Replaced with quick access to
    // Templates and Chatbot flows instead.
    addIconTool('📋', 'Templates', () => openTemplatesModal());

    addIconTool('🤖', 'Chatbot flows', () => openChatbotFlowsModal());

    addIconTool('📸', 'My Status — text/image/video, Post now or Schedule/Repeat', () => openMyStatusModal());

    const scheduleBtn = el('button', 'sy-icon-btn sy-primary', '📅');
    scheduleBtn.title = 'Schedule Message — pick a contact, Send Now or Schedule/Repeat, via the QR bridge';
    scheduleBtn.addEventListener('click', () => openScheduleMessageModal(setToolStatus));
    iconRow.appendChild(scheduleBtn);

    const scheduleGroupsBtn = el('button', 'sy-icon-btn sy-primary', '📅👥');
    scheduleGroupsBtn.title = 'Schedule Groups — same engine as CRM → QR Group Scheduler (server-side, real repeat)';
    scheduleGroupsBtn.addEventListener('click', () => openScheduleGroupsModal());
    iconRow.appendChild(scheduleGroupsBtn);

    const broadcastBtn = el('button', 'sy-icon-btn sy-primary', '📣');
    broadcastBtn.title = 'Broadcast — template + recipient list, Send Now or Schedule, via the QR bridge';
    broadcastBtn.addEventListener('click', () => openBroadcastModal());
    iconRow.appendChild(broadcastBtn);

    const funnelBtn = el('button', 'sy-icon-btn', '🔻');
    funnelBtn.title = 'Funnel — view/add people per stage, send to a whole stage';
    funnelBtn.addEventListener('click', () => openFunnelModal());
    iconRow.appendChild(funnelBtn);

    const reportBtn = el('button', 'sy-icon-btn', '📈');
    reportBtn.title = 'QR Broadcast Report — sent/delivered/read/failed/blocked';
    reportBtn.addEventListener('click', () => openReportModal());
    iconRow.appendChild(reportBtn);

    const settingsBtn = el('button', 'sy-icon-btn', '⚙️');
    settingsBtn.title = 'Settings';
    settingsBtn.addEventListener('click', () => openSettingsModal());
    iconRow.appendChild(settingsBtn);

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
      fixBtn.textContent = 'Fixing…';
      await runAiFix();
      fixBtn.textContent = '✏️ Fix spelling';
    });
    aiRow.appendChild(fixBtn);

    const replyBtn = el('button', 'sy-btn sy-primary', '✨ AI reply');
    replyBtn.addEventListener('click', async () => {
      replyBtn.textContent = 'Thinking…';
      await runAiReply();
      replyBtn.textContent = '✨ AI reply';
    });
    aiRow.appendChild(replyBtn);

    aiSection.appendChild(aiRow);
    body.appendChild(aiSection);

    // ── Quick Replies (collapsible, "+" to add) ──
    const { section: qrSection, body: qrBody } = makeCollapsibleSection('quickReplies', `Quick Replies (${state.quickReplies.length})`, {
      addTitle: 'Add a new quick reply',
      onAdd: () => openQuickReplyModal(),
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

    // ── Templates — opens the full search/filter popup instead of a
    // cramped inline list (matches the reference "Message Templates" modal).
    const tplRow = el('div', 'sy-section');
    const tplTrigger = el('div', 'sy-section-header');
    tplTrigger.style.cursor = 'pointer';
    tplTrigger.appendChild(el('span', 'sy-section-title', `📋 Templates (${state.templates.length})`));
    const tplControls = el('div', 'sy-section-controls');
    const tplAddBtn = el('span', 'sy-add-btn', '+');
    tplAddBtn.title = 'Create a new template';
    tplAddBtn.addEventListener('click', (e) => { e.stopPropagation(); openCreateTemplateModal(); });
    tplControls.appendChild(tplAddBtn);
    tplTrigger.appendChild(tplControls);
    tplTrigger.addEventListener('click', () => openTemplatesModal());
    tplRow.appendChild(tplTrigger);
    body.appendChild(tplRow);
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
    state.name = s.name || '';
    state.userId = s.userId || '';
    state.isSuperAdmin = !!s.isSuperAdmin;
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
      if (state.loggedIn && state.allowed) {
        renderConversationHeaderActions();
        injectComposeActionButton();
        injectComposeAiButtons();
      }
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
    if (msg.type === 'RUN_SCHEDULED_STATUS') {
      (msg.mediaUrl ? postMediaStatus(msg.mediaUrl, msg.text) : postTextStatus(msg.text)).then(sendResponse);
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
