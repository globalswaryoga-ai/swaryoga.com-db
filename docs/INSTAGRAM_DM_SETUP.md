# Instagram DM Integration — Setup & Maintenance Guide

**Status:** ✅ Working — 22 conversations and 108 messages imported into the CRM inbox.

---

## 1. Why there are two Instagram paths (and why we use the second)

Instagram exposes **two entirely separate integrations**. They use different
apps, different tokens, different account IDs and different API hosts.

| | Facebook Login path | **Instagram Login path** ← we use this |
|---|---|---|
| App | Swar yoga WT (`1818511178556728`) | **Swar yoga WT-IG (`1489642672015303`)** |
| Host | `graph.facebook.com` | **`graph.instagram.com`** |
| Endpoint | `/{page-id}/conversations?platform=instagram` | **`/me/conversations`** |
| Token | `EAAZ…` (Page token) | **`IGAA…`** |
| Account ID | `17841448622906382` (IG Business) | **`28159059563700889`** (app-scoped) |
| Needs App Review? | **Yes** — Advanced Access for `instagram_manage_messages` | **No** — Standard Access is enough |
| Result when tested | `0` conversations + `(#3) Application does not have the capability` | **22 conversations** ✅ |

**Key insight:** the Facebook Login path was never going to work without App
Review. The Instagram Login path authorises the account *directly*, so first-party
access to your own inbox works immediately.

Messenger still uses the Facebook Login path — that one works fine (25 conversations).

---

## 2. The two Instagram account IDs — do not mix them up

This caused a bug during the first import and will bite again if forgotten.

| ID | Value | Where it appears |
|---|---|---|
| **IG Login (app-scoped)** | `28159059563700889` | What `/me` returns. Stored as `accountId`. Used in webhook `entry[].id`. |
| **IG Business** | `17841448622906382` | Appears inside `participants[]` and `message.from.id`. |

⚠️ When deciding "is this message from us?", **both IDs mean us**. The code keeps
a `selfIds` set for exactly this reason (`lib/socialInbox.ts`). Matching on only
one collapses every thread into a single conversation.

---

## 3. Environment variables

Added to `.env.local`, `.env.production` and Vercel production:

```bash
INSTAGRAM_APP_ID=1489642672015303
INSTAGRAM_APP_SECRET=            # ⚠️ STILL EMPTY — see §4
INSTAGRAM_API_VERSION=v23.0
INSTAGRAM_LOGIN_USER_ID=28159059563700889
INSTAGRAM_BUSINESS_ID=17841448622906382
```

---

## 4. ⚠️ ACTION REQUIRED — the app secret

`INSTAGRAM_APP_SECRET` is **empty**, so the stored token is the **short-lived one
(expires ~1 hour)**. Once it expires, Instagram DMs stop syncing.

**Fix:**

1. developers.facebook.com → **Swar yoga WT-IG** → **Instagram** →
   **API setup with Instagram business login**
2. Copy the full **Instagram app secret** (the copy icon beside it — the field is
   truncated on screen, so use the icon, don't retype it)
3. Add it locally and to Vercel:
   ```bash
   # .env.local and .env.production
   INSTAGRAM_APP_SECRET=<paste-full-secret>

   printf '%s' '<paste-full-secret>' | vercel env add INSTAGRAM_APP_SECRET production
   ```
4. Re-run the token exchange so a **60-day** token is stored (see §5).

---

## 5. Refreshing the token

Instagram Login tokens last **60 days** and can be refreshed any time before expiry.

**Exchange short-lived → long-lived (60 days):**
```
GET https://graph.instagram.com/access_token
    ?grant_type=ig_exchange_token
    &client_secret={INSTAGRAM_APP_SECRET}
    &access_token={short-lived IGAA token}
```

**Refresh an existing long-lived token (do this within 60 days):**
```
GET https://graph.instagram.com/refresh_access_token
    ?grant_type=ig_refresh_token
    &access_token={current long-lived token}
```

To get a fresh short-lived token manually: WT-IG app → Instagram → API setup →
**1. Generate access tokens** → **Generate token** next to `swar.yoga`.

The token is stored **encrypted** in `socialmediaaccounts` (super_admin scope,
`platform: 'instagram'`) — never in plain text.

---

## 6. How the code decides which API to use

`socialmediaaccounts.metadata.apiType` drives everything:

- `'instagram_login'` → `graph.instagram.com/me/...` with the `IGAA` token
- `'facebook_login'` (default) → `graph.facebook.com/{page-id}/...` with `EAAZ`

Set on our record as:
```js
metadata: {
  apiType: 'instagram_login',
  igLoginUserId: '28159059563700889',
  igBusinessId:  '17841448622906382',
}
```

Relevant code — all in `lib/socialInbox.ts`:
- `readApiType()` — reads `metadata.apiType`
- `resolveGraphNodeId()` — skips the Page lookup for Instagram Login
- `sendMetaSocialMessage()` — posts to `/me/messages` vs `/{page}/messages`
- `importFacebookConversationHistory()` — reads `/me/conversations` vs the Page

---

## 7. Webhook

Configured **inside the WT-IG app** (Instagram Login webhooks cannot be set in
the generic Webhooks section — Meta shows a banner saying exactly this):

- Callback URL: `https://crm.swaryoga.com/api/webhooks/meta-inbox`
- Verify token: `swaryoga_webhook_verify_2026`
- Subscribed: `messages`, `message_reactions`, `message_edit`, `comments`, …
- `swar.yoga` → **Webhook Subscription: On**

Inbound events land in `parseMetaSocialWebhookPayload()` (handles
`object: 'instagram'`) and are stored by `ingestMetaSocialEvent()`.

A **5-minute cron** (`/api/cron/social-inbox-sync`) also polls the API as a
fallback in case webhook delivery is unreliable.

---

## 8. Meta's 24-hour reply window

Meta blocks replies more than 24 hours after the contact's last message
(`error code 10`). This is enforced on Meta's servers — it cannot be disabled.

The code retries once with `messaging_type: MESSAGE_TAG` + `tag: HUMAN_AGENT`,
which extends the window to **7 days** — but that requires the **Human Agent**
feature approved in App Review. Until then, older chats show a clear amber
banner in the inbox explaining why the reply was blocked.

---

## 9. Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `(#3) Application does not have the capability` | Using the Facebook Login path for Instagram | Ensure `metadata.apiType = 'instagram_login'` |
| `0` conversations but DMs visible in the app | Same as above, or wrong account ID | Confirm `accountId` is the **Login** id `28159059563700889` |
| All messages land in one conversation | Only one self-ID matched | Both IDs must be in `selfIds` (§2) |
| `Error validating access token … session invalidated` | Token expired (short-lived) | Set `INSTAGRAM_APP_SECRET` and store a 60-day token (§4) |
| `(#10) outside of allowed window` | Meta's 24-hour rule | Wait for their reply, or get Human Agent approved (§8) |
| Messenger works but Instagram doesn't | They use different paths — this is expected | Messenger = Facebook Login; Instagram = Instagram Login |

---

## 10. Verify it's working

```bash
# Should print swar.yoga and a conversation count
curl -s "https://graph.instagram.com/v23.0/me?fields=id,username&access_token=IGAA..."
curl -s "https://graph.instagram.com/v23.0/me/conversations?access_token=IGAA..."
```

In the CRM: open `/admin/crm/instagram` — you should see the conversation list
with real usernames (`_laxmeera`, `turyakalburgi`, `drprasadnaidu`, …).
