# How to Add Institutions to the Catalog (Do-It-Yourself Guide)

This guide shows you how to fill in the institution lists for any country in UNI MART —
especially the **United States**, which is too large for me to generate reliably here.

**Good news up front:** adding institutions is a *pure code change* to one file
(`src/lib/institutions.ts`). There is **no database migration** and nothing to run against
Postgres. You edit the file, rebuild, and you're done. Every dropdown also has an
**"Other (not listed)"** escape hatch, so your lists never have to be perfect or complete —
a missing school never blocks a student from signing up.

---

## The big picture — 3 steps

1. **Get a clean list of names** for each category (from an authoritative source).
2. **Turn that plain list into a TypeScript array** (one tiny script does this for you).
3. **Paste the arrays into `src/lib/institutions.ts`** and register the country.

Then rebuild and spot-check the form. That's it.

---

## Step 1 — Get accurate data

Pull names from the official regulator / registry for each country. These are the best
free sources:

| Country | Where to get the list |
|---|---|
| United States | **IPEDS / NCES College Navigator** (nces.ed.gov/collegenavigator) and the **Carnegie Classification** (carnegieclassifications.acenet.edu). Also Wikipedia's "List of colleges and universities in the United States" (organized by state). |
| Nigeria | **NUC** (universities), **NBTE** (polytechnics), **NCCE** (colleges of education). |
| Ghana | **GTEC** — Ghana Tertiary Education Commission. |
| Kenya | **CUE** — Commission for University Education (+ TVETA for polytechnics). |
| South Africa | **DHET** — Dept. of Higher Education & Training; Universities South Africa (USAf). |
| United Kingdom | **OfS** — Office for Students register; HESA; Universities UK. |
| Canada | **Universities Canada** and **Colleges and Institutes Canada (CICan)**. |

### How to sort US institutions into the four categories

