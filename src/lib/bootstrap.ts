import { db } from './db'
import { hashPassword } from './auth'
import { backfillReferralCodes } from './referral'

// Bootstrap the marketplace: admin + demo seed data for first run.
// Idempotent — safe to call on every server start.
export async function bootstrapMarketplace() {
  // 1. Admin user
  const adminEmail = 'admin@abuad.marketplace'
  let admin = await db.user.findUnique({ where: { email: adminEmail } })
  if (!admin) {
    admin = await db.user.create({
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

  // 2. Default categories
  const { DEFAULT_CATEGORIES, DEFAULT_AGREEMENT } = await import('./seed')
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

  // 3. Active agreement
  const existingAgreement = await db.agreement.findUnique({ where: { version: DEFAULT_AGREEMENT.version } })
  if (!existingAgreement) {
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

  // 4. Demo seller + products to make the homepage feel alive (only if no products yet)
  const productCount = await db.product.count()
  if (productCount === 0) {
    await seedDemoData()
  }

  // 5. Backfill referral codes for any users created before the referral program existed
  await backfillReferralCodes()

  // 6. One-time backfill: existing users predate email verification, so treat
  // them as already verified rather than suddenly locking them out of a
  // requirement that didn't exist when they joined. Detected by "has anyone
  // ever been marked verified yet" -- if not, this is the first run since the
  // feature shipped, so backfill everyone present right now (admin included).
  // Any registration after this point is a genuinely new, unverified user,
  // and won't be caught by this check on later calls since the admin above
  // is already verified by then.
  const anyoneVerified = await db.user.findFirst({ where: { emailVerified: true } })
  if (!anyoneVerified) {
    await db.user.updateMany({ data: { emailVerified: true } })
  }

  return { admin }
}

async function seedDemoData() {
  const demoSellers = [
    {
      email: 'chioma.okafor@abuad.edu.ng',
      fullName: 'Chioma Okafor',
      matricNumber: 'AHS/2021/0456',
      level: '300',
      department: 'Medicine & Surgery',
      storefront: {
        name: "Chioma's Study Corner",
        description: 'Medical & health science textbooks, past questions, and study materials — from a 300-level Medicine student who\'s used them all.',
        type: 'products',
        bankName: 'Access Bank',
        accountName: 'Okafor Chioma',
        accountNumber: '0123456789',
        phoneNumber: '08012345678',
        contactEmail: 'chioma.okafor@abuad.edu.ng',
        status: 'active',
      },
    },
    {
      email: 'tunde.bello@abuad.edu.ng',
      fullName: 'Tunde Bello',
      matricNumber: 'ENG/2020/0123',
      level: '400',
      department: 'Electrical Engineering',
      storefront: {
        name: 'Tunde Gadgets Hub',
        description: 'Phones, accessories, flashing, screen replacement & software fixes. Trusted campus tech guy.',
        type: 'both',
        bankName: 'GTBank',
        accountName: 'Bello Tunde',
        accountNumber: '0987654321',
        phoneNumber: '08098765432',
        contactEmail: 'tunde.bello@abuad.edu.ng',
        status: 'active',
      },
    },
    {
      email: 'amina.yusuf@abuad.edu.ng',
      fullName: 'Amina Yusuf',
      matricNumber: 'LAW/2022/0789',
      level: '200',
      department: 'Law',
      storefront: {
        name: 'Amina Errands & Co.',
        description: 'Fast delivery, errands, and pick-up services across ABUAD campus. Pay a fair price.',
        type: 'services',
        bankName: 'Zenith Bank',
        accountName: 'Yusuf Amina',
        accountNumber: '0567891234',
        phoneNumber: '08123456789',
        contactEmail: 'amina.yusuf@abuad.edu.ng',
        status: 'active',
      },
    },
    {
      email: 'david.adebayo@abuad.edu.ng',
      fullName: 'David Adebayo',
      matricNumber: 'SCI/2021/0345',
      level: '300',
      department: 'Computer Science',
      storefront: {
        name: 'David Notes & Tutorials',
        description: 'Comprehensive class notes, typed assignments, project research and tutorials for CS & engineering courses.',
        type: 'services',
        bankName: 'First Bank',
        accountName: 'Adebayo David',
        accountNumber: '0345678901',
        phoneNumber: '08087654321',
        contactEmail: 'david.adebayo@abuad.edu.ng',
        status: 'active',
      },
    },
  ]

  for (const s of demoSellers) {
    let user = await db.user.findUnique({ where: { email: s.email } })
    if (!user) {
      user = await db.user.create({
        data: {
          email: s.email,
          passwordHash: hashPassword('password123'),
          fullName: s.fullName,
          matricNumber: s.matricNumber,
          level: s.level,
          department: s.department,
        },
      })
    }
    let store = await db.storefront.findUnique({ where: { ownerId: user.id } })
    if (!store) {
      store = await db.storefront.create({
        data: { ...s.storefront, ownerId: user.id },
      })
    }
  }

  // Get categories & sellers for products
  const phoneCat = await db.category.findUnique({ where: { slug: 'phones-gadgets' } })
  const deliveryCat = await db.category.findUnique({ where: { slug: 'delivery-services' } })
  const notesCat = await db.category.findUnique({ where: { slug: 'note-writing-assignments-projects' } })
  const clothesCat = await db.category.findUnique({ where: { slug: 'clothes-fashion' } })
  const laundryCat = await db.category.findUnique({ where: { slug: 'laundry-services' } })
  const printingCat = await db.category.findUnique({ where: { slug: 'printing-photocopy' } })
  const shoesCat = await db.category.findUnique({ where: { slug: 'shoe-repair-care' } })
  const booksCat = await db.category.findUnique({ where: { slug: 'textbooks-study-materials' } })

  const chioma = await db.user.findUnique({ where: { email: 'chioma.okafor@abuad.edu.ng' } })
  const tunde = await db.user.findUnique({ where: { email: 'tunde.bello@abuad.edu.ng' } })
  const amina = await db.user.findUnique({ where: { email: 'amina.yusuf@abuad.edu.ng' } })
  const david = await db.user.findUnique({ where: { email: 'david.adebayo@abuad.edu.ng' } })
  if (!chioma || !tunde || !amina || !david || !phoneCat || !deliveryCat || !notesCat || !clothesCat || !laundryCat || !printingCat || !shoesCat || !booksCat) return

  const chiomaStore = (await db.storefront.findUnique({ where: { ownerId: chioma.id } }))!
  const tundeStore = (await db.storefront.findUnique({ where: { ownerId: tunde.id } }))!
  const aminaStore = (await db.storefront.findUnique({ where: { ownerId: amina.id } }))!
  const davidStore = (await db.storefront.findUnique({ where: { ownerId: david.id } }))!

  // Demo products
  const products = [
    // Study materials (Chioma)
    { title: 'Guyton & Hall Physiology (13th ed, fairly used)', description: 'Guyton & Hall Textbook of Medical Physiology, 13th edition. All pages intact, no markings.', price: 12000, kind: 'product', categoryId: booksCat.id, sellerId: chioma.id, storefrontId: chiomaStore.id, stock: 1, condition: 'fairly_used' },
    { title: 'MBBS 300L Past Questions Bundle', description: 'Compiled past questions and answers for 300-level Medicine & Surgery courses, organized by course code.', price: 2500, kind: 'product', categoryId: booksCat.id, sellerId: chioma.id, storefrontId: chiomaStore.id, stock: 99, condition: 'new' },
    { title: 'Anatomy Atlas (Netter, fairly used)', description: 'Netter\'s Atlas of Human Anatomy, good condition, some highlighter marks in early chapters only.', price: 15000, kind: 'product', categoryId: booksCat.id, sellerId: chioma.id, storefrontId: chiomaStore.id, stock: 1, condition: 'fairly_used' },

    // Phones (Tunde)
    { title: 'iPhone 11 (128GB, Fairly Used)', description: 'Clean iPhone 11, 128GB, battery health 87%, no cracks. Comes with charger and case.', price: 180000, kind: 'product', categoryId: phoneCat.id, sellerId: tunde.id, storefrontId: tundeStore.id, stock: 1, condition: 'fairly_used' },
    { title: 'Phone Screen Replacement (Samsung/Infinix)', description: 'Professional screen replacement for Samsung, Infinix, Tecno & Nokia phones. 1-hour service.', price: 12000, kind: 'service', categoryId: phoneCat.id, sellerId: tunde.id, storefrontId: tundeStore.id, stock: 99, condition: null },
    { title: 'Phone Flashing & Software Fix', description: 'Phone hanging, freezing, or stuck on logo? I will flash & restore the OS. Same-day service.', price: 3500, kind: 'service', categoryId: phoneCat.id, sellerId: tunde.id, storefrontId: tundeStore.id, stock: 99, condition: null },
    { title: 'Power Bank 20000mAh (Original)', description: 'Original 20000mAh power bank, fast charging, dual USB. 6-month warranty.', price: 8500, kind: 'product', categoryId: phoneCat.id, sellerId: tunde.id, storefrontId: tundeStore.id, stock: 12, condition: 'new' },

    // Delivery (Amina)
    { title: 'Same-hostel Delivery (under 1km)', description: 'Pick up & deliver items within the same hostel or under 1km. 30-minute delivery window.', price: 300, kind: 'service', categoryId: deliveryCat.id, sellerId: amina.id, storefrontId: aminaStore.id, stock: 99, condition: null },
    { title: 'Cross-campus Errand (up to 2 hours)', description: 'Run any errand across campus — pick up documents, buy groceries, queue at the bank. Up to 2 hours.', price: 800, kind: 'service', categoryId: deliveryCat.id, sellerId: amina.id, storefrontId: aminaStore.id, stock: 99, condition: null },
    { title: 'Off-campus Grocery Run', description: 'Pickup groceries from market or supermarket and deliver to your hostel. Price covers errand fee only.', price: 1000, kind: 'service', categoryId: deliveryCat.id, sellerId: amina.id, storefrontId: aminaStore.id, stock: 99, condition: null },

    // Notes (David)
    { title: 'CSC 301 — Data Structures Full Notes', description: 'Comprehensive typed notes for CSC 301 covering arrays, linked lists, trees, graphs, sorting, hashing. PDF + Word.', price: 1500, kind: 'product', categoryId: notesCat.id, sellerId: david.id, storefrontId: davidStore.id, stock: 99, condition: 'new' },
    { title: 'Assignment Typing (up to 10 pages)', description: 'Professional assignment typing with proper formatting and references. Up to 10 pages, 24-hour turnaround.', price: 2000, kind: 'service', categoryId: notesCat.id, sellerId: david.id, storefrontId: davidStore.id, stock: 99, condition: null },
    { title: 'Final Year Project Research Assistance', description: 'Help with literature review, methodology writeup, and data analysis for your final year project. Per chapter.', price: 8000, kind: 'service', categoryId: notesCat.id, sellerId: david.id, storefrontId: davidStore.id, stock: 5, condition: null },

    // Clothes
    { title: 'Ankara 2-piece Set (Size M)', description: 'Beautifully sewn Ankara 2-piece set, size M, perfect for campus events. Brand new.', price: 7500, kind: 'product', categoryId: clothesCat.id, sellerId: tunde.id, storefrontId: tundeStore.id, stock: 3, condition: 'new' },
    { title: 'Ironing Service (per 10 items)', description: 'Professional ironing service, 10 items for one flat price. Pickup & delivery available.', price: 1200, kind: 'service', categoryId: laundryCat.id, sellerId: amina.id, storefrontId: aminaStore.id, stock: 99, condition: null },

    // Printing
    { title: 'Color Printing (per page)', description: 'High-quality color printing on A4. Bring your file or send via WhatsApp. Same-day service.', price: 100, kind: 'service', categoryId: printingCat.id, sellerId: david.id, storefrontId: davidStore.id, stock: 999, condition: null },

    // Shoes
    { title: 'Shoe Repair — Resole (any leather shoe)', description: 'Professional resole service for leather shoes. Adds months of life. 48-hour turnaround.', price: 2500, kind: 'service', categoryId: shoesCat.id, sellerId: tunde.id, storefrontId: tundeStore.id, stock: 99, condition: null },
  ]

  for (const p of products) {
    await db.product.create({ data: p as any })
  }

  // A couple of demo reviews
  const chiomaPhysiology = await db.product.findFirst({ where: { title: { contains: 'Guyton & Hall' } } })
  const tundeIphone = await db.product.findFirst({ where: { title: { contains: 'iPhone 11' } } })
  if (chiomaPhysiology && amina) {
    await db.review.create({
      data: { productId: chiomaPhysiology.id, userId: amina.id, rating: 5, comment: 'Book was exactly as described, no missing pages. Saved me so much buying it used.' },
    })
    await db.product.update({ where: { id: chiomaPhysiology.id }, data: { rating: 5, reviewCount: 1 } })
  }
  if (tundeIphone && david) {
    await db.review.create({
      data: { productId: tundeIphone.id, userId: david.id, rating: 4, comment: 'Phone is clean as described. Battery health was actually 85% not 87% but overall good deal.' },
    })
    await db.product.update({ where: { id: tundeIphone.id }, data: { rating: 4, reviewCount: 1 } })
  }
}
