# Digital Trekking Permit System — Build Specification

**Purpose of this document.** This is the working specification for building the system. Paste it at the start of any new Claude session so no design context is lost. It is not the proposal — that document is for the Department. This one is for the people writing the code.

**Status:** Pre-development. Week 1 not yet started.
**Platform:** Windows, VS Code.
**Team:** Solo developer, full-time, working with Claude.

---

## 1. What we are building

A system for issuing and verifying trekking permits in Jammu & Kashmir, piloted on one route for one season.

Three parts:

| Part | Technology | Who uses it |
|---|---|---|
| Mobile app — Trekker role | React Native (Expo) | Applicants and trek leaders |
| Mobile app — Field Officer role | Same binary, separate login | Checkpoint officers |
| Department dashboard | Next.js | Tourism officers |
| Backend API | NestJS + PostgreSQL | — |

The defining constraint: **a permit must be verifiable at a checkpoint with no mobile signal, and must be impossible to alter after issue.** Everything else follows from that.

---

## 2. Confirmed design decisions

These were settled through consultation and are not open for casual revision. If a decision needs to change, change it here first.

### Approval and issuance

1. **No decision is ever automated.** An officer approves, rejects, or requests correction. Permits are issued only when an officer explicitly clicks *Issue Permit*.
2. **Trek Leader must be approved** or the entire group application fails. The group would resubmit under a different leader.
3. **Application-level rejection exists** separately from member-level: route closed, dates unavailable, operator registration invalid or expired.
4. **Permit issuance requires** the Trek Leader approved and at least one member approved. Nothing else.
5. **An officer may issue a permit while members are still unresolved.** The system warns first, then sets those members to `EXCLUDED`.

### Member handling

6. **Per-member verification.** Each group member is decided on their own documents. One member's outcome does not affect any other.
7. **Partial issuance.** A permit containing 9 of 12 members is normal and expected.
8. **`REJECTED` and `EXCLUDED` are different.** Rejected = an officer assessed them and found them ineligible. Excluded = no decision was reached before issuance. The Trek Leader is told which, accurately.
9. **Reapplication is permitted** after rejection. The person may apply individually or in another group.
10. **Prior rejections are surfaced to the reviewing officer**, looked up by identity number, for 12 months. The system does not block; it informs.
11. **Corrections are member-scoped.** Only that member's document is re-uploaded. The rest of the group is untouched.
12. **Documents are versioned, never overwritten.** The record must show what the officer saw at the time of each decision.

### Group types

13. **Two group types:** `private` and `commercial`.
14. **Commercial requires** operator registration number, registered operator name, and registration validity date. Verified by the officer against departmental records — ATO registration is issued by this same Department.
15. **The Trek Leader need not personally hold the registration.** They enter the operator's details. Formal operator accounts are a later phase.

### Out of scope for the pilot

16. Foreign nationals / passport applications.
17. Payments of any kind.
18. Check-in / check-out, rescue coordination, analytics.
19. Minimum group size and capacity enforcement (fields exist, not enforced).
20. Member substitution after issuance.

### Pending Department direction

These have recommended defaults in Section 10 of the proposal. Build to the default; the flagged one may change the workflow.

- **Security agency clearance before approval** — if required, this adds a workflow stage. Confirm before Week 4.
- Date flexibility window (default: start date ± 3 days)
- Fitness certificate validity (default: issued within 90 days)
- Minimum lead time (default: 3 working days)
- Prior rejection visibility (default: 12 months)
- Document retention (default: 3 years, then anonymise)

---

## 3. Member status state machine

Every participant carries a status. **Only these transitions are legal.** Enforce this in code — do not allow arbitrary status writes.

```
PENDING              → APPROVED
PENDING              → REJECTED
PENDING              → CORRECTION_REQUESTED
PENDING              → EXCLUDED              (officer issues while unresolved)

CORRECTION_REQUESTED → PENDING               (leader re-uploads; set resubmitted = true)
CORRECTION_REQUESTED → APPROVED
CORRECTION_REQUESTED → REJECTED
CORRECTION_REQUESTED → EXCLUDED              (officer issues before fix arrives)

APPROVED             → REVOKED               (admin only, after issuance)
```

**Terminal states:** `APPROVED`, `REJECTED`, `EXCLUDED`, `REVOKED`.
**Active states:** `PENDING`, `CORRECTION_REQUESTED`. Only these can block issuance, and even then only until the officer chooses to proceed.