The US catalog uses four buckets. The easiest way to decide which bucket a school goes in
is the **Carnegie Classification** (and IPEDS' "control" field for public vs private):

- **University (Public)** — public doctoral/research and master's universities and
  well-known regional public universities (e.g. all University of California campuses,
  big state flagships, land-grant universities, large SUNY/CSU campuses).
- **University (Private)** — private **not-for-profit** doctoral/research and comprehensive
  universities (Ivy League, Stanford, MIT, Duke, NYU, Georgetown, major Jesuit/Catholic
  universities, etc.). *Tip: skip for-profit schools, or include only the few well-known ones.*
- **Liberal Arts College** — Carnegie "Baccalaureate Colleges: Arts & Sciences Focus"
  (primarily-undergraduate colleges like Williams, Amherst, Swarthmore, Pomona, Wellesley).
- **Community / Technical College** — Carnegie "Associate's Colleges" (two-year community
  and technical colleges like Miami Dade College, Santa Monica College, Houston Community College).

**You do not need to be exhaustive.** Start with the ~100–150 most recognizable schools per
bucket. You can always grow the list later — see "Grow it from real sign-ups" at the end.

---

## Step 2 — Turn a plain list into a TypeScript array

Get your names into a plain text file, **one institution per line**, like `names.txt`:

```
University of California, Berkeley
University of Michigan-Ann Arbor
Ohio State University
```

Then run this tiny script (save it as `make-array.js` anywhere, you have Node already):

```js
// Usage: node make-array.js US_PUBLIC_UNIVERSITIES names.txt
const fs = require("fs")
const [, , name, file] = process.argv
const lines = fs.readFileSync(file, "utf8").split(/\r?\n/).map((s) => s.trim()).filter(Boolean)
const list = [...new Set(lines)].sort((a, b) => a.localeCompare(b)) // de-duplicate + sort A–Z
const body = list.map((s) => `  ${JSON.stringify(s)},`).join("\n")
console.log(`const ${name} = [\n${body}\n]`)
```

Run it:

```
node make-array.js US_PUBLIC_UNIVERSITIES names.txt
```

It prints a ready-to-paste array — already de-duplicated, sorted alphabetically, and
correctly quoted (it uses `JSON.stringify`, so apostrophes and any odd characters are
escaped safely):

```ts
const US_PUBLIC_UNIVERSITIES = [
  "Ohio State University",
  "University of California, Berkeley",
  "University of Michigan-Ann Arbor",
]
```

Repeat for each of the four US arrays (`US_PUBLIC_UNIVERSITIES`, `US_PRIVATE_UNIVERSITIES`,
`US_LIBERAL_ARTS_COLLEGES`, `US_COMMUNITY_TECHNICAL_COLLEGES`).

> **Two no-script alternatives**
> - **VS Code:** paste names one-per-line, select all, open Find/Replace, turn on regex
>   (`.*` button), find `^(.+)$`, replace with `  "$1",`. Then wrap with `const NAME = [` … `]`.
> - **Excel / Google Sheets:** names in column A, then in B1 put
>   `=CHAR(34)&A1&CHAR(34)&","` and fill down. `CHAR(34)` is a double-quote, so you get
>   `"Name",` with no quoting headaches. Copy column B into the array.

---

## Step 3 — Paste into `src/lib/institutions.ts` and register the country

**3a. Paste the arrays.** Open `src/lib/institutions.ts`. Scroll to just below the last
Nigerian list (`NG_PRIVATE_COLLEGES_OF_EDUCATION = [ … ]`), right **before** this comment:

```ts
/**
 * Institutions per country, grouped by category (rendered in CATEGORY_ORDER).
 * ...
 */
export const INSTITUTIONS_BY_COUNTRY: Record<string, InstitutionGroup[]> = {
```

Paste your four US arrays there (module scope — not inside any function or object).

**3b. Register the country.** Inside the `INSTITUTIONS_BY_COUNTRY = { … }` object, after the
`NG: [ … ],` block, add a `US:` block that maps each **category label** to one of your arrays:

```ts
  US: [
    { category: "University (Public)", institutions: US_PUBLIC_UNIVERSITIES },
    { category: "University (Private)", institutions: US_PRIVATE_UNIVERSITIES },
    { category: "Liberal Arts College", institutions: US_LIBERAL_ARTS_COLLEGES },
    { category: "Community / Technical College", institutions: US_COMMUNITY_TECHNICAL_COLLEGES },
  ],
```

That's the whole wiring. The category labels above are what the student sees in the new
**Institution Type** dropdown; picking one narrows the **Institution** dropdown to that array.

### Category → array mapping for every country

The category text **must match exactly** (copy-paste it). Here's the intended mapping for all
six remaining countries, so you can do any of them the same way:

```ts
  GH: [
    { category: "Public University",         institutions: GH_PUBLIC_UNIVERSITIES },
    { category: "Technical University",      institutions: GH_TECHNICAL_UNIVERSITIES },
    { category: "Private University",        institutions: GH_PRIVATE_UNIVERSITIES },
    { category: "College of Education",      institutions: GH_COLLEGES_OF_EDUCATION },
  ],
  KE: [
    { category: "Public University",         institutions: KE_PUBLIC_UNIVERSITIES },
    { category: "Private University",        institutions: KE_PRIVATE_UNIVERSITIES },
    { category: "National Polytechnic",      institutions: KE_NATIONAL_POLYTECHNICS },
  ],
  ZA: [
    { category: "Public University",         institutions: ZA_PUBLIC_UNIVERSITIES },
    { category: "University of Technology",  institutions: ZA_UNIVERSITIES_OF_TECHNOLOGY },
    { category: "Private Higher Institution",institutions: ZA_PRIVATE_INSTITUTIONS },
    { category: "TVET College",              institutions: ZA_TVET_COLLEGES },
  ],
  GB: [
    { category: "University",                institutions: GB_UNIVERSITIES },
    { category: "University College / Specialist Institution", institutions: GB_UNIVERSITY_COLLEGES },
  ],
  CA: [
    { category: "University",                institutions: CA_UNIVERSITIES },
    { category: "College / Polytechnic",     institutions: CA_COLLEGES_POLYTECHNICS },
  ],
  US: [
    { category: "University (Public)",       institutions: US_PUBLIC_UNIVERSITIES },
    { category: "University (Private)",      institutions: US_PRIVATE_UNIVERSITIES },
    { category: "Liberal Arts College",      institutions: US_LIBERAL_ARTS_COLLEGES },
    { category: "Community / Technical College", institutions: US_COMMUNITY_TECHNICAL_COLLEGES },
  ],
```

(These category labels already exist in the `InstitutionCategory` type at the top of the file,
so you do **not** need to touch that type — just use the labels exactly as written above.)

---

## Step 4 — Verify and ship

1. **Type-check** (catches a mistyped array name or category label instantly):

   ```
   npx tsc --noEmit
   ```

   or just `npm run build`.

2. **Spot-check the form:** run the app, open **Create Account**, and under
   **Admin → Settings → "Countries open for registration"** enable the United States. Back on
   the sign-up form, pick **United States** → the **Institution Type** dropdown should list your
   four categories → picking one should narrow the **Institution** dropdown to that list.

3. **Deploy:** this change is only in `src/lib/institutions.ts`, so there's **no `prisma db push`
   and no migration** — just redeploy the app the usual way (e.g. `npm run build` then restart).

---

## Tips

- **Don't chase 100% coverage.** The "Other (not listed)" option in both the Institution Type
  and Institution dropdowns means anyone can type a school that isn't in your list. Start small
  and solid; expand over time.
- **Grow it from real sign-ups.** When a student picks "Other", their typed school name is saved
  verbatim on the `User` record (with `institutionType` left null). Periodically look those up,
  and fold the common ones back into the catalog. Easy way to see them:

  ```sql
  SELECT country, institution, COUNT(*)
  FROM "User"
  WHERE "institutionType" IS NULL AND institution IS NOT NULL
  GROUP BY country, institution
  ORDER BY COUNT(*) DESC;
  ```

- **Keep names consistent.** Pick one spelling convention (e.g. include the city/campus where
  it disambiguates: "University of California, Berkeley"). The script de-duplicates exact
  matches, so consistent naming keeps the list clean.

---

## Quick reference — exact category labels

Copy these verbatim when you write each `{ category: "…" }` line:

- **Nigeria:** `Federal University`, `State University`, `Private University`,
  `Federal Polytechnic`, `State Polytechnic`, `Private Polytechnic`,
  `Federal College of Education`, `State College of Education`, `Private College of Education`
- **Ghana:** `Public University`, `Technical University`, `Private University`, `College of Education`
- **Kenya:** `Public University`, `Private University`, `National Polytechnic`
- **South Africa:** `Public University`, `University of Technology`, `Private Higher Institution`, `TVET College`
- **United Kingdom:** `University`, `University College / Specialist Institution`
- **Canada:** `University`, `College / Polytechnic`
- **United States:** `University (Public)`, `University (Private)`, `Liberal Arts College`, `Community / Technical College`
