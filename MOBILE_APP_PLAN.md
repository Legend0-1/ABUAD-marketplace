# UNI MART — Native Android App Build Plan

A concrete plan for shipping UNI MART as a native mobile app, grounded in the
current codebase (Next.js 16 + Prisma + Paystack, ~85 API routes, 30 web views).

---

## Recommendation (TL;DR)

Build with **React Native via Expo** (managed workflow) + **Expo Router** +
**NativeWind**. Reuse the **entire existing backend** (API routes, Prisma,
Paystack, payouts, verification) essentially unchanged — the only backend work is
one *additive* auth change so a native client can send a token in a header instead
of a cookie. Ship **Android first**; iOS then comes almost for free from the same
codebase and can replace the half-built Capacitor iOS shell.

Honest effort for a solo developer: roughly **6–8 weeks** to a solid v1 of the
*user* app, or **8–10 weeks** if the admin/HR dashboards are also rebuilt natively
(recommendation: keep those on web). Store review adds calendar time, more so
because the app collects government-ID images and a facial video.

---

## Why React Native + Expo (and not Kotlin)

The app is already React 19 + TypeScript + Tailwind + zod + Zustand. React Native
keeps all of that, so you reuse one language, your types, your zod schemas, your
shared constants (e.g. `src/lib/verification.ts`), and the shape of your API
client. Specifically Expo gives you:

- **EAS Build** — produce a Play Store `.aab` in the cloud, no local Android Studio toolchain to babysit.
- **First-party native modules** for exactly what this app needs: `expo-camera` (liveness video + ID photos), `expo-notifications` (FCM push), `expo-secure-store` (auth token), `expo-image-picker` (listing photos).
- **NativeWind** — reuse your Tailwind class vocabulary and the `#153B3D` brand theme, so the visual port is faster and stays consistent with the web app.
- **Cross-platform** — Android now, iOS later from the same code. You would likely retire the partially-configured Capacitor iOS wrapper and unify on one native codebase.

Pure **Kotlin / Jetpack Compose** is the alternative if you want absolute-maximum
Android nativeness, but it is a brand-new codebase and skillset, Android-only (you
would still need a separate Swift app for iOS), and reuses none of your existing
TypeScript. Not recommended for your situation.

---

## Architecture: what you reuse vs. rebuild

**Backend — reused as-is.** Your ~85 Next.js route handlers, the Prisma schema,
the Paystack integration, the payout engine, verification review, delivery/HR
flows, and admin APIs all stay. The mobile app is simply another REST client
hitting the same endpoints. The cleanest structure is a **monorepo**
(pnpm/turborepo) with `apps/web`, `apps/mobile`, and `packages/shared` holding
types, zod schemas, and constants so logic is never forked. If a monorepo is too
much churn right now, start the mobile app in its own repo and copy the handful of
shared constants, then refactor to a monorepo later.

**Frontend — rebuilt.** Every screen is re-implemented with React Native
components and Expo Router navigation. Your 30 web views map onto native screens;
much of the static/legal content can be lightweight screens or an in-app browser
to save time.

### The one backend change that matters: auth transport

Today `getCurrentUser()` reads the signed session token from the `unimart_session`
**cookie**. The good news is that the token itself (`src/lib/auth.ts`) is already a
self-contained, HMAC-SHA256-signed, 7-day `base64(payload).signature` string — it
is not cookie-dependent, it just travels in a cookie today. To support a native
client:

1. **`getCurrentUser()`** — also accept `Authorization: Bearer <token>` when no cookie is present (a few lines).
2. **`/api/auth/login`** and **`/api/auth/2fa/verify-login`** — in addition to `Set-Cookie`, return the same token in the JSON body so the app can store it.
3. **Native app** — keep the token in `expo-secure-store` and attach it as the `Authorization` header in the API client.

No new session system and no database changes. The 2FA, email-verification, and
password-reset tokens are already portable the same way.

---

## Screen map (30 web views → native screens)

