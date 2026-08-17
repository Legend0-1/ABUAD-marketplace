import { db } from './db'

// Default categories required by the ABUAD marketplace spec.
// Food requires admin approval per storefront to prevent poisoning.
export const DEFAULT_CATEGORIES = [
  {
    name: 'Delivery Services',
    slug: 'delivery-services',
    description: 'Errands, package & food delivery by fellow students. Pay a fair price to have items picked up or delivered on campus.',
    icon: 'Truck',
    origin: 'default',
    requiresApproval: false,
  },
  {
    name: 'Note Writing, Assignments & Projects',
    slug: 'note-writing-assignments-projects',
    description: 'Quality class notes, typed assignments, research summaries, and project assistance across departments.',
    icon: 'FileText',
    origin: 'default',
    requiresApproval: false,
  },
  {
    name: 'Clothes & Fashion',
    slug: 'clothes-fashion',
    description: 'New and fairly used clothing, traditional wear, accessories and campus fashion.',
    icon: 'Shirt',
    origin: 'default',
    requiresApproval: false,
  },
  {
    name: 'Laundry Services',
    slug: 'laundry-services',
    description: 'Wash, fold, ironing & dry-cleaning pickup services by trusted students.',
    icon: 'WashingMachine',
    origin: 'default',
    requiresApproval: false,
  },
  {
    name: 'Printing & Photocopy',
    slug: 'printing-photocopy',
    description: 'Color & B/W printing, photocopying, lamination, scanning and binding.',
    icon: 'Printer',
    origin: 'default',
    requiresApproval: false,
  },
  {
    name: 'Shoe Repair & Care',
    slug: 'shoe-repair-care',
    description: 'Cobbler services — repair, polish, restitch, resole and customize shoes and bags.',
    icon: 'Footprints',
    origin: 'default',
    requiresApproval: false,
  },
  {
    name: 'Phones & Gadgets',
    slug: 'phones-gadgets',
    description: 'Phones, laptops, accessories, repairs, flashing, screen replacement & software fixes.',
    icon: 'Smartphone',
    origin: 'default',
    requiresApproval: false,
  },
  {
    name: 'Textbooks & Study Materials',
    slug: 'textbooks-study-materials',
    description: 'Course textbooks, past questions, handouts, slides and recommended reading materials.',
    icon: 'BookOpen',
    origin: 'default',
    requiresApproval: false,
  },
  {
    name: 'Cosmetics & Beauty',
    slug: 'cosmetics-beauty',
    description: 'Skincare, makeup, hair products, wigs, braiding services and beauty consultations.',
    icon: 'Sparkles',
    origin: 'default',
    requiresApproval: false,
  },
  {
    name: 'Electronics & Appliances',
    slug: 'electronics-appliances',
    description: 'Mini fridges, blenders, extension sockets, fans, bulbs, chargers and small electronics.',
    icon: 'Plug',
    origin: 'default',
    requiresApproval: false,
  },
  {
    name: 'Hostel & Room Essentials',
    slug: 'hostel-room-essentials',
    description: 'Bedding, mattresses, buckets, kitchenware, decorations and other hostel essentials.',
    icon: 'BedDouble',
    origin: 'default',
    requiresApproval: false,
  },
] as const

