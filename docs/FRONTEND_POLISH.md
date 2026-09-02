# Frontend Polish — Visual Pass on the Current Stack

**Purpose of this document.** `docs/WEEK7_SPEC.md` deferred this pass until Week 7 shipped and named this file as where its scope would land. This is that scope, written the same way `BUILD_SPEC.md`/`WEEK7_SPEC.md` are — grounded in what's actually in the code, not a redesign brief.

**Status:** Not started.

**Decision from 2026-09-01:** visual polish on the current stack — Tailwind on the dashboard, `StyleSheet`/inline styles on mobile. No new UI library, no design-system adoption, no navigation/information-architecture changes (that was a separate option, explicitly not chosen).

---

## 1. Fix first: the dashboard renders on a black canvas for any dark-mode browser

This isn't a style opinion — it's a bug, and it's why every dashboard screenshot taken while building Weeks 6–7 looked stark and half-broken.

**Root cause**, in `dashboard/app/globals.css` (untouched `create-next-app` boilerplate):

```css
:root { --background: #ffffff; --foreground: #171717; }
@media (prefers-color-scheme: dark) {
  :root { --background: #0a0a0a; --foreground: #ededed; }
}
body { background: var(--background); color: var(--foreground); }
```

`app/layout.tsx` also puts `bg-gray-50 text-gray-900` directly on `<body>`. Those two rules target the same element, and the plain `body { }` rule wins — not on specificity (a class selector normally beats a type selector) but because Tailwind v4 emits its utilities inside a CSS `@layer`, and **unlayered CSS always wins over layered CSS in the cascade, regardless of specificity.** `globals.css`'s `body` rule is unlayered; `bg-gray-50` is layered. So on any visitor whose OS/browser prefers dark mode, the page background silently becomes `#0a0a0a` while every component keeps rendering its hardcoded light-mode classes (`bg-white`, `border-gray-200`, `text-gray-900`, …) — the result is white cards floating on a near-black void, on every page, including the very first thing anyone sees: the login screen (`dashboard/app/login/page.tsx`, a bare `min-h-screen flex items-center justify-center` with no background of its own — it inherits whatever `body` resolves to).

**Fix:** delete the `@media (prefers-color-scheme: dark)` block from `globals.css` entirely. This app has no actual dark theme — nothing in it besides that leftover boilerplate ever accounts for one — so committing to light-only is strictly better than a half-flip that only changes the canvas and nothing else. Two-line change, no risk, immediate and visible difference for anyone on a dark-mode default (a meaningful share of Windows users).

---

## 2. Dashboard: extract the components five-plus pages already imply

These aren't new ideas — they're markup that's already identical across files and should be one component instead of N copies.

| Missing component | Repeated literal className (or near-identical) | Where it repeats today |
|---|---|---|
| `Input` / `Select` / `Textarea` | `"w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"` | `login/page.tsx` (×2), `RouteForm.tsx`, `audit-log/page.tsx` (select + 2 date inputs), `visitors/page.tsx` (select + date), `applications/page.tsx` (search input), `routes/page.tsx` (search input) — same string, copy-pasted 9+ times |
| `PageHeader` | `<h1 className="text-xl font-semibold text-gray-900">…</h1>` + `<p className="mt-1 text-sm text-gray-500">…</p>` | `applications/page.tsx`, `routes/page.tsx`, `audit-log/page.tsx`, `visitors/page.tsx`, `notifications/page.tsx` — identical structure, 5 times |
| `Card` / `Panel` | `"rounded-lg border border-gray-200 bg-white p-5"` (or `p-6`) | `RouteForm`'s wrapping pages, application detail's section blocks, permit block, decision block |
| `EmptyState` / `LoadingState` / `ErrorState` | Each page hand-rolls its own version of "Loading…", "Nothing here", and the red error box — wording and markup drift slightly page to page (`text-red-700` plain text in some places, a bordered `bg-red-50 border-red-200` box in others) | Every list/detail page |

Centralizing these isn't just less code — it means a future palette or spacing tweak is a one-file change instead of a grep across 15 files, and it stops small inconsistencies (a slightly different loading message, a missing empty-state border) from accumulating unnoticed.

**Don't touch:** the color palette itself. Gray neutrals + emerald primary + red danger + amber warning is already applied consistently across every page — this pass centralizes *usage* of that palette, not the palette.

---

## 3. Mobile: smaller gap, same idea

The bones here are already better than the dashboard's — `PrimaryButton`, `FormField`, `Screen`, and `StatusBadge` exist and are used consistently everywhere. What's still duplicated:

- **List-row card style** — `{ borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 16, marginBottom: 12 }` (or near-identical) is inlined verbatim in `routes.tsx`, `applications.tsx`, and `notifications.tsx`. Extract a `ListCard` component.
- **Centered loading spinner** — the exact same `{ flex: 1, alignItems: 'center', justifyContent: 'center' }` + `ActivityIndicator` block appears in at least those same three screens. Either a `LoadingView` component, or fold a `loading` prop into `Screen` itself.
- **Empty/error text style** — `{ color: colors.muted, textAlign: 'center', marginTop: 40 }` repeated identically each time it's needed.

`colors.ts`'s palette is fine as-is for a single-theme app — no changes needed there.

---

## Build order

1. **The dark-mode CSS fix** (Section 1) — trivial, zero-risk, do it first regardless of anything else.
2. **Dashboard shared components** (Section 2) — build `Input`/`Select`/`Textarea`, `PageHeader`, `Card`, and the three state components, then retrofit existing pages one at a time (mechanical, low-risk, easy to review incrementally rather than as one giant diff).
3. **Mobile shared components** (Section 3) — `ListCard` + the loading/empty helpers, retrofit `routes.tsx`/`applications.tsx`/`notifications.tsx`.

## Explicitly out of scope for this pass

- Adopting a UI library or design-system primitives (shadcn/Radix, NativeWind, React Native Paper, etc.) — considered and not chosen for this round.
- Navigation or information-architecture changes — a separate option at decision time, not this one.
- Building an actual dark theme — Section 1's fix is committing to light-only, not adding real dark-mode support.
