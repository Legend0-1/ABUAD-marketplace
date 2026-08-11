'use client'

import { useEffect, useState } from 'react'
import { useStore } from '@/lib/store'
import { api } from '@/lib/api'
import { ProductCard } from '@/components/product-card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ChevronRight, ChevronLeft, ShieldCheck, Truck, UtensilsCrossed, FileText, Smartphone, Shirt, Printer, Footprints, WashingMachine, BookOpen, Sparkles, Plug, BedDouble, Star, TrendingUp, Tag, Store } from 'lucide-react'

const CATEGORY_ICONS: Record<string, any> = {
  'Truck': Truck,
  'FileText': FileText,
  'UtensilsCrossed': UtensilsCrossed,
  'Shirt': Shirt,
  'WashingMachine': WashingMachine,
  'Printer': Printer,
  'Footprints': Footprints,
  'Smartphone': Smartphone,
  'BookOpen': BookOpen,
  'Sparkles': Sparkles,
  'Plug': Plug,
  'BedDouble': BedDouble,
  'Tag': Tag,
}

const HERO_SLIDES = [
  {
    title: 'Trade Smarter on Campus',
    subtitle: 'Buy & sell with verified ABUAD students. Safe, fast, and trusted.',
    cta: 'Start Selling',
    bg: 'from-purple-700 via-purple-600 to-fuchsia-600',
    image: '/hero-marketplace.svg',
  },
  {
    title: 'Hungry? Get hot meals delivered to your hostel',
    subtitle: 'Every food storefront is admin-verified to keep you safe.',
    cta: 'Order Food',
    bg: 'from-amber-600 via-orange-600 to-red-600',
    image: '/hero-food.svg',
  },
  {
    title: 'Phone cracked? Get it fixed today.',
    subtitle: 'Trusted campus techs for screen replacement, flashing & accessories.',
    cta: 'Find Phone Services',
    bg: 'from-blue-700 via-indigo-600 to-purple-600',
    image: '/hero-tech.svg',
  },
  {
    title: 'Notes, Assignments & Projects — done right.',
    subtitle: 'Quality typed notes & research help from senior students.',
    cta: 'Browse Notes',
    bg: 'from-emerald-600 via-teal-600 to-cyan-600',
    image: '/hero-notes.svg',
  },
]

