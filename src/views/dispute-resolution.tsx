'use client'

import { PolicyPage } from '@/components/policy-page'
import { Scale } from 'lucide-react'

const BODY = `Most transactions on UNI MART go smoothly. When one doesn't, here's exactly what happens.

STEP 1 — YOUR PAYMENT IS ALREADY PROTECTED
Because payment is held in escrow and only released to the seller after you confirm receipt, a seller cannot simply take your money and disappear. If there's a problem, the funds are still recoverable.

STEP 2 — RAISE A DISPUTE
From your Orders page, any order that hasn't yet been acknowledged can be disputed instead. Tell us what went wrong — item not received, significantly not as described, wrong item, or another issue — with as much detail as you can give.

STEP 3 — ADMIN REVIEW
A real admin reviews the order: the listing, the messages between buyer and seller, and the details of your dispute. We may reach out to either party through the in-app inbox for more information or evidence (photos, delivery confirmation, etc.).

STEP 4 — RESOLUTION
Depending on what the review finds, outcomes include:
- Full refund to the buyer, if the seller failed to deliver or misrepresented the item.
- Partial refund, for issues like minor damage or a partial mismatch from the listing.
- Payment released to the seller, if the evidence shows the order was fulfilled as agreed and the dispute doesn't hold up.
- Account action against either party for repeated bad-faith behavior — including suspension for sellers who consistently fail to deliver, or for buyers who file dishonest disputes.

HOW LONG THIS TAKES
We aim to review every dispute promptly. More complex cases (needing evidence from both sides) take longer than straightforward ones. You'll be notified in-app as soon as a decision is made.

OUR GOAL
We're not trying to automatically side with buyers or sellers — we're trying to get to what actually happened and make it right. Every dispute is looked at individually, and we'd rather take a little longer and get it right than rush a decision that leaves someone unfairly out of pocket.

IF YOU DISAGREE WITH A DECISION
Reply in the same order thread or reach out through your inbox — decisions can be reconsidered if new information comes to light.`

export function DisputeResolutionPage() {
  return <PolicyPage icon={Scale} title="Dispute Resolution" subtitle="How we resolve problems between buyers and sellers" body={BODY} />
}