export const DEFAULT_AGREEMENT = {
  version: '1.1',
  title: 'UNI MART Seller Agreement',
  serviceChargePercent: 20,
  body: `# UNI MART Seller Agreement (v1.1)

**Effective Date:** Upon signing
**Between:** The Seller (you) and UNI MART ("the Platform")

## 1. Purpose of the Platform
UNI MART is a peer-to-peer commerce platform restricted to verified ABUAD students. It exists to make campus life easier by connecting student sellers with student buyers in a safe, accountable environment.

## 2. Service Charge
In consideration for hosting your storefront, processing transactions, providing escrow protection, dispute resolution, and the messaging infrastructure, the Platform charges a **20% service fee** on the net profit of every successful transaction. Net profit is defined as the total amount paid by the buyer minus any Platform-processed refunds. The 20% service fee is deducted before the seller's payout is initiated.

## 3. Payout to Seller
The remaining 80% of every successfully completed transaction will be remitted to the bank account you provide during storefront setup. Payouts are triggered only after the buyer has formally acknowledged receipt of the good or service. Payout timelines are subject to your bank's processing schedule.

## 4. Buyer Acknowledgement & Refunds
To protect both parties, no payout is released to the seller until the buyer clicks **"Acknowledge Receipt"** on the order. If the buyer disputes receipt (e.g., goods not delivered, wrong item, item significantly not as described), the Platform will hold the funds and mediate. Refunds may be issued in whole or in part based on the admin's review. Sellers who repeatedly fail to deliver will be suspended.

## 5. Prohibited Items & Services
You may not list: food or drink of any kind (not currently permitted on the Platform), alcohol sales to minors, drugs, weapons, stolen goods, or academic malpractice materials (e.g. exam answers, or complete assignments/projects written for someone to submit as their own work). See the Campus Safety Policy for the full, current list — it may be updated from time to time as new risks are identified.

## 6. Accountabilities
- You may only create one storefront per verified ABUAD account.
- You must respond to buyer messages within a reasonable time.
- Reviews, comments and reports are part of the Platform; retaliating against a buyer for leaving a negative review is prohibited.

## 7. Safety Review of Messages
The admin team has the ability to review messages sent through the platform's inbox system, as part of keeping the marketplace safe from fraud, harassment, and prohibited transactions — most actively when responding to a report or dispute. The admin can also send direct or broadcast messages to any user for important platform announcements.

## 8. Auto-Categorisation
The Platform will automatically create new categories when 2 or more sellers list the same product or service type. This is to help buyers find similar offerings. Sellers cannot opt out of auto-categorisation.

## 9. Reviews of this Agreement
This agreement may be reviewed and updated. **Any revisions will be communicated to every seller via inbox message and email** at least 7 days before the new version takes effect. Continued use of the Platform after the effective date constitutes acceptance of the revised terms.

## 10. Account Suspension & Termination
The Platform reserves the right to suspend or terminate any account found violating these terms, engaging in fraudulent activity, or being reported and confirmed by multiple users. Suspended sellers forfeit pending payouts only when fraud is confirmed; otherwise payouts due before suspension are honoured.

## 11. Liability
The Platform is a facilitator and is not a party to the contract of sale between buyer and seller. The Platform's maximum liability for any single transaction is limited to the 20% service charge collected on that transaction.

## 12. Acceptance
By clicking **"I have read and agree to the Seller Agreement"**, you confirm that:
- You have read this agreement in full
- You understand the 20% service charge and the buyer-acknowledgement payout rule
- You consent to the admin's ability to review inbox messages as described above
- You agree to be bound by all the terms above

Welcome to UNI MART. Trade safely, trade fairly.`,
}

export async function seedDefaults() {
  // Categories
  for (const cat of DEFAULT_CATEGORIES) {
    const existing = await db.category.findUnique({ where: { slug: cat.slug } })
    if (!existing) {
      await db.category.create({ data: { ...cat } as any })
    } else {
      await db.category.update({
        where: { slug: cat.slug },
        data: {
          description: cat.description,
          icon: cat.icon,
          requiresApproval: cat.requiresApproval,
        },
      })
    }
  }

  // Agreement
  const existingAgreement = await db.agreement.findUnique({ where: { version: DEFAULT_AGREEMENT.version } })
  if (!existingAgreement) {
    // Mark old agreements as inactive
    await db.agreement.updateMany({ where: { isActive: true }, data: { isActive: false } })
    await db.agreement.create({
      data: {
        version: DEFAULT_AGREEMENT.version,
        title: DEFAULT_AGREEMENT.title,
        body: DEFAULT_AGREEMENT.body,
        serviceChargePercent: DEFAULT_AGREEMENT.serviceChargePercent,
        isActive: true,
      },
    })
  }

  // Admin user (default)
  const adminEmail = 'admin@abuad.marketplace'
  const existingAdmin = await db.user.findUnique({ where: { email: adminEmail } })
  if (!existingAdmin) {
    const { hashPassword } = await import('./auth')
    await db.user.create({
      data: {
        email: adminEmail,
        passwordHash: hashPassword('admin1234'),
        fullName: 'UNI MART Admin',
        matricNumber: 'ADMIN-0001',
        level: 'Staff',
        department: 'Administration',
        isAdmin: true,
      },
    })
  }
}