export function HomePage() {
  const { setView, user, setAuthModalOpen } = useStore()
  const [categories, setCategories] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [services, setServices] = useState<any[]>([])
  const [foodProducts, setFoodProducts] = useState<any[]>([])
  const [topRated, setTopRated] = useState<any[]>([])
  const [slide, setSlide] = useState(0)

  useEffect(() => {
    (async () => {
      const [cats, prods] = await Promise.all([
        api<{ categories: any[] }>('/api/categories'),
        api<{ products: any[] }>('/api/products/list?limit=40'),
      ])
      if (cats.data?.categories) setCategories(cats.data.categories)
      if (prods.data?.products) {
        setProducts(prods.data.products)
        setServices(prods.data.products.filter((p) => p.kind === 'service').slice(0, 8))
        setFoodProducts(prods.data.products.filter((p) => p.category?.slug === 'food-drinks').slice(0, 8))
        setTopRated([...prods.data.products].sort((a, b) => (b.rating || 0) - (a.rating || 0)).slice(0, 8))
      }
    })()
  }, [])

  // Auto-advance hero
  useEffect(() => {
    const t = setInterval(() => setSlide((s) => (s + 1) % HERO_SLIDES.length), 6000)
    return () => clearInterval(t)
  }, [])

  const handleCta = (cta: string) => {
    if (!user) {
      setAuthModalOpen(true)
      return
    }
    if (cta === 'Start Selling') setView({ name: 'sell' })
    else if (cta === 'Order Food') setView({ name: 'category', slug: 'food-drinks', categoryName: 'Food & Drinks' })
    else if (cta === 'Find Phone Services') setView({ name: 'category', slug: 'phones-gadgets', categoryName: 'Phones & Gadgets' })
    else if (cta === 'Browse Notes') setView({ name: 'category', slug: 'note-writing-assignments-projects', categoryName: 'Note Writing, Assignments & Projects' })
  }

  const hero = HERO_SLIDES[slide]

  return (
    <div className="bg-muted/30">
      {/* Hero carousel */}
      <section className="relative">
        <div className={`relative bg-gradient-to-br ${hero.bg} text-white overflow-hidden`}>
          <div className="absolute inset-0 opacity-20" style={{
            backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 30%, white 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }} />
          <div className="max-w-[1500px] mx-auto px-4 sm:px-6 py-10 sm:py-16 lg:py-20 relative">
            <div className="max-w-2xl">
              <Badge className="bg-white/20 text-white border-white/30 mb-3">
                <ShieldCheck className="w-3 h-3 mr-1" /> Verified ABUAD Students Only
              </Badge>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black leading-tight mb-3 drop-shadow">
                {hero.title}
              </h1>
              <p className="text-base sm:text-lg text-white/90 mb-6">{hero.subtitle}</p>
              <div className="flex flex-wrap gap-3">
                <Button size="lg" className="bg-white text-purple-700 hover:bg-white/90 font-bold" onClick={() => handleCta(hero.cta)}>
                  {hero.cta} <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
                <Button size="lg" variant="outline" className="border-white/40 text-white hover:bg-white/10" onClick={() => setView({ name: 'category', slug: 'clothes-fashion', categoryName: 'Clothes & Fashion' })}>
                  Browse Categories
                </Button>
              </div>
            </div>
          </div>
          {/* Slide controls */}
          <div className="absolute inset-x-0 bottom-4 flex items-center justify-center gap-2">
            {HERO_SLIDES.map((_, i) => (
              <button
                key={i}
                onClick={() => setSlide(i)}
                className={`h-2 rounded-full transition-all ${i === slide ? 'w-8 bg-white' : 'w-2 bg-white/50'}`}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>
          <button
            onClick={() => setSlide((s) => (s - 1 + HERO_SLIDES.length) % HERO_SLIDES.length)}
            className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-white/10 hover:bg-white/20 rounded-full"
            aria-label="Previous"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={() => setSlide((s) => (s + 1) % HERO_SLIDES.length)}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-white/10 hover:bg-white/20 rounded-full"
            aria-label="Next"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </section>

      <div className="max-w-[1500px] mx-auto px-3 sm:px-4 py-6 space-y-8">
        {/* Category cards grid (Amazon-style tile cards) */}
        <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {categories.slice(0, 8).map((cat) => {
            const Icon = CATEGORY_ICONS[cat.icon || 'Tag'] || Tag
            return (
              <div key={cat.id} className="bg-card rounded-lg p-4 shadow-sm border hover:shadow-md transition cursor-pointer" onClick={() => setView({ name: 'category', slug: cat.slug, categoryName: cat.name })}>
                <div className="flex items-center justify-between mb-2">
                  <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  {cat.requiresApproval && (
                    <Badge variant="secondary" className="text-[10px]">Verified</Badge>
                  )}
                </div>
                <h3 className="font-bold text-sm mb-1">{cat.name}</h3>
                <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{cat.description}</p>
                <p className="text-xs text-primary font-medium hover:underline">
                  Shop now →
                </p>
              </div>
            )
          })}
        </section>

        {/* Today's Deals banner */}
        <section className="bg-gradient-to-r from-purple-100 via-fuchsia-50 to-purple-100 dark:from-purple-950/30 dark:via-fuchsia-950/30 dark:to-purple-950/30 rounded-xl p-5 sm:p-6 border border-primary/20">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Today's Deals on Campus</h2>
              <p className="text-sm text-muted-foreground">Hot prices from verified ABUAD sellers. New deals daily.</p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            {products.slice(0, 6).map((p) => (
              <ProductCard key={p.id} product={p} compact />
            ))}
          </div>
        </section>

        {/* Food section */}
        {foodProducts.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <UtensilsCrossed className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-bold">Fresh Food & Drinks</h2>
                <Badge variant="secondary" className="text-xs">
                  <ShieldCheck className="w-3 h-3 mr-1" /> Admin-Verified Sellers
                </Badge>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setView({ name: 'category', slug: 'food-drinks', categoryName: 'Food & Drinks' })}>
                See all <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
              {foodProducts.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          </section>
        )}

        {/* Services section */}
        {services.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Store className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-bold">Services by Students</h2>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setView({ name: 'category', slug: 'delivery-services', categoryName: 'Delivery Services' })}>
                See all <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
              {services.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          </section>
        )}

        {/* Top rated */}
        {topRated.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                <h2 className="text-xl font-bold">Top Rated by Students</h2>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setView({ name: 'search', q: '' })}>
                See all <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
              {topRated.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          </section>
        )}

        {/* All categories grid */}
        <section>
          <h2 className="text-xl font-bold mb-3">Browse All Categories</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
            {categories.map((cat) => {
              const Icon = CATEGORY_ICONS[cat.icon || 'Tag'] || Tag
              return (
                <button
                  key={cat.id}
                  onClick={() => setView({ name: 'category', slug: cat.slug, categoryName: cat.name })}
                  className="bg-card rounded-lg p-4 shadow-sm border hover:shadow-md hover:border-primary/30 transition flex flex-col items-center text-center gap-2"
                >
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Icon className="w-6 h-6 text-primary" />
                  </div>
                  <p className="text-sm font-medium leading-tight">{cat.name}</p>
                  <p className="text-xs text-muted-foreground">{cat._count?.products || 0} listings</p>
                </button>
              )
            })}
          </div>
        </section>

        {/* Safety & trust strip */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { icon: ShieldCheck, title: 'Matric-Verified', text: 'Every account is tied to a unique ABUAD matric number.' },
            { icon: Truck, title: 'Buyer Acknowledgement', text: 'Sellers are paid only after you confirm receipt.' },
            { icon: UtensilsCrossed, title: 'Food Safety', text: 'Food storefronts are individually approved by admin.' },
            { icon: Sparkles, title: 'Admin Oversight', text: 'All inbox messages are monitored to prevent fraud.' },
          ].map((f, i) => (
            <div key={i} className="bg-card rounded-lg p-4 border flex gap-3 items-start">
              <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                <f.icon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-bold text-sm">{f.title}</p>
                <p className="text-xs text-muted-foreground">{f.text}</p>
              </div>
            </div>
          ))}
        </section>
      </div>
    </div>
  )
}
