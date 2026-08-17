# Trek Permit — Mobile (Trekker role)

Expo (TypeScript) app for the trekker side of the pilot: OTP login, browsing
open treks, creating an individual application, uploading documents,
submitting, and viewing an issued permit's QR code.

**Not in this app yet** (see `docs/BUILD_SPEC.md`'s Week 6 plan): the Field
Officer role, QR *scanning*, and offline signature verification. Group
applications (member management) also aren't in the mobile UI yet, though
the backend supports them from Week 3 onward.

## Running it

1. **Backend must be running** — this app talks to it over plain HTTP, there's no offline fallback for anything but the (not-yet-built) permit-verification screen.
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
  (app)/                   shown when signed in
    (tabs)/                  Treks, My Applications
    applications/            new / [id] detail / [id]/upload
    permits/[id]             QR display
src/
  api/                   one file per backend module (auth, routes, applications, documents, permits) + a shared fetch client
  context/AuthContext    session state, persisted via expo-secure-store
  components/            Screen, PrimaryButton, FormField, DateField, StatusBadge
  theme.ts               colors + status-color lookup
```

Each `src/api/*.ts` file mirrors one backend controller — if the backend adds
a field or endpoint, the matching file here is where to update it.
