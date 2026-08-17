'use client'

import { useStore } from '@/lib/store'
import { Star, MapPin, ShoppingCart, Zap, Package } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

type Props = {
  product: any
  compact?: boolean
}

export function ProductCard({ product, compact }: Props) {
  const { setView, addToCart, user } = useStore()

  const cover = product.media?.find((m: any) => m.type === 'image') || product.media?.[0]
  const rating = product.rating || 0
  const reviewCount = product._count?.reviews ?? product.reviewCount ?? 0

  const onAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!user) {
      toast.info('Sign in to add to cart')
      return
    }
    addToCart({
      productId: product.id,
      title: product.title,
      price: product.price,
      quantity: 1,
      sellerId: product.sellerId,
      image: cover?.url,
    })
    toast.success('Added to cart', { description: product.title })
  }

  const onBuyNow = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!user) {
      toast.info('Sign in to buy')
      return
    }
    addToCart({
      productId: product.id,
      title: product.title,
      price: product.price,
      quantity: 1,
      sellerId: product.sellerId,
      image: cover?.url,
    })
    useStore.getState().setCartOpen(true)
  }

  return (
    <div
      onClick={() => setView({ name: 'product', id: product.id })}
      className="product-card bg-card border rounded-lg overflow-hidden cursor-pointer flex flex-col h-full group"
    >
      <div className={`relative ${compact ? 'aspect-square' : 'aspect-square'} bg-muted overflow-hidden`}>
        {cover ? (
          <img src={cover.url} alt={product.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <Package className="w-8 h-8 mx-auto mb-1 opacity-50" />
              <p className="text-xs">No image</p>
            </div>
          </div>
        )}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {product.kind === 'service' && (
            <Badge className="bg-accent text-accent-foreground">Service</Badge>
          )}
          {product.kind === 'product' && product.condition && (
            <Badge variant="secondary" className="capitalize">{product.condition.replace('_', ' ')}</Badge>
          )}
        </div>
        {product.storefront?.status === 'active' && product.category?.requiresApproval && (
          <div className="absolute top-2 right-2">
            <Badge className="bg-verified text-verified-foreground">Verified</Badge>
          </div>
        )}
      </div>
      <div className="p-3 flex flex-col gap-1 flex-1">
        <p className="text-sm font-medium line-clamp-2 leading-snug min-h-[2.5rem]">{product.title}</p>
        <div className="flex items-center gap-1 text-xs">
          {rating > 0 ? (
            <>
              <span className="flex">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star key={i} className={`w-3 h-3 ${i <= Math.round(rating) ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/40'}`} />
                ))}
              </span>
              <span className="text-muted-foreground">({reviewCount})</span>
            </>
          ) : (
            <span className="text-muted-foreground italic text-xs">New listing</span>
          )}
        </div>
        <span className="price-tag mt-1 self-start">₦{product.price.toLocaleString()}</span>
        <p className="text-xs text-muted-foreground truncate">
          {product.storefront?.name || product.seller?.fullName || 'ABUAD seller'}
        </p>
        <div className="flex gap-1 mt-2">
          <Button size="sm" variant="outline" className="flex-1 h-8" onClick={onAddToCart}>
            <ShoppingCart className="w-3.5 h-3.5 mr-1" /> Cart
          </Button>
          <Button size="sm" className="flex-1 h-8 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold" onClick={onBuyNow}>
            <Zap className="w-3.5 h-3.5 mr-1" /> Buy
          </Button>
        </div>
      </div>
    </div>
  )
}
