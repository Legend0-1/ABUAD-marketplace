'use client'

import { PolicyPage } from '@/components/policy-page'
import { ShieldCheck } from 'lucide-react'

const BODY = `Your safety matters more than any transaction. These are the practices we build into the platform, and the ones we ask every student to follow.

VERIFIED IDENTITY, EVERY TIME
Every account belongs to a real ABUAD student verified by matric number at sign-up. If you're dealing with someone on UNI MART, you're dealing with a real, identifiable person from your own campus — not an anonymous stranger.

MEETING UP SAFELY
- Prefer well-lit, populated campus locations for handovers — hostels lobbies, faculty buildings, or the student center are good defaults.
- Avoid isolated locations, especially for first-time transactions or high-value items.
- Bring a friend if a handover feels off, or ask the other party to meet somewhere busier.
- Trust your instincts — if something feels wrong before or during a meetup, you can cancel and report it. You never owe anyone the transaction.

YOUR PAYMENT IS PROTECTED
Because UNI MART holds payment in escrow until you confirm receipt, you're never sending money directly to a stranger's personal account. If an item never arrives, or arrives significantly not as described, you can dispute the order instead of just losing your money.

WHAT'S NOT ALLOWED ON THE PLATFORM
- Weapons, illegal substances, stolen goods, or anything prohibited under Nigerian law or university rules.
- Academic malpractice: selling exam answers, or writing entire assignments/projects for someone to submit as their own work. (Legitimate note-taking, typing, and study-material services are welcome — the line is between helping someone study and doing their academic work for them.)
- Any listing or message that harasses, threatens, or discriminates against another student.

IF SOMETHING GOES WRONG
Use the Report button on a seller's profile or product page, or visit the Report a User page for the full process. Reports go directly to the admin team and are handled confidentially. If you're ever in a situation that feels physically unsafe, prioritize your safety first and involve campus security or the appropriate authorities — reporting on the platform can come after.

We review safety practices regularly and will update this policy as the platform grows.`

export function CampusSafetyPage() {
  return <PolicyPage icon={ShieldCheck} title="Campus Safety Policy" subtitle="How we keep transactions and meetups safe" body={BODY} />
}
