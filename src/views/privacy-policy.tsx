'use client'

import { PolicyPage } from '@/components/policy-page'
import { Lock } from 'lucide-react'

const BODY = `This explains what UNI MART collects, why, and who else ever sees it. It's written to match what the platform actually does — not boilerplate.

WHAT WE COLLECT
- Account details: full name, matric number, email, WhatsApp number, department, level, and an optional profile photo, collected at sign-up.
- Marketplace activity: listings you create, orders you place or fulfil, messages you send through the in-app inbox, reviews and reports you file.
- Payment details: when you pay for something, your card/bank details are handled directly by Paystack, our payment processor — we never see or store your card number or bank login. We do store the outcome (amount, status, reference) needed to run the escrow system.
- Seller payout details: if you open a storefront, we collect your bank name, account name, and account number so we can pay you. This is never shown to other users — only the platform can see it, to make the actual transfer.
- Delivery partner details: if you register as a delivery partner, we additionally collect a short verification video, used only for identity review by our HR team before approving you for jobs. It is not shown to customers or other users.

WHO ELSE SEES YOUR DATA
- Paystack (payments) processes your payment details directly — see their own privacy policy for how they handle it.
- Resend (email) and Termii (SMS) deliver our notifications to you — they see your email/phone number and the message content, nothing else about your account.
- Other students only ever see your name and, if you're a seller, your storefront details. Your matric number, bank details, phone number, and KYC video are never shown to other users — only to the admin team, for verification and safety purposes.

WHY WE COLLECT IT
- Matric number: confirms you're a real, current student — this is the foundation of the platform's trust model.
- Bank details: required to actually pay sellers and delivery partners.
- KYC video: lets our HR team verify a delivery partner's identity before trusting them with jobs, especially ones involving upfront payment.
- Everything else: to make the marketplace itself work — listings, orders, messages, notifications.

HOW LONG WE KEEP IT
We keep account and transaction data for as long as your account is active, and for a reasonable period after in case of disputes or legal requirements. If you want your account and data deleted, contact the admin team — we'll process this unless we're required to retain specific records (e.g. transaction history) for legal or financial reasons.

MESSAGE REVIEW
As disclosed in the Seller Agreement, the admin team can review messages sent through the inbox as part of safety and fraud investigations — most actively when responding to a report or dispute. This isn't blanket monitoring of every conversation.

YOUR RIGHTS
You can ask to see what data we hold on you, correct anything inaccurate, or request deletion, by contacting the admin team. We'll respond as quickly as we reasonably can.

CHANGES TO THIS POLICY
If this policy changes in a meaningful way, we'll let you know through the platform — the same way we handle Seller Agreement updates.`

export function PrivacyPolicyPage() {
  return <PolicyPage icon={Lock} title="Privacy Policy" subtitle="What we collect, why, and who ever sees it" body={BODY} />
}
