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

  // Must match FUNNEL_STATUSES in app/api/extension/lead/route.ts.
  const FUNNEL_STATUSES = [
    'new_lead', 'contacted', 'interested', 'demo_trial', 'negotiation',
    'enrolled', 'completed', 'inactive', 'repeater', 'old_sadhak',
    'only_for_post', 'lead', 'hot', 'prospect', 'customer',
  ];

  let state = { loggedIn: false, allowed: false, currentPhone: '', currentGroupName: '', quickReplies: [], templates: [], lead: null };

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
    document.execCommand('delete', false, undefined);
    // Insert line-by-line with execCommand('insertLineBreak') between lines
    // instead of a single insertText call with raw \n characters. Raw \n in
    // execCommand text doesn't reliably become the proper internal line
    // break WhatsApp Web expects for a multi-line message — it can leave the
    // message in a state that shows the "!" failed-to-send icon once you hit
    // Send, even though the text looked fine in the box. insertLineBreak
    // matches what a real Shift+Enter keypress produces.
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
      onProgress?.(`Adding ${phones[i]} (${i + 1}/${phones.length})…`);
      const found = await searchAndSelectContact(phones[i]);
      if (found) added.push(phones[i]); else failed.push(phones[i]);
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
      onProgress?.(`Adding ${phones[i]} (${i + 1}/${phones.length})…`);
      const found = await searchAndSelectContact(phones[i]);
      if (found) added.push(phones[i]); else failed.push(phones[i]);
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
      for (const s of FUNNEL_STATUSES) {
        const opt = document.createElement('option');
        opt.value = s;
        opt.textContent = s.replace(/_/g, ' ');
        if (s === state.lead.status) opt.selected = true;
        funnelSelect.appendChild(opt);
      }
      const funnelError = el('div', 'sy-empty');
      funnelError.style.cssText = 'display:none;color:#b91c1c;margin-top:3px;';
      funnelSelect.addEventListener('change', async () => {
        const newStatus = funnelSelect.value;
        const prevStatus = state.lead.status;
        funnelSelect.disabled = true;
        funnelError.style.display = 'none';
        const res = await sendMessage({ type: 'UPDATE_LEAD_STATUS', leadId: state.lead._id, status: newStatus });
        funnelSelect.disabled = false;
        if (res.ok && res.data?.success) {
          state.lead.status = newStatus;
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

    // ── Tools ──
    const toolsSection = el('div', 'sy-section');
    toolsSection.appendChild(el('div', 'sy-section-title', 'Tools'));

    const statusBox = el('div', 'sy-empty');
    statusBox.style.display = 'none';
    const setToolStatus = (msg, isError) => {
      if (!msg) { statusBox.style.display = 'none'; return; }
      statusBox.style.display = 'block';
      statusBox.style.fontStyle = 'normal';
      statusBox.style.color = isError ? '#b91c1c' : '#374151';
      statusBox.textContent = msg;
    };

    const toolsRow = el('div', 'sy-btn-row');

    // Applies to New Group / Add Members — these drive a regular WhatsApp
    // Group's UI and are not built for WhatsApp Communities (announcement
    // group + linked sub-groups, up to 5000 members) — those have a
    // different structure entirely, and grow via invite link, not admin-add.
    const MAX_ADD_MEMBERS = 30;

    const newChatBtn = el('button', 'sy-btn', '💬 New Chat');
    newChatBtn.addEventListener('click', () => {
      const phone = prompt('Phone number to start a chat with:');
      if (phone && phone.trim()) startNewChat(phone.trim());
    });
    toolsRow.appendChild(newChatBtn);

    const newGroupBtn = el('button', 'sy-btn', '👥 New Group');
    newGroupBtn.title = 'Creates a regular WhatsApp Group (not a Community) — communities have a different structure this doesn\'t support';
    newGroupBtn.addEventListener('click', async () => {
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
    toolsRow.appendChild(newGroupBtn);

    const mergeBtn = el('button', 'sy-btn', '➕ Add Members');
    mergeBtn.title = 'Adds phone numbers to the currently open GROUP (not a Community) — 3-7 min gap between each, same safety pacing as the QR bridge. Not built for WhatsApp Communities — use the invite link to grow those.';
    mergeBtn.addEventListener('click', async () => {
      const raw = prompt(
        `Add to the CURRENTLY OPEN group — phone numbers, comma separated (max ${MAX_ADD_MEMBERS} at a time):\n\n` +
        'This is for a regular WhatsApp Group, NOT a Community (Communities/5000-member entities have a different structure this doesn\'t support — use the invite link to grow those instead).\n\n' +
        'Paced 3-7 min apart to protect this WhatsApp number — a large list will take a while. You can close this tab; it will just stop where it is.'
      );
      if (!raw || !raw.trim()) return;
      const phones = raw.split(',').map((p) => p.trim()).filter(Boolean);
      if (phones.length > MAX_ADD_MEMBERS) {
        setToolStatus(`❌ ${phones.length} numbers is too many for this tool (max ${MAX_ADD_MEMBERS}) — this isn't meant for large-scale growth (that's what invite links are for). Split into smaller batches if this is genuinely a small group.`, true);
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
    toolsRow.appendChild(mergeBtn);

    const deleteGroupBtn = el('button', 'sy-btn', '🗑️ Leave/Delete Group');
    deleteGroupBtn.title = 'For a regular WhatsApp Group, not a Community';
    deleteGroupBtn.addEventListener('click', async () => {
      if (!confirm('Leave the currently open group? This removes you from it (deletes it if you were the last member).')) return;
      deleteGroupBtn.disabled = true;
      const result = await leaveAndDeleteOpenGroup((msg) => setToolStatus(msg));
      deleteGroupBtn.disabled = false;
      setToolStatus(result.ok ? '✅ Left the group.' : `❌ ${result.error}`, !result.ok);
    });
    toolsRow.appendChild(deleteGroupBtn);

    const statusBtn = el('button', 'sy-btn', '📸 Post Status');
    statusBtn.addEventListener('click', async () => {
      const text = prompt('Status text:');
      if (!text || !text.trim()) return;
      statusBtn.disabled = true;
      const result = await postTextStatus(text.trim(), (msg) => setToolStatus(msg));
      statusBtn.disabled = false;
      setToolStatus(result.ok ? '✅ Status posted.' : `❌ ${result.error}`, !result.ok);
    });
    toolsRow.appendChild(statusBtn);

    const scheduleBtn = el('button', 'sy-btn sy-primary', '📅 Schedule Message');
    scheduleBtn.title = 'Schedules the current compose box text to send later, to whichever chat (person or group) is currently open — only fires if this Chrome window is still open at that time';
    scheduleBtn.addEventListener('click', async () => {
      const text = getComposeText();
      if (!text.trim()) { setToolStatus('❌ Type the message in WhatsApp\'s compose box first, then click Schedule.', true); return; }

      // Primary target = whichever chat is currently open (optional — the
      // list below can be used on its own too).
      const primaryTarget = state.currentPhone
        ? { type: 'phone', value: state.currentPhone }
        : state.currentGroupName
          ? { type: 'group', value: state.currentGroupName }
          : null;

      const when = prompt('Send at? (e.g. "2026-08-04 09:00", 24h local time)');
      if (!when) return;
      const baseSendAt = new Date(when.replace(' ', 'T'));
      if (isNaN(baseSendAt.getTime()) || baseSendAt.getTime() <= Date.now()) {
        setToolStatus('❌ Couldn\'t understand that date/time, or it\'s in the past.', true);
        return;
      }

      const rawList = prompt(
        'Also send to (optional) — phone numbers and/or group names, comma separated.\n\n' +
        'Each one is paced 3-7 min apart starting at the time above, same safety window as Add Members — this is real bulk sending on your personal WhatsApp, so a long list means real time and real risk.'
      );
      const listTargets = (rawList || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .map((s) => ({ type: looksLikePhone(s) ? 'phone' : 'group', value: s }));

      const targets = [primaryTarget, ...listTargets].filter(Boolean);
      if (targets.length === 0) { setToolStatus('❌ Open a chat/group, or enter at least one recipient, first.', true); return; }

      let cumulativeMs = 0;
      let scheduled = 0;
      let failed = [];
      for (let i = 0; i < targets.length; i++) {
        if (i > 0) cumulativeMs += humanGapMs();
        const t = targets[i];
        const res = await sendMessage({
          type: 'SCHEDULE_MESSAGE',
          targetType: t.type,
          phone: t.type === 'phone' ? t.value : undefined,
          groupName: t.type === 'group' ? t.value : undefined,
          text,
          sendAt: baseSendAt.getTime() + cumulativeMs,
        });
        if (res.ok) scheduled++; else failed.push(t.value);
      }

      const lastAt = new Date(baseSendAt.getTime() + cumulativeMs);
      setToolStatus(
        `✅ Scheduled ${scheduled}/${targets.length} (spread from ${baseSendAt.toLocaleString()} to ${lastAt.toLocaleString()})${failed.length ? `, failed to schedule: ${failed.join(', ')}` : ''}. Keep this Chrome window open the whole time so they actually fire.`,
        failed.length > 0
      );
    });
    toolsRow.appendChild(scheduleBtn);

    toolsSection.appendChild(toolsRow);
    toolsSection.appendChild(statusBox);
    body.appendChild(toolsSection);

    // ── CRM Dashboards ── (full pages — tables/kanban/charts don't fit a 300px sidebar)
    const dashSection = el('div', 'sy-section');
    dashSection.appendChild(el('div', 'sy-section-title', 'CRM Dashboards'));
    const dashRow = el('div', 'sy-btn-row');
    const dashLinks = [
      ['📋 QR Leads', '/admin/crm/qr/leads'],
      ['🔻 QR Funnel', '/admin/crm/qr/funnel'],
      ['⚙️ QR Manage', '/admin/crm/qr/manage'],
      ['📊 QR Reports', '/admin/crm/qr/agent-report'],
    ];
    for (const [label, path] of dashLinks) {
      const btn = el('button', 'sy-btn', label);
      btn.addEventListener('click', () => window.open(`https://swaryoga.com${path}`, '_blank'));
      dashRow.appendChild(btn);
    }
    dashSection.appendChild(dashRow);
    body.appendChild(dashSection);
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
    let lastGroupName = '';
    setInterval(() => {
      const detectedPhone = detectPhoneFromHeader();
      if (detectedPhone && detectedPhone !== lastPhone) {
        lastPhone = detectedPhone;
        lastGroupName = '';
        state.currentPhone = detectedPhone;
        state.currentGroupName = '';
        loadLead();
        render();
      } else if (!detectedPhone) {
        const detectedGroup = detectGroupNameFromHeader();
        if (detectedGroup && detectedGroup !== lastGroupName) {
          lastGroupName = detectedGroup;
          lastPhone = '';
          state.currentGroupName = detectedGroup;
          state.currentPhone = '';
          state.lead = null;
          render();
        }
      }
    }, 1500);
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
    setInterval(refreshAuthState, 15000);
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(init, 1000);
  } else {
    window.addEventListener('load', () => setTimeout(init, 1000));
  }
})();
