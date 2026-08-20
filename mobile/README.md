# Trek Permit — Mobile (Trekker + Field Officer roles)

Expo (TypeScript) app, one binary, two roles split by login:

- **Trekker**: OTP login, browsing open treks, creating an individual or
  group (private/commercial) application, adding/removing group members,
  uploading documents per participant, submitting, and viewing an issued
  permit's QR code.
- **Field Officer**: scans a permit's QR code and verifies it — signature,
  revocation, validity window — entirely offline, against a public key and
  revocation list synced into on-device SQLite while the phone still has
  signal. See `../docs/BUILD_SPEC.md` Section 1 for why offline verification
  is the defining constraint of this whole system.

Group applications (individual/private/commercial, adding and removing
members, a per-guide registration number) are supported end to end in the
Trekker UI now, not just the backend.

See the root README's "Trying the Field Officer role" section for how to
get an officer-role account, since there's no in-app signup for one.

## Running it

1. **Backend must be running** — the Trekker role talks to it for
   everything; the Field Officer role only needs it for the Sync tab
   (Scan works with no connection at all once synced).
2. **Find this computer's LAN IP** (Windows: `ipconfig`, look for "IPv4 Address" under your active adapter — Wi-Fi or Ethernet).
3. Copy `.env.example` to `.env` and set `EXPO_PUBLIC_API_URL` to `http://<that IP>:3000`. **Not `localhost`** — on a phone, `localhost` means the phone itself, not this computer.
4. Your phone and this computer need to be on the **same Wi-Fi network**.
5. If the phone can't reach the backend, check Windows Firewall isn't blocking inbound connections on port 3000 (allow Node.js on private networks).
6. `npm start`, then scan the QR code with the **Expo Go** app (install from the Play Store / App Store first).

Changing `.env` requires restarting the dev server (`npx expo start --clear` if it doesn't pick the change up).

## Structure

```
app/                    expo-router file-based routes
  (auth)/                  login, OTP verify — shown when signed out
  (app)/                   shown when signed in, role = trekker
    (tabs)/                  Treks, My Applications
    applications/            new / [id] detail / [id]/add-member / [id]/upload
    permits/[id]             QR display
  (officer)/               shown when signed in, role = officer/admin
    (tabs)/                  Scan (camera), Sync (pull key + revocations, sign out)
    result                   verification verdict + permit details
src/
  api/                   one file per backend module (auth, routes, applications, documents,
                          permits, verification) + a shared fetch client
  offline/               store.ts (SQLite cache of the public key + revocation list),
                          verifyPermit.ts (parse QR, check signature/revocation/dates — no network)
  context/AuthContext    session state, persisted via expo-secure-store
  components/            Screen, PrimaryButton, FormField, DateField, StatusBadge,
                          ParticipantForm (shared by the leader form and add-member —
                          one DTO on the backend, one form here)
  theme.ts               colors + status-color lookup
```

`app/_layout.tsx` is where Trekker vs. Field Officer is decided — by
`user.role`, once, right after sign-in.

Each `src/api/*.ts` file mirrors one backend controller — if the backend adds
a field or endpoint, the matching file here is where to update it.
