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

    default:
      return { ok: false, error: `Unknown message type: ${msg.type}` };
  }
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  handleMessage(msg).then(sendResponse).catch((err) => sendResponse({ ok: false, error: err.message }));
  return true; // keep the message channel open for the async response
});
