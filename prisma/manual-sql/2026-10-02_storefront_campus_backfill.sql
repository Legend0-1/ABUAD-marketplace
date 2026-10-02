-- UNI MART — Backfill existing storefronts with their owner's campus
-- Date: 2026-10-02
--
-- After adding the campus columns, existing storefronts have campus = NULL and
-- campusKeys = {}. This one-off script fills them from the owner's registered
-- institution so their listings become visible to their campus.
--
-- The normalization below MUST match src/lib/campus.ts normalizeCampus():
--   lowercase → strip accents → "&" → " and " → drop punctuation → split on
--   whitespace → drop noise words → join with single spaces.
-- It is duplicated here because SQL can't call the TS helper.
--
-- Idempotent-ish: it only touches storefronts whose campus is still NULL, so
-- re-running is harmless. Storefronts whose owner has no institution are left
-- as-is (an admin can set their campus from the Storefronts tab).

WITH normalized AS (
  SELECT
    s.id,
    u.institution AS campus_label,
    trim(
      regexp_replace(
        regexp_replace(lower(unaccent(u.institution)), '[^a-z0-9\s]', ' ', 'g'),
        '\s+', ' ', 'g'
      )
    ) AS base
  FROM "Storefront" s
  JOIN "User" u ON u.id = s."ownerId"
  WHERE s.campus IS NULL
    AND u.institution IS NOT NULL
    AND length(trim(u.institution)) > 0
),
keyed AS (
  SELECT
    id,
    campus_label,
    trim(
      array_to_string(
        ARRAY(
          SELECT w
          FROM unnest(string_to_array(base, ' ')) AS w
          WHERE w <> ''
            AND w NOT IN (
              'university','univ','college','polytechnic','poly','institute',
              'institution','school','faculty','campus','main','the','of','and',
              'for','nigeria','nigerian'
            )
        ),
        ' '
      )
    ) AS campus_key
  FROM normalized
)
UPDATE "Storefront" s
SET campus = k.campus_label,
    "campusKeys" = ARRAY[k.campus_key]
FROM keyed k
WHERE s.id = k.id
  AND k.campus_key <> '';

-- NOTE: this uses the `unaccent` extension for accent stripping. If it isn't
-- installed, run `CREATE EXTENSION IF NOT EXISTS unaccent;` first, or drop the
-- unaccent() call (accents are rare in institution names and the TS side still
-- normalizes on write, so a miss here just means an admin sets that campus once).
