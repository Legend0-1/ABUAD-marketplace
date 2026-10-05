# Identity Verification (KYC)

Amazon-style identity verification for UNI MART. Before a student can **sell**
(open a storefront or list an item), an admin must confirm their government ID
**and** match a short facial/liveness video to it. This stops impersonation and
protects buyers from fake sellers.

---

## The student flow

1. **Entry points.** A signed-in user who isn't verified yet hits a gate the moment
   they try to sell — from the header menu ("Verify Identity"), the profile page row,
   `/verify-identity` directly, or by trying to open a storefront / create a listing
   (both the client shows a "verify first" card and the server returns `403`).
2. **Submit.** On the verification page they:
   - pick an ID type,
   - upload a photo of the **front**, and — for every document except a passport — a
     photo of the **back** (photos taken with the phone camera or chosen from the
     gallery, max 5MB each), and
   - record a **short facial (liveness) video** — the same "record a video to confirm
     it's you" step bank apps use. The front camera opens; the user looks at it and
     slowly turns their head; recording auto-stops after ~5 seconds (or they tap Stop).
     The clip is re-recordable and required before the form will submit.
3. **Review.** The submission enters the admin queue as `pending`.
4. **Outcome.**
   - **Approved** → the user's `idVerified` flag turns on; they can sell immediately.
   - **Rejected** → the admin's reason is shown to the student, who can re-submit
     with a better photo/video. Re-submitting replaces the old media and re-enters the queue.

Accepted ID types: **National ID** (NIN slip/card), **Voter's Card** (PVC),
**Driver's License**, **International Passport**.

---

## Admin: how to review

Admin Dashboard → **Verifications** tab. The tab shows a live badge with the number
of pending submissions.

- The queue lists pending submissions, oldest first. Click **View ID** to load that
  submission's front/back photos **and the liveness video** (media is fetched on
  demand, only when you open a row — see "Privacy" below).
- **Approve** only when the ID is clear, the details match the account holder, **and
  the face in the video matches the photo on the document**.
- **Reject** with a short reason (e.g. "Face in the video doesn't match the ID photo")
  so the student knows what to fix. The reason is shown back to them.
- A short "Recently reviewed" list gives context on what you just actioned.

Approving/rejecting is audited (`verification.approved` / `verification.rejected` in
the Audit Log tab).

---

## Important: run the migration

The feature relies on schema additions that must be pushed to your database:

- `User.idVerified Boolean @default(false)` — the denormalized gate flag.
- The `IdVerification` model (front/back image data URLs, the `faceVideoUrl`
  liveness clip, status, reviewer fields).

If you haven't already, run:

```bash
npx prisma db push
```

Without this, the `idVerified` column, the verification table, and the `faceVideoUrl`
column won't exist and every selling action will error. (This is the same push that
adds the order `payoutStatus` / `transferCode` columns from the payouts work.)

---

## Privacy & security notes

Government-ID photos and the facial video are sensitive personal data. The
implementation minimizes exposure deliberately:

- **Media is never in list endpoints.** The admin queue (`/api/admin/verifications`)
  and the user's own status (`/api/verification/me`) return metadata only. The raw
  image and video data URLs are served solely from `/api/admin/verifications/[id]`,
  which an admin calls only when opening one record to review it.
- **Size-capped.** Each image is capped at ~5MB (`MAX_ID_IMAGE_CHARS`) and the video
  at `MAX_FACE_VIDEO_CHARS` (~11MB of base64), at both the client and the API, so a
  submission can't bloat the row or the request body.
- **Validated.** The API checks the ID type against the shared allow-list, requires a
  `data:image...` payload for the photos (a back image is required for cards and
  optional for a passport), and requires a `data:video...` payload for the liveness clip.
- **Never logged.** Image/video bytes never appear in logs or audit entries — only the
  submitter's name and ID-type label are recorded.
- **Camera released.** The selfie stream is stopped when recording ends and when the
  component unmounts, so the camera indicator doesn't linger.
- **One row per user.** `IdVerification.userId` is unique, so re-submissions overwrite
  rather than accumulate.

---

## Where the code lives

| Concern | File |
| --- | --- |
| Shared constants/helpers (used by API **and** UI) | `src/lib/verification.ts` |
| Submit / re-submit | `src/app/api/verification/submit/route.ts` |
| My status (no media) | `src/app/api/verification/me/route.ts` |
| Admin queue + approve/reject | `src/app/api/admin/verifications/route.ts` |
| Admin single-record detail (with images + video) | `src/app/api/admin/verifications/[id]/route.ts` |
| Student view (+ liveness recorder) | `src/views/verify-identity.tsx` |
| "Verify first" gate card | `src/components/verification-gate.tsx` |
| Admin tab | `src/components/admin-verifications-manager.tsx` |
| Selling gates (server) | `src/app/api/storefront/setup/route.ts`, `src/app/api/products/create/route.ts` |
| Gate flag plumbing | `src/lib/session.ts`, `src/lib/store.ts`, login/2fa/me routes |

---

## Testing checklist

- [ ] Unverified user opening a storefront sees the verify card, not the form.
- [ ] Unverified user creating a listing sees the verify card, not the form.
- [ ] Direct POST to `/api/storefront/setup` or `/api/products/create` without
      verification returns `403` with `needsVerification: true`.
- [ ] Submitting with a missing front image is blocked; a card without a back image
      is blocked; a passport needs only the front.
- [ ] Submitting **without a liveness video** is blocked; a bad/mismatched submission
      to `/api/verification/submit` with a non-`data:video` value is rejected.
- [ ] A >5MB image is rejected client-side and server-side; an over-long video is
      rejected client-side and server-side.
- [ ] The camera opens, the countdown auto-stops after ~5s, "Record again" replaces
      the clip, and the recorded clip plays back.
- [ ] After submit, the user sees "Under review"; the admin tab badge increments.
- [ ] Admin "View ID" loads both images **and the liveness video**; approving flips
      the user to verified and the "Action needed" nav badge disappears.
- [ ] Rejecting requires a reason; the student sees the reason and can re-submit.
- [ ] An approved user is never asked to verify again (submit returns "already verified").
- [ ] Verification status survives a page refresh (via `/api/auth/me` hydration).

