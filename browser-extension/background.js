// Swar Yoga WhatsApp CRM — background service worker (MV3)
//
// All network calls to our backend go through here, not the content script,
// so they run with the extension's own cross-origin fetch privileges
// (declared via host_permissions in manifest.json) rather than being subject
// to web.whatsapp.com's page-level CORS restrictions.

const API_BASE = 'https://swaryoga.com';

async function getStored() {
  const data = await chrome.storage.local.get(['token', 'userId', 'name', 'allowed', 'isSuperAdmin']);
  return data;
}

async function setStored(partial) {
  await chrome.storage.local.set(partial);
}

async function apiFetch(path, options = {}) {
  const { token } = await getStored();
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

async function handleMessage(msg) {
  switch (msg.type) {
    case 'LOGIN': {
      const res = await apiFetch('/api/admin/auth/login', {
        method: 'POST',
        body: JSON.stringify({ userId: msg.userId, password: msg.password }),
      });
      if (!res.ok || !res.data?.success) {
        return { ok: false, error: res.data?.error || `Login failed (${res.status})` };
      }
      // Immediately check extension access approval before considering login complete.
      await setStored({ token: res.data.token, userId: res.data.user?.userId, name: res.data.user?.name || res.data.user?.userId });
      const me = await apiFetch('/api/extension/me');
      const allowed = !!me.data?.allowed;
      const isSuperAdmin = !!me.data?.isSuperAdmin;
      await setStored({ allowed, isSuperAdmin });
      return { ok: true, allowed, isSuperAdmin, name: res.data.user?.name || res.data.user?.userId };
    }

    case 'LOGOUT': {
      await chrome.storage.local.clear();
      return { ok: true };
    }

    case 'GET_STATE': {
      const s = await getStored();
      return { ok: true, ...s, loggedIn: !!s.token };
    }

    case 'REFRESH_ACCESS': {
      const me = await apiFetch('/api/extension/me');
      if (!me.ok) return { ok: false, error: me.data?.error || 'Failed to check access' };
      await setStored({ allowed: !!me.data?.allowed, isSuperAdmin: !!me.data?.isSuperAdmin });
      return { ok: true, allowed: !!me.data?.allowed, isSuperAdmin: !!me.data?.isSuperAdmin };
    }

    case 'GET_LEAD': {
      const res = await apiFetch(`/api/extension/lead?phone=${encodeURIComponent(msg.phone)}`);
      return { ok: res.ok, data: res.data };
    }

    case 'GET_QUICK_REPLIES': {
      const res = await apiFetch('/api/extension/quick-replies');
      return { ok: res.ok, data: res.data };
    }

    case 'CREATE_QUICK_REPLY': {
      const res = await apiFetch('/api/extension/quick-replies', {
        method: 'POST',
        body: JSON.stringify({ title: msg.title, content: msg.content }),
      });
      return { ok: res.ok, data: res.data };
    }

    // Call once immediately BEFORE each group mutation (one member
    // add/remove, one group creation, one group-targeted scheduled send).
    // 150/day, 15/hour, 5:00 AM-10:30 PM IST — server-enforced (not just in
    // the page) so it can't be bypassed by reloading or clearing storage.
    // Does NOT apply to 1:1 messages, which stay unrestricted.
    case 'RESERVE_GROUP_OP': {
      const res = await apiFetch('/api/extension/group-op-guard', { method: 'POST' });
      return { ok: res.ok, data: res.data };
    }

    case 'UPDATE_LEAD_STATUS': {
      const res = await apiFetch('/api/extension/lead', {
        method: 'PATCH',
        body: JSON.stringify({ leadId: msg.leadId, status: msg.status }),
      });
      return { ok: res.ok, data: res.data };
    }

    case 'GET_TEMPLATES': {
      const res = await apiFetch('/api/extension/templates');
      return { ok: res.ok, data: res.data };
    }

    case 'CREATE_TEMPLATE': {
      const res = await apiFetch('/api/extension/templates', {
        method: 'POST',
        body: JSON.stringify(msg.template),
      });
      return { ok: res.ok, data: res.data };
    }

    // Generic passthrough to the existing admin CRM API (leads, broadcast-runs,
    // qr-broadcast-schedule, broadcast reports, the QR bridge's chat list, …).
    // The extension login already goes through /api/admin/auth/login, which
    // rejects non-admins outright — every extension user's token already
    // carries isAdmin:true — so these routes work with the same stored token
    // without needing a parallel set of /api/extension/* re-implementations.
    case 'ADMIN_API': {
      const res = await apiFetch(msg.path, {
        method: msg.method || 'GET',
        body: msg.body !== undefined ? JSON.stringify(msg.body) : undefined,
      });
      return { ok: res.ok, status: res.status, data: res.data };
    }

    case 'GET_FUNNEL_STAGES': {
      const res = await apiFetch('/api/extension/funnel-stages');
      return { ok: res.ok, data: res.data };
    }

    case 'CREATE_FUNNEL_STAGE': {
      const res = await apiFetch('/api/extension/funnel-stages', {
        method: 'POST',
        body: JSON.stringify({ stage: msg.stage }),
      });
      return { ok: res.ok, data: res.data };
    }

    case 'GET_LABELS': {
      const res = await apiFetch('/api/extension/labels');
      return { ok: res.ok, data: res.data };
    }

    case 'CREATE_LABEL_PRESET': {
      const res = await apiFetch('/api/extension/labels', {
        method: 'POST',
        body: JSON.stringify({ action: 'create_preset', label: msg.label, color: msg.color }),
      });
      return { ok: res.ok, data: res.data };
    }

    case 'ASSIGN_LABEL': {
      const res = await apiFetch('/api/extension/labels', {
        method: 'POST',
        body: JSON.stringify({ action: 'assign', chatKey: msg.chatKey, labelKey: msg.labelKey, on: msg.on }),
      });
      return { ok: res.ok, data: res.data };
    }

    case 'AI_FIX': {
      const res = await apiFetch('/api/extension/ai', {
        method: 'POST',
        body: JSON.stringify({ mode: 'fix', text: msg.text }),
      });
      return { ok: res.ok, data: res.data };
    }

    case 'AI_REPLY': {
      const res = await apiFetch('/api/extension/ai', {
        method: 'POST',
        body: JSON.stringify({ mode: 'reply', context: msg.context }),
      });
      return { ok: res.ok, data: res.data };
    }

    // ── Scheduling ──────────────────────────────────────────────────────
    // Uses chrome.alarms, which only fires while Chrome is running (not
    // after the laptop sleeps/quits) — there's no persistent server-side
    // WhatsApp session behind this the way the QR bridge has, so this is a
    // best-effort "fires if this Chrome window is still open" scheduler,
    // not a guaranteed one. The sidebar tells the user this explicitly.
    case 'SCHEDULE_MESSAGE': {
      const id = `sched_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const { scheduledMessages = [] } = await chrome.storage.local.get(['scheduledMessages']);
      scheduledMessages.push({
        id,
        targetType: msg.targetType || 'phone',
        phone: msg.phone,
        groupName: msg.groupName,
        text: msg.text,
        sendAt: msg.sendAt,
        status: 'pending',
      });
      await chrome.storage.local.set({ scheduledMessages });
      chrome.alarms.create(id, { when: msg.sendAt });
      return { ok: true, id };
    }

    default:
      return { ok: false, error: `Unknown message type: ${msg.type}` };
  }
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  handleMessage(msg).then(sendResponse).catch((err) => sendResponse({ ok: false, error: err.message }));
  return true; // keep the message channel open for the async response
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  const { scheduledMessages = [] } = await chrome.storage.local.get(['scheduledMessages']);
  const job = scheduledMessages.find((m) => m.id === alarm.name);
  if (!job) return;

  try {
    const tabs = await chrome.tabs.query({ url: 'https://web.whatsapp.com/*' });
    if (!tabs.length) {
      job.status = 'missed_no_tab';
    } else {
      const results = await chrome.tabs.sendMessage(tabs[0].id, {
        type: 'RUN_SCHEDULED_SEND',
        targetType: job.targetType,
        phone: job.phone,
        groupName: job.groupName,
        text: job.text,
      }).catch(() => null);
      job.status = results?.ok ? 'sent' : 'failed';
    }
  } catch (e) {
    job.status = 'failed';
  }

  const updated = scheduledMessages.map((m) => (m.id === job.id ? job : m));
  await chrome.storage.local.set({ scheduledMessages: updated });
});
