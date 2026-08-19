# Trek Permit — Backend

NestJS + PostgreSQL (via Prisma) API for the pilot: OTP auth, individual and
group permit applications, document upload, officer review/approval,
Ed25519 permit signing and QR issuance, and revocation. See
[`../docs/BUILD_SPEC.md`](../docs/BUILD_SPEC.md) for the full design spec —
this file only covers running it. See [`../README.md`](../README.md) for
whole-repo setup (database, env vars, key generation).

## Running it

```bash
npm install
npx prisma migrate dev   # apply migrations, generate the Prisma client
npx tsx prisma/seed.ts   # creates the pilot trek route
npm run start:dev        # http://localhost:3000, restarts on change
```

Requires `.env` to be set up first — see the root README's Backend setup
section for `DATABASE_URL`, `JWT_SECRET`, and the Ed25519
`SIGNING_PRIVATE_KEY`/`SIGNING_PUBLIC_KEY` pair.

## Tests

```bash
npm test           # unit tests
npm run test:cov   # with coverage
npm run test:e2e   # end-to-end (needs a running DB — see jest-e2e.json)
```

## Structure

```
src/
├── main.ts
├── app.module.ts
├── common/         guards, filters, decorators shared across modules
├── config/
├── auth/           OTP request/verify, JWT issue, auth guard
├── users/
├── routes/         trek routes CRUD
├── applications/   individual + group applications, submit
├── participants/   per-member review, status transitions, corrections
├── documents/       upload, versioning
├── permits/         Ed25519 signing, QR payload, issuance, revocation,
│                     public-key/revocations sync for offline mobile verification
└── audit/          every state change writes here
```

Every endpoint has a DTO with `class-validator` decorators — never trust
client input directly. Status transitions go through a single guarded
function per module, not scattered `UPDATE ... SET status =` calls. Every
state change writes an `audit_log` row.