`resubmitted` is a boolean flag on the participant, not a status. It tells the officer "this came back corrected" versus "never looked at". Reset it to `false` when the officer next reviews.

---

## 4. Data model

PostgreSQL. Field names below are the database names (snake_case). Prisma will expose them as camelCase in TypeScript.

### users

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| mobile | varchar(15) | unique, not null |
| full_name | varchar(200) | |
| email | varchar(200) | nullable |
| address | text | nullable |
| role | enum | `trekker` \| `officer` \| `admin` |
| is_active | boolean | default true |
| created_at / updated_at | timestamptz | |

### otp_codes

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| mobile | varchar(15) | not null, indexed |
| code_hash | varchar(255) | **hashed, never plaintext** |
| expires_at | timestamptz | |
| consumed_at | timestamptz | nullable |
| attempts | int | default 0 |
| created_at | timestamptz | |

### trek_routes

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| name | varchar(200) | not null |
| region | varchar(200) | |
| description | text | nullable |
| difficulty | enum | `easy` \| `moderate` \| `difficult`, nullable |
| is_open | boolean | default false |
| required_documents | jsonb | e.g. `["aadhaar","fitness_certificate"]` |
| capacity_per_day | int | nullable, not enforced in pilot |
| min_lead_time_days | int | default 3 |
| created_at / updated_at | timestamptz | |

### applications

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| reference | varchar(30) | unique — `APP-2026-000001` or `GRP-2026-000134` |
| type | enum | `individual` \| `group` |
| group_type | enum | `private` \| `commercial`, null for individual |
| applicant_user_id | uuid | FK → users |
| trek_route_id | uuid | FK → trek_routes |
| start_date / end_date | date | |
| status | enum | `draft` \| `submitted` \| `under_review` \| `approved` \| `rejected` \| `permit_issued` |
| rejection_reason | text | nullable — application-level rejection |
| operator_registration_no | varchar(100) | nullable, commercial only |
| operator_name | varchar(200) | nullable, commercial only |
| operator_reg_valid_until | date | nullable, commercial only |
| submitted_at / decided_at | timestamptz | nullable |
| decided_by | uuid | FK → users, nullable |
| created_at / updated_at | timestamptz | |

> **Why operator fields live here, not on the participant.** The commercial arrangement describes *this application*, not the person. The same guide might lead a private trek next month. Nullable columns on `applications` is simpler than a separate table for a pilot.

### participants

One table covers individual applicants, trek leaders, and group members. An individual application has exactly one participant with `is_leader = true`.

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| application_id | uuid | FK → applications |
| is_leader | boolean | default false |
| full_name | varchar(200) | not null |
| date_of_birth | date | nullable |
| gender | enum | `male` \| `female` \| `other`, nullable |
| address | text | nullable |
| mobile | varchar(15) | nullable |
| identity_number | varchar(20) | not null — Aadhaar |
| identity_last4 | varchar(4) | denormalised for the permit payload |
| emergency_contact_name | varchar(200) | |
| emergency_contact_mobile | varchar(15) | |
| medical_declaration | boolean | default false |
| is_guide | boolean | default false |
| guide_registration_no | varchar(100) | nullable |
| status | enum | see state machine |
| officer_remark | text | nullable — the reason shown to the leader |
| resubmitted | boolean | default false |
| reviewed_at | timestamptz | nullable |
| reviewed_by | uuid | FK → users, nullable |
| created_at / updated_at | timestamptz | |

> **Why one table instead of `trek_leaders` + `group_members`.** Both need identical verification, identical documents, identical status handling. Splitting them means writing every rule twice. `is_leader` is the only real difference.

### documents

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| participant_id | uuid | FK → participants |
| document_type | enum | `aadhaar` \| `fitness_certificate` \| `photograph` \| `guardian_consent` \| `other` |
| storage_key | varchar(500) | path or object key |
| original_filename | varchar(300) | |
| mime_type | varchar(100) | |
| size_bytes | int | |
| version | int | default 1 |
| is_current | boolean | default true |
| uploaded_at | timestamptz | |

On correction: insert a new row with `version + 1`, set the previous row `is_current = false`. Never update in place.

