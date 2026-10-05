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

// The liveness clip is recorded and stored the same way (a base64 data URL).
// A few seconds of phone-camera video is well under a megabyte, but we allow
// generous headroom (~11MB of base64) so longer/less-compressed recordings
// still succeed — while keeping a hard ceiling on the row and the request body.
export const MAX_FACE_VIDEO_CHARS = 15_000_000

// How long we ask the user to record for. Kept short (like a bank's selfie
// check) so the clip is small, quick to upload, and easy for the admin to scan.
export const FACE_VIDEO_SECONDS = 5

// A verification record is "locked" (no new submissions accepted) only when it
// has already been approved. Pending and rejected can both be (re)submitted.
export function canSubmitVerification(status: string | null | undefined): boolean {
  return status !== 'approved'
}
