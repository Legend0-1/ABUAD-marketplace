# Campus scoping

UNI MART is **scoped by campus**. A student only ever sees listings from their
own institution, so there's no cross-campus mix-up between, say, ABUAD and a
university in another city. The interface is identical for everyone — the only
difference is which listings appear.

## The model

A **campus** is the institution a student belongs to: the free-text institution
they chose at sign-up (or typed later in the campus-setup prompt). Two students
belong to the same campus when their campus names *normalize* to the same key.

Each storefront carries two fields (see `prisma/schema.prisma`, model
`Storefront`):

- **`campus`** — the human-readable primary campus (the owner's institution),
  shown in the admin UI.
- **`campusKeys`** — the set of normalized campus keys the storefront is visible
  to. It always contains the primary campus, plus any an admin has added.

A listing is visible to a viewer only when the viewer's campus key is in the
storefront's `campusKeys`.

## Normalization (`src/lib/campus.ts`)

`normalizeCampus()` canonicalizes a name so near-identical spellings collide:
lowercase → strip accents → `&` becomes "and" → strip punctuation → split on
whitespace → drop noise words (`university`, `college`, `campus`, `of`, `the`,
`nigeria`, …) → rejoin.

So `"ABUAD"`, `"Afe Babalola University, Ado-Ekiti"` and `"afe babalola
university ado ekiti"` all reduce to comparable keys. It is deliberately **not
fuzzy**: `"ABUAD"` and `"Afe Babalola University"` do *not* match, which is why
the UI tells students to type the same campus name their classmates use. If two
students type genuinely different names for one school, an admin can add the
second name to a storefront's campuses, or the students can correct their campus
in the setup prompt.

## Who sees what

| Viewer | Sees |
| --- | --- |
| Logged out | Nothing — sign-in prompt |
| Logged in, no campus set | Nothing — one-time campus-setup prompt |
| Logged in, campus set | Only listings whose storefront's `campusKeys` contains their key |
| Admin | Everything, on every campus |

**Enforcement is server-side.** The `CampusGate` component is only the friendly
UI layer; the actual filter lives in the API so it can't be bypassed from the
client:

- `GET /api/products/list` — returns `{ products: [], needsAuth: true }` when
  logged out, `{ products: [], needsCampus: true }` when no campus, otherwise
  filters `where.storefront = { campusKeys: { has: viewerKey } }`. Admins bypass.
- `GET /api/search` — same gate, applied to both products and storefronts.
- `GET /api/products/[id]` — a non-owner, non-admin viewer whose campus isn't in
  the storefront's keys gets a **404** (so a listing's existence isn't leaked).
  The view counter only increments after this check passes.
- `GET /api/storefront/view`-style pages reuse `/api/products/list`, so they
  inherit the filter for free.

## Setting a campus

- **At sign-up** the registration cascade records `country`, `institution` and
  `institutionType` on the user. That institution *is* the campus.
- **Existing users / corrections:** `PUT /api/auth/me` accepts `institution`
  (plus optional `country` / `institutionType`), validates against the catalog
  when it matches, and **backfills** the user's existing storefront's `campus` /
  `campusKeys` so their listings move with them. The campus-setup modal
  (`src/components/campus-setup-modal.tsx`) drives this.
- **New storefronts:** `POST /api/storefront/setup` refuses to create a
  storefront without an institution and stamps `campus` + `campusKeys` from the
  owner's institution.

## Admin: extra campuses

An admin can give a storefront more than its primary campus (e.g. a seller near
two schools). In the admin **Storefronts** tab, the **Campuses** button opens a
comma-separated prompt; `POST /api/admin/storefronts` with
`{ action: 'set_campuses', campuses: [...] }` updates the set. The owner's
primary campus is always retained, and every action is audit-logged.

## Applying the change

Primary path (how this repo manages its DB):

```bash
npm run db:push && npm run db:generate
```

That applies the two new columns. If you prefer raw SQL, `prisma/manual-sql/`
contains:

- `2026-10-02_storefront_campus_scoping.sql` — the columns + a GIN index on
  `campusKeys` (idempotent).
- `2026-10-02_storefront_campus_backfill.sql` — one-off: fills existing
  storefronts' campus from their owner's institution. Requires the `unaccent`
  extension, or drop that call.

After backfilling, any storefront still showing campus `unset` in the admin tab
belongs to an owner who registered before institutions existed — set it once
from the Storefronts tab.

## Notes / limitations

- Campus scoping filters *discovery* (browse, category, search, product page).
  It is not a security boundary for data the buyer already has a link to *and*
  is entitled to see — messaging a seller still works once a listing is visible.
- If you later want a "show me other campuses" toggle, add a query param that
  widens the `where` clause; the schema already supports multi-campus storefronts.
