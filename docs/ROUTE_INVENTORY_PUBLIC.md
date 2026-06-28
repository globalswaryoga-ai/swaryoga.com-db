# Public Route Inventory

This inventory records the non-admin page routes under `app/`. It is a maintenance map, not a promise that every route should appear in public navigation.

Last verified: June 28, 2026

## Status Labels

| Status | Meaning |
| --- | --- |
| `active` | Current visitor-facing route |
| `account` | User authentication, account, or purchased-content route |
| `compatibility` | Older route retained for existing links or payment callbacks |
| `product` | Separate CRM product site |
| `review` | Demo, diagnostic, duplicate, or unclear route that should not be promoted |

## Primary Navigation

These routes are linked by `components/Navigation.tsx`.

| Route | Status | Purpose |
| --- | --- | --- |
| `/` | active | Homepage |
| `/about` | active | About Swar Yoga |
| `/workshops` | active | Canonical workshop listing |
| `/e-learning` | active | Recorded-course listing |
| `/resort` | active | Resort information |
| `/life-planner/ritucharya` | active | Ritucharya entry page |
| `/blog` | active | Blog listing |
| `/community` | active | Community entry page |
| `/contact` | active | Contact page |
| `/media` | active | Media page |

Header utility routes are `/cart`, `/signin`, `/signup`, and `/profile`.

## Public Content And Marketing

| Route or family | Status | Notes |
| --- | --- | --- |
| `/blog/[slug]` | active | Dynamic blog article |
| `/blog/sleep-postures-swar-yoga` | active | Static article route |
| `/faq` | active | FAQ page; footer currently uses `#` instead |
| `/enquiry` | active | Enquiry form |
| `/forms/[formType]` | active | Dynamic public forms |
| `/invest`, `/invest/swar-sakshi`, `/invest/upamanyu` | active | Investment pages |
| `/lp/[slug]` | active | Dynamic landing pages |
| `/privacy`, `/terms`, `/refunds-and-cancellations` | active | Policy pages |
| `/social-media` | active | Social media page |
| `/youth-workshop` | active | Youth workshop landing page |
| `/thankyou` | compatibility | Generic post-submission page |

## Workshops, Registration, And Payments

| Route or family | Status | Notes |
| --- | --- | --- |
| `/workshops` | active | Canonical workshop index |
| `/workshops/[slug]` | active | Workshop details |
| `/workshops/[slug]/landing` | active | Workshop campaign landing page |
| `/workshops/[slug]/register` | active | Current registration entry |
| `/workshops/[slug]/[mode]/[language]/form` | active | Current mode/language form |
| `/registration/[mode]/[language]/[workshop]` | compatibility | Alternate registration route; usage must be traced before removal |
| `/workshop` | compatibility | Permanent redirect to `/workshops` |
| `/workshop/[slug]/dates`, `/workshop/[slug]/select-date` | compatibility | Older discovery flow |
| `/workshop/register/[slug]` | compatibility | Older registration route |
| `/workshop/registretion/*` | compatibility | Misspelled legacy form routes |
| `/workshop/old-id-routes/*` | compatibility | Legacy ID, cart, checkout, and PayU routes |
| `/registernow` | compatibility | Older workshop selection flow |
| `/workshop-join/[formId]` | active | Form-specific workshop join page |
| `/cart`, `/checkout`, `/checkout-enhanced` | active | Cart and checkout pages |
| `/pay-nepal` | active | Nepal payment instructions |
| `/payment-success`, `/payment-successful` | compatibility | Both payment success return pages are live |
| `/payment-pending`, `/payment-failed`, `/payment-confirmation` | compatibility | Payment result/callback pages; do not rename casually |

## E-Learning And User Content

| Route or family | Status | Notes |
| --- | --- | --- |
| `/e-learning/[slug]` | active | Course details |
| `/e-learning/[slug]/learn`, `/e-learning/[slug]/videos` | account | Course learning and video pages |
| `/e-learning/workshop` | account | Workshop learning view |
| `/recordings`, `/recordings/[slug]` | account | Recording library and detail |
| `/assignments`, `/course-materials` | account | Learner resources |
| `/certificates`, `/certificate-details/[id]` | account | Certificates |
| `/sessions`, `/my-sessions` | account | Session discovery and user sessions |
| `/recommendations`, `/leaderboard` | account | Learner recommendations and leaderboard |

