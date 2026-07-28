# Swar Yoga WhatsApp CRM — Browser Extension

Adds a CRM sidebar to your own WhatsApp Web (web.whatsapp.com): lead lookup by
phone number, AI Fix/Reply (same AI used in the admin panel), and click-to-insert
quick replies. Runs on your own WhatsApp Web login — no separate bridge, no
QR-ban risk, since it's just the real, official web.whatsapp.com page with UI
added on top.

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
