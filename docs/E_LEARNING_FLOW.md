# E-Learning Flow

This file maps the current Swar Yoga e-learning system before deeper cleanup. The goal is to make courses, enrollments, payments, video access, materials, assignments, certificates, and admin tools easier to change without breaking paid student access.

## Main Goal

Keep the public e-learning experience stable while clarifying which routes, APIs, and admin tools own each part of the course lifecycle.

Safe order:

1. Document current public and admin flows.
2. Trace enrollment and payment side effects.
3. Audit video/material access rules.
4. Clean up obvious naming/UI issues.
5. Add smoke tests for critical routes.

## Public Student Flow

Current flow:

```text
/e-learning
-> Course listing, language folders, search, level filter
-> /e-learning/[slug]
-> Course detail, price, preview, videos/materials summary
-> Enrollment modal / payment
-> /e-learning/[slug]/videos
-> /e-learning/[slug]/learn
-> Progress, locked/free videos, materials, AI ask, certificate eligibility
```

Important files:

- `app/e-learning/page.tsx`
- `app/e-learning/[slug]/page.tsx`
- `app/e-learning/[slug]/videos/page.tsx`
- `app/e-learning/[slug]/learn/page.tsx`
- `app/e-learning/workshop/page.tsx`
- `components/CourseEnrollmentModal.tsx`
- `components/CashfreePaymentButton.tsx`

Important public/user APIs:

- `app/api/recorded-courses/route.ts`
- `app/api/recorded-courses/video/[videoId]/route.ts`
- `app/api/recorded-courses/video/[videoId]/ask/route.ts`
- `app/api/recorded-courses/enroll/route.ts`
- `app/api/recorded-courses/payment/webhook/route.ts`
- `app/api/recorded-courses/certificate/[enrollmentId]/route.ts`
- `app/api/recorded-courses/[courseId]/enrollments/route.ts`
- `app/api/e-learning/enrollment/initiate/route.ts`
- `app/api/user/enrolled-courses/route.ts`
- `app/api/user/course-materials/route.ts`
- `app/api/user/video-progress/route.ts`
- `app/api/user/assignments/route.ts`
- `app/api/user/certificates/route.ts`

Current issues:

- Public UI uses `/e-learning`, while several APIs and schemas use `recorded-courses`. This may be okay, but it should be documented as a boundary.
- Enrollment can be initiated through course-specific APIs and also through shared payment components.
- The enrollment modal uses `CashfreePaymentButton`, which calls the shared Cashfree payment initiation route.
- The payment webhook must grant course access reliably, so payment-related routes should not be renamed casually.
- Some student-count behavior includes a base/default count in addition to real enrollments.
- `app/e-learning/workshop/page.tsx` is an unlinked legacy-candidate student dashboard route. It uses `/api/user/enrolled-courses`, but current public course cards/details use `/e-learning/[slug]`, `/videos`, and `/learn`.

Fix plan:

- Treat `/e-learning` as the canonical public product route.
- Treat `recorded-courses` as the current data/API naming unless a later migration is planned.
- Trace all enrollment creation paths before changing payment or access behavior.
- Document free-video, gift-hours, paid-video, material, and certificate access rules.
- Keep `app/e-learning/workshop/page.tsx` working for now, but treat `/e-learning/[slug]/learn` as the canonical per-course learning route unless production analytics show otherwise.

## Admin E-Learning Flow

Current flow:

```text
/admin/crm/e-learning
-> language folders or course list
-> create/edit/duplicate/publish/delete course
-> manage videos/materials/tasks/assignments
-> manage users/enrollments/devices
-> analytics
-> certificates
-> AI/RAG video jobs
```

Important admin pages:

- `app/admin/crm/e-learning/page.tsx`
- `app/admin/crm/e-learning/[courseId]/edit/page.tsx`
- `app/admin/crm/e-learning/[courseId]/videos/page.tsx`
- `app/admin/crm/e-learning/[courseId]/materials/page.tsx`
- `app/admin/crm/e-learning/[courseId]/assignments/page.tsx`
- `app/admin/crm/e-learning/[courseId]/certificates/page.tsx`
- `app/admin/crm/e-learning/users/page.tsx`
- `app/admin/crm/e-learning/users/[userId]/page.tsx`
- `app/admin/crm/e-learning/analytics/page.tsx`
- `app/admin/crm/e-learning/bulk-actions/page.tsx`
- `app/admin/crm/e-learning/dashboard/page.tsx`
- `app/admin/crm/e-learning/rag-video/page.tsx`

Important admin APIs:

- `app/api/admin/recorded-courses/route.ts`
- `app/api/admin/recorded-courses/sections/route.ts`
- `app/api/admin/recorded-courses/videos/route.ts`
- `app/api/admin/recorded-courses/videos/check-duplicates/route.ts`
- `app/api/admin/e-learning/enrollments/route.ts`
- `app/api/admin/e-learning/materials/route.ts`
- `app/api/admin/e-learning/assignments/route.ts`
- `app/api/admin/e-learning/assignment-submissions/route.ts`
- `app/api/admin/e-learning/certificates/route.ts`
- `app/api/admin/e-learning/devices/route.ts`
- `app/api/admin/e-learning/analytics/route.ts`
- `app/api/admin/e-learning/ai-video/*`

Current issues:

- Admin route is `/admin/crm/e-learning`, but course CRUD API is `/api/admin/recorded-courses`.
- Videos page is becoming a unified content manager for videos, materials, tasks, questions, and assignments.
- Certificates can be manually issued/revoked, but automatic certificate rules need tracing.
- AI/RAG video tools are a separate workflow and should be treated as advanced/admin-only.
- Some admin UI has noisy debug logging and naming cleanup opportunities.

Fix plan:

- Keep admin URLs stable until a full route inventory exists.
- Document `recorded-courses` as the current course CRUD API.
- Use `/admin/crm/e-learning/[courseId]/videos` as the current unified content manager if that is the intended admin workflow.
- Add smoke tests for admin course list, edit, videos/content, users, analytics, and certificate pages.

## Data Model

Primary schema file:

- `lib/schemas/recordedCourseSchemas.ts`

Main collections/models:

- `RecordedCourse`
- `CourseSection`
- `CourseVideo`
- `CourseMaterial`
- `CourseAssignment`
- `CourseEnrollment`
- `CourseReview`
- `VideoWatchLog`

Important concepts:

- Course content is multi-language and falls back to English.
- Courses can be free or paid.
- Courses can allow gift/free trial hours.
- Paid videos and materials are hidden unless the user has an active/completed enrollment.
- Enrollments track progress, completed videos, watch time, device usage, payment metadata, assignment completion, and certificate fields.

## Video Access And Progress Flow

Current flow:

```text
/e-learning/[slug]/learn
-> GET /api/recorded-courses?slug=...
-> choose URL video, last watched video, or first watchable video
-> GET /api/recorded-courses/video/[videoId]
-> render direct/Bunny player stream
-> POST /api/recorded-courses/video/[videoId]
-> update watch log, device, progress, videosWatched, lastWatchedVideoId
```

Access rules:

- Free videos can be watched by guests.
- Paid videos require an active/completed `CourseEnrollment`.
- Course detail/list responses expose paid `videoUrl`/`bunnyVideoId` only when the user can access paid content.
- Material `fileUrl` is exposed only when the user can access paid content.
- Device records are created/updated for authenticated video access and progress calls.
- Blocked devices return `403`.

Progress rules:

- `CourseEnrollment.videosWatched` is the canonical completed-video list.
- `CourseEnrollment.lastWatchedVideoId` is the canonical resume field.
- The learn page now reads `lastWatchedVideoId` and `videosWatched`; it still accepts older `lastVideoId`/`completedVideos` shapes for compatibility.
- Gift enrollments decrement `giftHoursRemaining` during progress updates.
- When all videos are watched, enrollment status becomes `completed`.

Cleanup completed:

- Fixed learn-page resume/completion mismatch: the UI had been looking for `lastVideoId` and `completedVideos`, while the API/schema use `lastWatchedVideoId` and `videosWatched`.

## Payment And Enrollment Risk Notes

High-risk behavior:

- Payment creation and webhook handling can grant access to paid courses.
- Course payment metadata also appears in shared order/payment schemas.
- Changing callback routes or webhook behavior can break real student access.

Current paid-course paths:

```text
Path A: direct course enrollment API
/api/recorded-courses/enroll
-> creates CourseEnrollment
-> free/gift courses become active immediately
-> paid courses create a pending enrollment with status `expired`
-> /api/recorded-courses/payment/webhook activates that pending enrollment
```

```text
Path B: public enrollment modal
components/CourseEnrollmentModal.tsx
-> components/CashfreePaymentButton.tsx
-> /api/payments/cashfree/initiate
-> creates shared Order with `courseId`
-> /api/payments/cashfree/webhook marks payment completed
-> shared webhook creates/activates CourseEnrollment from Order.courseId
-> sets Order.enrollmentCreated=true
```

Important finding:

- The public course modal currently uses Path B, not Path A.
- Path B depends on `Order.courseId` and `Order.enrollmentCreated` in `lib/db.ts`.
- Path B resolves the student in `app/api/payments/cashfree/webhook/route.ts`:
  - use `Order.userId` if it is a valid existing Mongo user id
  - otherwise find an existing user by checkout email
  - otherwise create a user from checkout name/email/phone/address fields
- Path A still exists and may be used by other UI/API callers.
- Keep both paths documented until usage is audited.

Usage audit:

