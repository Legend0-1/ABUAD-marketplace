'use client'

import { PolicyPage } from '@/components/policy-page'
import { Info } from 'lucide-react'

const BODY = `UNI MART is a marketplace built exclusively for verified university students. It exists to make campus life easier: a safe, accountable place to buy and sell the things students actually need — gadgets, clothes, textbooks and notes, errands, and everyday essentials — directly with each other.

WHO CAN USE IT
Every account is tied to a verified matric number at sign-up. This isn't a public marketplace open to anyone on the internet — it's a closed, campus-only community, which is a big part of why we can offer the protections below.

HOW BUYING & SELLING WORKS
Sellers list items or services through their own storefront. When a buyer pays, the money is held by the platform, not sent straight to the seller. It's only released to the seller once the buyer confirms they've received the item or service in good order. This escrow model protects buyers from paying for something that never shows up, and protects sellers by guaranteeing that once a buyer confirms receipt, payment follows immediately.

WHY WE'RE DIFFERENT FROM A GENERIC CLASSIFIEDS APP
- Every user is a real, identifiable student — not an anonymous stranger.
- Payments are protected by escrow, not "pay and hope."
- Disputes are reviewed by a real admin team, not left for buyer and seller to sort out alone.
- A small service charge on sales keeps the platform funded without charging students to browse, list, or message — see "Our Service Charge" for exactly what that covers.

OUR COMMITMENT
UNI MART is run by students, for students. We built the safeguards on this platform because we've seen what goes wrong on unmoderated group-chat trading: no accountability, no recourse when something goes wrong, and no way to know who you're really dealing with. Our goal is to keep the convenience of trading with people down the hall, with the accountability of a real marketplace.`

export function AboutPage() {
  return <PolicyPage icon={Info} title="About UNI MART" subtitle="Campus commerce, built for trust" body={BODY} />
}
