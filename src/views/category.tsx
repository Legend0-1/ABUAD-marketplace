'use client'

import { useEffect, useState } from 'react'
import { useStore } from '@/lib/store'
import { api } from '@/lib/api'
import { ProductCard } from '@/components/product-card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { ChevronRight, SlidersHorizontal, ShieldCheck, SearchX } from 'lucide-react'

export function CategoryPage({ slug, name }: { slug: string; name?: string }) {
  const { setView } = useStore()
  const [products, setProducts] = useState<any[]>([])
  const [category, setCategory] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [sort, setSort] = useState('newest')
  const [kind, setKind] = useState<'all' | 'product' | 'service'>('all')

  useEffect(() => {
    (async () => {
      setLoading(true)
      const params = new URLSearchParams({ category: slug, sort, limit: '100' })
      if (kind !== 'all') params.set('kind', kind)
      const { data } = await api<{ products: any[] }>(`/api/products/list?${params.toString()}`)
      if (data?.products) setProducts(data.products)
      // Fetch category meta
      const cats = await api<{ categories: any[] }>('/api/categories')
      const found = cats.data?.categories?.find((c) => c.slug === slug)
      setCategory(found || null)
      setLoading(false)
    })()
  }, [slug, sort, kind])

  return (
    <div className="max-w-[1500px] mx-auto px-3 sm:px-4 py-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-3">
        <button onClick={() => setView({ name: 'home' })} className="hover:text-primary">Home</button>
        <ChevronRight className="w-3 h-3" />
        <span className="text-foreground font-medium">{category?.name || name}</span>
      </div>

      <div className="flex flex-col lg:flex-row gap-4">
        {/* Sidebar filters */}
        <aside className="lg:w-64 shrink-0 space-y-4">
          <div className="bg-card rounded-lg p-4 border">
            <h3 className="font-bold text-sm mb-2">{category?.name || name}</h3>
            <p className="text-xs text-muted-foreground">{category?.description}</p>
            {category?.requiresApproval && (
              <div className="mt-2 text-xs bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 p-2 rounded flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 shrink-0" /> Listings in this category are sold by admin-verified storefronts only.
              </div>
            )}
          </div>
          <div className="bg-card rounded-lg p-4 border">
            <h3 className="font-bold text-sm mb-2 flex items-center gap-1.5"><SlidersHorizontal className="w-4 h-4" /> Filters</h3>
            <div className="space-y-2">
              <div>
                <label className="text-xs text-muted-foreground">Type</label>
                <Select value={kind} onValueChange={(v: any) => setKind(v)}>
                  <SelectTrigger className="h-8 mt-1 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="product">Products only</SelectItem>
                    <SelectItem value="service">Services only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Sort by</label>
                <Select value={sort} onValueChange={setSort}>
                  <SelectTrigger className="h-8 mt-1 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Newest first</SelectItem>
                    <SelectItem value="price_low">Price: Low to High</SelectItem>
                    <SelectItem value="price_high">Price: High to Low</SelectItem>
                    <SelectItem value="rating">Avg. rating</SelectItem>
                    <SelectItem value="popular">Most viewed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </aside>

        {/* Products grid */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-muted-foreground">
              {loading ? 'Loading…' : `${products.length} result${products.length !== 1 ? 's' : ''}`}
            </p>
          </div>
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="aspect-[3/4] rounded-lg" />)}
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-16 bg-card rounded-lg border">
              <SearchX className="w-10 h-10 mx-auto mb-2 text-muted-foreground" />
              <p className="font-bold">No listings in this category yet</p>
              <p className="text-sm text-muted-foreground mb-4">Be the first to sell here.</p>
              <Button onClick={() => setView({ name: 'sell' })}>Sell on UNI MART</Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {products.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
