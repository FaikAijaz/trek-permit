# Week 7 — Notifications, Search, Visitor Lists, Audit Trail Views

**Purpose of this document.** `BUILD_SPEC.md` names Week 7's focus in one line (Section 7) but doesn't scope it — everything since Week 6 shipped went beyond what BUILD_SPEC.md specified in detail anyway (dashboard now covers issuance, revocation, document viewing, route management). This document fills that gap the same way BUILD_SPEC.md does for Weeks 1–6, so the next session doesn't have to re-derive it.

**Status:** Not started.

**Decisions made for this pass (2026-09-01):**
- **Notifications are in-app only.** No SMS/push integration — `SmsService` stays exactly as documented in `PROJECT_ARCHITECTURE.md` Section 13 (console-log only, real providers throw). This matches the project's existing "no paid services for the pilot" pattern and keeps `SmsService` as a later, config-only swap.
- **Frontend gets a visual-polish pass after these four features ship**, not before or interleaved — see `docs/FRONTEND_POLISH.md` (to be written when that work starts) for that scope. Nothing in this document should require adopting a new UI library; build these screens in the current stack (Tailwind on dashboard, `StyleSheet` on mobile) so the later polish pass isn't fighting inconsistent foundations.

**Build order for this document's four features**, cheapest/lowest-risk first:

1. Audit trail views — no schema change, data already exists
2. Search — no schema change
3. Visitor lists — no schema change, new query only
4. In-app notifications — new table, touches the most existing service methods

---

## 1. Audit trail views

**Current state:** `AuditLog` (schema.prisma, `@@map("audit_log")`) is fully populated — `AuditService.log()` is called from 18 sites across routes, applications, participants, documents, and permits. There is no controller, no read endpoint, and no UI. This is write-only today.

**Scope:**

- New `AuditController` in `backend/src/audit/`, `GET /audit-log`:
  - Query params: `entityType`, `entityId`, `actorUserId`, `from`, `to`, pagination (`page`/`pageSize`, mirror whatever pattern `applications.controller.ts` already uses if it paginates — confirm before inventing a new shape)
  - Role: **admin-only** for the unscoped/global query. An officer can see an entity-scoped slice (below) but not query across all actors/entities freely.
  - Response includes actor's `fullName`/`mobile` (join `User`) — an actor ID alone isn't useful in a UI.
- Two surfaces on the dashboard:
  - **Global audit log page** (`/audit-log`, admin-only nav item) — filterable table: actor, action, entity type, entity, timestamp. This is the "what happened across the system" view.
  - **Per-entity activity, embedded**: an "Activity" section on the application detail page (`dashboard/app/(dashboard)/applications/[id]/page.tsx`) scoped to `entityType=application` (and probably its participants/permits too — decide whether to union those or keep them strictly separate when building). Available to officer + admin, since they're already looking at that application.
- No mobile UI for this — audit trail is a department/admin concern, not a trekker/field-officer one.

**Out of scope:** exporting the log (CSV/PDF), retention/pruning policy for `audit_log` (grows forever, same trade-off already accepted for `Document` per `PROJECT_ARCHITECTURE.md` Section 18).

---

## 2. Search

**Current state:** Dashboard's applications list and routes list are unfiltered — every row, client-fetched, no query params. Fine at pilot scale, won't stay fine.

**Scope:**

- **Applications** (`GET /applications`, backend): add `search` (matches `reference`, applicant `fullName`/`mobile`), `status`, `trekRouteId`, `from`/`to` (by `startDate`) query params. Dashboard applications list page gets a search input + status/route dropdown filters above the table.
- **Routes**: dataset is small (one department, one season) — do this **client-side** on the already-fetched list rather than adding server params. Add a search box to `dashboard/app/(dashboard)/routes/page.tsx` filtering on `name`/`region` in-memory. Revisit if the route count ever grows past a page or two.
- **Mobile**: the Trekker app's routes tab (`mobile/app/(app)/(tabs)/routes.tsx`) likely wants the same client-side filter treatment once route counts grow — lower priority than the dashboard, include only if time allows this week.

