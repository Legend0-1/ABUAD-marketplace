'use client'

import { useStore } from '@/lib/store'
import { Star, ShoppingCart, Zap, Package } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ImageWithFallback } from '@/components/image-with-fallback'
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
      className="product-card rounded-xl overflow-hidden cursor-pointer flex flex-col h-full group"
    >
      <div className="relative aspect-[3/4] overflow-hidden">
        <ImageWithFallback
          src={cover?.url}
          alt={product.title}
          className="w-full h-full"
          imgClassName="group-hover:scale-105 transition-transform duration-500"
          fallbackIcon={<Package className="w-9 h-9 opacity-40" />}
        />

        {/* Gradient scrim so overlaid text/badges stay legible on any photo */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/10 pointer-events-none" />

        {/* Rating score, poster-corner style */}
        {rating > 0 && (
          <div className="absolute top-2 right-2 rating-badge">
            <Star className="w-3 h-3 fill-current" />
            {rating.toFixed(1)}
          </div>
        )}

        {/* Type / condition chips */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {product.kind === 'service' && (
            <Badge className="cta-gradient border-0 text-[10px] font-bold">Service</Badge>
          )}
          {product.kind === 'product' && product.condition && (
            <Badge variant="secondary" className="capitalize text-[10px] bg-black/50 backdrop-blur-sm border border-white/10">
              {product.condition.replace('_', ' ')}
            </Badge>
          )}
        </div>

        {product.storefront?.status === 'active' && product.category?.requiresApproval && (
          <div className="absolute bottom-2 left-2">
            <Badge className="bg-verified text-verified-foreground text-[10px] font-bold">Verified</Badge>
          </div>
        )}

        {/* Price sits on the poster like a MovieBox "Limited Free" tag */}
        <span className="price-tag absolute bottom-2 right-2 text-xs shadow-lg">
          ₦{product.price.toLocaleString()}
        </span>
      </div>

      <div className="p-3 flex flex-col gap-1 flex-1">
        <p className="text-sm font-semibold line-clamp-2 leading-snug min-h-[2.5rem] text-foreground group-hover:text-primary transition-colors">
          {product.title}
        </p>

        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          {rating > 0 ? (
            <span>{reviewCount} {reviewCount === 1 ? 'review' : 'reviews'}</span>
          ) : (
            <span className="italic">New listing</span>
          )}
        </div>

        <p className="text-xs text-muted-foreground truncate">
          {product.storefront?.name || product.seller?.fullName || 'Verified seller'}
        </p>

        <div className="flex gap-1.5 mt-2">
          <Button
            size="sm"
            variant="outline"
            className="flex-1 h-8 border-white/15 bg-white/5 hover:bg-white/10 text-foreground"
            onClick={onAddToCart}
          >
            <ShoppingCart className="w-3.5 h-3.5 mr-1" /> Cart
          </Button>
          <Button
            size="sm"
            className="flex-1 h-8 cta-gradient font-bold border-0"
            onClick={onBuyNow}
          >
            <Zap className="w-3.5 h-3.5 mr-1" /> Buy
          </Button>
        </div>
      </div>
    </div>
  )
}