### permits

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| reference | varchar(30) | unique — `PMT-2026-000001` |
| application_id | uuid | FK → applications |
| schema_version | int | default 1 |
| signed_payload | text | the exact JSON that was signed |
| signature | text | base64 Ed25519 signature |
| qr_payload | text | what actually goes in the QR |
| valid_from / valid_until | date | |
| issued_at | timestamptz | |
| issued_by | uuid | FK → users |
| status | enum | `active` \| `revoked` |
| created_at | timestamptz | |

### revocations

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| permit_id | uuid | FK → permits |
| reason | text | not null |
| revoked_at | timestamptz | |
| revoked_by | uuid | FK → users |

### audit_log

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| actor_user_id | uuid | FK → users, nullable |
| action | varchar(100) | e.g. `participant.approved` |
| entity_type | varchar(50) | |
| entity_id | uuid | |
| metadata | jsonb | nullable |
| ip_address | varchar(45) | nullable |
| created_at | timestamptz | |

**Every state change writes an audit row.** No exceptions.

### Prior rejections

No table. It is a query:

```sql
SELECT * FROM participants
WHERE identity_number = $1
  AND status = 'rejected'
  AND reviewed_at > now() - interval '12 months';
```

---

## 5. Permit payload

This is the JSON that gets signed and encoded into the QR. **Keys are short deliberately** — QR codes have limited capacity and every byte counts.

```json
{
  "v":   1,
  "pid": "PMT-2026-000001",
  "typ": "group",
  "gid": "GRP-2026-000134",
  "gt":  "commercial",
  "op":  { "n": "XYZ Adventures", "r": "REG/T/1389/287" },
  "ldr": "Faisal Ahmad",
  "rt":  "Tarsar Marsar",
  "rid": "b3f1…",
  "f":   "2026-08-10",
  "t":   "2026-08-16",
  "n":   9,
  "m":   [ { "n": "Adil Khan", "i": "4471" } ],
  "iat": "2026-07-28T10:22:00Z"
}
```

`op` omitted for private groups. `gid`, `gt`, `n`, `m` omitted for individual permits.

**QR capacity note.** An Ed25519 signature is 64 bytes (~88 chars base64). A 20-member group runs roughly 700–900 bytes total. A QR at version 20 with medium error correction holds about 1,000 bytes, so this fits — but do not add fields casually. If capacity becomes a problem, the fallback is Base45 encoding rather than Base64, which is more QR-efficient. (This is what the EU COVID certificate scheme used, for the same reason.)

**`v` is the schema version and must never be dropped.** If the payload shape changes later, old permits still need to verify. The verifier reads `v` first and branches.

---

## 6. Technology and conventions

### Stack

| Layer | Choice | Why |
|---|---|---|
| Backend | NestJS (TypeScript) | Clear module structure; same language as the rest |
| ORM | Prisma | Type-safe queries, good migration tooling |
| Database | PostgreSQL 16+ | Relational fit for the group hierarchy |
| Mobile | React Native via Expo | One codebase, no native build setup needed initially |
| On-device storage | Expo SQLite | Permit cache and revocation list |
| Dashboard | Next.js | Browser-based, nothing for officers to install |
| Signing | Ed25519 via `@noble/ed25519` or `tweetnacl` | Compact signatures, well-audited |
| Validation | `class-validator` + DTOs | Every endpoint validates its input |

### Conventions

- TypeScript `strict` mode on. No `any` without a written reason.
- Database is snake_case; TypeScript is camelCase; Prisma maps between them.
- Every endpoint has a DTO with validation decorators. Never trust client input.
- Every state change writes to `audit_log`.
- Status transitions go through a single guarded function — never `UPDATE participants SET status = ...` scattered around the codebase.
- Environment-specific values live in `.env`, never in code. This is what makes the future infrastructure migration a configuration change.

### Environment variables

```
NODE_ENV=development
PORT=3000

DATABASE_URL=postgresql://user:pass@localhost:5432/trekpermit

JWT_SECRET=
JWT_EXPIRES_IN=7d

OTP_EXPIRY_MINUTES=10
OTP_MAX_ATTEMPTS=5

SMS_PROVIDER=console          # console | msg91 | twilio
SMS_API_KEY=

SIGNING_PRIVATE_KEY=          # dev only — managed key store in production
SIGNING_PUBLIC_KEY=

STORAGE_PROVIDER=local        # local | s3
STORAGE_LOCAL_PATH=./storage
S3_BUCKET=
S3_REGION=
S3_ACCESS_KEY=
S3_SECRET_KEY=
```

