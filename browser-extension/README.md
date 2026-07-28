# Swar Yoga WhatsApp CRM — Browser Extension

Adds a CRM sidebar to your own WhatsApp Web (web.whatsapp.com): lead lookup by
phone number (with editable funnel/status), AI Fix/Reply (same AI used in the
admin panel), click-to-insert quick replies and templates, and a Tools panel
(New Chat, New Group, Add/Remove Member, Leave/Delete group, Post Status,
Schedule Message — including group scheduling and paced multi-recipient
scheduling). Runs on your own WhatsApp Web login — no separate bridge, no
QR-ban risk, since it's just the real, official web.whatsapp.com page with UI
added on top.

## Group operation limits (server-enforced, not just client-side)

Add Member, Remove Member, New Group, and group-targeted Schedule Message all
draw from one shared, per-user budget, checked on our server before each
action so it can't be bypassed by reloading or clearing extension storage:

- **150 operations/day, 15/hour** (resets 5:00 AM IST)
- **Only between 5:00 AM and 10:30 PM IST** — outside that window, group
  actions are refused outright (not queued)
- **1:1 messages (Schedule Message to a person) are exempt** — unlimited,
  any time, no gate

If you need more group-operation volume than this, that's the point where
the official Meta WhatsApp Business API (or a paid tool) is the right
answer, not raising this cap — it exists specifically to keep personal
WhatsApp accounts from getting banned, the same failure mode that's hit the
QR bridge multiple times before.

**Not built for WhatsApp Communities** (the announcement-group + linked
sub-groups structure, up to 5000 members) — these tools drive a regular
Group's UI. Communities grow via invite link, which needs no automation at
all.

## Tools panel — what's real vs. best-effort

- **New Chat** — very reliable; uses WhatsApp's own public click-to-chat URL.
- **Schedule Message** — reliable for the send mechanism, but only fires if
  **this Chrome window is still open** at the scheduled time (no persistent
  server-side session like the QR bridge has, so closing your laptop means
  it won't fire). Works for both 1:1 chats and groups, and accepts an
  optional list of additional recipients (phone numbers or group names),
  each staggered 3-7 min apart.
- **New Group / Add Member / Remove Member / Leave-Delete Group / Post
  Status** — drive WhatsApp Web's own real UI (clicking buttons, typing into
  its search boxes) rather than the QR bridge. WhatsApp Web's layout isn't a
  documented public API, so these are best-effort: if a button/label can't
  be found, the sidebar shows a clear error instead of failing silently —
  tell your admin exactly what it says and it can be adjusted.
- **Add Member / Remove Member** are paced 3-7 minutes between each person,
  same safety window used server-side for the QR bridge's Merge Group tool —
  this runs on your *personal* WhatsApp account, so the same anti-spam risk
  that's caused QR bridge restrictions before applies here too.

## Install (not on the Chrome Web Store — sideloaded / "developer mode")

1. Download and unzip the extension.
2. Open `chrome://extensions` in Chrome.
3. Turn on **Developer mode** (top-right toggle).
4. Click **Load unpacked** and select the unzipped `browser-extension` folder.
5. Click the extension icon in your toolbar and sign in with your CRM login
   (same userId/email + password you use for the admin panel).
6. Ask your admin to approve extension access for your account:
   **admin panel → QR WhatsApp → Settings → Browser Extension Access**.
7. Once approved, click "Refresh access status" in the extension popup, then
   open `web.whatsapp.com` — the CRM sidebar appears on the right.

## Notes

- Each Chrome install needs its own "Load unpacked" — there's no Chrome Web
  Store listing (that requires a Google Developer account, payment, and a
  review process this build doesn't go through).
- Multiple team members can each install this in their own Chrome and log
  into their own personal WhatsApp Web — access is gated per-user by an
  admin, same approval model as the QR bridge.
- If the sidebar doesn't detect a chat's phone number automatically (this
  happens for contacts saved under a name rather than a number), type it
  into the phone field manually — CRM lookup still works.
