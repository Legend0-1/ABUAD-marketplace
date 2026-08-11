'use client'

import { useEffect, useRef, useState } from 'react'
import { useStore } from '@/lib/store'
import { api } from '@/lib/api'
import {
  Search, ShoppingCart, User, Menu, Store, Package, MessageSquare,
  LayoutDashboard, LogOut, ChevronDown, Shield, X, Bell,
} from 'lucide-react'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

const CATEGORY_ICONS: Record<string, string> = {
  'Truck': '🚚',
  'FileText': '📝',
  'UtensilsCrossed': '🍽️',
  'Shirt': '👕',
  'WashingMachine': '🧺',
  'Printer': '🖨️',
  'Footprints': '👞',
  'Smartphone': '📱',
  'BookOpen': '📚',
  'Sparkles': '💄',
  'Plug': '🔌',
  'BedDouble': '🛏️',
  'Tag': '🏷️',
}

export function Header() {
  const { user, setUser, setView, view, setAuthModalOpen, setAuthMode, cart, setCartOpen, setView: sv } = useStore()
  const [searchQ, setSearchQ] = useState('')
  const [categories, setCategories] = useState<any[]>([])
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const searchRef = useRef<HTMLInputElement>(null)

  // Load categories
  useEffect(() => {
    (async () => {
      const { data } = await api<{ categories: any[] }>('/api/categories')
      if (data?.categories) setCategories(data.categories)
    })()
  }, [])

  // Poll for unread inbox count (lightweight)
  useEffect(() => {
    if (!user) return
    let cancelled = false
    const poll = async () => {
      const { data } = await api<{ conversations: any[] }>('/api/messages/conversations')
      if (cancelled) return
      // We don't track read state per-message in DB to keep things simple;
      // use lastMessage timestamp vs a sessionStorage watermark.
      if (data?.conversations) {
        const lastSeen = Number(sessionStorage.getItem('abuad_inbox_seen') || 0)
        const newest = data.conversations.reduce((max, c) => {
          const t = c.lastMessage ? new Date(c.lastMessage.createdAt).getTime() : 0
          return t > max ? t : max
        }, 0)
        // Count conversations where the last message is from someone else and newer than seen
        const unread = data.conversations.filter((c) => {
          if (!c.lastMessage) return false
          if (c.lastMessage.senderId === user.id) return false
          return new Date(c.lastMessage.createdAt).getTime() > lastSeen
        }).length
        setUnreadCount(unread)
      }
    }
    poll()
    const t = setInterval(poll, 15000)
    return () => { cancelled = true; clearInterval(t) }
  }, [user])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQ.trim()) return
    sv({ name: 'search', q: searchQ.trim() })
  }

  const handleLogout = async () => {
    await api('/api/auth/logout', { method: 'POST' })
    setUser(null)
    sessionStorage.removeItem('abuad_inbox_seen')
    sessionStorage.removeItem('abuad_auth_dismissed')
    sv({ name: 'home' })
  }

  const openAuth = (mode: 'login' | 'register') => {
    setAuthMode(mode)
    setAuthModalOpen(true)
  }

  const cartCount = cart.reduce((s, c) => s + c.quantity, 0)

  return (
    <>
      {/* Top purple bar */}
      <header className="amazon-header text-white sticky top-0 z-40 shadow-lg">
        <div className="max-w-[1500px] mx-auto px-3 sm:px-4">
          <div className="flex items-center gap-2 sm:gap-4 h-14 sm:h-16">
            {/* Mobile menu toggle */}
            <button
              className="lg:hidden p-2 rounded hover:bg-white/10"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Logo */}
            <button
              onClick={() => sv({ name: 'home' })}
              className="flex items-center gap-2 hover:bg-white/10 px-2 py-1.5 rounded transition shrink-0"
            >
              <div className="w-9 h-9 rounded-md bg-white/95 flex items-center justify-center text-primary font-black text-lg shadow-inner">
                A
              </div>
              <div className="hidden sm:flex flex-col leading-none text-left">
                <span className="text-[10px] text-white/70 -mb-0.5">ABUAD</span>
                <span className="text-sm font-bold tracking-tight">Marketplace</span>
              </div>
            </button>

            {/* Deliver-to (decorative) */}
            <div className="hidden xl:flex items-center gap-1 px-2 py-1.5 rounded hover:bg-white/10 cursor-default text-xs">
              <div className="flex flex-col leading-tight">
                <span className="text-[10px] text-white/70">Deliver to</span>
                <span className="font-bold">ABUAD Campus</span>
              </div>
            </div>

            {/* Search */}
            <form onSubmit={handleSearch} className="flex-1 max-w-3xl flex items-stretch rounded-md overflow-hidden bg-white shadow-sm">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="hidden sm:flex items-center gap-1 px-3 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs border-r border-gray-300 transition"
                  >
                    All <ChevronDown className="w-3 h-3" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-64 max-h-96 overflow-y-auto scrollbar-thin">
                  <DropdownMenuLabel className="text-xs text-muted-foreground">Categories</DropdownMenuLabel>
                  {categories.map((c) => (
                    <DropdownMenuItem
                      key={c.id}
                      onClick={() => sv({ name: 'category', slug: c.slug, categoryName: c.name })}
                      className="cursor-pointer text-sm"
                    >
                      <span className="mr-2">{CATEGORY_ICONS[c.icon || 'Tag'] || '🏷️'}</span>
                      {c.name}
                      <span className="ml-auto text-xs text-muted-foreground">{c._count?.products || 0}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <Input
                ref={searchRef}
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
                placeholder="Search products, services, sellers…"
                className="flex-1 border-0 rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 text-foreground"
              />
              <button
                type="submit"
                className="px-4 bg-primary hover:bg-primary/90 text-primary-foreground flex items-center justify-center transition"
                aria-label="Search"
              >
                <Search className="w-5 h-5" />
              </button>
            </form>

            {/* Right actions */}
            <div className="flex items-center gap-1 sm:gap-2 shrink-0">
              {user ? (
                <>
                  {/* Inbox */}
                  <button
                    onClick={() => sv({ name: 'inbox' })}
                    className="relative p-2 rounded hover:bg-white/10 transition"
                    aria-label="Inbox"
                    title="Inbox"
                  >
                    <MessageSquare className="w-5 h-5" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 bg-accent text-accent-foreground text-[10px] font-bold rounded-full min-w-4 h-4 px-1 flex items-center justify-center pulse-purple">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </button>

                  {/* Orders */}
                  <button
                    onClick={() => sv({ name: 'orders' })}
                    className="hidden md:flex flex-col items-start px-2 py-1.5 rounded hover:bg-white/10 transition leading-tight"
                  >
                    <span className="text-[10px] text-white/70">Returns</span>
                    <span className="text-xs font-bold">& Orders</span>
                  </button>

                  {/* Cart */}
                  <button
                    onClick={() => setCartOpen(true)}
                    className="flex items-center gap-1 px-2 py-1.5 rounded hover:bg-white/10 transition relative"
                    aria-label="Cart"
                  >
                    <div className="relative">
                      <ShoppingCart className="w-6 h-6" />
                      {cartCount > 0 && (
                        <span className="absolute -top-2 -right-2 bg-accent text-accent-foreground text-[10px] font-bold rounded-full min-w-4 h-4 px-1 flex items-center justify-center">
                          {cartCount}
                        </span>
                      )}
                    </div>
                    <span className="hidden sm:inline text-xs font-bold ml-1">Cart</span>
                  </button>

                  {/* Account */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-white/10 transition">
                        <Avatar className="w-7 h-7 border border-white/30">
                          <AvatarImage src={user.profilePicture || undefined} />
                          <AvatarFallback className="bg-white/20 text-white text-xs">
                            {user.fullName.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="hidden sm:flex flex-col items-start leading-tight">
                          <span className="text-[10px] text-white/70">Hello, {user.fullName.split(' ')[0]}</span>
                          <span className="text-xs font-bold flex items-center gap-1">
                            Account <ChevronDown className="w-3 h-3" />
                          </span>
                        </div>
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-64">
                      <DropdownMenuLabel className="flex flex-col gap-0.5">
                        <span className="font-bold">{user.fullName}</span>
                        <span className="text-xs text-muted-foreground font-normal">{user.matricNumber}</span>
                        <span className="text-xs text-muted-foreground font-normal">{user.department} • {user.level}</span>
                        {user.isAdmin && (
                          <Badge variant="secondary" className="w-fit mt-1 text-[10px]">
                            <Shield className="w-3 h-3 mr-1" /> Admin
                          </Badge>
                        )}
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => sv({ name: 'profile' })} className="cursor-pointer">
                        <User className="w-4 h-4 mr-2" /> Your Profile
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => sv({ name: 'orders' })} className="cursor-pointer">
                        <Package className="w-4 h-4 mr-2" /> Your Orders
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => sv({ name: 'storefront' })} className="cursor-pointer">
                        <Store className="w-4 h-4 mr-2" /> Your Storefront
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => sv({ name: 'sell' })} className="cursor-pointer">
                        <Package className="w-4 h-4 mr-2" /> Sell a Product / Service
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => sv({ name: 'inbox' })} className="cursor-pointer">
                        <MessageSquare className="w-4 h-4 mr-2" /> Inbox
                        {unreadCount > 0 && <Badge className="ml-auto">{unreadCount}</Badge>}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => sv({ name: 'agreement' })} className="cursor-pointer">
                        <Shield className="w-4 h-4 mr-2" /> Seller Agreement
                      </DropdownMenuItem>
                      {user.isAdmin && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => sv({ name: 'admin' })} className="cursor-pointer text-primary font-medium">
                            <LayoutDashboard className="w-4 h-4 mr-2" /> Admin Dashboard
                          </DropdownMenuItem>
                        </>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive">
                        <LogOut className="w-4 h-4 mr-2" /> Sign Out
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              ) : (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-white hover:bg-white/10 hover:text-white"
                    onClick={() => openAuth('login')}
                  >
                    Sign In
                  </Button>
                  <Button
                    size="sm"
                    className="bg-accent hover:bg-accent/90 text-accent-foreground"
                    onClick={() => openAuth('register')}
                  >
                    Create Account
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Secondary nav: categories scrollable bar */}
          <div className="hidden lg:flex items-center gap-1 h-10 text-sm border-t border-white/10 overflow-x-auto scrollbar-thin">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="flex items-center gap-1 px-3 py-1.5 rounded hover:bg-white/10 font-bold transition shrink-0"
            >
              <Menu className="w-4 h-4" /> All Categories
            </button>
            {categories.filter(c => (c._count?.products || 0) > 0 || c.origin === 'default').slice(0, 14).map((c) => (
              <button
                key={c.id}
                onClick={() => sv({ name: 'category', slug: c.slug, categoryName: c.name })}
                className={cn(
                  "px-3 py-1.5 rounded hover:bg-white/10 transition whitespace-nowrap shrink-0",
                  view.name === 'category' && view.slug === c.slug && "bg-white/15"
                )}
              >
                {c.name}
              </button>
            ))}
            <button
              onClick={() => sv({ name: 'sell' })}
              className="ml-auto px-3 py-1.5 rounded bg-accent hover:bg-accent/90 text-accent-foreground font-bold transition shrink-0"
            >
              + Sell on ABUAD
            </button>
          </div>
        </div>
      </header>

      {/* Mobile slide-out menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileMenuOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-80 max-w-[85vw] bg-background shadow-xl overflow-y-auto scrollbar-thin">
            <div className="amazon-header p-4 text-white flex items-center justify-between">
              <div>
                <p className="text-xs text-white/70">Hello,</p>
                <p className="font-bold">{user?.fullName || 'Student'}</p>
              </div>
              <button onClick={() => setMobileMenuOpen(false)} className="p-2 hover:bg-white/10 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="p-2">
              <p className="px-3 py-2 text-xs font-bold text-muted-foreground uppercase">Browse</p>
              <button onClick={() => { sv({ name: 'home' }); setMobileMenuOpen(false) }} className="w-full text-left px-3 py-2 hover:bg-accent/10 rounded text-sm">
                Home
              </button>
              {categories.map((c) => (
                <button
                  key={c.id}
                  onClick={() => { sv({ name: 'category', slug: c.slug, categoryName: c.name }); setMobileMenuOpen(false) }}
                  className="w-full text-left px-3 py-2 hover:bg-accent/10 rounded text-sm flex items-center gap-2"
                >
                  <span>{CATEGORY_ICONS[c.icon || 'Tag'] || '🏷️'}</span>
                  <span className="flex-1">{c.name}</span>
                  <span className="text-xs text-muted-foreground">{c._count?.products || 0}</span>
                </button>
              ))}
              {user && (
                <>
                  <p className="px-3 py-2 mt-4 text-xs font-bold text-muted-foreground uppercase">Account</p>
                  <button onClick={() => { sv({ name: 'profile' }); setMobileMenuOpen(false) }} className="w-full text-left px-3 py-2 hover:bg-accent/10 rounded text-sm">Your Profile</button>
                  <button onClick={() => { sv({ name: 'orders' }); setMobileMenuOpen(false) }} className="w-full text-left px-3 py-2 hover:bg-accent/10 rounded text-sm">Your Orders</button>
                  <button onClick={() => { sv({ name: 'storefront' }); setMobileMenuOpen(false) }} className="w-full text-left px-3 py-2 hover:bg-accent/10 rounded text-sm">Your Storefront</button>
                  <button onClick={() => { sv({ name: 'sell' }); setMobileMenuOpen(false) }} className="w-full text-left px-3 py-2 hover:bg-accent/10 rounded text-sm">Sell a Product / Service</button>
                  <button onClick={() => { sv({ name: 'inbox' }); setMobileMenuOpen(false) }} className="w-full text-left px-3 py-2 hover:bg-accent/10 rounded text-sm">Inbox {unreadCount > 0 && <Badge className="ml-2">{unreadCount}</Badge>}</button>
                  <button onClick={() => { sv({ name: 'agreement' }); setMobileMenuOpen(false) }} className="w-full text-left px-3 py-2 hover:bg-accent/10 rounded text-sm">Seller Agreement</button>
                  {user.isAdmin && (
                    <button onClick={() => { sv({ name: 'admin' }); setMobileMenuOpen(false) }} className="w-full text-left px-3 py-2 hover:bg-accent/10 rounded text-sm font-medium text-primary">Admin Dashboard</button>
                  )}
                  <button onClick={() => { handleLogout(); setMobileMenuOpen(false) }} className="w-full text-left px-3 py-2 hover:bg-accent/10 rounded text-sm text-destructive">Sign Out</button>
                </>
              )}
            </nav>
          </div>
        </div>
      )}
    </>
  )
}
