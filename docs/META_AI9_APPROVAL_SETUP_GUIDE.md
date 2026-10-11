# Meta Leads AI-9 Approval Setup Guide

This guide explains how to configure **Admin → CRM → New Registration → Meta Leads** so that approved leads automatically receive the selected WhatsApp template, only once.

## Pipeline (current)

```
New Meta lead
  → AI-9A  New Leads screen          → stage_1_new / new_pending / new_rejected
  → AI-9B  Stage 1 (final screen)    → approved / stage_1_pending / stage_1_rejected
  → AI-9E  Trigger check (Active)    → eligible leads continue
  → AI-9W  Approved template         → queued once, after the configured delay
  → Meta webhook receipts            → Trigger / Broadcast report sent/delivered/read
```

Stage 2 (AI-9C) and Stage 3 (AI-9D) are removed. Leads that were left in legacy Stage 2 or Stage 3 statuses are screened again by AI-9B.

## How each question rule is evaluated

For every question rule:

1. The **question** must match a question in the Meta form. Matching ignores case, spaces and punctuation, so `Are you 18+?` matches `are you 18`. Copy the question exactly from the lead's form answers.
2. Each **answer option** matches when the lead's answer is:
   - the same text (ignoring case and punctuation), or
   - a text that contains the option as a whole word or phrase. For example, the option `Hindi` matches the answer `Hindi, Marathi`.
3. The category of the matched option decides the result for that question:
   - `approved`: this question passes.
   - `pending`: this question needs manual review.
   - `rejected`: the whole lead is rejected.
4. If no option matches, or the question was not answered, that question is **Pending**. There is no fallback selector or Global Mismatch / Hard Reject section any more.

The final result for the stage:

| Any question Rejected? | Any question Pending? | Result |
|---|---|---|
| Yes | — | Rejected |
| No | Yes | Pending |
| No | No | Approved |

## Recommended setup

### AI-9A: New Leads (basic qualification)

Keep this stage light, using only the must-have questions. Example:

| Question | Answer option | Category |
|---|---|---|
| Which language do you prefer? | Hindi | approved |
| Which language do you prefer? | English | rejected (for the Hindi batch) |
| Can you attend all days? | Yes | approved |
| Can you attend all days? | No | rejected |
| Can you attend all days? | Maybe | pending |

### AI-9B: Stage 1 (final approval)

Put the detailed qualification questions here. Example:

| Question | Answer option | Category |
|---|---|---|
| Do you have Zoom on your phone/laptop? | Yes | approved |
| Do you have Zoom on your phone/laptop? | No | pending |
| Age group | 18-30 / 31-45 / 46-60 | approved |
| Age group | Below 18 | rejected |

Tips:

- **Add every expected answer.** An answer that isn't listed always becomes Pending.
- If the Meta form has fixed choices, add **all** of them, each with its intended category.
- Use `rejected` only for real disqualifiers.

### AI-9E: Trigger

- AI-9E **must be Active**. If it is inactive, automatic approvals are not sent.
- Question rules here are optional. With no rules, every approved lead is eligible. If you add rules, only leads whose answers match `approved` options are sent.

### AI-9W: WhatsApp template

- Select the Meta-approved template for **Approved**, set the delay in minutes, and save.
- Re-save AI-9W after any template change. Saving is rejected if a required stage is inactive or the template is not approved.

## Manual approvals

When you change a lead to **Approved** manually, the AI-9W template is queued even though the AI-9 stages and AI-9E were skipped. Duplicate protection still applies.

## Duplicate-send protection

A lead is skipped, never resent, when any of these is true:

- `wtLastTemplates` already contains the template;
- a previous broadcast-run message exists for the phone and template; or
- the Meta inbox already has an outbound message with the template.

Skipped leads show `wtStatus: skipped` with the reason. The manual broadcasts already sent are therefore **not** resent.

## Reports

- Runs with no queued messages, or where every message was skipped, are marked **failed/skipped**, not successful.
- Delivery receipts from the Meta webhook update sent, delivered, read and failed counts in the Trigger and Broadcast reports.

## Setup checklist for each batch (e.g. Hindi)

1. AI-9A: add the questions and every answer option → **Active** → Save.
2. AI-9B: add the questions and every answer option → **Active** → Save.
3. AI-9E: **Active** (rules optional) → Save.
4. AI-9W: select the approved template and delay → Save.
5. Test with a dummy lead, or check one new lead: its status should become `approved` and `wtStatus` should become `queued`.

## Change history

- Fixed the Meta Leads "Invalid Date" display.
- Manual approvals now trigger the AI-9W template. Duplicate sends are blocked. Empty or all-skipped runs are flagged (`6e36f79a`, `c094c64b`).
- Removed Stage 2 and Stage 3, the fallback selector and Global Mismatch / Hard Reject. Unmatched answers become Pending (`ecaace74`).
- Known pending item: the Broadcast lead list loads at most 5,000 leads.
