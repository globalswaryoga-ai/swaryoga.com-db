# Swar Yoga WhatsApp CRM — Browser Extension

Adds a CRM sidebar to your own WhatsApp Web (web.whatsapp.com): lead lookup by
phone number, AI Fix/Reply (same AI used in the admin panel), click-to-insert
quick replies and templates, and a Tools panel (New Chat, New Group, Add
Members to a group, Leave/Delete group, Post Status, Schedule Message). Runs
on your own WhatsApp Web login — no separate bridge, no QR-ban risk, since
it's just the real, official web.whatsapp.com page with UI added on top.

## Tools panel — what's real vs. best-effort

- **New Chat** — very reliable; uses WhatsApp's own public click-to-chat URL.
- **Schedule Message** — reliable for the send mechanism, but only fires if
  **this Chrome window is still open** at the scheduled time (no persistent
  server-side session like the QR bridge has, so closing your laptop means
  it won't fire).
- **New Group / Add Members / Leave-Delete Group / Post Status** — drive
  WhatsApp Web's own real UI (clicking buttons, typing into its search boxes)
  rather than the QR bridge. WhatsApp Web's layout isn't a documented public
  API, so these are best-effort: if a button/label can't be found, the sidebar
  shows a clear error instead of failing silently — tell your admin exactly
  what it says and it can be adjusted.
- **Add Members** is paced 3-7 minutes between each person added, same
  safety window used server-side for the QR bridge's Merge Group tool — this
  runs on your *personal* WhatsApp account, so the same anti-spam risk that's
  caused QR bridge restrictions before applies here too. A large list will
  take a while; that's intentional.

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
