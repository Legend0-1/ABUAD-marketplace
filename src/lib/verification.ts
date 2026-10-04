// Shared constants + helpers for identity (KYC) verification, used by both the
// API routes and the client UI so the two never drift on allowed ID types,
// labels, or size limits.

export const ID_TYPES = ['national_id', 'voters_card', 'drivers_license', 'passport'] as const
export type IdType = (typeof ID_TYPES)[number]

export const ID_TYPE_LABELS: Record<IdType, string> = {
  national_id: 'National ID (NIN slip / card)',
  voters_card: "Voter's Card (PVC)",
  drivers_license: "Driver's License",
  passport: 'International Passport',
}

// A passport is a single photo page, so it needs only one image. Every other
// accepted document has a front and a back we want to see.
export function requiresBackImage(idType: string): boolean {
  return idType !== 'passport'
}

export function isValidIdType(t: unknown): t is IdType {
  return typeof t === 'string' && (ID_TYPES as readonly string[]).includes(t)
}

// Cap each uploaded image (stored inline as a data URL) so a single submission
// can't bloat the row / request body. ~7M chars of base64 ≈ a 5MB photo, which
// comfortably fits a phone camera shot while staying bounded.
export const MAX_ID_IMAGE_CHARS = 7_000_000

// A verification record is "locked" (no new submissions accepted) only when it
// has already been approved. Pending and rejected can both be (re)submitted.
export function canSubmitVerification(status: string | null | undefined): boolean {
  return status !== 'approved'
}