`SMS_PROVIDER=console` prints the OTP to the terminal instead of sending it. `STORAGE_PROVIDER=local` writes to disk. **Weeks 1–6 need no paid services at all.**

### Project layout

```
trek-permit/
├── backend/
│   ├── src/
│   │   ├── main.ts
│   │   ├── app.module.ts
│   │   ├── common/          guards, filters, decorators
│   │   ├── config/
│   │   ├── auth/            OTP + JWT
│   │   ├── users/
│   │   ├── routes/
│   │   ├── applications/
│   │   ├── participants/    review, status transitions
│   │   ├── documents/
│   │   ├── permits/         signing, QR, revocation
│   │   └── audit/
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── migrations/
│   └── .env
├── mobile/
├── dashboard/
└── docs/
    └── BUILD_SPEC.md        ← this file
```

Single repository, plain folders. No monorepo tooling — unnecessary complexity for one developer.

---

## 7. Eight-week plan

### Week 1 — Foundation

| Day | Work |
|---|---|
| 1 | Install toolchain, create repo, scaffold NestJS, connect to PostgreSQL |
| 2 | Full Prisma schema, first migration, seed data |
| 3 | Auth: OTP request, OTP verify, JWT issue, auth guard |
| 4 | Routes module — full CRUD, first real endpoints |
| 5 | Review, tests, tidy up |

**End of week:** a running API where you can create a trek route and register a user.

### Weeks 2–8

| Week | Focus |
|---|---|
| 2 | Individual applications: create, upload documents, submit |
| 3 | Group applications: group creation, group type, leader, member management |
| 4 | Dashboard: application list, member-by-member review, corrections, prior-rejection flag |
| 5 | Permits: signing, QR generation, issuance with exclusion warning |
| 6 | Mobile app: Trekker role, then Field Officer role with offline verification |
| 7 | Notifications, search, visitor lists, audit trail views |
| 8 | End-to-end testing including tampered and revoked permits; field trial |

Weeks 6 onward carry the most risk — offline verification and app store submission are where estimates usually slip. Start the app store developer account in Week 1; it runs in parallel and has its own queue.

---

## 8. Windows setup — do this before Day 1

Install in this order:

1. **Node.js** — [nodejs.org](https://nodejs.org), current LTS. Verify: `node -v` and `npm -v`.
2. **PostgreSQL** — [postgresql.org/download/windows](https://www.postgresql.org/download/windows/). Set a password for the `postgres` user and **write it down**. Includes pgAdmin for browsing the database.
3. **Git** — [git-scm.com](https://git-scm.com/download/win). Accept the defaults.
4. **Windows Terminal** — from the Microsoft Store. Optional but considerably better than the default console.

VS Code extensions:

- Prisma
- ESLint
- Prettier
- Thunder Client (for testing API endpoints without leaving the editor)

Verify everything works:

```
node -v
npm -v
git --version
psql --version
```

If `psql` is not recognised, PostgreSQL's `bin` folder needs adding to your PATH — a common Windows snag, easily fixed.

---

## 9. How we work

The goal is that you understand the system well enough to maintain and extend it without help. So:

- **Concept before code.** Before writing an auth system, we cover what JWTs are and why we're using them.
- **Reasons, not just instructions.** Every non-obvious choice gets an explanation.
- **Judgment calls are flagged.** There is a difference between "this is the standard approach" and "this is a choice with a trade-off". You should always know which one you're looking at.
- **Common mistakes are pointed out** when they are relevant, not in the abstract.
- **Interrupt freely.** If an explanation does not land, say so. Building on a shaky foundation is how projects get rewritten in month three.

**Where to work:** Claude Code, in your project folder, for building. Chat for concept walkthroughs, architecture questions, and code review. Claude Code can edit files, run migrations, and see the whole repo — chat cannot.

---

## 10. Open questions

Update as they are answered.

| Question | Status |
|---|---|
| Does any route need security agency clearance before approval? | **Awaiting Department — affects Week 4** |
| Which route is the pilot? | Awaiting Department |
| Which officer reviews applications? | Awaiting Department |
| Date flexibility window | Default ±3 days unless directed |
| Document retention period | Default 3 years unless directed |

---

## 11. Revision log

| Version | Change |
|---|---|
| 1.0 | Initial specification. Reflects all decisions confirmed through design consultation, including the corrected permit-issuance logic, the `EXCLUDED` state, reapplication with rejection history, and the private/commercial group split. |
