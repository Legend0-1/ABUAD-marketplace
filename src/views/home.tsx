'use client'

import { useEffect, useState } from 'react'
import { useStore } from '@/lib/store'
import { api } from '@/lib/api'
import { ProductCard } from '@/components/product-card'
import { ImageWithFallback } from '@/components/image-with-fallback'
import { categoryImage } from '@/lib/category-images'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ChevronRight, ChevronLeft, ShieldCheck, Truck, Scale, Star, TrendingUp, Sparkles, Store, RefreshCw, AlertCircle } from 'lucide-react'

const HERO_SLIDES = [
  {
    title: 'Trade Smarter on Campus',
    subtitle: 'Buy & sell with verified university students. Safe, fast, and trusted.',
    cta: 'Start Selling',
    photo: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1600&h=700&q=70',
  },
  {
    title: 'Need something picked up or delivered?',
    subtitle: 'Trusted student runners for errands and deliveries across campus.',
    cta: 'Find Delivery Services',
    photo: 'https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?auto=format&fit=crop&w=1600&h=700&q=70',
  },
  {
    title: 'Phone cracked? Get it fixed today.',
    subtitle: 'Trusted campus techs for screen replacement, flashing & accessories.',
    cta: 'Find Phone Services',
    photo: 'https://images.unsplash.com/photo-1581092160562-40aa08e78837?auto=format&fit=crop&w=1600&h=700&q=70',
  },
  {
    title: 'Notes, Assignments & Projects — done right.',
    subtitle: 'Quality typed notes & research help from senior students.',
    cta: 'Browse Notes',
    photo: 'https://images.unsplash.com/photo-1517842645767-c639042777db?auto=format&fit=crop&w=1600&h=700&q=70',
  },
]

