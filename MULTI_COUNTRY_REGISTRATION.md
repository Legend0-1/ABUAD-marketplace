# Multi-Country Registration — Country & Institution

This feature adds a **Country** and **Institution** dropdown to the sign-up form, lets the
admin control which countries are open for registration, and defaults each new user's
display currency to their country's local currency. It is fully additive and low-risk:
new database columns are nullable, no existing tables or rows change, and there is always
an **"Other (not listed)"** escape hatch so nobody is ever blocked from signing up.

Today only **Nigeria** is enabled and populated. The platform is built to switch on more
countries later with no code change to the registration flow itself.

---

## What a student sees

At registration they pick three things in order: **Country**, then **Institution Type**, then
**Institution**. The Institution Type is the category (e.g. Federal / State / Private
University, Polytechnic, College of Education for Nigeria — different systems elsewhere), and
choosing it narrows the Institution dropdown so neither list is ever overwhelming. If the type
they need isn't listed they pick **"Other / Not listed"** and type the school name directly;
within a listed type, if their specific school is missing they pick **"Other (not listed)"**
and type it in. Everything else on the form (full name, matric number, level, department, etc.)
is unchanged. Picking a country also sets the currency the user will see figures in (Nigeria → NGN).

> Note: matric number and department were intentionally left exactly as they were
> (ABUAD-specific), per the agreed scope.

## What the admin sees

**Admin → Settings → "Countries open for registration."** Each country in the catalog has
an **Enable / Enabled** toggle. Countries whose institution list isn't ready yet show a
**"Coming soon"** badge and can't be enabled. Click **Save** to apply. At least one country
always stays on — if you clear them all, it falls back to Nigeria automatically.

---

## Files changed / added

**Added**

- `src/lib/institutions.ts` — the country + institution catalog and helpers.
- `src/components/country-select.tsx` — country dropdown.
- `src/components/institution-category-select.tsx` — country-dependent **Institution Type**
  (category) dropdown, with an "Other / Not listed" sentinel.
- `src/components/institution-select.tsx` — category-dependent institution dropdown with the
  "Other (not listed)" fallback (now filtered by the chosen Institution Type).
- `src/app/api/countries/route.ts` — public endpoint listing the enabled countries for the sign-up form.
- `prisma/manual-sql/2026-10-01_user_country_institution.sql` — raw-SQL version of the schema change (optional; see below).
- `HOW_TO_ADD_INSTITUTIONS.md` — step-by-step guide for populating institution lists for the
  remaining countries (Ghana, Kenya, South Africa, UK, Canada, US).

**Edited**

- `prisma/schema.prisma` — added nullable `country`, `institution`, `institutionType` to `User`.
- `src/lib/settings.ts` — added the `ENABLED_COUNTRIES` setting + `getEnabledCountryCodes` / `setEnabledCountryCodes`.
- `src/app/api/admin/settings/route.ts` — GET returns `enabledCountries`; PUT accepts `enabledCountries`.
- `src/components/auth-modal.tsx` — Country + Institution Type + Institution cascade wired into the registration form.
- `src/app/api/auth/register/route.ts` — validates the country + institution type, stores country/institution/type and the defaulted currency.
- `src/views/admin.tsx` — the "Countries open for registration" admin panel.

---

## Deploy steps (IMPORTANT — order matters)

The schema gained three columns, so the Prisma client **must be regenerated before you
build**, or the TypeScript build will fail on the new fields.

1. **Apply the schema change** (this project's normal workflow):

   ```
   npx prisma db push
   ```

   *(Alternatively, if you apply raw SQL instead of `db push`, run
   `prisma/manual-sql/2026-10-01_user_country_institution.sql` — it's idempotent and
   additive.)*

2. **Regenerate the Prisma client:**

   ```
   npx prisma generate
   ```

3. **Build and start:**

   ```
   npm run build
   npm start
   ```

No data migration is needed. Existing users simply have `NULL` for the new columns. The
`ENABLED_COUNTRIES` setting defaults to `["NG"]` even before an admin ever opens the
Settings panel, so registration works immediately after deploy.

---

## Adding a new country later

See **`HOW_TO_ADD_INSTITUTIONS.md`** for a detailed, do-it-yourself walkthrough (authoritative
data sources per country, a one-line script to turn a plain name list into a TypeScript array,
and the exact category→array mapping). In short, two steps, both in `src/lib/institutions.ts`:

1. The country already exists in the `COUNTRIES` list (Ghana, Kenya, South Africa, UK, US,
   Canada are pre-listed with their currencies). Add its institutions under
   `INSTITUTIONS_BY_COUNTRY` keyed by the ISO code, grouped by category (each category label
   becomes an "Institution Type" option) — mirror the Nigeria block.
2. Redeploy. The country will stop showing "Coming soon" in the admin panel and can be
   toggled on. The moment it's enabled, students from that country can register and are
   defaulted to its local currency.

To add a country not in the list at all, add an entry to `COUNTRIES` (code, name, currency,
flag) — the currency code must exist in `src/lib/currency.ts` `CURRENCIES`.

---

## Data-accuracy disclosure — please read

The Nigerian institution list was compiled from model knowledge (training cutoff Jan 2026)
plus known recent status changes, **because live web access to the official registries was
not available in the build environment** (both web search and direct fetching of the
NUC / NBTE / NCCE sites were blocked). It was **not** verified against the live registries.

It reflects known recent changes as of early 2026 (e.g. LASPOTECH → LASUSTECH; Adeyemi and
Alvan Ikoku now federal universities of education; the Lagos state college mergers into
LASUED), but it should be treated as a **strong starting point, not an audited list**.

**Before relying on it in production, please verify/refresh the lists against the official
sources:**

- Universities — **NUC** (National Universities Commission): list of approved universities.
- Polytechnics / monotechnics — **NBTE** (National Board for Technical Education).
- Colleges of Education — **NCCE** (National Commission for Colleges of Education).

Because every institution dropdown includes **"Other (not listed)"**, any school that is
missing or renamed never blocks a student from registering — they can always type it in.
So this is safe to ship as-is and tighten later; the "Other" values a student types are
stored verbatim (with `institutionType` left null), which also makes them easy to find and
fold back into the catalog.
