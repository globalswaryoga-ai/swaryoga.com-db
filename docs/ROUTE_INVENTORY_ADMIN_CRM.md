# Admin CRM Route Inventory

This inventory maps the page routes under `app/admin/crm/`. It is a maintenance guide, not an authorization specification and not a recommendation to expose every route in navigation.

Last verified: June 29, 2026

## Scope And Sources

- `app/admin/crm/**/page.tsx` contains 202 page routes.
- `components/admin/crm/crmNavConfig.ts` defines the shared sidebar sections and section sub-navigation.
- `components/admin/crm/CrmSidebar.tsx` filters sections by domain, tenant plan modules, and super-admin status.
- `components/admin/crm/CrmShell.tsx` applies onboarding, compartment, trial, and plan gates around CRM pages.
- `/admin/dashboard` redirects to `/admin/crm`; the canonical CRM entry is `/admin/crm`.

Routes outside `app/admin/crm/`, including the website-admin pages linked from the Web Super Admin section, are outside this inventory.

## Route Labels

| Label | Meaning |
| --- | --- |
| `core` | Current CRM entry or broadly available operational route |
| `module` | Current feature route, sometimes controlled by a tenant plan bundle |
| `detail` | Child, editor, report, or record route normally reached from a parent page |
| `owner` | Platform-owner or super-admin route hidden from regular tenant navigation |
| `archive` | Older, duplicate, diagnostic, or compatibility route retained in the super-admin Archive section |
| `review` | Existing route whose canonical status or navigation ownership needs confirmation |

## Access And Navigation Model

The CRM has two navigation contexts:

- On `crm.swaryoga.com`, the sidebar shows a curated tenant module list. Sections are filtered using the tenant's plan and assigned module keys.
- On the main site, super-admins can see all configured sections, including Web Super Admin, platform tenants, bank income, and Archive. Regular users see only their permitted plan modules.

The sidebar and top sub-navigation are both driven by `sectionConfigs`. A route missing from a direct navigation item is not necessarily dead: dynamic record pages, editors, setup pages, and compatibility aliases are commonly reached from a parent page or retained for old links.

Navigation visibility is not the security boundary. Individual pages and their APIs use client tokens, role checks, tenant resolution, and server-side authorization in different combinations. Those checks must be audited before changing access behavior.

## Core, Leads, And Sales

| Route or family | Label | Purpose |
| --- | --- | --- |
| `/admin/crm` | core | Canonical CRM overview |
| `/admin/crm/dashboard` | review | Alternate analytics-style dashboard; not the canonical entry |
| `/admin/crm/web-admin` | owner | Hub for website administration links |
| `/admin/crm/leads`, `/admin/crm/leads/[id]`, `/admin/crm/leads/deleted` | module/detail | Meta lead list, detail, and deleted leads |
| `/admin/crm/leads-followup` | module | Lead follow-up workspace |
| `/admin/crm/funnel`, `/admin/crm/funnel/manage` | module | Sales funnel and funnel configuration |
| `/admin/crm/sales`, `/admin/crm/sales/[id]` | module/detail | Sales list and sale detail |
| `/admin/crm/sales/[id]/certificate`, `/admin/crm/sales/events` | detail | Certificate and sales-event management |
| `/admin/crm/labels`, `/admin/crm/lead-assignment-settings` | module | Lead labels and assignment rules |
| `/admin/crm/order-maintenance` | module | Order maintenance |
| `/admin/crm/investment`, `/admin/crm/investment-dashboard` | module | Investment records and dashboard |

## Messaging And Channels

