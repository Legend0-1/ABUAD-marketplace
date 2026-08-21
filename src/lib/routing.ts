import type { View } from './store'

/** View -> URL path (+ query string where relevant). */
export function viewToPath(view: View): string {
  switch (view.name) {
    case 'home': return '/'
    case 'category': return `/category/${encodeURIComponent(view.slug)}`
    case 'product': return `/product/${encodeURIComponent(view.id)}`
    case 'search': return `/search?q=${encodeURIComponent(view.q)}`
    case 'sell': return '/sell'
    case 'storefront': return '/storefront'
    case 'storefrontView': return `/store/${encodeURIComponent(view.ownerId)}`
    case 'orders': return '/orders'
    case 'inbox': return '/inbox'
    case 'inboxThread': return `/inbox/${encodeURIComponent(view.conversationId)}`
    case 'profile': return '/profile'
    case 'admin': return '/admin'
    case 'agreement': return '/agreement'
    case 'setup-storefront': return '/setup-storefront'
    case 'about': return '/about'
    case 'campus-safety': return '/campus-safety'
    case 'service-charge': return '/service-charge'
    case 'sustainability': return '/sustainability'
    case 'dispute-resolution': return '/disputes'
    case 'report-user': return '/report'
    case 'protect-account': return '/security'
    case 'feedback': return '/feedback'
    case 'delivery-partner-register': return '/become-a-partner'
    case 'deliveries': return '/deliveries'
    case 'hr-queue': return '/hr'
    case 'reset-password': return `/reset-password?token=${encodeURIComponent(view.token)}`
    default: return '/'
  }
}

/** URL path (+ search params) -> View. Returns null for unrecognized paths (caller should fall back to home). */
export function pathToView(pathname: string, search: URLSearchParams): View | null {
  const segments = pathname.split('/').filter(Boolean)
  const [first, second] = segments

  if (segments.length === 0) return { name: 'home' }

  switch (first) {
    case 'category': return second ? { name: 'category', slug: decodeURIComponent(second) } : null
    case 'product': return second ? { name: 'product', id: decodeURIComponent(second) } : null
    case 'search': return { name: 'search', q: search.get('q') || '' }
    case 'sell': return { name: 'sell' }
    case 'storefront': return { name: 'storefront' }
    case 'store': return second ? { name: 'storefrontView', ownerId: decodeURIComponent(second) } : null
    case 'orders': return { name: 'orders' }
    case 'inbox': return second ? { name: 'inboxThread', conversationId: decodeURIComponent(second) } : { name: 'inbox' }
    case 'profile': return { name: 'profile' }
    case 'admin': return { name: 'admin' }
    case 'agreement': return { name: 'agreement' }
    case 'setup-storefront': return { name: 'setup-storefront' }
    case 'about': return { name: 'about' }
    case 'campus-safety': return { name: 'campus-safety' }
    case 'service-charge': return { name: 'service-charge' }
    case 'sustainability': return { name: 'sustainability' }
    case 'disputes': return { name: 'dispute-resolution' }
    case 'report': return { name: 'report-user' }
    case 'security': return { name: 'protect-account' }
    case 'feedback': return { name: 'feedback' }
    case 'become-a-partner': return { name: 'delivery-partner-register' }
    case 'deliveries': return { name: 'deliveries' }
    case 'hr': return { name: 'hr-queue' }
    case 'reset-password': {
      const token = search.get('token')
      return token ? { name: 'reset-password', token } : null
    }
    default: return null
  }
}
