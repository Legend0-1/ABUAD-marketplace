'use client'

import { useEffect, useState } from 'react'
import { useStore } from '@/lib/store'
import { api } from '@/lib/api'
import { ProductCard } from '@/components/product-card'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Search as SearchIcon, Store, ChevronRight, Tag } from 'lucide-react'

export function SearchPage({ q }: { q: string }) {
  const { setView } = useStore()
  const [query, setQuery] = useState(q)
  const [results, setResults] = useState<{ products: any[]; storefronts: any[]; categories: any[] }>({ products: [], storefronts: [], categories: [] })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setQuery(q)
    if (!q.trim()) return
    setLoading(true)
    api<{ products: any[]; storefronts: any[]; categories: any[] }>(`/api/search?q=${encodeURIComponent(q)}`).then(({ data }) => {
      if (data) setResults(data)
      setLoading(false)
    })
  }, [q])

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) setView({ name: 'search', q: query.trim() })
  }

  return (
    <div className="max-w-[1500px] mx-auto px-3 sm:px-4 py-6">
      <form onSubmit={onSearch} className="flex gap-2 mb-4">
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search products, services, sellers…" className="flex-1" />
        <Button type="submit"><SearchIcon className="w-4 h-4 mr-1" /> Search</Button>
      </form>

      <p className="text-sm text-muted-foreground mb-3">
        {loading ? 'Searching…' : `${results.products.length + results.storefronts.length + results.categories.length} result(s) for "${q}"`}
      </p>

      {results.storefronts.length > 0 && (
        <section className="mb-6">
          <h2 className="font-bold mb-2">Sellers</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {results.storefronts.map((s) => (
              <button
                key={s.id}
                onClick={() => setView({ name: 'storefrontView', ownerId: s.ownerId })}
                className="bg-card border rounded-lg p-3 flex items-center gap-3 hover:border-primary/40 text-left"
              >
                <Avatar className="w-10 h-10">
                  <AvatarImage src={s.owner?.profilePicture || undefined} />
                  <AvatarFallback><Store className="w-5 h-5" /></AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="font-bold text-sm truncate">{s.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{s.description}</p>
                </div>
                <ChevronRight className="w-4 h-4 ml-auto shrink-0" />
              </button>
            ))}
          </div>
        </section>
      )}

      {results.categories.length > 0 && (
        <section className="mb-6">
          <h2 className="font-bold mb-2">Categories</h2>
          <div className="flex flex-wrap gap-2">
            {results.categories.map((c) => (
              <button
                key={c.id}
                onClick={() => setView({ name: 'category', slug: c.slug, categoryName: c.name })}
                className="bg-card border rounded-full px-3 py-1.5 text-sm hover:border-primary/40 flex items-center gap-1.5"
              >
                <Tag className="w-3 h-3" /> {c.name}
              </button>
            ))}
          </div>
        </section>
      )}

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="aspect-[3/4] rounded-lg" />)}
        </div>
      ) : results.products.length > 0 ? (
        <>
          <h2 className="font-bold mb-2">Products & Services</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {results.products.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </>
      ) : (
        !loading && q && (
          <div className="text-center py-16">
            <div className="text-5xl mb-2">🔍</div>
            <p className="font-bold">No results for "{q}"</p>
            <p className="text-sm text-muted-foreground">Try different keywords or browse a category.</p>
          </div>
        )
      )}
    </div>
  )
}