| Route or family | Label | Purpose |
| --- | --- | --- |
| `/admin/crm/meta`, `/admin/crm/meta-dashboard` | module | Canonical Meta WhatsApp inbox and dashboard |
| `/admin/crm/meta/templates`, `/admin/crm/meta/templates/new` | module/detail | Meta template list and creation |
| `/admin/crm/broadcast`, `/admin/crm/broadcast-dashboard`, `/admin/crm/broadcast/reports`, `/admin/crm/broadcast-runs/[id]` | module/detail | Meta broadcast operations and results |
| `/admin/crm/send-template`, `/admin/crm/templates`, `/admin/crm/templates/builder` | module/detail | Shared Meta message/template tools |
| `/admin/crm/qr` | module | Canonical QR WhatsApp inbox |
| `/admin/crm/qr/templates`, `/admin/crm/qr/broadcast`, `/admin/crm/qr/broadcast-report`, `/admin/crm/qr/broadcast-schedule` | module/detail | QR templates, broadcasts, reports, and scheduling |
| `/admin/crm/qr/group-contacts`, `/admin/crm/qr/group-scheduler`, `/admin/crm/qr/merge-group-v2` | module/detail | QR group operations |
| `/admin/crm/qr/leads`, `/admin/crm/qr/funnel`, `/admin/crm/qr/funnel-report`, `/admin/crm/qr/manage` | module | QR-scoped leads and funnel tools |
| `/admin/crm/qr/automation`, `/admin/crm/qr/chatbot`, `/admin/crm/qr/chatbot/builder/[id]`, `/admin/crm/qr/health-report` | detail | QR automation, chatbot, and diagnostics |
| `/admin/crm/email`, `/admin/crm/email-campaigns` | module | Email dashboard and campaigns |
| `/admin/crm/telegram`, `/admin/crm/telegram/templates`, `/admin/crm/telegram/broadcast` | module | Telegram channel tools |
| `/admin/crm/messages`, `/admin/crm/scheduled-messages` | module | SMS/message operations and scheduling |
| `/admin/crm/connections`, `/admin/crm/devices`, `/admin/crm/devices/settings` | module/detail | Channel connections and devices |
| `/admin/crm/whatsapp/settings`, `/admin/crm/whatsapp/webhook-events` | module/detail | Shared WhatsApp settings and webhook events |
| `/admin/crm/whatsapp/meta` | archive | Compatibility alias for canonical `/admin/crm/meta` |
| `/admin/crm/whatsapp`, `/admin/crm/whatsapp-meta`, `/admin/crm/whatsapp-groups` | archive | Older WhatsApp pages |
| `/admin/crm/whatsapp/connection-monitor`, `/admin/crm/whatsapp/templates`, `/admin/crm/whatsapp/templates/new` | archive | Older connection and template tools |
| `/admin/crm/qr-broadcast`, `/admin/crm/qr-templates`, `/admin/crm/qr/broadcast-v2` | archive | Older QR broadcast/template routes |

## Product Modules

| Route or family | Label | Purpose |
| --- | --- | --- |
| `/admin/crm/community`, `/admin/crm/community-moderation`, `/admin/crm/community/zoom-setting` | module/detail | Community administration and Zoom mapping |
| `/admin/crm/recording-management`, `/admin/crm/zoom-analytics` | module | Recordings and Zoom reporting |
| `/admin/crm/e-learning`, `/admin/crm/e-learning/dashboard`, `/admin/crm/e-learning/analytics`, `/admin/crm/e-learning/bulk-actions` | module | E-learning course operations |
| `/admin/crm/e-learning/[courseId]/edit`, `/videos`, `/materials`, `/assignments`, `/certificates` | detail | Course-specific management; each suffix is under `[courseId]` |
| `/admin/crm/e-learning/users`, `/admin/crm/e-learning/users/[userId]` | module/detail | Learner list and learner detail |
| `/admin/crm/e-learning/rag-video` | detail | RAG video processing tool |
| `/admin/crm/sadhana-programs`, `/admin/crm/sadhana-programs/[id]`, `/admin/crm/sadhana-programs/test-sessions` | module/detail | Sadhana programs and test sessions |
| `/admin/crm/sadhana-announcements`, `/admin/crm/sadhana-chat`, `/admin/crm/sadhana-scheduler` | module | Sadhana communications and scheduling |
| `/admin/crm/calls`, `/admin/crm/calls/agents`, `/admin/crm/calls/templates`, `/admin/crm/calls/reports`, `/admin/crm/calls/broadcasts` | module | AI calling workflows |
| `/admin/crm/chatbots`, `/admin/crm/chatbots/builder/[id]` | module/detail | Chatbot list and builder |
| `/admin/crm/knowledge-base`, `/admin/crm/ai-agents`, `/admin/crm/chatbot-builder`, `/admin/crm/chatbot-settings` | module | AI and chatbot configuration |
| `/admin/crm/automation`, `/admin/crm/workflows` | module | Automation and workflow tools |
| `/admin/crm/landing-pages`, `/admin/crm/form-links` | module | CRM landing pages and public form links |
| `/admin/crm/media`, `/admin/crm/media/settings`, `/admin/crm/inbound-media` | module/detail | CRM media storage and settings |
| `/admin/crm/integration-hub` | module | Current integration hub |

## Planner, Ritucharya, And KP Astro

