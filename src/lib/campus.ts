// Campus scoping helpers.
//
// A "campus" is the institution a student belongs to (their free-text
// institution from registration, or a value they type in later). Two students
// belong to the same campus when their typed names normalize to the same key —
// e.g. "ABUAD", "Afe Babalola University, Ado-Ekiti" and "afe babalola
// university ado ekiti" all collapse to one key. Listings are visible only to
// viewers whose campus key is in the storefront's `campusKeys`.
//
// Normalization is deliberately aggressive (lowercase, strip punctuation,
// drop generic words like "university"/"college"/"campus") so that near-identical
// spellings from different students hash to the same bucket. It is NOT fuzzy —
// "ABUAD" and "Afe Babalola University" would NOT match, which is why the UI
// asks students to type the same, well-known name their peers use.

// Words that carry no distinguishing signal for a campus identity, so they're
// dropped before keying. Kept lowercase.
const NOISE_WORDS = new Set([
  'university',
  'univ',
  'college',
  'polytechnic',
  'poly',
  'institute',
  'institution',
  'school',
  'faculty',
  'campus',
  'main',
  'the',
  'of',
  'and',
  'for',
  'nigeria',
  'nigerian',
])

/**
 * Canonicalize a campus name into a stable key. Returns '' for blank input.
 *
 * Steps: lowercase → strip diacritics → replace & with "and" → remove
 * punctuation → split on whitespace → drop noise words → join. Word order is
 * preserved (not sorted) because "abuad ado ekiti" and "ado ekiti abuad" are
 * rare enough that sorting would create false merges more often than it helps.
 */
export function normalizeCampus(raw: string | null | undefined): string {
  if (!raw) return ''
  return raw
    .toString()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // strip accents
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9\s]/g, ' ') // punctuation -> space
    .split(/\s+/)
    .filter((w) => w && !NOISE_WORDS.has(w))
    .join(' ')
    .trim()
}

/** The key for a single campus name. Blank → ''. */
export function campusKeyFor(raw: string | null | undefined): string {
  return normalizeCampus(raw)
}

/** A deduped, blank-free list of keys for one or more campus names. */
export function campusKeysFor(...names: (string | null | undefined)[]): string[] {
  const out = new Set<string>()
  for (const n of names) {
    const k = normalizeCampus(n)
    if (k) out.add(k)
  }
  return [...out]
}

/**
 * Does a storefront's `campusKeys` include the viewer's campus? An empty
 * viewer key never matches (the caller should have gated that already).
 */
export function campusVisibleTo(
  campusKeys: string[] | null | undefined,
  viewerCampus: string | null | undefined,
): boolean {
  const key = normalizeCampus(viewerCampus)
  if (!key) return false
  return Array.isArray(campusKeys) && campusKeys.includes(key)
}

/** Human-readable label for a campus value (trimmed), or null when blank. */
export function campusLabel(raw: string | null | undefined): string | null {
  const s = (raw ?? '').toString().trim()
  return s || null
}
