# Campus scoping — verification checklist

The Linux build environment on this machine is currently unavailable, so the
changes below were reviewed by hand rather than by a compile. Run this list
once before you deploy.

## 1. Apply the schema

```bash
npm install          # picks up the schema change via postinstall → prisma generate
npm run db:push      # adds Storefront.campus + Storefront.campusKeys
npm run db:generate
```

If `db:push` complains about a destructive change, you have local drift — good,
but check the prompt before accepting. The two new columns are additive
(`campus` nullable, `campusKeys` defaulted to `[]`), so nothing existing is
touched.

Optional: run the two files in `prisma/manual-sql/` (`2026-10-02_*`) if you
prefer raw SQL and want to backfill existing storefronts' campus from their
owners' institutions. Requires the `unaccent` extension for the backfill.

## 2. Type-check / build

```bash
npx tsc --noEmit
npm run build
```

Things to watch for, since they were written without a compiler:

- `Prisma.Storefront` should now expose `campus` and `campusKeys`. Every read
  that selects storefront fields still works (they're optional), but the admin
  list should now show a Campus line rather than `undefined`.
- `src/lib/campus.ts` — the accent-stripping regex uses a combining-mark range.
  If your editor mangled the characters on save, replace the line with
  `.normalize('NFKD').replace(/\p{M}/gu, '')`.
- `InstitutionCategory[]` typing in `src/app/api/auth/me/route.ts` — the
  `cats.includes(t as any)` cast is intentional; remove it only if the type
  lines up.

## 3. Behaviour checks (run the dev server: `npm run dev`)

Logged out
- [ ] Visit `/` → you see the **"Sign in to browse your campus"** prompt, not a
      grid of listings. The sign-in button opens the auth modal.
- [ ] `curl 'http://localhost:3000/api/products/list'` returns
      `{ "products": [], "total": 0, "needsAuth": true }`.
- [ ] Same for `/api/search?q=anything`.

Logged in, no campus
- [ ] Log in as a user whose `institution` is null (an old account). You get the
      **"Set your campus"** prompt with a Choose-my-campus button.
- [ ] Picking a campus saves, and the home feed immediately shows that campus's
      listings without a reload.

Two campuses, no mix-up
- [ ] Create listing A under campus X and listing B under campus Y (two test
      sellers, or set one storefront's campus by hand in the DB).
- [ ] A user on campus X sees A but **not** B in home, category, and search.
- [ ] Opening B's product URL directly while on campus X returns **404**.
- [ ] A user on campus Y sees B but not A.
- [ ] As admin, you see both.

Storefront creation
- [ ] A user with no campus cannot complete storefront setup — it returns
      "Set your campus before creating a storefront".
- [ ] A user with a campus creates a storefront; the admin Storefronts tab shows
      their campus, and their listings appear only on that campus.

Admin extra campuses
- [ ] In Admin → Storefronts, the **Campuses** button on a storefront adds a
      second campus; after saving, that storefront's listings show up on both
      campuses.

Changing campus
- [ ] Profile → your campus row → **Change**: pick a different campus. Existing
      listings move to the new campus (the storefront's `campusKeys` is
      backfilled), and the old campus no longer shows them.

## 4. Quick data sanity

```sql
SELECT id, name, campus, "campusKeys" FROM "Storefront" ORDER BY "createdAt" DESC LIMIT 20;
```

Storefronts created before this change show `campus = NULL` until you run the
backfill or set their campus once in the admin tab. Confirm no real storefront
is left `unset` before you announce the change to students.

## Known follow-ups (not blockers)

- The gate filters *discovery*. Anyone who already holds a direct product link
  for a listing on another campus still gets the 404 guard — but messaging a
  seller is not campus-restricted once a listing is visible.
- If a student types a campus name that doesn't match their classmates', they'll
  be alone on their own campus. The admin Campuses control is the fix (add the
  variant name), or they can correct it from their profile.
- Task #7 (inserting the other five countries' institution data) is still open
  and independent of this work.
