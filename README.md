# Trek Permit

A digital trekking permit system for Jammu & Kashmir, piloted on one route
for one season. The defining constraint: **a permit must be verifiable at a
checkpoint with no mobile signal, and must be impossible to alter after
issue.** See [`docs/BUILD_SPEC.md`](docs/BUILD_SPEC.md) for the full design
spec and week-by-week plan — read that before making a design decision this
README doesn't cover.

Three parts, in one plain repo (no monorepo tooling):

| Part | Where | Status |
|---|---|---|
| Backend API (NestJS + PostgreSQL) | [`backend/`](backend) | Auth, applications (individual + group), officer review, permit signing/issuance/revocation |
| Mobile app — Trekker + Field Officer roles (Expo/React Native, one binary) | [`mobile/`](mobile) | Trekker: auth, treks, applications, document upload, permit QR. Field Officer: QR scan, fully offline signature verification |
| Department dashboard (Next.js) | `dashboard/` | Not started — officer review currently happens via the backend API directly |

## Prerequisites

- Node.js 20+ and npm
- PostgreSQL 16+, running locally
- A phone with the **Expo Go** app, on the same Wi-Fi network as your dev machine (for running the mobile app)
- Git

## Setup

### 1. Database

Create an empty database matching whatever `DATABASE_URL` you'll set below:

```bash
createdb trekpermit
# or: psql -U postgres -c "CREATE DATABASE trekpermit;"
```

### 2. Backend

```bash
cd backend
npm install
cp .env.example .env
```

Fill in `.env`:

- **`DATABASE_URL`** — point at the database from step 1.
- **`JWT_SECRET`** — any long random string, e.g.:
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
  ```
- **`SIGNING_PRIVATE_KEY` / `SIGNING_PUBLIC_KEY`** — an Ed25519 keypair for permit signing (`signing.service.ts` loads these as PKCS8/SPKI DER, base64-encoded — this snippet produces exactly that):
  ```bash
  node -e "
  const { generateKeyPairSync } = require('crypto');
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');
  console.log('SIGNING_PRIVATE_KEY=' + privateKey.export({ type: 'pkcs8', format: 'der' }).toString('base64'));
  console.log('SIGNING_PUBLIC_KEY=' + publicKey.export({ type: 'spki', format: 'der' }).toString('base64'));
  "
  ```
- Everything else in `.env.example` has a working dev default already (`SMS_PROVIDER=console` prints OTPs to the terminal instead of sending them; `STORAGE_PROVIDER=local` writes uploaded documents to disk). **No paid service is needed to run this locally.**

Then:

```bash
npx prisma migrate dev   # applies backend/prisma/migrations, generates the client
npx tsx prisma/seed.ts   # creates the pilot trek route
npm run start:dev        # http://localhost:3000
```

Sanity check: `npm test` should pass.

### 3. Mobile app

```bash
cd mobile
npm install
cp .env.example .env
```

Set `EXPO_PUBLIC_API_URL` in `.env` to this computer's LAN IP (Windows:
`ipconfig`, look for the IPv4 address on your active adapter) — **not**
`localhost`, which on a phone means the phone itself. Your phone and dev
machine need to be on the same Wi-Fi network, and Windows Firewall needs to
allow inbound connections on port 3000.

```bash
npm start
```

Scan the QR code with Expo Go. See [`mobile/README.md`](mobile/README.md)
for the app's structure.

**Trying the Field Officer role:** every new mobile number signs in as a
`trekker` by default — there's no signup flow for officers yet. To test the
Field Officer side, sign in once (creating the user), then promote that
account directly in the database:

```sql
UPDATE users SET role = 'officer' WHERE mobile = '<the mobile number you signed in with>';
```

Sign out and back in on the phone afterward — the role is only read at
login. Once signed in as an officer, sync from the **Sync** tab (this needs
a live connection, on purpose — it's the one moment the officer side talks
to the server) before scanning permit QR codes on the **Scan** tab, which
works with no connection at all.

## Repository layout

```
trek-permit/
├── backend/     NestJS API — see backend/README.md
├── mobile/      Expo app (Trekker + Field Officer) — see mobile/README.md
├── dashboard/   Next.js department dashboard — not started
└── docs/
    └── BUILD_SPEC.md   full design spec, confirmed decisions, week-by-week plan
```
