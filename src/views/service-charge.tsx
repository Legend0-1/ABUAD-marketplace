'use client'

import { PolicyPage } from '@/components/policy-page'
import { Percent } from 'lucide-react'

const BODY = `When an item sells on UNI MART, the platform keeps 20% of the sale and the seller receives the remaining 80%. Buyers never pay more than the listed price — the charge comes out of the seller's side, not added on top for buyers.

WHAT THE 20% ACTUALLY FUNDS
- Payment processing: every transaction runs through a licensed payment processor, which charges its own fees to move money securely.
- Escrow protection: your payment doesn't go to the seller the moment you pay — it's held by the platform and only released once you confirm you've received your item. Running that holding-and-release system, and reviewing it when disputes come up, has a real operating cost.
- Dispute resolution: when a transaction goes wrong, a real admin reviews it, communicates with both sides, and decides on refunds or other resolutions. That's active human time, not an automated formality.
- Fraud prevention & account verification: checking matric numbers, reviewing suspicious activity, and banning bad actors keeps the marketplace trustworthy — which benefits every seller on it.
- Platform hosting & maintenance: servers, storage for listings and photos, and the ongoing development that keeps the app working and improving.
- Student support: someone to actually respond when a student reaches out with a problem.

WHY IT'S A PERCENTAGE, NOT A FLAT FEE
A percentage means new sellers with small first sales aren't hit with a fee that eats their entire profit, while it still scales fairly as sales grow. It also means we only make money when you do — there's no cost to list an item, open a storefront, or browse the platform.

IS THIS COMPETITIVE?
Many delivery and gig platforms take a comparable or higher cut once you account for their listing fees, subscription costs, or payment fees layered on top. We've deliberately kept UNI MART's structure simple: one transparent percentage, nothing hidden, no surprise charges.

We review this rate periodically as the platform's costs and scale change, and any change to it will be communicated in advance through the Seller Agreement, not applied silently.`

export function ServiceChargePage() {
  return <PolicyPage icon={Percent} title="Our 20% Service Charge" subtitle="Where it goes, and why it's structured this way" body={BODY} />
}