**Out of scope:** full-text search infra (Postgres `tsvector`, external search service) — plain `ILIKE`/`contains` filters are enough at this scale.

---

## 3. Visitor lists

**Current state:** No concept of "who is on route X on date Y" exists anywhere. This is new, not a UI gap on existing data.

**Scope:**

- New endpoint, `GET /routes/:id/visitors?date=YYYY-MM-DD` (or `from`/`to` for a range):
  - Returns participants where: their application's `trekRouteId` matches, the application's `[startDate, endDate]` range covers the queried date, the application status is `approved` or `permit_issued`, and the participant's own status is `APPROVED` (excludes `REJECTED`/`EXCLUDED`/pending members — they aren't actually going).
  - Per row: participant name, `identityLast4`, `isLeader`, `isGuide`, mobile, application reference, permit status if issued.
  - Role: officer + admin.
- Dashboard screen: pick a route + date (or date range), get the roster. This is the piece with real operational value — it's what the department would actually want at a trailhead or for search-and-rescue, closer to the "check-in/check-out, rescue coordination" that BUILD_SPEC.md Section 2 explicitly parked as out-of-scope for the pilot. Worth flagging to the Department that this is a lightweight read-only version of that, not the real thing.
- **Mobile, Field Officer role**: same query, on-device — useful at the checkpoint. Whether this needs the same *offline* treatment as QR/signature verification (`c563dfa`'s SQLite cache) is an open question; the simplest version requires connectivity to fetch the roster, which may be an acceptable gap since visitor lists aren't the safety-critical path permit verification is. Decide when building.

**Out of scope:** any write path (check-in/check-out marking someone as departed/returned) — this is a read-only roster, per Section 2's explicit exclusion.

---

## 4. In-app notifications

**Current state:** Nothing. Users (trekkers, officers) currently learn about status changes only by opening the app and looking.

**Scope:**

New Prisma model:

```prisma
enum NotificationType {
  application_status_changed
  correction_requested
  permit_issued
  permit_revoked

  @@map("notification_type")
}

model Notification {
  id     String @id @default(uuid()) @db.Uuid
  userId String @map("user_id") @db.Uuid
  user   User   @relation(fields: [userId], references: [id])

  type       NotificationType
  title      String @db.VarChar(200)
  body       String
  entityType String @map("entity_type") @db.VarChar(50)
  entityId   String @map("entity_id") @db.Uuid

  isRead    Boolean  @default(false) @map("is_read")
  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz

  @@index([userId, isRead])
  @@map("notifications")
}
```

- Emit a `Notification` row at the same call sites that already emit an `AuditLog` entry for a user-facing state change — specifically: application decided (approve/reject), participant decided (approve/reject/correction requested), permit issued, permit revoked. Same list as the 18 `auditService.log()` call sites, filtered down to the ones that represent something a trekker or trek leader would want to know about (not every audit event needs a notification — e.g. a route being edited by an admin doesn't).
- New `NotificationsController`: `GET /notifications` (mine, paginated, includes unread count), `PATCH /notifications/:id/read`, `PATCH /notifications/read-all`.
- **Dashboard**: bell icon in `TopNav.tsx` with an unread badge, dropdown or `/notifications` page — mainly useful to officers for their own actions' downstream effects (less central than for trekkers, but keep it consistent across both apps rather than mobile-only).
- **Mobile**: bell/inbox icon, likely in the Trekker tab layout (`mobile/app/(app)/(tabs)/_layout.tsx`) — this is the one that actually matters, since trekkers have no other way to learn their application moved.

**Out of scope:** push notifications (would need Expo push tokens + a push service — real infrastructure, not "in-app"), email.

---

## Open questions to confirm before or during the build

- Audit trail global page: is admin-only right, or should officers see it too (read-only, no filter-by-actor)?
- Visitor list date range vs single date — single date is simpler and probably sufficient (a route's applications rarely span more than a few days anyway).
- Whether mobile visitor lists ship this week at all, or get deferred to a follow-up once the offline question is answered.