export function HomePage() {
  const { setView, user, setAuthModalOpen } = useStore()
  const [categories, setCategories] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [services, setServices] = useState<any[]>([])
  const [deliveryProducts, setDeliveryProducts] = useState<any[]>([])
  const [topRated, setTopRated] = useState<any[]>([])
  const [slide, setSlide] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const load = async () => {
    setLoading(true)
    setError(false)
    const [cats, prods] = await Promise.all([
      api<{ categories: any[] }>('/api/categories'),
      api<{ products: any[] }>('/api/products/list?limit=40'),
    ])
    if (cats.data?.categories) setCategories(cats.data.categories)
    if (prods.data?.products) {
      setProducts(prods.data.products)
      setServices(prods.data.products.filter((p) => p.kind === 'service').slice(0, 8))
      setDeliveryProducts(prods.data.products.filter((p) => p.category?.slug === 'delivery-services').slice(0, 8))
      setTopRated([...prods.data.products].sort((a, b) => (b.rating || 0) - (a.rating || 0)).slice(0, 8))
    }
    // Only surface a blocking error if BOTH feeds failed — a partial load still
    // renders whatever came back.
    if (cats.error && prods.error) setError(true)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

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
    else if (cta === 'Find Delivery Services') setView({ name: 'category', slug: 'delivery-services', categoryName: 'Delivery Services' })
    else if (cta === 'Find Phone Services') setView({ name: 'category', slug: 'phones-gadgets', categoryName: 'Phones & Gadgets' })
    else if (cta === 'Browse Notes') setView({ name: 'category', slug: 'note-writing-assignments-projects', categoryName: 'Note Writing, Assignments & Projects' })
  }

  const hero = HERO_SLIDES[slide]

  const SectionHeader = ({ icon: Icon, title, iconClass, onSeeAll }: { icon: any; title: string; iconClass?: string; onSeeAll?: () => void }) => (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <Icon className={`w-5 h-5 ${iconClass || 'text-primary'}`} />
        <h2 className="text-lg sm:text-xl font-bold">{title}</h2>
      </div>
      {onSeeAll && (
        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-white" onClick={onSeeAll}>
          See all <ChevronRight className="w-4 h-4" />
        </Button>
      )}
    </div>
  )

  return (
    <div className="max-w-[1600px] mx-auto px-3 sm:px-5 py-5 space-y-9">
      {/* Cinematic hero */}
      <section className="relative rounded-2xl overflow-hidden border border-white/10 h-[280px] sm:h-[360px] lg:h-[400px]">
        {HERO_SLIDES.map((s, i) => (
          <div key={i} className={`absolute inset-0 transition-opacity duration-700 ${i === slide ? 'opacity-100' : 'opacity-0'}`}>
            <ImageWithFallback src={s.photo} alt={s.title} className="w-full h-full" />
          </div>
        ))}
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/85 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent" />

        <div className="relative h-full flex flex-col justify-center max-w-xl px-5 sm:px-10">
          <Badge className="glass border-white/15 text-white w-fit mb-3">
            <ShieldCheck className="w-3 h-3 mr-1 text-verified" /> Verified Students Only
          </Badge>
          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black leading-tight mb-3">{hero.title}</h1>
          <p className="text-sm sm:text-base text-white/80 mb-6 max-w-md">{hero.subtitle}</p>
          <div className="flex flex-wrap gap-3">
            <Button size="lg" className="cta-gradient font-bold border-0 rounded-full" onClick={() => handleCta(hero.cta)}>
              {hero.cta} <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="rounded-full border-white/20 bg-white/5 hover:bg-white/10 text-white"
              onClick={() => setView({ name: 'category', slug: 'clothes-fashion', categoryName: 'Clothes & Fashion' })}
            >
              Browse Categories
            </Button>
          </div>
        </div>

        {/* Slide dots */}
        <div className="absolute bottom-4 left-5 sm:left-10 flex items-center gap-2">
          {HERO_SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => setSlide(i)}
              className={`h-1.5 rounded-full transition-all ${i === slide ? 'w-8 bg-primary' : 'w-2 bg-white/40'}`}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
        <button onClick={() => setSlide((s) => (s - 1 + HERO_SLIDES.length) % HERO_SLIDES.length)} className="absolute right-14 bottom-4 p-2 glass rounded-full hover:bg-white/15" aria-label="Previous">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button onClick={() => setSlide((s) => (s + 1) % HERO_SLIDES.length)} className="absolute right-4 bottom-4 p-2 glass rounded-full hover:bg-white/15" aria-label="Next">
          <ChevronRight className="w-4 h-4" />
        </button>
      </section>

      {/* Load error (only when nothing rendered) */}
      {error && categories.length === 0 && products.length === 0 && (
        <section className="glass-card rounded-2xl p-8 text-center">
          <AlertCircle className="w-10 h-10 mx-auto mb-3 text-destructive" />
          <p className="font-bold text-lg">We couldn&apos;t load the marketplace</p>
          <p className="text-sm text-muted-foreground mb-4">Please check your connection and try again.</p>
          <Button onClick={load} className="cta-gradient border-0 rounded-full">
            <RefreshCw className="w-4 h-4 mr-1.5" /> Retry
          </Button>
        </section>
      )}

      {/* Category photo tiles */}
      <section>
        <SectionHeader icon={Sparkles} title="Shop by Category" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {loading ? (
            Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="rounded-xl aspect-[16/10]" />)
          ) : (
            categories.slice(0, 8).map((cat) => (
              <button
                key={cat.id}
                onClick={() => setView({ name: 'category', slug: cat.slug, categoryName: cat.name })}
                className="group relative rounded-xl overflow-hidden border border-white/10 aspect-[16/10] text-left"
              >
                <ImageWithFallback src={categoryImage(cat)} alt={cat.name} className="absolute inset-0 w-full h-full" imgClassName="group-hover:scale-110 transition-transform duration-500" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
                {cat.requiresApproval && (
                  <Badge className="absolute top-2 right-2 bg-verified text-verified-foreground text-[10px] font-bold">Verified</Badge>
                )}
                <div className="absolute inset-x-0 bottom-0 p-3">
                  <h3 className="font-bold text-sm text-white drop-shadow">{cat.name}</h3>
                  <p className="text-[11px] text-white/70">{cat._count?.products || 0} listings</p>
                </div>
              </button>
            ))
          )}
        </div>
      </section>

      {/* Loading product row (shown until the product feed resolves) */}
      {loading && (
        <section className="glass-panel rounded-2xl p-5 sm:p-6">
          <Skeleton className="h-6 w-48 mb-4" />
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="aspect-[3/4] rounded-xl" />)}
          </div>
        </section>
      )}

      {/* Today's Deals */}
      {products.length > 0 && (
        <section className="glass-panel rounded-2xl p-5 sm:p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full cta-gradient flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold">Today's Deals on Campus</h2>
              <p className="text-sm text-muted-foreground">Hot prices from verified sellers. New deals daily.</p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            {products.slice(0, 6).map((p) => (
              <ProductCard key={p.id} product={p} compact />
            ))}
          </div>
        </section>
      )}

      {/* Delivery */}
      {deliveryProducts.length > 0 && (
        <section>
          <SectionHeader icon={Truck} title="Errands & Delivery" onSeeAll={() => setView({ name: 'category', slug: 'delivery-services', categoryName: 'Delivery Services' })} />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
            {deliveryProducts.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      )}

      {/* Services */}
      {services.length > 0 && (
        <section>
          <SectionHeader icon={Store} title="Services by Students" onSeeAll={() => setView({ name: 'category', slug: 'delivery-services', categoryName: 'Delivery Services' })} />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
            {services.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      )}

      {/* Top rated */}
      {topRated.length > 0 && (
        <section>
          <SectionHeader icon={Star} title="Top Rated by Students" iconClass="text-gold fill-gold" onSeeAll={() => setView({ name: 'search', q: '' })} />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
            {topRated.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      )}

      {/* All categories — compact photo tiles */}
      <section>
        <SectionHeader icon={Sparkles} title="Browse All Categories" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setView({ name: 'category', slug: cat.slug, categoryName: cat.name })}
              className="group relative rounded-xl overflow-hidden border border-white/10 aspect-square text-left"
            >
              <ImageWithFallback src={categoryImage(cat, 400, 400)} alt={cat.name} className="absolute inset-0 w-full h-full" imgClassName="group-hover:scale-110 transition-transform duration-500" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-2.5">
                <p className="text-xs font-semibold text-white leading-tight drop-shadow line-clamp-2">{cat.name}</p>
                <p className="text-[10px] text-white/70">{cat._count?.products || 0} listings</p>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Trust strip */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { icon: ShieldCheck, title: 'Matric-Verified', text: 'Every account is tied to a unique, verified matric number.' },
          { icon: Truck, title: 'Buyer Acknowledgement', text: 'Sellers are paid only after you confirm receipt.' },
          { icon: Scale, title: 'Real Dispute Support', text: 'A real admin reviews every dispute, not an automated form.' },
          { icon: Sparkles, title: 'Fraud Protection', text: 'Suspicious activity is reviewed by our safety team.' },
        ].map((f, i) => (
          <div key={i} className="glass-card rounded-xl p-4 flex gap-3 items-start">
            <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
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
  )
}
