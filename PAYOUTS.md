# Seller Payouts — How They Work & How to Unstick Them

This explains how money moves from the platform's Paystack balance to a seller's
bank account, why a payout can get "stuck" on your Paystack dashboard, and how to
release it. Read this if a buyer has confirmed receipt but the seller hasn't been paid.

## The money flow

1. A buyer pays for a product. The money lands in **your platform's Paystack balance**
   (this is why you see it on your dashboard). It is held like escrow.
2. The buyer taps **"Confirm receipt"**. This is the trigger to pay the seller.
3. The platform fires a **Paystack Transfer** from your balance to the seller's bank
   account, using the bank details on their storefront.
4. When the transfer settles, the order is marked **paid out** and the sale is credited
   to the seller's totals (exactly once).

Steps 3–4 are handled by one shared engine (`src/lib/payout.ts`) so buyer
acknowledgment, admin dispute-release, and the admin Payouts screen all behave
identically and can never double-pay.

## Why money gets "stuck" on your dashboard

By far the most common cause: **"OTP for transfers" is switched ON** in your Paystack
account. When it's on, Paystack does **not** move the money immediately — it sends a
one-time code (OTP) to your registered phone/email and waits for that code to confirm
*each* transfer. If nobody enters the code, the transfer sits unfinalized and the money
stays in your balance. The order will show **"OTP needed"**.

Other possible causes:

- **Transfers not enabled** on your Paystack account (new/unverified accounts).
- **Funds not settled yet.** Card payments settle on a T+1 basis — you can't transfer
  out money that hasn't settled, even though you can see it.
- **Bad seller bank details** — a wrong account number or a bank name Paystack can't resolve.

## How to release a stuck payout (the Payouts tab)

Go to **Admin → Payouts**. Every acknowledged order whose payout hasn't fully gone
through is listed there, with the seller, their bank details, the amount owed, and the
current status. The tab header shows a count badge when payouts need attention. You also
see your **settled Paystack balance** vs. the **total owed to sellers**.

For each order you can:

- **Finalize payout** — appears when the status is "OTP needed". Enter the OTP Paystack
  sent you and the money is released.
- **Retry payout / Start fresh transfer** — re-attempts the payout. It first re-checks any
  existing transfer with Paystack (so it never double-sends) and then starts a new one with
  a fresh reference if needed.
- **Re-check status** — asks Paystack for the latest status and updates the order
  (useful if a transfer settled out-of-band).

## Make payouts fully automatic (recommended)

So you don't have to enter an OTP for every sale:

1. Paystack Dashboard → **Settings → Preferences**.
2. Turn **"OTP for transfers" OFF**.
3. Make sure **Transfers are enabled** on the account.

After that, payouts fire and settle automatically the moment a buyer confirms receipt
(subject to funds having settled). Transfer results also reconcile automatically via the
Paystack webhook (`transfer.success` / `transfer.failed` / `transfer.reversed`), which is
re-verified server-side before any order is marked paid.

## One-time setup required after this change

Two new, nullable columns were added to the `Order` table (`transferCode`, `payoutError`).
Apply them to your database once:

```
npx prisma db push     # or: npx prisma migrate deploy
```

No existing data is affected — both columns are optional.

## Note on delivery-partner fees

The delivery flow (`/api/delivery/requests/[id]/confirm` and `.../respond`) pays delivery
partners with the same Paystack Transfer mechanism but does **not** yet handle the OTP
case or offer a retry screen. If you use paid delivery and have "OTP for transfers" on,
those fees can get stuck the same way. They can be moved onto this same payout engine if
needed — ask and it can be done.
