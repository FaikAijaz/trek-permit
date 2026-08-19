# Trek Permit — Department Dashboard

Next.js (App Router, TypeScript, Tailwind) app for officers and admins:
the review queue, per-participant decisions (approve / reject / request
correction), whole-application approve/reject, permit issuance (with the
exclusion-confirmation step), and admin-only permit revocation. See
[`../docs/BUILD_SPEC.md`](../docs/BUILD_SPEC.md) for the full design spec
and [`../PROJECT_ARCHITECTURE.md`](../PROJECT_ARCHITECTURE.md) for how this
fits the rest of the system.

Signs in with the same mobile-number + OTP flow as the mobile app, against
the same backend — but only `officer` and `admin` accounts are let in
(a `trekker` account that verifies successfully is rejected client-side
with a clear message, since every dashboard endpoint would just 403 for
them anyway).

## Running it

1. **Backend must be running**, and it must have CORS enabled
   (`app.enableCors()` in `backend/src/main.ts`) — a browser app calling a
   different origin needs that; the mobile app never did, since React
   Native's `fetch` doesn't enforce CORS.
2. Copy `.env.local.example` to `.env.local` and set `NEXT_PUBLIC_API_URL`
   (`http://localhost:3000` works if both run on the same machine —
   unlike the mobile app, a browser doesn't need the LAN IP trick).
3. `npm install`
4. `npm run dev` — runs on **port 3001**, not Next's default 3000, so it
   doesn't collide with the backend.

**Getting an officer/admin account to sign in with:** `backend/prisma/seed.ts`
creates one of each for the pilot (`9999999998` / officer,
`9999999999` / admin). See the root README's "Trying the Field Officer
role" section for the same OTP-over-console mechanics.

## Structure

```
app/
  layout.tsx              wraps everything in AuthProvider
  page.tsx                redirects to /login or /applications by auth state
  login/page.tsx           two-step mobile → OTP form
  (dashboard)/             route group: RequireStaff guard + TopNav, no URL segment of its own
    layout.tsx
    applications/page.tsx           the review queue, filterable by status
    applications/[id]/page.tsx      the big one — application detail, participant
                                     review/decide, approve/reject, issue permit,
                                     admin revoke
    applications/[id]/ParticipantCard.tsx   one participant's card + decision form
lib/
  types.ts                 hand-mirrored backend types (same caveat as mobile/src/api/types.ts —
                            no shared package, keep this in sync by hand)
  auth-context.tsx          session state, persisted to localStorage (a bearer token
                            sent as Authorization header, same posture as the mobile app —
                            not an httpOnly cookie; see the file's own comment on that trade-off)
  api/                      one file per backend module + a shared fetch client
  theme.ts                  status → Tailwind class lookup
components/
  RequireStaff.tsx           the auth/role guard every (dashboard) page sits behind
  StatusBadge.tsx, Button.tsx, TopNav.tsx, QrCode.tsx
```

A known gap, inherited from the backend rather than introduced here:
there's no document-download endpoint, so a document shows as a filename
and version on the participant card, with no way to actually view its
contents. See `PROJECT_ARCHITECTURE.md` Section 27.