| Group | Views | Native concern |
| --- | --- | --- |
| Discovery | `home`, `category`, `search`, `product`, `storefront-view` | Lists, images, campus scoping; product detail triggers chat/checkout |
| Selling | `sell`, `setup-storefront`, `storefront`, `seller-dashboard` | Image upload (`expo-image-picker`); gated on `idVerified` |
| Commerce | `orders`, `deliveries` | Order status, cancel/acknowledge, Paystack return |
| Messaging | `inbox`, `inbox-thread` | Realtime via `socket.io-client` (works in RN) |
| Identity | `verify-identity`, `profile`, `protect-account`, `reset-password` | **Liveness video + ID capture** (`expo-camera`); 2FA; currency/campus |
| Delivery program | `delivery-partner-register`, `deliveries` | KYC video capture |
| Admin / HR | `admin`, `hr-queue` | **Keep on web** for v1 (desktop-heavy, low-frequency) |
| Static / support | `agreement`, `service-charge`, `sustainability`, `dispute-resolution`, `campus-safety`, `about`, `privacy-policy`, `report-user`, `feedback`, `contact-admin` | Mostly static content; cheap screens or in-app browser |

---

## The genuinely hard parts (and the approach for each)

**1. Liveness video + ID capture.** Rebuild the `verify-identity` MediaRecorder
flow with `expo-camera` (front camera, ~5-second clip, size-capped). Keep the
existing `data:video` / `MAX_FACE_VIDEO_CHARS` API contract at first so the backend
is untouched; move to presigned/direct upload later for large clips over mobile
data.

**2. Paystack.** Use `react-native-paystack-webview`, which reuses your existing
`payments/initiate` → `payments/verify` server flow unchanged. Because UNI MART
sells **physical goods/services**, Google Play Billing is **not** required —
third-party PSPs are allowed. Handle the post-payment return via a deep link.

**3. Push notifications.** `expo-notifications` + an FCM project; the backend
stores device tokens and sends. You already have `socket.io` for in-app realtime
(inbox, delivery chat), which runs in React Native too.

**4. Media & uploads.** `expo-image-picker` / `expo-camera` feed your existing
`/api/upload` (8 MB image / 25 MB video caps). Watch base64 payload sizes on mobile
networks.

**5. Deep links.** Payment returns and email-verification links open the app via
Expo Linking + Android App Links (reuses the `assetlinks.json` you need anyway).

**6. i18n & currency.** Port the `next-intl` strings to an RN i18n library; the
multi-currency `currency` field stays server-driven.

---

## Store & compliance (Android)

- **$25** one-time Google Play Console account; build the `.aab` with EAS; ship to an **internal testing** track before production.
- **Data Safety review:** the app collects **government-ID images and a facial/liveness video** — sensitive personal data that draws extra scrutiny. You need a live **privacy policy URL**, **in-app account + data deletion**, and clear disclosure of what is collected and why.
- **Permissions:** camera (verification) and notifications, requested at point of use.

---

## Phased roadmap (solo developer, rough)

**Phase 0 — Foundations (~1 wk).** Monorepo + shared package; the additive
Bearer-token backend change; Expo app skeleton, theme/NativeWind, navigation, API
client + secure token storage, auth + 2FA screens.

**Phase 1 — Browse & discovery (~1 wk).** Home, categories, search, product
detail, public storefront (campus-scoped).

**Phase 2 — Selling (~1–1.5 wk).** Storefront setup, create listing (image
upload), seller dashboard.

**Phase 3 — Orders & payments (~1.5 wk).** Checkout, Paystack, orders list with
cancel/acknowledge, reviews.

**Phase 4 — Identity verification (~1 wk).** Native ID capture + liveness video,
status screen.

**Phase 5 — Messaging, delivery, profile, content (~1.5 wk).** Realtime inbox,
delivery-partner flows, profile/security, legal/content screens, push.

**Phase 6 — Hardening & launch (~1–1.5 wk).** Deep links, error/offline states,
store assets, Data Safety + privacy policy, internal testing → production.

**Admin & HR:** recommend keeping on the existing web dashboard for v1 (saves
~1.5–2 weeks); build native later only if genuinely needed.

---

## Suggested first step

Phase 0's **backend Bearer-token change** is the foundation that unblocks every
native API call, is additive (does not change the web app's behavior), and can be
implemented and reviewed directly in this repo. That is the recommended place to
start before any Expo scaffolding.
