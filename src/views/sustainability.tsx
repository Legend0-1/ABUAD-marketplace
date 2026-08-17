'use client'

import { PolicyPage } from '@/components/policy-page'
import { Leaf } from 'lucide-react'

const BODY = `Every semester, students buy things they'll only need for a few months and discard things that still have real value when they leave. UNI MART exists partly to interrupt that cycle.

A CAMPUS-SCALE CIRCULAR ECONOMY
Reselling a laptop, textbook, or piece of furniture to another student keeps it in use instead of in a bin. Every transaction on the platform is, in a small way, a diversion from waste — no new manufacturing, packaging, or shipping required, because the buyer and seller are often a few buildings apart.

TEXTBOOKS & NOTES
Course materials are some of the most wastefully single-use purchases in a student's life — used for one semester, then discarded or forgotten. Buying and selling these directly between students keeps them circulating instead of piling up.

LESS PACKAGING, LESS SHIPPING
Because transactions happen on campus, hand to hand, there's no cardboard, no courier fuel, and no packaging waste that a shipped order would generate.

DIGITAL BY DEFAULT
Listings, receipts, agreements, and communication all happen in-app — no printed flyers, no paper receipts, no physical noticeboard clutter.

WHERE WE'RE HEADED
This page will grow as we do. We're exploring partnerships with campus sustainability initiatives and looking at ways to highlight and reward sellers who specialize in secondhand and upcycled goods. If you have ideas, the Feedback page is the place to send them — we read every submission.`

export function SustainabilityPage() {
  return <PolicyPage icon={Leaf} title="Sustainability" subtitle="Reuse over waste, one transaction at a time" body={BODY} />
}