## Community

| Route or family | Status | Notes |
| --- | --- | --- |
| `/community/[communityId]` | account | Community detail |
| `/join/[communityId]` | account | Community joining flow |
| `/my/communities` | account | User community list |
| `/community/post`, `/community/post/[postId]` | account | Post creation/detail |
| `/community/[communityId]/create` | account | Community content creation |
| `/community/recordings` | account | Recording library |
| `/community/experiences`, `/community/questions`, `/community/tips`, `/community/transformations`, `/community/submit` | account | Community content sections |
| `/community/*/recording` | account | Program-specific recording pages |
| `/sadhana/community/private-videos`, `/sadhana/community/private-videos/[videoId]` | account | Protected private videos |

Current program recording slugs are `9-month-garbha-sanskar`, `aahar-shastra`, `i-am-fit`, `pre-planning-garbh-sankar`, `swar-yoga-l1` through `swar-yoga-l5`, and `youth`.

## Life Planner And Sadhana

| Route or family | Status | Notes |
| --- | --- | --- |
| `/life-planner` | active | Product entry |
| `/life-planner/login`, `/life-planner/signup` | account | Planner authentication |
| `/life-planner/profile` | account | Planner profile |
| `/life-planner/ritucharya/today` | account | Daily Ritucharya view |
| `/life-planner/dashboard` | account | Dashboard home |
| `/life-planner/dashboard/*` | account | Accounting, plans, budget, calendar, daily, goals, health, routines, notes, progress, reminders, tasks, todos, vision, weekly, monthly, yearly, and settings views |
| `/sadhana/live`, `/sadhana/live/[slug]` | account | Live Sadhana listing/session |
| `/sadhana/obs/[slug]` | account | OBS session view |

## Authentication And Account

| Route or family | Status | Notes |
| --- | --- | --- |
| `/signin`, `/signup`, `/forgot-password` | account | Main authentication |
| `/profile`, `/profile/devices` | account | Profile and device management |
| `/account/delete` | account | Account deletion |
| `/update-details` | account | User detail update |

## CRM Product Site

These routes belong to the separate public CRM product rather than the Swar Yoga content site.

| Route or family | Status | Notes |
| --- | --- | --- |
| `/crm-site` | product | CRM product homepage |
| `/crm-site/about`, `/crm-site/product`, `/crm-site/pricing`, `/crm-site/community`, `/crm-site/contact` | product | Marketing pages |
| `/crm-site/login`, `/crm-site/signup` | product | Product authentication |
| `/crm-site/checkout` | product | Subscription checkout |
| `/crm-site/billing/success`, `/crm-site/billing/pending`, `/crm-site/billing/failed` | product | Billing result pages |
| `/crm`, `/crm/profile` | product | Tenant CRM entry/profile |

## Routes Requiring Review

These pages exist outside `/admin` but appear operational, diagnostic, duplicate, or unfinished. They should be assessed before deletion because external links may exist.

| Route | Reason for review |
| --- | --- |
| `/admin-test` | Publicly reachable admin login diagnostic with preset credentials in client code |
| `/analytics` | Operational page outside the admin namespace |
| `/backup-upload` | Operational backup tool outside the admin namespace |
| `/batches-demo` | Demo route |
| `/calendar` | Unclear overlap with Life Planner calendar |
| `/forum` | Unclear overlap with Community |

## Navigation Findings

- `/workshops` is canonical; `/workshop` permanently redirects to it.
- `components/Footer.tsx` still links workshop items to `/workshop`. Those links work through the redirect but should eventually use `/workshops` directly.
- Footer links for FAQ and Success Stories currently use `#`, although `/faq` exists.
- Payment return routes must remain stable until provider dashboards, callbacks, and webhook behavior are documented.
- The routes in the review table deserve a security/ownership pass before broader route cleanup.

## Verification Method

The inventory was built from:

```bash
find app -name page.tsx -not -path 'app/admin/*' -not -path 'app/api/*' | sort
```

Route status was then checked against `components/Navigation.tsx`, `components/Footer.tsx`, redirect implementations, and the flow notes in `docs/ORGANIZATION_AND_FLOWS.md`.