| Route or family | Label | Purpose |
| --- | --- | --- |
| `/admin/crm/planner` | module | Planner home |
| `/admin/crm/planner-dashboard` | detail | Redirect to the comprehensive planner dashboard |
| `/admin/crm/planner-dashboard/comprehensive-dashboard` | module | Main planner dashboard |
| `/admin/crm/planner-dashboard/daily`, `/calendar`, `/events`, `/reminders`, `/tasks`, `/todos` | module | Daily planning and scheduling; suffixes are under `planner-dashboard` |
| `/admin/crm/planner-dashboard/goals`, `/action-plan`, `/progress`, `/vision`, `/vision-download`, `/diamond-people` | module | Goals and vision planning |
| `/admin/crm/planner-dashboard/health`, `/notes`, `/words`, `/accounting` | module | Personal life and accounting tools |
| `/admin/crm/planner-dashboard/ritucharya` | module | Current planner Ritucharya entry |
| `/admin/crm/planner-dashboard/ritucharya/{calendar,dashboard,guide,profile,recipes,today}` | detail | Ritucharya user views |
| `/admin/crm/planner-dashboard/ritucharya/{recipes-admin,ritus-admin,variations-admin}` | owner/detail | Ritucharya administration |
| `/admin/crm/kp-astro`, `/data-entry`, `/workspace`, `/charts`, `/charts/[id]` | module/detail | KP Astro toolkit and birth charts; suffixes are under `kp-astro` |
| `/admin/crm/kp-astro/horary`, `/horary-workspace`, `/final-prediction`, `/export` | module/detail | Horary workflow and exports |
| `/admin/crm/kp-astro/matchmaking/{data-entry,workspace,final-prediction}` | module/detail | Matchmaking workflow |
| `/admin/crm/planner/ritucharya`, `/admin/crm/planner/ritucharya/manage` | archive | Older planner Ritucharya implementation |
| `/admin/crm/ritucharya`, `/diet-plan`, `/dietary-recommendations`, `/logic` | archive | Older Ritucharya routes; suffixes are under `ritucharya` |
| `/admin/crm/ritucharya-recipes` | archive | Older recipe administration |

## Reports, Settings, And Tenant Operations

| Route or family | Label | Purpose |
| --- | --- | --- |
| `/admin/crm/reports`, `/admin/crm/all-reports`, `/admin/crm/analytics` | module | Reporting hubs and CRM analytics |
| `/admin/crm/reports/meta`, `/admin/crm/reports/qr`, `/admin/crm/whatsapp-analytics` | module | Channel-specific reports |
| `/admin/crm/settings`, `/admin/crm/settings/data-management` | core/detail | CRM settings and data management |
| `/admin/crm/users`, `/admin/crm/users/profile`, `/admin/crm/team`, `/admin/crm/permissions` | core/owner | CRM users, profile, team, and permissions |
| `/admin/crm/custom-fields`, `/admin/crm/branding` | module | Tenant data and appearance configuration |
| `/admin/crm/subscription`, `/admin/crm/addons` | module | Storage/subscription status and extensions |
| `/admin/crm/super-admin`, `/users`, `/payments`, `/signins`, `/reports` | owner | Platform super-admin family; suffixes are under `super-admin` |
| `/admin/crm/tenants`, `/admin/crm/tenants-plan` | owner | Tenant and plan-bundle administration |
| `/admin/crm/bank-income` | owner | Bank income tracker |

## Archive And Review Routes

These routes remain reachable, mostly through the super-admin Archive section. Do not remove them until inbound links, API dependencies, and replacement routes are confirmed.

| Route or family | Label | Notes |
| --- | --- | --- |
| `/admin/crm/account`, `/admin/crm/profile`, `/admin/crm/account-book`, `/admin/crm/billing`, `/admin/crm/billing-history`, `/admin/crm/payment-details`, `/admin/crm/affiliate` | archive | Older account and billing pages |
| `/admin/crm/admin-activity`, `/admin/crm/error-logs`, `/admin/crm/anti-bug`, `/admin/crm/helpdesk`, `/admin/crm/capacity` | archive | Diagnostics and operational support |
| `/admin/crm/crm-users`, `/admin/crm/translate`, `/admin/crm/instagram`, `/admin/crm/messenger`, `/admin/crm/tally` | archive | Older or miscellaneous tools |
| `/admin/crm/onboarding` | archive | Standalone onboarding page; shell also owns onboarding UI |
| `/admin/crm/chatbot`, `/admin/crm/chatbots/editor` | archive | Older chatbot implementations |
| `/admin/crm/integrations` | archive | Older integrations page; current hub is `/integration-hub` |

## Navigation Findings

- The canonical dashboard is `/admin/crm`; `/admin/dashboard` redirects there.
- Tenant navigation is intentionally smaller than the route tree and changes with plan modules.
- The main-domain super-admin sidebar exposes owner tools and an Archive catch-all that are hidden on the tenant CRM domain.
- Dynamic detail routes and setup pages are normally linked from their parent modules rather than listed as sidebar entries.
- `/admin/crm/whatsapp/meta` explicitly preserves an older URL while re-exporting the canonical `/admin/crm/meta` page.
- `/admin/crm/planner-dashboard` explicitly redirects to `/admin/crm/planner-dashboard/comprehensive-dashboard`.
- `/admin/crm/dashboard`, several legacy WhatsApp routes, and older Ritucharya/chatbot routes should not be promoted until their ownership and replacement status are confirmed.

## Verification Method

The route list was generated with:

```bash
find app/admin/crm -name page.tsx | sort
```

Literal CRM navigation links were extracted from `components/admin/crm/crmNavConfig.ts` and checked against the page tree. Query-string variants of `/admin/crm/web-admin` resolve to the same page. Routes not represented by a literal navigation item were reviewed as dynamic details, parent-linked tools, redirects, aliases, or review candidates.