- Current public course pages use `CourseEnrollmentModal`.
- `CourseEnrollmentModal` uses `CashfreePaymentButton`.
- `CashfreePaymentButton` posts to `/api/payments/cashfree/initiate`.
- No current app/component caller was found for `/api/recorded-courses/enroll`.
- No current app/component caller was found for `/api/e-learning/enrollment/initiate`.
- Treat both unreferenced enrollment initiation endpoints as legacy/alternate APIs until backend callers or external clients are checked.

Return URL behavior:

- `lib/payments/cashfree.ts` sets Cashfree return URL to `/api/payments/cashfree/return?order_id={order_id}`.
- `app/api/payments/cashfree/return/route.ts` verifies order status server-side.
- On success, it redirects to generic `/payment-success?orderId=...&name=...&status=success`.
- On failure or pending status, it redirects to `/payment-failed` with status/error query params.
- Current course purchases do not return directly to `/e-learning/[slug]/learn`; that is a UX improvement candidate after confirming enrollment creation is reliable.

Do not change yet:

- Payment callback/webhook URLs.
- Enrollment creation side effects.
- Access checks for paid video URLs.
- Certificate issuance behavior.

## Payment And Enrollment Test Checklist

Use this checklist before changing course payment, order, webhook, or access logic.

Public paid-course checkout:

1. Open `/e-learning`.
2. Open a paid course detail page.
3. Open the enrollment modal.
4. Submit required fields: first name, email, phone, city.
5. Confirm `/api/payments/cashfree/initiate` creates an `Order` with:
   - `paymentMethod: cashfree`
   - `paymentStatus: pending`
   - `courseId`
   - `cashfreeOrderId`
   - `shippingAddress.email`
6. Complete or simulate a Cashfree paid status.
7. Confirm `/api/payments/cashfree/webhook` marks the order completed.
8. Confirm the shared Cashfree webhook creates or activates one `CourseEnrollment`.
9. Confirm `Order.enrollmentCreated` becomes `true`.
10. Confirm `RecordedCourse.enrolledCount` increments only once.

Student access after payment:

1. Open `/e-learning/[slug]` as the purchaser.
2. Confirm course shows enrolled/progress state.
3. Open `/e-learning/[slug]/videos`.
4. Confirm paid videos are watchable for the enrolled user.
5. Open `/e-learning/[slug]/learn`.
6. Confirm the selected video loads.
7. Confirm video progress writes through `/api/recorded-courses/video/[videoId]`.
8. Refresh and confirm last watched/progress state persists.

Guest checkout:

1. Complete checkout without a valid logged-in user token.
2. Confirm webhook resolves the user by checkout email or creates a user.
3. Confirm the created/resolved user owns the `CourseEnrollment`.
4. Confirm the student can log in or be found by email in admin tools.

Duplicate/idempotency checks:

1. Send the same successful Cashfree webhook twice.
2. Confirm only one active enrollment exists for `userId + courseId`.
3. Confirm `enrolledCount` does not double-increment.
4. Confirm `Order.enrollmentCreated` prevents duplicate work.

Return-page checks:

1. Confirm Cashfree redirects to `/api/payments/cashfree/return?order_id=...`.
2. Confirm successful payments redirect to `/payment-success`.
3. Confirm failed/pending payments redirect to `/payment-failed`.
4. Later UX improvement: make course purchases return to a course-aware success page or `/e-learning/[slug]/learn`.

Next trace:

1. Confirm which UI, if any, still calls `/api/recorded-courses/enroll` for paid courses.
2. Add a test checklist for the shared Cashfree course enrollment path.
3. Decide whether Path A should remain public, become internal, or be deprecated after usage audit.
4. Consider course-aware success redirect after payment, for example to `/e-learning/[slug]/learn`, once webhook enrollment reliability is verified.

## First E-Learning Cleanup Candidates

Safe candidates:

1. Rename the admin page component from `DLearningPage` to `ELearningPage`. Done.
2. Remove noisy delete debug logs from the admin course list. Done.
3. Add comments or docs around the `/e-learning` vs `recorded-courses` naming boundary. Done in this file.
4. Mark `app/e-learning/workshop/page.tsx` route status after link audit. Done: unlinked legacy-candidate.
5. Audit public student-count display so fake/base counts and real enrollment counts are clearly intentional. Done: public listing API now returns `defaultStudents`, and listing/detail pages use `(defaultStudents ?? 15) + enrolledCount`.
6. Audit `components/CashfreePaymentButton.tsx` browser console logging; keep useful failure logs, but remove verbose success/debug logs after payment testing is stable.

Riskier candidates:

1. Changing payment/enrollment routes.
2. Changing video URL exposure.
3. Changing certificate eligibility or issue/revoke rules.
4. Moving admin e-learning URLs.

## Suggested Next Task

Trace the enrollment-to-payment-to-access flow before changing any behavior. After that, perform the first safe cleanup in the admin e-learning page.
